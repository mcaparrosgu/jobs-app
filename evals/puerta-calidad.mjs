#!/usr/bin/env node
//
// Puerta de calidad del Paso 16.
//
// Lee los archivos de resultados que deja Promptfoo (`-o resultado-*.json`),
// agrega las aserciones por métrica y decide si el cambio puede publicarse.
//
//   node evals/puerta-calidad.mjs evals/promptfoo/resultado-perfil.json evals/promptfoo/resultado-generar.json
//
// Devuelve tres desenlaces distintos, y esa distinción es lo importante:
//
//   0 · VERDE          todas las métricas por encima de su umbral -> se publica
//   1 · ROJO           el modelo respondió y respondió mal         -> NO se publica
//   2 · NO CONCLUYENTE no hubo cuota / el juez no contestó         -> NO se publica,
//                      pero no es culpa del prompt: hay que repetirlo
//
// El caso 2 existe porque ya ha pasado tres veces (knowledge/paso-13-evals.md):
// un eval en rojo por un 429 de Groq o por el modelo juez sin endpoints parece
// un suspenso de calidad y no lo es. Sin esta distinción se pierden tardes
// arreglando un prompt que estaba bien.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

const VERDE = 0;
const ROJO = 1;
const NO_CONCLUYENTE = 2;

// Señales de que quien falló fue la infraestructura, no el prompt. Se buscan
// tanto en el error del caso como en el motivo que da cada aserción.
const SENALES_DE_INFRAESTRUCTURA = [
  /\b429\b/,
  /\b50[0234]\b/,
  /rate.?limit/i,
  /too many requests/i,
  /quota/i,
  /free-models-per-day/i,
  /no endpoints available/i,
  /insufficient|credits/i,
  /timeout|timed out|aborted/i,
  /econnreset|enotfound|etimedout|socket hang up|fetch failed|network error/i,
  /unauthorized|\b401\b|\b403\b|api key/i,
  /provider .*(error|did not respond)/i,
];

function esDeInfraestructura(texto) {
  if (!texto) return false;
  return SENALES_DE_INFRAESTRUCTURA.some((patron) => patron.test(String(texto)));
}

function cargarUmbrales() {
  const bruto = JSON.parse(readFileSync(path.join(AQUI, 'umbrales.json'), 'utf8'));
  return {
    porMetrica: bruto.porcentajeMinimoPorMetrica,
    maxNoConcluyente: bruto.maxPorcentajeNoConcluyente,
    minimoEvaluables: bruto.minimoAsercionesEvaluables,
  };
}

// De un archivo de Promptfoo saca una lista plana de aserciones, cada una con
// su métrica y su desenlace.
function leerAserciones(rutaArchivo) {
  const contenido = JSON.parse(readFileSync(rutaArchivo, 'utf8'));
  const casos = contenido?.results?.results ?? [];

  if (casos.length === 0) {
    throw new Error(
      `El archivo ${rutaArchivo} no contiene ningún caso. ¿Se llegó a ejecutar el eval?`,
    );
  }

  const aserciones = [];

  for (const caso of casos) {
    // Promptfoo no siempre sube la descripción al nivel del resultado; cuando
    // no lo hace, sigue estando dentro del caso de prueba. Sin este respaldo
    // el detalle sale como "caso #0" y hay que ir al YAML a buscar cuál era —
    // justo cuando más prisa se tiene.
    const descripcion =
      caso.description ?? caso.testCase?.description ?? `caso #${caso.testIdx ?? '?'}`;
    // failureReason 2 = ERROR (excepción real: el proveedor no respondió o
    // Promptfoo no pudo completar la llamada), frente a 1 = ASSERT (el
    // modelo SÍ contestó y la comprobación de calidad dijo que no).
    //
    // `Boolean(caso.error)` NO sirve para distinguir esto: verificado en el
    // código fuente de Promptfoo (evaluator-*.js) que en un ASSERT normal
    // también hace `result.failureReason = ASSERT; result.error = reason` —
    // rellena `caso.error` con el motivo del suspenso, igual que en un
    // ERROR real. Con el OR puesto, TODO fallo (también una invención real
    // detectada por el juez) contaba como "no concluyente" y la rama ROJO
    // de `juzgar()` quedaba inalcanzable. Encontrado el 22/08/2026 al
    // revisar a mano el resultado_generar.json de esta misma tarde:
    // knowledge/arreglo-puerta-casoreventado.md.
    const casoReventado = caso.failureReason === 2;
    const motivoDelCaso = caso.error ?? '';
    // La llamada real a la IA (lib/ia.ts) devuelve su fallo como
    // `{ error: true, mensaje }` dentro de `output`, no como una excepción de
    // Promptfoo — así que ni `failureReason` ni `caso.error` lo ven. Una
    // aserción JS/Python con forma `if (output.error) return false` (varias
    // en helpers.cjs) pierde ese `mensaje` real y lo sustituye por un texto
    // fijo genérico ("Sin salida que comprobar"), que no coincide con
    // ninguna señal de `esDeInfraestructura`. Mirar aquí el error crudo de la
    // respuesta, no solo el texto de cada aserción, es lo que de verdad
    // distingue "ningún modelo respondió" de una invención real — verificado
    // en vivo el 24/08/2026 cuando una tanda entera sin cuota (13/13) se
    // contó como ROJO de fidelidad en vez de NO CONCLUYENTE
    // (knowledge/paso-13-evals.md).
    const motivoRespuesta = caso.response?.output?.mensaje ?? '';

    const componentes = caso.gradingResult?.componentResults ?? [];

    // Un caso que revienta antes de evaluar nada no deja componentes: se anota
    // igualmente para que cuente como no concluyente y no desaparezca del
    // recuento.
    if (componentes.length === 0) {
      aserciones.push({
        metrica: '(sin metrica)',
        caso: descripcion,
        desenlace: casoReventado ? 'no_concluyente' : caso.success ? 'aprobada' : 'suspensa',
        motivo: motivoDelCaso || caso.gradingResult?.reason || '',
      });
      continue;
    }

    for (const componente of componentes) {
      const metrica = componente.assertion?.metric ?? componente.metric ?? '(sin metrica)';
      const motivo = componente.reason ?? '';

      let desenlace;
      if (componente.pass) {
        desenlace = 'aprobada';
      } else if (
        casoReventado ||
        esDeInfraestructura(motivo) ||
        esDeInfraestructura(motivoDelCaso) ||
        esDeInfraestructura(motivoRespuesta)
      ) {
        desenlace = 'no_concluyente';
      } else {
        desenlace = 'suspensa';
      }

      aserciones.push({ metrica, caso: descripcion, desenlace, motivo: motivo || motivoRespuesta });
    }
  }

  return aserciones;
}

function agruparPorMetrica(aserciones) {
  const porMetrica = new Map();

  for (const asercion of aserciones) {
    if (!porMetrica.has(asercion.metrica)) {
      porMetrica.set(asercion.metrica, {
        aprobadas: 0,
        suspensas: 0,
        noConcluyentes: 0,
        fallos: [],
      });
    }
    const grupo = porMetrica.get(asercion.metrica);

    if (asercion.desenlace === 'aprobada') {
      grupo.aprobadas += 1;
    } else if (asercion.desenlace === 'suspensa') {
      grupo.suspensas += 1;
      grupo.fallos.push(asercion);
    } else {
      grupo.noConcluyentes += 1;
      grupo.fallos.push(asercion);
    }
  }

  return porMetrica;
}

function juzgar(porMetrica, umbrales) {
  const filas = [];
  let hayRojo = false;
  let hayNoConcluyente = false;

  for (const [metrica, grupo] of porMetrica) {
    const total = grupo.aprobadas + grupo.suspensas + grupo.noConcluyentes;
    const evaluables = grupo.aprobadas + grupo.suspensas;
    const umbral = umbrales.porMetrica[metrica];

    // Métricas sin umbral declarado (p. ej. "(sin metrica)") se informan pero
    // no bloquean: bloquear por algo que nadie ha definido sería ruido.
    if (umbral === undefined) {
      filas.push({
        metrica, total, evaluables, porcentaje: null, umbral: null,
        veredicto: 'informativa', grupo,
      });
      if (grupo.noConcluyentes > 0) hayNoConcluyente = true;
      continue;
    }

    const porcentajeNoConcluyente = total === 0 ? 100 : (grupo.noConcluyentes / total) * 100;
    const muestraPobre =
      evaluables < umbrales.minimoEvaluables || porcentajeNoConcluyente > umbrales.maxNoConcluyente;

    if (muestraPobre) {
      hayNoConcluyente = true;
      filas.push({
        metrica, total, evaluables, porcentaje: null, umbral,
        veredicto: 'no_concluyente', grupo,
      });
      continue;
    }

    const porcentaje = (grupo.aprobadas / evaluables) * 100;
    const veredicto = porcentaje >= umbral ? 'verde' : 'rojo';
    if (veredicto === 'rojo') hayRojo = true;

    filas.push({ metrica, total, evaluables, porcentaje, umbral, veredicto, grupo });
  }

  // El rojo manda sobre el no concluyente: si algo suspendió de verdad, ese es
  // el titular aunque además falte cuota en otra métrica.
  const codigo = hayRojo ? ROJO : hayNoConcluyente ? NO_CONCLUYENTE : VERDE;
  return { filas, codigo };
}

const ICONO = {
  verde: 'OK  ',
  rojo: 'MAL ',
  no_concluyente: '????',
  informativa: '--  ',
};

function imprimir({ filas, codigo }, archivos) {
  console.log('');
  console.log('PUERTA DE CALIDAD · evals del Paso 13');
  console.log('Archivos leidos: ' + archivos.map((a) => path.basename(a)).join(', '));
  console.log('='.repeat(78));
  console.log('estado metrica                    aprobadas  umbral  resultado  sin evaluar');
  console.log('-'.repeat(78));

  for (const fila of filas) {
    const porcentaje = fila.porcentaje === null ? '   -  ' : `${fila.porcentaje.toFixed(1).padStart(5)}%`;
    const umbral = fila.umbral === null ? '   - ' : `${String(fila.umbral).padStart(4)}%`;
    const aprobadas = `${fila.grupo.aprobadas}/${fila.evaluables}`.padStart(9);
    const sinEvaluar = fila.grupo.noConcluyentes > 0 ? String(fila.grupo.noConcluyentes).padStart(6) : '     -';

    console.log(
      `${ICONO[fila.veredicto]}  ${fila.metrica.padEnd(24)} ${aprobadas}  ${umbral}  ${porcentaje}  ${sinEvaluar}`,
    );
  }

  console.log('='.repeat(78));

  const conFallos = filas.filter((f) => f.grupo.fallos.length > 0);
  if (conFallos.length > 0) {
    console.log('');
    console.log('DETALLE DE LO QUE NO PASO');
    for (const fila of conFallos) {
      for (const fallo of fila.grupo.fallos) {
        const etiqueta = fallo.desenlace === 'suspensa' ? 'suspenso de calidad' : 'sin evaluar';
        const motivo = String(fallo.motivo).replace(/\s+/g, ' ').slice(0, 160);
        console.log(`  · [${fila.metrica}] ${fallo.caso}`);
        console.log(`      ${etiqueta}: ${motivo || '(sin motivo)'}`);
      }
    }
  }

  console.log('');
  if (codigo === VERDE) {
    console.log('VEREDICTO: VERDE. Todas las metricas por encima de su umbral. Se puede publicar.');
  } else if (codigo === ROJO) {
    console.log('VEREDICTO: ROJO. Alguna metrica ha bajado del umbral con el modelo respondiendo.');
    console.log('           Esto si es un problema de calidad. NO se publica.');
    console.log('           Mira el detalle de arriba antes de tocar el prompt.');
  } else {
    console.log('VEREDICTO: NO CONCLUYENTE. No hay muestra suficiente para juzgar.');
    console.log('           NO es un fallo del prompt. Mira el motivo en el detalle de arriba:');
    console.log('');
    console.log('           · "401" / "Invalid API Key"  -> la CLAVE que ha recibido el proceso');
    console.log('             no vale. En local, revisa GROQ_API_KEY en .env.local. En el robot,');
    console.log('             revisa el secreto GROQ_API_KEY del repositorio en GitHub.');
    console.log('           · "429" / "rate limit"       -> sin cuota. La de Groq se renueva');
    console.log('             cada dia; vuelve a lanzarlo entonces.');
    console.log('           · "no endpoints available"   -> el modelo juez no esta disponible.');
    console.log('           · "timeout" / "fetch failed" -> red o el proveedor sin responder.');
    console.log('');
    console.log('           Si tienes prisa y el cambio no toca la IA, el commit puede llevar');
    console.log('           "[sin evals]" en el mensaje para saltarse esta puerta a conciencia.');
  }
  console.log('');
}

function main() {
  const archivos = process.argv.slice(2);
  if (archivos.length === 0) {
    console.error('Uso: node evals/puerta-calidad.mjs <resultado.json> [otro-resultado.json ...]');
    process.exit(ROJO);
  }

  const umbrales = cargarUmbrales();
  const aserciones = archivos.flatMap((archivo) => leerAserciones(archivo));
  const resultado = juzgar(agruparPorMetrica(aserciones), umbrales);

  imprimir(resultado, archivos);
  process.exit(resultado.codigo);
}

// Solo se ejecuta cuando se llama desde la terminal, no cuando lo importan las
// pruebas: si `main()` corriera al importar, `process.exit` mataría a Vitest.
const llamadoDesdeLaTerminal =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (llamadoDesdeLaTerminal) main();

export {
  VERDE,
  ROJO,
  NO_CONCLUYENTE,
  esDeInfraestructura,
  leerAserciones,
  agruparPorMetrica,
  juzgar,
  cargarUmbrales,
};
