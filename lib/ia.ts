// Llamadas al modelo de IA, en un solo sitio (docs/04-plan-tecnico.md §3.3).
// Proveedor: OpenRouter, sin tarjeta. Ver knowledge/decision-modelo-ia.md
// para por qué no es Groq y por qué hay varios modelos en vez de uno fijo.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Lista de modelos gratis intercambiables: si uno se retira o se satura
// (429, "upstream_provider_shared_pool"), se prueba el siguiente antes de
// darse por vencido. Orden de preferencia, ver knowledge/decision-modelo-ia.md.
const MODELOS_IA = [
  'google/gemma-4-31b-it:free',
  'z-ai/glm-5.2:free',
  'nvidia/nemotron-nano-9b-v2:free',
] as const;

// Espera creciente entre reintentos del mismo modelo (docs/05-ia.md §6.7).
const ESPERAS_MS = [1000, 3000, 6000];

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
        minItems: 5,
        maxItems: 10,
      },
      empresas_cv: { type: 'array', items: { type: 'string' } },
      titulos_cv: { type: 'array', items: { type: 'string' } },
    },
    required: ['puesto', 'palabras_clave', 'empresas_cv', 'titulos_cv'],
    additionalProperties: false,
  },
};

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function llamarModelo(
  modelo: string,
  mensajes: Mensaje[],
  esquema: { name: string; strict: boolean; schema: object },
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

// Prueba cada modelo de la lista, con reintento de espera creciente dentro
// de cada uno, antes de pasar al siguiente (docs/05-ia.md §6.7).
async function llamarConReintentos(
  mensajes: Mensaje[],
  esquema: { name: string; strict: boolean; schema: object },
): Promise<string> {
  let ultimoError: unknown;

  for (const modelo of MODELOS_IA) {
    for (let intento = 0; intento < ESPERAS_MS.length; intento++) {
      try {
        return await llamarModelo(modelo, mensajes, esquema);
      } catch (error) {
        ultimoError = error;
        await esperar(ESPERAS_MS[intento]);
      }
    }
  }

  throw new Error(
    `No se pudo completar la llamada a la IA tras probar todos los modelos disponibles. Último error: ${ultimoError}`,
  );
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
// (docs/05-ia.md §6.2, punto 3).
export async function extraerPerfil(cvTexto: string): Promise<PerfilExtraido> {
  const mensajes: Mensaje[] = [
    {
      role: 'system',
      content:
        'Lees un CV en texto libre, de cualquier sector, y extraes: ' +
        'el puesto principal al que aspira la persona; entre 5 y 10 palabras clave ' +
        'tal como aparecerían en un anuncio de empleo (nada de habilidades blandas ' +
        'ni palabras genéricas como "trabajo en equipo"); la lista de empresas donde ' +
        'ha trabajado; y la lista de titulaciones que menciona. ' +
        'No inventes nada que no esté en el texto del CV.',
    },
    { role: 'user', content: cvTexto },
  ];

  const contenido = await llamarConReintentos(mensajes, ESQUEMA_PERFIL);
  return validarPerfil(JSON.parse(contenido));
}
