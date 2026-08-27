// T110 · ¿Le pide el código a Supabase algo que Supabase no tiene?
//
// Por qué existe. Las migraciones de este proyecto se aplican **a mano** en el
// SQL Editor de Supabase, así que el esquema cambia en el momento en que Mar
// pega el SQL, sin esperar a ningún despliegue. El código va por otro camino y
// a otra velocidad. Cuando los dos se separan, producción se rompe entera y en
// silencio: dos veces en dos días (24 y 25/08/2026), `perfiles.puesto` y
// `generaciones.rehechos`. Ver `knowledge/incidente-esquema-desajuste-24-08.md`.
//
// Qué hace: lee el esquema **vivo** de Supabase (no las migraciones del repo —
// lo que importa es lo que hay de verdad) y lo compara con las columnas que el
// código pide en cada consulta.
//
//   npm run comprobar:esquema
//   COMMIT=abc1234 npm run comprobar:esquema   # otra versión del código
//
// El esquema vivo se lee por la API OpenAPI de PostgREST (`GET /rest/v1/`), que
// devuelve todas las tablas y columnas expuestas en una sola llamada, sin SQL y
// sin permisos especiales.
//
// QUÉ NO CUBRE, para que nadie se confíe:
//
// - **Los tipos no se comprueban**, solo que la columna exista. Cambiar un
//   `text` por un `text[]` (que es justo lo que hizo la migración 0017) no lo
//   detecta si el nombre se mantiene.
// - Solo mira consultas escritas de forma literal: `.from('tabla')` con un
//   `.select('...')` de texto fijo. Una tabla o una columna calculadas en
//   tiempo de ejecución se le escapan.
// - Comprueba el código de ESTE árbol de trabajo. El incidente del 24/08 fue
//   el caso simétrico —el esquema al día y el código **publicado** viejo—, y
//   para eso hay que apuntarlo al commit que está en producción con `COMMIT=`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARPETAS = ['app', 'lib'];

type Peticion = { tabla: string; columna: string; fichero: string; linea: number };

function asegurarEntorno(): void {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    process.loadEnvFile(path.join(raizRepo, '.env.local'));
  } catch {
    // Si de verdad faltan, la comprobación de abajo lo dice claro.
  }
}

function ficherosDeCodigo(carpeta: string): string[] {
  const encontrados: string[] = [];
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const completo = path.join(dir, entrada);
      if (statSync(completo).isDirectory()) {
        if (entrada !== 'node_modules' && !entrada.startsWith('.')) recorrer(completo);
      } else if (/\.tsx?$/.test(entrada)) {
        encontrados.push(completo);
      }
    }
  };
  recorrer(path.join(raizRepo, carpeta));
  return encontrados;
}

// Desde un `.from('tabla')`, devuelve el trozo de código de esa consulta: se
// avanza hasta el `;` que la cierra (contando paréntesis y llaves, para no
// cortar dentro de un objeto) o hasta el siguiente `.from(`, lo que llegue
// antes.
function trozoDeLaConsulta(texto: string, desde: number): string {
  let profundidad = 0;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];
    if (c === '(' || c === '{' || c === '[') profundidad++;
    else if (c === ')' || c === '}' || c === ']') profundidad--;
    else if (c === ';' && profundidad <= 0) return texto.slice(desde, i);
    else if (c === '.' && profundidad <= 0 && texto.startsWith('.from(', i) && i > desde) {
      return texto.slice(desde, i);
    }
  }
  return texto.slice(desde);
}

// De `'nombre, puestos, ofertas(titulo, descripcion)'` saca las columnas de la
// tabla consultada y, aparte, las de las tablas relacionadas.
function columnasDeUnSelect(seleccion: string): { propias: string[]; relacionadas: Map<string, string[]> } {
  const relacionadas = new Map<string, string[]>();
  // Primero los joins, y se quitan del texto para no confundir sus columnas
  // con las de la tabla principal.
  const sinJoins = seleccion.replace(/(\w+)\s*\(([^)]*)\)/g, (_, tabla: string, dentro: string) => {
    relacionadas.set(
      tabla,
      dentro
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c && c !== '*'),
    );
    return '';
  });
  const propias = sinJoins
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c && c !== '*' && /^\w+$/.test(c));
  return { propias, relacionadas };
}

function peticionesDelFichero(ruta: string, texto: string): Peticion[] {
  const peticiones: Peticion[] = [];
  const nombreCorto = path.relative(raizRepo, ruta).replace(/\\/g, '/');
  const lineaDe = (indice: number) => texto.slice(0, indice).split('\n').length;

  for (const encaje of texto.matchAll(/\.from\(\s*['"`](\w+)['"`]\s*\)/g)) {
    const tabla = encaje[1];
    const inicio = encaje.index!;
    const linea = lineaDe(inicio);
    const trozo = trozoDeLaConsulta(texto, inicio);
    const anotar = (t: string, columnas: string[]) => {
      for (const columna of columnas) peticiones.push({ tabla: t, columna, fichero: nombreCorto, linea });
    };

    // .select('a, b, otra_tabla(c)')
    for (const sel of trozo.matchAll(/\.select\(\s*['"`]([^'"`]*)['"`]/g)) {
      const { propias, relacionadas } = columnasDeUnSelect(sel[1]);
      anotar(tabla, propias);
      for (const [otra, columnas] of relacionadas) anotar(otra, columnas);
    }

    // Filtros y ordenaciones: .eq('columna', ...), .order('columna'), ...
    for (const filtro of trozo.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|in|is|like|ilike|order)\(\s*['"`](\w+)['"`]/g)) {
      anotar(tabla, [filtro[1]]);
    }

    // .insert({ ... }) y .upsert({ ... }): las claves de primer nivel.
    for (const escritura of trozo.matchAll(/\.(?:insert|upsert|update)\(\s*\{/g)) {
      const abre = escritura.index! + escritura[0].length - 1;
      let profundidad = 0;
      let cierra = abre;
      for (let i = abre; i < trozo.length; i++) {
        if (trozo[i] === '{') profundidad++;
        else if (trozo[i] === '}') {
          profundidad--;
          if (profundidad === 0) {
            cierra = i;
            break;
          }
        }
      }
      const objeto = trozo.slice(abre + 1, cierra);
      // Solo el primer nivel: se descartan los objetos anidados.
      let nivel = 0;
      let acumulado = '';
      for (const c of objeto) {
        if (c === '{' || c === '[' || c === '(') nivel++;
        else if (c === '}' || c === ']' || c === ')') nivel--;
        acumulado += nivel === 0 ? c : ' ';
      }
      for (const clave of acumulado.matchAll(/(?:^|,)\s*(\w+)\s*:/g)) anotar(tabla, [clave[1]]);
    }
  }
  return peticiones;
}

async function esquemaVivo(): Promise<Map<string, Set<string>>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const respuesta = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: clave, Authorization: `Bearer ${clave}` },
  });
  if (!respuesta.ok) {
    throw new Error(`Supabase respondió ${respuesta.status} al pedir el esquema. ¿Es correcta la clave de .env.local?`);
  }
  const cuerpo = await respuesta.json();
  const definiciones = cuerpo.definitions ?? cuerpo.components?.schemas ?? {};
  const esquema = new Map<string, Set<string>>();
  for (const [tabla, definicion] of Object.entries<{ properties?: Record<string, unknown> }>(definiciones)) {
    esquema.set(tabla, new Set(Object.keys(definicion.properties ?? {})));
  }
  return esquema;
}

async function main(): Promise<void> {
  asegurarEntorno();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
        'En local se leen de .env.local.',
    );
    process.exitCode = 1;
  }

  const commit = process.env.COMMIT;
  const peticiones: Peticion[] = [];

  // Con COMMIT, los ficheros son los de ESA versión: si se listaran los del
  // disco, `git show` fallaría con los que aún no existían entonces (o se
  // saltaría los que ya se borraron).
  const rutas = commit
    ? execFileSync('git', ['ls-tree', '-r', '--name-only', commit, '--', ...CARPETAS], {
        cwd: raizRepo,
        encoding: 'utf8',
      })
        .split('\n')
        .map((r) => r.trim())
        .filter((r) => /\.tsx?$/.test(r))
    : CARPETAS.flatMap((carpeta) =>
        ficherosDeCodigo(carpeta).map((f) => path.relative(raizRepo, f).replace(/\\/g, '/')),
      );

  for (const relativo of rutas) {
    const texto = commit
      ? execFileSync('git', ['show', `${commit}:${relativo}`], { cwd: raizRepo, encoding: 'utf8' })
      : readFileSync(path.join(raizRepo, relativo), 'utf8');
    peticiones.push(...peticionesDelFichero(path.join(raizRepo, relativo), texto));
  }

  const esquema = await esquemaVivo();

  console.log('\n=== T110 · El código contra el esquema vivo de Supabase ===');
  console.log(`Código: ${commit ? `commit ${commit}` : 'árbol de trabajo'}`);
  console.log(`Tablas vivas: ${[...esquema.keys()].sort().join(', ')}`);
  console.log(`Peticiones encontradas en el código: ${peticiones.length}\n`);

  const problemas: string[] = [];
  const tablasQuePideElCodigo = new Set(peticiones.map((p) => p.tabla));

  for (const tabla of [...tablasQuePideElCodigo].sort()) {
    const columnasVivas = esquema.get(tabla);
    if (!columnasVivas) {
      const donde = peticiones.filter((p) => p.tabla === tabla);
      problemas.push(
        `Tabla "${tabla}" NO existe en Supabase.\n` +
          donde.map((p) => `    ${p.fichero}:${p.linea}`).join('\n'),
      );
      continue;
    }
    const pedidas = peticiones.filter((p) => p.tabla === tabla);
    const faltan = pedidas.filter((p) => !columnasVivas.has(p.columna));
    if (faltan.length === 0) {
      const distintas = new Set(pedidas.map((p) => p.columna)).size;
      console.log(`  OK  ${tabla} · ${distintas} columnas comprobadas`);
    } else {
      for (const p of faltan) {
        problemas.push(`Columna "${tabla}.${p.columna}" NO existe en Supabase.\n    ${p.fichero}:${p.linea}`);
      }
    }
  }

  if (problemas.length === 0) {
    console.log('\nTodo lo que el código pide existe en Supabase.\n');
    return;
  }

  console.error(`\n${problemas.length} DESAJUSTE(S) entre el código y Supabase:\n`);
  for (const problema of problemas) console.error(`  - ${problema}\n`);
  console.error(
    'Esto rompe producción en cuanto se publique (o ya la tiene rota).\n' +
      'Suele ser una migración de supabase/migrations/ sin aplicar en el SQL Editor,\n' +
      'o código que se quedó atrás respecto a una migración que sí se aplicó.\n',
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
