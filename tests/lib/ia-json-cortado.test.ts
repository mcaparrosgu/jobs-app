import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeContenido, generarCvYCarta, repararJsonCortado } from '@/lib/ia';

// T117 (26/08/2026) · El modelo deja el JSON sin cerrar y el documento entero
// se perdía.
//
// Medido sobre la respuesta cruda de Cloudflare: escribe la carta y el CV
// bien y completos, cierra `cv_lineas`... y a partir de ahí emite un salto de
// línea y dos espacios, una y otra vez, hasta agotar el techo de tokens. Nunca
// escribe el campo `puesto` ni la llave de cierre. `JSON.parse` a secas daba
// 0 de 5 casos; con esta reparación, 5 de 5.
//
// Detalle en `knowledge/medicion-t117-cierre-json.md`.

const COLA_DEL_BUCLE = '\n  '.repeat(120);

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

// Reproduce lo que devuelve Cloudflare de verdad: las claves en orden inverso
// al del esquema, sin `puesto`, sin la llave de cierre, y con la cola de
// espacio en blanco del bucle pegada al final.
function respuestaCortadaComoLaReal(): string {
  const carta = JSON.stringify(CARTA_PARRAFOS);
  const cv = JSON.stringify(CV_LINEAS);
  return `{ "carta_parrafos": ${carta},\n"cv_lineas": ${cv}${COLA_DEL_BUCLE}`;
}

describe('repararJsonCortado · recupera el documento que el modelo no cerró', () => {
  it('devuelve tal cual un JSON que sí está bien cerrado', () => {
    const entero = { puesto: 'Project Manager', cv_lineas: CV_LINEAS, carta_parrafos: CARTA_PARRAFOS };
    expect(repararJsonCortado(JSON.stringify(entero))).toEqual(entero);
  });

  it('recupera el CV y la carta de la respuesta cortada real, sin llave de cierre ni "puesto"', () => {
    const recuperado = repararJsonCortado(respuestaCortadaComoLaReal()) as Record<string, unknown>;

    expect(recuperado.cv_lineas).toEqual(CV_LINEAS);
    expect(recuperado.carta_parrafos).toEqual(CARTA_PARRAFOS);
    // La clave que el corte se lleva siempre: no está, y no pasa nada.
    expect(recuperado.puesto).toBeUndefined();
  });

  it('descarta el último elemento cuando el corte pilla una línea a medias', () => {
    const cortado = `{ "cv_lineas": ["EXPERIENCIA", "- Nubelo (2021-2024): coordinación de equi`;
    const recuperado = repararJsonCortado(cortado) as Record<string, unknown>;

    // Se queda con lo que estaba entero y tira el trozo a medias, en vez de
    // colar media frase en el documento de alguien.
    expect(recuperado.cv_lineas).toEqual(['EXPERIENCIA']);
  });

  it('no confunde un corchete que va dentro de una cadena con uno de la estructura', () => {
    const cortado = `{ "cv_lineas": ["- Referencias: [disponibles a petición]", "FORMACIÓN"`;
    const recuperado = repararJsonCortado(cortado) as Record<string, unknown>;

    expect(recuperado.cv_lineas).toEqual(['- Referencias: [disponibles a petición]', 'FORMACIÓN']);
  });

  it('rechaza lo que no es un JSON recuperable, en vez de inventarse un objeto', () => {
    expect(() => repararJsonCortado('Lo siento, no puedo ayudarte con eso.')).toThrow(ErrorDeContenido);
  });
});

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

describe('generarCvYCarta · con la respuesta cortada del proveedor', () => {
  it('entrega el documento igualmente, y pone el titular del perfil en el "puesto" que faltaba', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: respuestaCortadaComoLaReal() }, finish_reason: 'length' }],
        usage: { prompt_tokens: 1804, completion_tokens: 1500 },
      }),
    })) as unknown as typeof fetch;

    const generado = await generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA);

    expect(generado.cv_texto).toBe(CV_LINEAS.join('\n'));
    expect(generado.carta_texto).toBe(CARTA_PARRAFOS.join('\n'));
    // El titular no se inventa: es el que la propia usuaria tiene en su perfil.
    expect(generado.puesto).toBe('Gestora de proyectos');
  });

  it('sigue rechazando un documento que llegó cortado de verdad, no solo sin cerrar', async () => {
    // Aquí el corte no pilla el cierre: pilla el CV por la mitad. La
    // reparación recupera el objeto, y la validación de siempre lo tumba por
    // quedarse corto.
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: `{ "cv_lineas": ["PERFIL PROFESIONAL"${COLA_DEL_BUCLE}` } }],
        usage: { prompt_tokens: 1804, completion_tokens: 1500 },
      }),
    })) as unknown as typeof fetch;

    await expect(generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA)).rejects.toThrow();
  });
});
