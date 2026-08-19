// Llamadas al modelo de IA, en un solo sitio (docs/04-plan-tecnico.md §3.3).
// Proveedor: OpenRouter, sin tarjeta. Ver knowledge/decision-modelo-ia.md
// para por qué no es Groq y por qué hay varios modelos en vez de uno fijo.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Lista de modelos gratis intercambiables: si uno se retira o se satura
// (429, "upstream_provider_shared_pool"), se prueba el siguiente. Orden de
// preferencia, ver knowledge/decision-modelo-ia.md.
const MODELOS_IA = [
  'google/gemma-4-31b-it:free',
  'z-ai/glm-5.2:free',
  'nvidia/nemotron-nano-9b-v2:free',
] as const;

// Tiempo máximo de espera de una llamada antes de darla por perdida. Generoso
// a propósito: cuando los modelos rápidos de la lista están saturados (429
// "upstream_provider_shared_pool", común en la capa gratuita compartida de
// OpenRouter), el único que queda es el modelo "razonador" de último recurso
// (knowledge/decision-modelo-ia.md), que tarda más por diseño — mejor
// esperarlo que fallar del todo.
const TIMEOUT_MS = 45_000;

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
        items: { type: 'string' },
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

async function llamarModelo(
  modelo: string,
  mensajes: Mensaje[],
  esquema: { name: string; strict: boolean; schema: object },
  senal: AbortSignal,
): Promise<string> {
  const respuesta = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensajes,
      response_format: { type: 'json_schema', json_schema: esquema },
    }),
    signal: senal,
  });

  if (!respuesta.ok) {
    throw new Error(`OpenRouter (${modelo}) respondió ${respuesta.status}: ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  const contenido = datos.choices?.[0]?.message?.content;
  if (typeof contenido !== 'string' || contenido.trim().length === 0) {
    throw new Error(`OpenRouter (${modelo}) devolvió una respuesta vacía`);
  }
  return contenido;
}

// Lanza los modelos EN PARALELO y se queda con el primero que responda con
// éxito (Promise.any), en vez de probarlos uno detrás de otro: probarlos en
// serie suma sus tiempos (con timeouts reales de 20-30s por modelo, la suma
// se dispara a más de un minuto o falla del todo); en paralelo, el tiempo lo
// marca el más rápido de los que respondan bien. Los demás se cancelan en
// cuanto hay un ganador — gasta algo más de cuota gratuita, pero el volumen
// de esta app es bajo (docs/05-ia.md §5) y la cuota es gratis.
async function llamarConReintentos(
  mensajes: Mensaje[],
  esquema: { name: string; strict: boolean; schema: object },
): Promise<string> {
  const controladores = MODELOS_IA.map(() => new AbortController());

  const intentos = MODELOS_IA.map((modelo, i) =>
    llamarModelo(modelo, mensajes, esquema, AbortSignal.any([controladores[i].signal, AbortSignal.timeout(TIMEOUT_MS)])),
  );

  try {
    const resultado = await Promise.any(intentos);
    controladores.forEach((controlador) => controlador.abort());
    return resultado;
  } catch (error) {
    const detalle = error instanceof AggregateError ? error.errors.join(' | ') : error;
    throw new Error(`No se pudo completar la llamada a la IA: ningún modelo respondió. ${detalle}`);
  }
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

  const palabrasClave = Array.from(new Set(listaTexto(palabras_clave)));
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
        'Lees un CV en texto libre, de cualquier sector y en cualquier idioma, y extraes: ' +
        'el puesto principal al que aspira la persona; entre 8 y 20 palabras clave ' +
        'tal como aparecerían en un anuncio de empleo (herramientas, tecnologías, ' +
        'funciones, sectores y habilidades duras concretas que aparezcan en el CV — ' +
        'sé exhaustiva explorando variantes y sinónimos habituales de lo que ya está en ' +
        'el texto, pero nada de habilidades blandas genéricas como "trabajo en equipo", ' +
        'y nada que no esté respaldado por el CV); la lista de empresas donde ha ' +
        'trabajado; y la lista de titulaciones que menciona. ' +
        'No inventes nada que no esté en el texto del CV. ' +
        'Responde SIEMPRE en español (castellano), sin importar en qué idioma esté ' +
        'escrito el CV original.',
    },
    { role: 'user', content: cvTexto },
  ];

  const contenido = await llamarConReintentos(mensajes, ESQUEMA_PERFIL);
  return validarPerfil(JSON.parse(contenido));
}
