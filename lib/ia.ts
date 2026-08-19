// Llamadas al modelo de IA, en un solo sitio (docs/04-plan-tecnico.md §3.3).
// Proveedor principal: OpenRouter, sin tarjeta. Ver knowledge/decision-modelo-ia.md
// para por qué no es Groq en solitario y por qué hay varios modelos en vez de
// uno fijo. Desde el 19/08/2026 hay además un respaldo en Groq (más abajo):
// ver knowledge/decision-respaldo-groq.md para el porqué.

import { detectarIdioma, NOMBRE_IDIOMA, type Idioma } from '@/lib/idioma';
import { MAXIMO_CARACTERES, normalizarPalabrasClave } from '@/lib/palabras-clave';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Modelos gratis intercambiables, en dos rondas (knowledge/decision-modelo-ia.md).
//
// Importante — verificado en vivo el 19/08/2026: el 429 que devuelven estos
// modelos casi siempre NO es "este modelo en concreto está saturado", sino
// "free-models-per-day": OpenRouter da 50 peticiones gratis AL DÍA para toda
// la cuenta, compartidas entre los 5 modelos. Agotada esa cuota, los 5 fallan
// a la vez con el mismo error, y probar el siguiente modelo de la ronda no
// arregla nada — por eso existe el respaldo en Groq, más abajo, que tiene su
// propio cupo independiente.
//
// Aun así se mantienen las dos rondas: si algún día el fallo es de verdad de
// un modelo concreto (retirado, con una tirada de errores 500, etc.) probar
// otro sí ayuda, y el coste de intentarlo es bajo porque un 429 por cupo
// agotado contesta en menos de un segundo.
//
// Dentro de una ronda se llama en paralelo y gana el primero que responde
// bien: un modelo saturado contesta 429 en menos de un segundo, pero uno que
// se atasca puede tardar mucho más, y en paralelo el atascado no retrasa a
// nadie.
//
// Orden verificado en vivo el 19/08/2026 con una petición de generación real.
const RONDAS_MODELOS: readonly (readonly string[])[] = [
  ['google/gemma-4-26b-a4b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free'],
  ['z-ai/glm-5.2:free', 'google/gemma-4-31b-it:free', 'nvidia/nemotron-nano-9b-v2:free'],
];

// Respaldo fuera de OpenRouter: Groq, con qwen3.6-27b (el mismo modelo que
// dejó "Preview" en knowledge/decision-modelo-ia.md — ahí se descartó como
// PRIMARIO por ese riesgo, pero como último recurso, solo cuando OpenRouter ya
// ha fallado entero, el riesgo de que además esté retirado justo ese día es
// asumible). Groq tiene su propio cupo (1000 peticiones/día verificadas en
// vivo, frente a las 50/día de OpenRouter), así que agotar el de OpenRouter no
// afecta a este. `reasoning_effort: 'none'` apaga la cadena de pensamiento que
// este modelo añade por defecto (gastaría cientos de tokens de más por nada:
// verificado en vivo, 1184 tokens de "pensamiento" para contestar "OK"), y
// `reasoning_format: 'hidden'` asegura que ese razonamiento, si aparece, no
// se cuele dentro del JSON de respuesta.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO_GROQ_RESPALDO = 'qwen/qwen3.6-27b';
const EXTRA_GROQ = { reasoning_format: 'hidden', reasoning_effort: 'none' } as const;

// Tiempo máximo de espera por ronda. Todo el presupuesto (las dos rondas de
// OpenRouter MÁS el respaldo de Groq) tiene que caber holgadamente en los 60 s
// que aguanta una función en el plan gratuito de Vercel, porque si se agota
// ese tiempo la usuaria no recibe ni un error claro: la petición se corta a
// medias.
const TIMEOUT_RONDA_MS = 12_000;
const TIMEOUT_RESPALDO_MS = 15_000;
const TIMEOUT_RONDA_GENERACION_MS = 15_000;
const TIMEOUT_RESPALDO_GENERACION_MS = 20_000;

// Groq, a diferencia de OpenRouter, limita también por TOKENS POR MINUTO
// (verificado en vivo: 8000 TPM en esta cuenta para qwen3.6-27b) y esa cuenta
// suma el texto de entrada MÁS el `max_tokens` pedido, no lo que de verdad se
// gaste. Pedir los mismos 6000 de OpenRouter revienta ese límite en cuanto el
// CV y la oferta ocupan su sitio. Se pide bastante menos aquí — de sobra para
// los mínimos de validarGeneracion, con margen para el texto de entrada.
const MAX_TOKENS_RESPALDO_POR_DEFECTO = 1_200;
const MAX_TOKENS_RESPALDO_GENERACION = 2_500;

type Mensaje = { role: 'system' | 'user'; content: string };

export type PerfilExtraido = {
  puesto: string;
  palabras_clave: string[];
  empresas_cv: string[];
  titulos_cv: string[];
};

const ESQUEMA_PERFIL = {
  name: 'perfil_extraido',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      puesto: { type: 'string' },
      palabras_clave: {
        type: 'array',
        // maxLength es un refuerzo, no la garantía: no todos los modelos
        // gratuitos de OpenRouter lo respetan. Quien garantiza la longitud es
        // normalizarPalabrasClave, más abajo, que es código nuestro.
        items: { type: 'string', maxLength: MAXIMO_CARACTERES },
        minItems: 8,
        maxItems: 20,
      },
      empresas_cv: { type: 'array', items: { type: 'string' } },
      titulos_cv: { type: 'array', items: { type: 'string' } },
    },
    required: ['puesto', 'palabras_clave', 'empresas_cv', 'titulos_cv'],
    additionalProperties: false,
  },
};

type Esquema = { name: string; strict: boolean; schema: object };

async function llamarModelo(
  proveedor: { nombre: string; url: string; apiKey: string | undefined; extra?: Record<string, unknown> },
  modelo: string,
  mensajes: Mensaje[],
  esquema: Esquema,
  maxTokens: number | undefined,
  senal: AbortSignal,
): Promise<string> {
  const respuesta = await fetch(proveedor.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${proveedor.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensajes,
      response_format: { type: 'json_schema', json_schema: esquema },
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...proveedor.extra,
    }),
    signal: senal,
  });

  if (!respuesta.ok) {
    throw new Error(`${proveedor.nombre} (${modelo}) respondió ${respuesta.status}: ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  const contenido = datos.choices?.[0]?.message?.content;
  if (typeof contenido !== 'string' || contenido.trim().length === 0) {
    throw new Error(`${proveedor.nombre} (${modelo}) devolvió una respuesta vacía`);
  }
  return contenido;
}

const PROVEEDOR_OPENROUTER = {
  nombre: 'OpenRouter',
  url: OPENROUTER_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
};

const PROVEEDOR_GROQ = {
  nombre: 'Groq',
  url: GROQ_URL,
  apiKey: process.env.GROQ_API_KEY,
  extra: EXTRA_GROQ as Record<string, unknown>,
};

// Recorre las rondas de RONDAS_MODELOS hasta que un modelo responda bien.
// Dentro de cada ronda gana el primero que conteste (Promise.any) y los demás
// se cancelan en el acto para no seguir gastando cuota.
async function llamarAlModelo(
  mensajes: Mensaje[],
  esquema: Esquema,
  opciones: {
    timeoutMs?: number;
    timeoutRespaldoMs?: number;
    maxTokens?: number;
    maxTokensRespaldo?: number;
  } = {},
): Promise<string> {
  const {
    timeoutMs = TIMEOUT_RONDA_MS,
    timeoutRespaldoMs = TIMEOUT_RESPALDO_MS,
    maxTokens,
    maxTokensRespaldo = MAX_TOKENS_RESPALDO_POR_DEFECTO,
  } = opciones;
  const fallos: unknown[] = [];

  for (const ronda of RONDAS_MODELOS) {
    const controladores = ronda.map(() => new AbortController());
    const intentos = ronda.map((modelo, i) =>
      llamarModelo(
        PROVEEDOR_OPENROUTER,
        modelo,
        mensajes,
        esquema,
        maxTokens,
        AbortSignal.any([controladores[i].signal, AbortSignal.timeout(timeoutMs)]),
      ),
    );

    try {
      const resultado = await Promise.any(intentos);
      controladores.forEach((controlador) => controlador.abort());
      return resultado;
    } catch (error) {
      controladores.forEach((controlador) => controlador.abort());
      fallos.push(...(error instanceof AggregateError ? error.errors : [error]));
    }
  }

  // Las dos rondas de OpenRouter han fallado — lo más probable, verificado en
  // vivo el 19/08/2026, es que la cuenta haya agotado su cupo gratis del día
  // (compartido entre los 5 modelos), no que estén saturados uno a uno. Groq
  // tiene un cupo propio e independiente: se prueba como último recurso antes
  // de darse por vencido.
  try {
    const controlador = new AbortController();
    const resultado = await llamarModelo(
      PROVEEDOR_GROQ,
      MODELO_GROQ_RESPALDO,
      mensajes,
      esquema,
      maxTokensRespaldo,
      AbortSignal.any([controlador.signal, AbortSignal.timeout(timeoutRespaldoMs)]),
    );
    return resultado;
  } catch (error) {
    fallos.push(error);
  }

  throw new Error(`No se pudo completar la llamada a la IA: ningún modelo respondió. ${fallos.join(' | ')}`);
}

// La API no garantiza el esquema en modo no-estricto salvo con modelos
// gpt-oss (descartados, docs/05-ia.md §6.4 nota), así que se valida en
// código de todas formas.
function validarPerfil(perfil: unknown): PerfilExtraido {
  if (typeof perfil !== 'object' || perfil === null) {
    throw new Error('La IA no devolvió un objeto de perfil válido');
  }

  const { puesto, palabras_clave, empresas_cv, titulos_cv } = perfil as Record<string, unknown>;

  if (typeof puesto !== 'string' || puesto.trim().length === 0) {
    throw new Error('La IA no devolvió un puesto válido');
  }

  const listaTexto = (valor: unknown): string[] =>
    Array.isArray(valor)
      ? valor.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
      : [];

  // Aquí se recorta al núcleo lo que venga largo: "gestión de equipos
  // multidisciplinares en entorno internacional" → "gestión de equipos"
  // (docs/05-ia.md §6.3, defensa 3). Sin esto, esas entradas son palabras
  // clave muertas: no encuentran ninguna oferta.
  const palabrasClave = normalizarPalabrasClave(listaTexto(palabras_clave));
  if (palabrasClave.length === 0) {
    throw new Error('La IA no devolvió palabras clave válidas');
  }

  return {
    puesto: puesto.trim(),
    palabras_clave: palabrasClave,
    empresas_cv: listaTexto(empresas_cv),
    titulos_cv: listaTexto(titulos_cv),
  };
}

// §2.1 de docs/05-ia.md: lee el CV pegado, propone puesto + palabras clave,
// y guarda de paso empresas/titulaciones para la verificación posterior
// (docs/05-ia.md §6.2, punto 3). La salida siempre es en español — la app
// entera vive en castellano (CLAUDE.md), así que se le quita la decisión
// del idioma al modelo, aunque el CV esté en otro idioma (docs/05-ia.md §6.5).
export async function extraerPerfil(cvTexto: string): Promise<PerfilExtraido> {
  const mensajes: Mensaje[] = [
    {
      role: 'system',
      content:
        'Lees un CV en texto libre, de cualquier sector y en cualquier idioma, y ' +
        'extraes: el puesto principal al que aspira la persona; entre 8 y 20 palabras ' +
        'clave de búsqueda de empleo; la lista de empresas donde ha trabajado; y la ' +
        'lista de titulaciones que menciona.\n\n' +
        'Las palabras clave son la parte delicada. Cada una es un TÉRMINO DE BÚSQUEDA, ' +
        'de los que se teclean en el buscador de un portal de empleo (LinkedIn, ' +
        'InfoJobs), no una descripción de lo que la persona sabe hacer:\n' +
        '- De 1 a 3 palabras. Nunca una frase.\n' +
        '- Sustantivos concretos: herramientas, tecnologías, metodologías, sectores, ' +
        'nombres de puesto, especialidades. Sin verbos ni relleno.\n' +
        '- Nada de habilidades blandas ("trabajo en equipo", "proactividad") ni de ' +
        'coletillas ("experiencia en", "conocimientos de", "capacidad de").\n' +
        '- BIEN: "Python", "Customer Success", "SAP", "atención al cliente", ' +
        '"Google Ads", "enfermería geriátrica", "comercio exterior".\n' +
        '- MAL: "gestión de equipos multidisciplinares en entorno internacional", ' +
        '"capacidad de análisis y resolución de problemas", "experiencia en atención ' +
        'al cliente", "trabajo en equipo".\n' +
        '- Puedes añadir el sinónimo con el que ese mismo término aparece en los ' +
        'anuncios (a menudo en inglés), siempre que también quepa en 3 palabras.\n' +
        '- Todas respaldadas por el CV. No inventes nada que no esté en el texto.\n\n' +
        'Responde SIEMPRE en español (castellano), sin importar en qué idioma esté ' +
        'escrito el CV original.',
    },
    { role: 'user', content: cvTexto },
  ];

  const contenido = await llamarAlModelo(mensajes, ESQUEMA_PERFIL);
  return validarPerfil(JSON.parse(contenido));
}

// ---------------------------------------------------------------------------
// §2.2 de docs/05-ia.md: el CV y la carta adaptados a una oferta concreta.
// Una sola llamada para los dos documentos, no dos (docs/05-ia.md §3,
// tentación 2): así no se contradicen entre sí y se gasta la mitad.
// ---------------------------------------------------------------------------

// T48 · El esquema de salida. Es la defensa 2 de docs/05-ia.md §6.1
// ("encajonar la salida"): en vez de pedirle al modelo que separe el CV de la
// carta con marcadores de texto —lo que falla en el workflow de n8n actual,
// §6.4— se le da un formulario con dos casillas y no hay nada que separar.
const ESQUEMA_GENERACION = {
  name: 'cv_y_carta',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      puesto: { type: 'string', maxLength: 80 },
      cv_texto: { type: 'string' },
      carta_texto: { type: 'string' },
    },
    required: ['puesto', 'cv_texto', 'carta_texto'],
    additionalProperties: false,
  },
};

export type Generacion = {
  puesto: string;
  cv_texto: string;
  carta_texto: string;
  idioma: Idioma;
};

// Límites de longitud, en caracteres (docs/05-ia.md §6.6, fallo 5: "devuelve
// un texto vacío o demasiado corto"). El mínimo caza medio CV o una respuesta
// truncada; el máximo, una generación desbocada que se ha puesto a inventar.
const LARGO_MINIMO_CV = 400;
const LARGO_MAXIMO_CV = 20_000;
const LARGO_MINIMO_CARTA = 200;
const LARGO_MAXIMO_CARTA = 8_000;

// Tope de texto que se le manda de cada pieza. Una descripción de oferta
// puede venir con toda la web de la empresa pegada dentro; recortarla evita
// pagar (en tiempo y en cuota) por texto que no aporta.
const MAXIMO_CARACTERES_CV = 12_000;
const MAXIMO_CARACTERES_OFERTA = 8_000;

// Mínimo de líneas con contenido (docs/05-ia.md §6.6): algunos modelos, pese
// a que el prompt pide un salto de línea real entre título/punto/párrafo,
// devuelven el texto entero en una sola línea con guiones pegados
// ("PERFIL- Nombre: X- Titular: Y-EXPERIENCIA-..."). El resultado es legible
// para la IA pero ilegible para una persona: sin líneas propias no hay forma
// de distinguir secciones ni puntos al dibujar el PDF (lib/pdf.tsx). Se
// rechaza aquí para que se reintente con otro modelo, igual que un texto
// demasiado corto.
const LINEAS_MINIMAS_CV = 6;
const LINEAS_MINIMAS_CARTA = 3;

function lineasConContenido(texto: string): number {
  return texto.split('\n').filter((linea) => linea.trim().length > 0).length;
}

// Defensa en código, no solo en el prompt (docs/05-ia.md §6.1): verificado en
// vivo el 19/08/2026, el modelo de respaldo de Groq (qwen3.6-27b) ignora la
// instrucción de un salto de línea real por punto y devuelve todos los
// puntos de un bloque pegados en una sola línea, separados por "•" en vez de
// saltos de línea. `agruparLineas` (lib/pdf.tsx) solo reconoce un punto de
// lista si empieza la línea con "- ": sin esto, el bloque entero se dibuja
// como un párrafo corrido en vez de una lista, y el PDF pierde el diseño
// original. Aquí se reparte cada "•" en su propia línea con "- " delante —
// lo que venga antes del primer "•" (el puesto, la empresa, las fechas) se
// deja como estaba, en su propia línea.
function normalizarPuntos(texto: string): string {
  return texto
    .split('\n')
    .flatMap((linea) => {
      if (!linea.includes('•')) return [linea];

      const partes = linea
        .split('•')
        .map((parte) => parte.trim())
        .filter((parte) => parte.length > 0);
      if (partes.length === 0) return [linea];

      if (linea.trim().startsWith('•')) {
        return partes.map((parte) => `- ${parte}`);
      }
      const [cabecera, ...puntos] = partes;
      return [cabecera, ...puntos.map((punto) => `- ${punto}`)];
    })
    .join('\n');
}

function validarGeneracion(datos: unknown): { puesto: string; cv_texto: string; carta_texto: string } {
  if (typeof datos !== 'object' || datos === null) {
    throw new Error('La IA no devolvió un objeto con el CV y la carta');
  }

  const { puesto, cv_texto, carta_texto } = datos as Record<string, unknown>;

  if (typeof puesto !== 'string' || puesto.trim().length === 0) {
    throw new Error('La IA no devolvió un titular de puesto válido');
  }
  if (typeof cv_texto !== 'string' || typeof carta_texto !== 'string') {
    throw new Error('La IA no devolvió los dos textos esperados');
  }

  const cv = normalizarPuntos(cv_texto.trim());
  const carta = normalizarPuntos(carta_texto.trim());

  if (cv.length < LARGO_MINIMO_CV) {
    throw new Error(`El CV generado es demasiado corto (${cv.length} caracteres)`);
  }
  if (cv.length > LARGO_MAXIMO_CV) {
    throw new Error(`El CV generado es desproporcionado (${cv.length} caracteres)`);
  }
  if (carta.length < LARGO_MINIMO_CARTA) {
    throw new Error(`La carta generada es demasiado corta (${carta.length} caracteres)`);
  }
  if (carta.length > LARGO_MAXIMO_CARTA) {
    throw new Error(`La carta generada es desproporcionada (${carta.length} caracteres)`);
  }
  if (lineasConContenido(cv) < LINEAS_MINIMAS_CV) {
    throw new Error('El CV generado no tiene saltos de línea reales entre secciones y puntos');
  }
  if (lineasConContenido(carta) < LINEAS_MINIMAS_CARTA) {
    throw new Error('La carta generada no tiene saltos de línea reales entre párrafos');
  }

  return { puesto: puesto.trim(), cv_texto: cv, carta_texto: carta };
}

export type OfertaParaGenerar = {
  titulo: string;
  empresa: string;
  descripcion: string | null;
};

// T50 · El prompt. La instrucción clave es la primera y es un cambio de
// encargo, no un ruego (defensa 1 de docs/05-ia.md §6.1): se le pide
// **reordenar y reformular** lo que ya hay en el CV, no "redactar un CV para
// esta oferta". Adaptar, no crear. Es la diferencia entre pedirle a alguien
// que subraye lo importante de un texto y pedirle que escriba uno nuevo.
function mensajesDeGeneracion(
  cvTexto: string,
  puestoPerfil: string,
  oferta: OfertaParaGenerar,
  idioma: Idioma,
): Mensaje[] {
  return [
    {
      role: 'system',
      content:
        'Tu tarea es REORDENAR Y REFORMULAR la información del CV que se te da, ' +
        'para destacar lo que resulta relevante para una oferta de empleo concreta, ' +
        'y escribir además una carta de presentación breve para esa misma oferta. ' +
        'NO redactas un CV nuevo: adaptas el que ya existe.\n\n' +
        'Reglas estrictas:\n' +
        '- Usa ÚNICAMENTE información presente en el CV original. No inventes ' +
        'empresas, fechas, cifras, porcentajes, tamaños de equipo, tecnologías, ' +
        'herramientas, certificaciones ni titulaciones.\n' +
        '- Si la oferta pide algo que el CV no menciona, NO lo añadas: no lo tiene.\n' +
        '- Puedes reordenar la experiencia, resumirla, cambiar el énfasis y ' +
        'reformular las frases con el vocabulario de la oferta, siempre que lo que ' +
        'digas siga estando respaldado por el CV original.\n' +
        `- Escribe TODO — el titular, el CV y la carta, sin excepción — en ` +
        `${NOMBRE_IDIOMA[idioma]}, sea cual sea el idioma del CV original o del ` +
        'titular de partida. Esto no es negociable ni tienes que decidirlo tú. Un ' +
        'documento que mezcle los dos idiomas está mal hecho.\n' +
        '- "puesto": traduce/adapta el titular de partida (más abajo, "TITULAR ' +
        `ACTUAL DEL PERFIL") a ${NOMBRE_IDIOMA[idioma]}, corto (2 a 6 palabras), ` +
        'sin inventar un cargo distinto — es el mismo titular, en el idioma correcto ' +
        'y con el vocabulario de la oferta si encaja de forma natural.\n' +
        '- FORMATO DEL CV, obligatorio: texto plano, organizado en secciones. Cada ' +
        'título de sección va en MAYÚSCULAS en su PROPIA línea. Cada punto de una ' +
        'lista empieza por "- " y va TAMBIÉN en su propia línea — nunca dos puntos, ' +
        'ni un punto y un título, pegados en la misma línea o separados solo por un ' +
        'guion. Cada elemento nuevo (título, punto, párrafo) empieza tras un salto de ' +
        'línea real, no tras un espacio. Nada de markdown, tablas ni asteriscos.\n' +
        '- EL CV NO EMPIEZA POR EL NOMBRE NI LOS DATOS DE CONTACTO: esta información ' +
        'ya se muestra aparte, encima del documento. Empieza directamente por la ' +
        'primera sección de contenido (perfil profesional, experiencia, etc.). No ' +
        'escribas el nombre, email, teléfono, LinkedIn ni ubicación en ningún punto ' +
        'del CV.\n' +
        '- La carta ocupa entre 200 y 300 palabras, va dirigida a la empresa de la ' +
        'oferta, y no repite el CV entero: explica por qué encaja. Se organiza en ' +
        'varios párrafos cortos (saludo, cuerpo, despedida), cada uno separado del ' +
        'siguiente por una línea en blanco — nunca todo seguido en un único bloque.\n' +
        '- No escribas datos de contacto que no estén en el CV original, ni ' +
        'marcadores del tipo "[tu nombre]" o "[fecha]".',
    },
    {
      role: 'user',
      content:
        `=== OFERTA ===\nPuesto: ${oferta.titulo}\nEmpresa: ${oferta.empresa}\n\n` +
        `${(oferta.descripcion ?? '(sin descripción; usa el puesto y la empresa)').slice(0, MAXIMO_CARACTERES_OFERTA)}\n\n` +
        `=== TITULAR ACTUAL DEL PERFIL ===\n${puestoPerfil || '(sin titular; deduce uno corto del CV)'}\n\n` +
        `=== CV ORIGINAL ===\n${cvTexto.slice(0, MAXIMO_CARACTERES_CV)}`,
    },
  ];
}

// Una llamada, dos rondas de modelos. Los reintentos con espera creciente que
// pide docs/05-ia.md §6.7 NO se hacen aquí dentro, sino desde la pantalla
// (components/TarjetaOferta.tsx): una función de Vercel se corta a los 60
// segundos, así que reintentar dentro de la misma petición solo conseguiría
// que se cortara a media faena y la usuaria no viera ni un error decente.
// Reintentando desde el navegador, cada intento es una petición nueva con su
// minuto entero, y de paso se espera entre uno y otro a que el proveedor
// saturado se despeje.
export async function generarCvYCarta(
  cvTexto: string,
  puestoPerfil: string,
  oferta: OfertaParaGenerar,
): Promise<Generacion> {
  // El idioma se decide aquí dentro, con código, para que ningún sitio que
  // llame a esta función pueda olvidarse de decidirlo (docs/05-ia.md §6.5).
  const idioma = detectarIdioma(`${oferta.titulo}\n${oferta.descripcion ?? ''}`);
  const mensajes = mensajesDeGeneracion(cvTexto, puestoPerfil, oferta, idioma);

  const contenido = await llamarAlModelo(mensajes, ESQUEMA_GENERACION, {
    timeoutMs: TIMEOUT_RONDA_GENERACION_MS,
    timeoutRespaldoMs: TIMEOUT_RESPALDO_GENERACION_MS,
    maxTokens: 6_000,
    maxTokensRespaldo: MAX_TOKENS_RESPALDO_GENERACION,
  });

  return { ...validarGeneracion(JSON.parse(contenido)), idioma };
}
