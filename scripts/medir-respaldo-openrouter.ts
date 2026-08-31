// T112 · ¿Sirve de algo el respaldo de OpenRouter?
//
// Hoy no respalda nada: sus dos modelos devuelven 429 en menos de medio
// segundo. Este script mide en vivo los candidatos que podrían sustituirlos,
// con el prompt REAL de generación, sin tocar `lib/ia.ts`.
//
//   npm run medir:respaldo                    # los candidatos por defecto
//   MODELOS='a/b:free|c/d:free' npm run medir:respaldo
//   CORTE_MS=90000 npm run medir:respaldo     # cuánto tardan de verdad
//
// El prompt no se reconstruye a mano: se **captura** el cuerpo que
// `generarCvYCarta` manda a Cloudflare, envolviendo el `fetch` global. Así lo
// que se mide es exactamente lo que la app pediría, y no una aproximación que
// se quede vieja en cuanto alguien toque el prompt.
//
// Solo 4 de los 17 modelos `:free` de OpenRouter declaran `structured_outputs`,
// que es lo que esta llamada pide siempre (`response_format: json_schema`).
// Consultado el 27/08/2026 en `GET /api/v1/models`.

import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const raizRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CANDIDATOS = [
  'z-ai/glm-5.2:free', // el que ya está en la ronda 2
  'dots-studio/dots-3-note-preview:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'liquid/lfm-2.5-2.6b:free',
];

function asegurarEntorno(): void {
  if (process.env.OPENROUTER_API_KEY && process.env.CLOUDFLARE_ACCOUNT_ID) return;
  try {
    process.loadEnvFile(path.join(raizRepo, '.env.local'));
  } catch {
    // La comprobación de abajo lo dice claro si de verdad falta algo.
  }
}

type CasoYaml = {
  description?: string;
  vars?: {
    cv_texto?: string;
    puesto_perfil?: string;
    oferta?: { titulo: string; empresa: string; descripcion: string | null };
  };
};

function leerCasos(): CasoYaml[] {
  const yaml: { load: (t: string) => unknown } = require('js-yaml');
  const config = yaml.load(
    readFileSync(path.join(raizRepo, 'evals/promptfoo/generar-cv-carta.yaml'), 'utf8'),
  ) as { tests?: CasoYaml[] };
  return (config.tests ?? []).filter((t) => t.vars?.cv_texto && t.vars?.oferta);
}

// Captura el cuerpo que `generarCvYCarta` manda a Cloudflare y corta ahí: no
// interesa la respuesta, solo la petición. Se devuelve un 429 de mentira para
// que la función no siga gastando cuota por la cascada.
async function capturarPeticionReal(caso: CasoYaml): Promise<Record<string, unknown>> {
  let capturado: Record<string, unknown> | undefined;
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    if (url.includes('api.cloudflare.com') && typeof init?.body === 'string') {
      capturado ??= JSON.parse(init.body);
      return new Response('{"errors":[{"message":"sonda: no se llama de verdad"}]}', { status: 429 });
    }
    if (url.includes('openrouter.ai')) {
      return new Response('{"error":"sonda: no se llama de verdad"}', { status: 429 });
    }
    return fetchOriginal(entrada, init);
  }) as typeof fetch;

  try {
    const { generarCvYCarta } = await import(pathToFileURL(path.join(raizRepo, 'lib/ia.ts')).href);
    const v = caso.vars!;
    await generarCvYCarta(v.cv_texto!, v.puesto_perfil ?? '', v.oferta!);
  } catch {
    // Se espera que falle: todos los proveedores devuelven 429 de mentira.
  } finally {
    globalThis.fetch = fetchOriginal;
  }

  if (!capturado) throw new Error('No se pudo capturar la petición a Cloudflare.');
  return capturado;
}

function segundos(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

async function probarModelo(
  modelo: string,
  peticion: Record<string, unknown>,
  corteMs: number,
): Promise<{ modelo: string; ms: number; resultado: string; detalle?: string; tokens?: number }> {
  // Mismo cuerpo que iría a Cloudflare, cambiando solo el modelo: el esquema,
  // el prompt y el techo de tokens son los de producción.
  const cuerpo = { ...peticion, model: modelo };
  const arranque = performance.now();
  try {
    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(corteMs),
    });
    const ms = performance.now() - arranque;

    if (!respuesta.ok) {
      const detalle = (await respuesta.text()).slice(0, 120).replace(/\s+/g, ' ');
      return { modelo, ms, resultado: `HTTP ${respuesta.status}`, detalle };
    }

    const datos = await respuesta.json();
    const contenido = datos.choices?.[0]?.message?.content;
    const tokens = datos.usage?.completion_tokens;
    if (typeof contenido !== 'string' || contenido.trim().length === 0) {
      return { modelo, ms, resultado: 'VACÍO', detalle: JSON.stringify(datos).slice(0, 120), tokens };
    }
    // ¿Es un JSON con la forma que la app espera? Se usa `repararJsonCortado`
    // y no `JSON.parse` a secas porque es lo que hace producción desde T118:
    // medir con un criterio más estricto que el de la app descartaría modelos
    // que en realidad sirven.
    try {
      const { repararJsonCortado } = await import(pathToFileURL(path.join(raizRepo, 'lib/ia.ts')).href);
      const objeto = repararJsonCortado(contenido) as {
        cv_lineas?: unknown;
        carta_parrafos?: unknown;
      };
      const cv = objeto.cv_lineas as string[] | undefined;
      const carta = objeto.carta_parrafos as string[] | undefined;
      const tieneCv = Array.isArray(cv) && cv.length > 0;
      const tieneCarta = Array.isArray(carta) && carta.length > 0;
      if (tieneCv && tieneCarta) {
        return {
          modelo,
          ms,
          resultado: 'OK',
          tokens,
          detalle: `${cv.join('\n').length} car. de CV, ${carta.length} párrafos`,
        };
      }
      return { modelo, ms, resultado: 'JSON INCOMPLETO', tokens, detalle: Object.keys(objeto ?? {}).join(', ') };
    } catch {
      return { modelo, ms, resultado: 'JSON ROTO', tokens, detalle: contenido.slice(0, 100).replace(/\s+/g, ' ') };
    }
  } catch (error) {
    const ms = performance.now() - arranque;
    const texto = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { modelo, ms, resultado: /timeout|abort/i.test(texto) ? 'TIMEOUT' : 'ERROR', detalle: texto.slice(0, 120) };
  }
}

async function main(): Promise<void> {
  asegurarEntorno();
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('Falta OPENROUTER_API_KEY. En local se lee de .env.local.');
    process.exitCode = 1;
    return;
  }

  const corteMs = Number(process.env.CORTE_MS ?? 60_000);
  const modelos = process.env.MODELOS ? process.env.MODELOS.split('|').filter(Boolean) : CANDIDATOS;
  const filtro = process.env.FILTRO ?? 'B01';
  const caso = leerCasos().find((c) => (c.description ?? '').startsWith(filtro));
  if (!caso) throw new Error(`El filtro "${filtro}" no encaja con ningún caso.`);

  console.log('\n=== T112 · ¿Sirve de algo el respaldo de OpenRouter? ===');
  console.log(`Caso: ${caso.description}`);
  console.log(`Corte de espera: ${segundos(corteMs)} (en producción son 2 s)\n`);

  const peticion = await capturarPeticionReal(caso);
  console.log(
    `Petición real capturada: ${(peticion.messages as unknown[]).length} mensajes, ` +
      `max_tokens ${peticion.max_tokens}, esquema ${peticion.response_format ? 'sí' : 'no'}\n`,
  );

  const resultados = [];
  for (const modelo of modelos) {
    const r = await probarModelo(modelo, peticion, corteMs);
    resultados.push(r);
    const linea = `  ${r.resultado.padEnd(15)} ${segundos(r.ms).padStart(8)}  ${r.modelo}`;
    console.log(r.detalle ? `${linea}\n${' '.repeat(27)}↳ ${r.detalle}` : linea);
  }

  const sirven = resultados.filter((r) => r.resultado === 'OK');
  console.log(`\n--- Resumen ---\n  Sirven: ${sirven.length}/${resultados.length}`);
  if (sirven.length > 0) {
    const masRapido = sirven.reduce((a, b) => (a.ms < b.ms ? a : b));
    console.log(`  Más rápido de los que sirven: ${masRapido.modelo} (${segundos(masRapido.ms)})`);
    console.log(
      '\n  Ojo al corte: en producción el respaldo tiene ' +
        'TIMEOUT_OPENROUTER_GENERACION_MS = 2 s, porque Cloudflare ya se ha\n' +
        '  comido hasta 48 s de los 60 del `maxDuration` de la ruta. Un modelo\n' +
        '  que tarde más que eso no salva ninguna generación por rápido que sea.',
    );
  }
  console.log();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
