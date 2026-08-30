import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extraerPerfil, generarCvYCarta } from '@/lib/ia';

// T119 (27/08/2026) · La generación manda a Cloudflare una secuencia de parada
// (`stop`) para cortar el bucle de basura antes de que agote el techo de
// tokens. Ver PARADAS_CLOUDFLARE_GENERACION en lib/ia.ts para la medición.
//
// Lo que se fija aquí es lo que se midió y no puede cambiar por descuido:
//
// 1. Que la parada se manda de verdad en el cuerpo de la petición. Sin esto,
//    el ahorro (133 → 70 neuronas, 36,5 → 11,2 s) desaparece en silencio: la
//    generación seguiría funcionando y nadie se enteraría de que cuesta el
//    doble.
// 2. Que la parada son TABULADORES y solo tabuladores. Añadir paradas basadas
//    en saltos de línea se probó en vivo y baja la tasa de acierto de 3/5 a
//    2/5, porque el modelo deja líneas en blanco DENTRO del documento y esas
//    paradas lo cortan por la mitad.
// 3. Que `extraerPerfil` no la lleva: ahí no se ha medido nada.

const CV_ORIGINAL = [
  'Marta Ruiz — Gestora de proyectos',
  'Experiencia: coordinación de equipos en Nubelo (2021-2024), con seguimiento',
  'de presupuesto y relación con cliente. Antes, analista junior en Pixelia.',
  'Formación: Grado en Administración de Empresas.',
  'Idiomas: español nativo, inglés B2.',
].join('\n');

const OFERTA = {
  titulo: 'Project Manager remoto',
  empresa: 'Finteca',
  descripcion: 'Buscamos gestora de proyectos con experiencia coordinando equipos.',
};

const CV_LINEAS = [
  'PERFIL PROFESIONAL',
  '- Gestora de proyectos con experiencia coordinando equipos y presupuestos.',
  'EXPERIENCIA',
  '- Nubelo (2021-2024): coordinación de equipos, seguimiento de presupuesto y relación con cliente.',
  '- Pixelia: analista junior, apoyo en la gestión de proyectos internos.',
  'FORMACIÓN',
  '- Grado en Administración de Empresas.',
  'IDIOMAS',
  '- Español nativo, inglés B2.',
];

const CARTA_PARRAFOS = [
  'Estimado equipo de Finteca:',
  'Me dirijo a ustedes por su oferta de Project Manager remoto. He coordinado equipos y presupuestos durante tres años en Nubelo, con seguimiento directo de la relación con cliente, y creo que ese recorrido encaja con lo que describen en el anuncio de la posición que han publicado.',
  'Antes de eso trabajé como analista junior en Pixelia, donde di apoyo a la gestión de proyectos internos. Mi formación en Administración de Empresas completa esa parte más cuantitativa del trabajo, y el inglés B2 me permite trabajar en entornos donde se usa a diario con soltura suficiente.',
  'Quedo a su disposición para ampliar cualquier punto en una entrevista.',
  'Un cordial saludo.',
];

function respuestaDelModelo(contenido: unknown): Response {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(contenido) } }],
      usage: { prompt_tokens: 900, completion_tokens: 420 },
    }),
  } as unknown as Response;
}

// Guarda el cuerpo de cada petición que sale hacia Cloudflare, que es lo que
// se quiere inspeccionar.
function espiarPeticiones(contenido: unknown): { cuerpos: Record<string, unknown>[] } {
  const cuerpos: Record<string, unknown>[] = [];
  globalThis.fetch = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    if (url.includes('api.cloudflare.com') && typeof init?.body === 'string') {
      cuerpos.push(JSON.parse(init.body));
    }
    return respuestaDelModelo(contenido);
  }) as unknown as typeof fetch;
  return { cuerpos };
}

let fetchOriginal: typeof globalThis.fetch;

beforeEach(() => {
  fetchOriginal = globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID ??= 'cuenta-de-prueba';
  process.env.CLOUDFLARE_API_TOKEN ??= 'token-de-prueba';
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  vi.restoreAllMocks();
});

describe('generarCvYCarta · secuencia de parada contra el bucle de basura', () => {
  it('manda una secuencia de parada a Cloudflare', async () => {
    const { cuerpos } = espiarPeticiones({
      puesto: 'Project Manager',
      cv_lineas: CV_LINEAS,
      carta_parrafos: CARTA_PARRAFOS,
    });

    await generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA);

    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0].stop).toEqual(['\t\t\t']);
  });

  it('para con tabuladores y nunca con saltos de línea', async () => {
    const { cuerpos } = espiarPeticiones({
      puesto: 'Project Manager',
      cv_lineas: CV_LINEAS,
      carta_parrafos: CARTA_PARRAFOS,
    });

    await generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA);

    const paradas = cuerpos[0].stop as string[];
    expect(paradas.length).toBeGreaterThan(0);
    for (const parada of paradas) {
      // Un salto de línea aquí corta el documento por la mitad: el modelo deja
      // líneas en blanco entre las secciones del CV. Medido, no supuesto.
      expect(parada).not.toContain('\n');
      expect(parada).toMatch(/^\t+$/);
      // Con menos de dos, cualquier tabulador suelto cortaría la generación.
      expect(parada.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('no corta un documento que se indenta con espacios', async () => {
    const { cuerpos } = espiarPeticiones({
      puesto: 'Project Manager',
      cv_lineas: CV_LINEAS,
      carta_parrafos: CARTA_PARRAFOS,
    });

    const generado = await generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA);

    // El documento que de verdad devuelve el modelo, tal y como viaja por el
    // cable: si alguna parada apareciera aquí dentro, la respuesta llegaría
    // truncada en producción.
    const documento = JSON.stringify({
      puesto: 'Project Manager',
      cv_lineas: CV_LINEAS,
      carta_parrafos: CARTA_PARRAFOS,
    }, null, 2);
    for (const parada of cuerpos[0].stop as string[]) {
      expect(documento).not.toContain(parada);
    }
    expect(generado.cv_texto).toBe(CV_LINEAS.join('\n'));
  });
});


describe('extraerPerfil · sin secuencia de parada', () => {
  it('no manda ninguna: ahí el bucle no se ha medido', async () => {
    const { cuerpos } = espiarPeticiones({
      puesto: 'Gestora de proyectos',
      palabras_clave: ['gestión de proyectos', 'coordinación de equipos'],
      puestos_sugeridos: ['Project Manager'],
      palabras_clave_sugeridas: ['scrum'],
    });

    await extraerPerfil(CV_ORIGINAL);

    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0].stop).toBeUndefined();
  });
});
