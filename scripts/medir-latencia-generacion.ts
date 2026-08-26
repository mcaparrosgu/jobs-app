// T114 · Sonda de latencia de `generarCvYCarta`.
//
// Por qué existe: la puerta de calidad dio NO CONCLUYENTE dos veces el
// 25/08/2026 por `TimeoutError` de Cloudflare, y la sospecha apuntada en T114
// era que el runner de GitHub tuviera peor latencia que el portátil de Mar.
//
// Esta sonda hace la llamada REAL (`generarCvYCarta` de lib/ia.ts, la misma
// que usa la app y la misma que usan los evals) sobre casos REALES del golden
// dataset, la cronometra una por una, e imprime la distribución.
//
// LO QUE MIDIÓ EL 26/08/2026 (y por qué la sospecha era falsa):
//
//   · Los timeouts pasan TAMBIÉN en local: 1 de cada 5 casos, sin runner de
//     GitHub por medio. No es un problema de dónde se llama.
//   · Los casos que fallan no son lentos: se DESBOCAN. B10 medido sin corte
//     tarda 181,5 s y acaba en un HTTP 408 del propio Cloudflare. Con el
//     techo bajado a 1.500 tokens llega al techo en 37,4 s y devuelve un JSON
//     truncado — es decir, el modelo no para de escribir por sí solo.
//   · Los casos buenos van a ~40 tokens/s (≈500 tokens en 10-13,5 s), así que
//     el corte de 26 s solo da para ~1.000 tokens. Subirlo a 44 s no salvaría
//     a B10, que necesitaría ~300 s: la propuesta apuntada en T114 queda
//     descartada por medición.
//
// Cuesta cuota de Cloudflare: una llamada de generación por caso. Por eso el
// número de casos es pequeño y ajustable, en vez de la tanda entera de 13.
//
//   npx tsx scripts/medir-latencia-generacion.ts          # 5 casos
//   npx tsx scripts/medir-latencia-generacion.ts 3        # 3 casos
//
// Variables de entorno:
//   CASOS       cuántos casos del golden dataset medir (por defecto 5)
//   PAUSA_MS    espera entre llamadas (por defecto 3000)
//   FILTRO      medir solo los casos cuya descripción empiece por esto
//               (p. ej. FILTRO=B10, o FILTRO=B02,B10 para varios)
//   SIN_CORTE   si vale 1, le quita el corte de espera a la llamada a
//               Cloudflare para ver cuánto tarda DE VERDAD un caso que
//               normalmente muere en el timeout. Ver `envolverFetch`.
//   MAX_TOKENS  fuerza otro techo de tokens de salida (en producción, 12.000)
//               para ver hasta dónde llega un caso desbocado. Ver `envolverFetch`.
//
// Nota: lee los casos del YAML de los evals para no duplicar el dataset. El
// parser (js-yaml) entra de rebote con promptfoo; si algún día promptfoo deja
// de traerlo, este script se queda sin arrancar y hay que instalarlo aparte.
// Es un script de diagnóstico, no código de producción: no lo llama nadie más.

import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const raizRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Mismo apaño que los proveedores de Promptfoo: en local las claves están en
// .env.local; en el runner llegan ya puestas como secretos de GitHub.
function asegurarEntorno(): void {
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) return;
  try {
    process.loadEnvFile(path.join(raizRepo, '.env.local'));
  } catch {
    // Sin .env.local no pasa nada aquí: si de verdad faltan las claves, la
    // comprobación de abajo lo dice con un mensaje entendible.
  }
}

type OfertaVar = { titulo: string; empresa: string; descripcion: string | null };
type CasoYaml = {
  description?: string;
  vars?: { cv_texto?: string; puesto_perfil?: string; oferta?: OfertaVar };
};

type Medicion = {
  caso: string;
  ms: number;
  resultado: 'OK' | 'TIMEOUT' | 'ERROR';
  proveedor?: string;
  modelo?: string;
  tokensSalida?: number | null;
  caracteresCv?: number;
  detalle?: string;
};

function leerCasos(): CasoYaml[] {
  // Se carga con `require` y no con `import` a propósito: js-yaml entra de
  // rebote con promptfoo y no trae declaraciones de tipos, así que un `import`
  // deja a `tsc` protestando (TS7016). Instalar @types/js-yaml solo para un
  // script de diagnóstico no compensa.
  const yaml: { load: (texto: string) => unknown } = require('js-yaml');
  const ruta = path.join(raizRepo, 'evals/promptfoo/generar-cv-carta.yaml');
  const config = yaml.load(readFileSync(ruta, 'utf8')) as { tests?: CasoYaml[] };
  const casos = (config.tests ?? []).filter((t) => t.vars?.cv_texto && t.vars?.oferta);
  if (casos.length === 0) throw new Error(`No hay casos utilizables en ${ruta}`);
  return casos;
}

// Reparte los N casos por todo el dataset en vez de coger los N primeros: los
// casos del golden están ordenados de más simple a más raro, y medir solo la
// cabeza daría una latencia optimista que no se parece a la tanda completa.
function repartir<T>(lista: T[], cuantos: number): T[] {
  if (cuantos >= lista.length) return lista;
  const paso = (lista.length - 1) / (cuantos - 1 || 1);
  return Array.from({ length: cuantos }, (_, i) => lista[Math.round(i * paso)]);
}

// Con SIN_CORTE=1 la sonda envuelve el `fetch` global y le quita la señal de
// aborto a las peticiones que van a Cloudflare. Es la única manera de saber
// cuánto tarda de verdad un caso que hoy muere a los 26 s, sin tener que
// tocar `TIMEOUT_CLOUDFLARE_GENERACION_MS` en lib/ia.ts — que es código de
// producción y, además, cualquier cambio ahí dispara los evals al publicar.
//
// Solo afecta a este proceso y solo a Cloudflare: el respaldo de OpenRouter
// conserva su corte, porque ahí no hay nada que medir (contesta 429 en menos
// de medio segundo, T112).
//
// El mismo envoltorio permite probar otro `max_tokens` (MAX_TOKENS) sin tocar
// `MAX_TOKENS_CLOUDFLARE_GENERACION`: es el techo que decide hasta dónde puede
// escribir un modelo que se ha desbocado, y medir su efecto en vivo es la
// única forma de saber si bajarlo arregla algo o solo trunca los CVs buenos.
// `MODELO` hace lo mismo con el modelo: permite comparar candidatos en vivo
// (¿se cuelga solo mistral, o es Cloudflare entero?) sin tocar
// `MODELO_CLOUDFLARE_GENERACION`.
function envolverFetch({
  sinCorte,
  maxTokens,
  modelo,
}: {
  sinCorte: boolean;
  maxTokens?: number;
  modelo?: string;
}): void {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    if (!url.includes('api.cloudflare.com')) return fetchOriginal(entrada, init);

    let siguiente: RequestInit = init ?? {};
    if (sinCorte && siguiente.signal) {
      siguiente = { ...siguiente };
      delete siguiente.signal;
    }
    if ((maxTokens || modelo) && typeof siguiente.body === 'string') {
      const cuerpo = JSON.parse(siguiente.body);
      if (maxTokens) cuerpo.max_tokens = maxTokens;
      if (modelo) cuerpo.model = modelo;
      siguiente = { ...siguiente, body: JSON.stringify(cuerpo) };
    }
    return fetchOriginal(entrada, siguiente);
  }) as typeof fetch;
}

function esTimeout(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /timeout|abort/i.test(texto);
}

function percentil(ordenados: number[], p: number): number {
  if (ordenados.length === 0) return NaN;
  const indice = Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length));
  return ordenados[indice];
}

function segundos(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

async function main(): Promise<void> {
  asegurarEntorno();

  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error(
      'Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID.\n' +
        'En local se leen de .env.local; en el runner, de los secretos del repositorio.',
    );
    process.exit(1);
  }

  const cuantos = Number(process.argv[2] ?? process.env.CASOS ?? 5);
  const pausaMs = Number(process.env.PAUSA_MS ?? 3000);
  const sinCorte = process.env.SIN_CORTE === '1';
  const filtro = (process.env.FILTRO ?? '').split(',').map((f) => f.trim()).filter(Boolean);

  const maxTokens = process.env.MAX_TOKENS ? Number(process.env.MAX_TOKENS) : undefined;
  const modelo = process.env.MODELO || undefined;

  // Antes del import de lib/ia.ts: hay que envolver el fetch global antes de
  // que el módulo lo capture en ningún sitio.
  if (sinCorte || maxTokens || modelo) envolverFetch({ sinCorte, maxTokens, modelo });

  const { generarCvYCarta } = await import('../lib/ia');

  const todos = leerCasos();
  const casos =
    filtro.length > 0
      ? todos.filter((c) => filtro.some((f) => (c.description ?? '').startsWith(f)))
      : repartir(todos, cuantos);

  if (casos.length === 0) throw new Error(`El filtro "${filtro.join(',')}" no encaja con ningún caso.`);

  const donde = process.env.GITHUB_ACTIONS === 'true' ? 'runner de GitHub' : 'máquina local';
  console.log(`\n=== T114 · Latencia de generarCvYCarta desde ${donde} ===`);
  console.log(`${casos.length} casos del golden dataset · ${new Date().toISOString()}`);
  if (sinCorte) console.log('SIN CORTE: a Cloudflare no se le aplica el timeout de 26 s.');
  if (maxTokens) console.log(`MAX_TOKENS forzado a ${maxTokens} (en producción son 12.000).`);
  if (modelo) console.log(`MODELO forzado a ${modelo}.`);
  console.log('');

  const mediciones: Medicion[] = [];

  for (const [indice, caso] of casos.entries()) {
    const nombre = caso.description ?? `caso ${indice + 1}`;
    const cvTexto = caso.vars!.cv_texto!;
    const arranque = performance.now();

    try {
      const generado = await generarCvYCarta(
        cvTexto,
        caso.vars!.puesto_perfil ?? '',
        caso.vars!.oferta!,
      );
      const ms = performance.now() - arranque;
      mediciones.push({
        caso: nombre,
        ms,
        resultado: 'OK',
        proveedor: generado.uso.proveedor,
        modelo: generado.uso.modelo,
        tokensSalida: generado.uso.tokensSalida,
        caracteresCv: generado.cv_texto.length,
      });
      console.log(
        `  OK       ${segundos(ms).padStart(7)}  ${generado.uso.proveedor.padEnd(11)}` +
          `  CV ${String(generado.cv_texto.length).padStart(5)} car.  ${nombre}`,
      );
    } catch (error) {
      const ms = performance.now() - arranque;
      const detalle = error instanceof Error ? error.message : String(error);
      const resultado = esTimeout(error) ? 'TIMEOUT' : 'ERROR';
      mediciones.push({ caso: nombre, ms, resultado, detalle });
      console.log(
        `  ${resultado.padEnd(8)} ${segundos(ms).padStart(7)}  ${nombre}\n           ↳ ${detalle.slice(0, 160)}`,
      );
    }

    if (indice < casos.length - 1) await new Promise((r) => setTimeout(r, pausaMs));
  }

  // ── Resumen ────────────────────────────────────────────────────────────
  const okes = mediciones.filter((m) => m.resultado === 'OK');
  const timeouts = mediciones.filter((m) => m.resultado === 'TIMEOUT');
  const errores = mediciones.filter((m) => m.resultado === 'ERROR');
  const tiempos = okes.map((m) => m.ms).sort((a, b) => a - b);

  console.log(`\n--- Resumen (${donde}) ---`);
  console.log(
    `  Correctas: ${okes.length}/${mediciones.length}   Timeouts: ${timeouts.length}   Otros errores: ${errores.length}`,
  );

  if (tiempos.length > 0) {
    console.log(
      `  Latencia de las correctas — mín ${segundos(tiempos[0])} · ` +
        `mediana ${segundos(percentil(tiempos, 50))} · p90 ${segundos(percentil(tiempos, 90))} · ` +
        `máx ${segundos(tiempos[tiempos.length - 1])}`,
    );
    const porCloudflare = okes.filter((m) => m.proveedor === 'Cloudflare').length;
    console.log(`  Resueltas por Cloudflare: ${porCloudflare}/${okes.length} (el resto, por el respaldo)`);
  }

  console.log(
    '\n  Lectura: desde T118, `generarCvYCarta` hace UN solo intento contra\n' +
      '  Cloudflare (48 s, TIMEOUTS_CLOUDFLARE_GENERACION_MS). Los tres intentos\n' +
      '  cortos de T114 (24 + 14 + 14 s) se calcularon cuando una generación\n' +
      '  tardaba 13 s; hoy tarda de 32 a 41 s, así que fallaban por definición.\n' +
      '  Una correcta en ese rango es lo normal, no un reintento afortunado.\n',
  );

  // JSON al final, en una línea, para poder guardarlo y comparar tandas.
  console.log('JSON_MEDICIONES=' + JSON.stringify({ donde, fecha: new Date().toISOString(), mediciones }));
}

main().catch((error) => {
  console.error('La sonda se cayó entera:', error);
  process.exit(1);
});
