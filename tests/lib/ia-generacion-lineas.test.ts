import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generarCvYCarta } from '@/lib/ia';

// T114 (26/08/2026) · El esquema de `generarCvYCarta` pide el CV y la carta
// como LISTAS (`cv_lineas`, `carta_parrafos`), no como texto con saltos de
// línea dentro, y es `validarGeneracion` quien las une con "\n".
//
// El motivo está medido: cuando se le pedía un string, el prompt tenía que
// insistirle al modelo en que metiera saltos de línea de verdad, y el modelo
// se pasaba al otro extremo y entraba en bucle generándolos — 3.089 líneas en
// un campo que debería tener quince, hasta agotar el techo de tokens y morir
// en un timeout. Pidiendo una lista, el modelo no escribe ni un salto de
// línea y ese fallo deja de ser posible.
//
// Estas pruebas cubren esa unión, que es la pieza nueva. El resto de la app
// no se entera del cambio: `generarCvYCarta` sigue devolviendo `cv_texto` y
// `carta_texto` como strings, igual que antes.

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

// Un CV y una carta que pasan los mínimos de `validarGeneracion` sin ser el
// objeto de la prueba: lo que se comprueba aquí es la FORMA, no la calidad.
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

describe('generarCvYCarta · el CV y la carta llegan como listas', () => {
  it('une las líneas del CV y los párrafos de la carta con saltos de línea', async () => {
    globalThis.fetch = vi.fn(async () =>
      respuestaDelModelo({ puesto: 'Project Manager', cv_lineas: CV_LINEAS, carta_parrafos: CARTA_PARRAFOS }),
    ) as unknown as typeof fetch;

    const generado = await generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA);

    expect(generado.cv_texto).toBe(CV_LINEAS.join('\n'));
    expect(generado.carta_texto).toBe(CARTA_PARRAFOS.join('\n'));
    // Lo que de verdad importaba: el CV ya no puede venir en una sola línea.
    expect(generado.cv_texto.split('\n').length).toBeGreaterThan(1);
  });

  it('descarta los elementos vacíos en vez de dejar líneas en blanco', async () => {
    globalThis.fetch = vi.fn(async () =>
      respuestaDelModelo({
        puesto: 'Project Manager',
        // Un modelo que mete elementos vacíos está pidiendo separación
        // visual, y esa la pone el formato del PDF, no el contenido.
        cv_lineas: [CV_LINEAS[0], '', '   ', ...CV_LINEAS.slice(1)],
        carta_parrafos: ['', ...CARTA_PARRAFOS],
      }),
    ) as unknown as typeof fetch;

    const generado = await generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA);

    expect(generado.cv_texto).toBe(CV_LINEAS.join('\n'));
    expect(generado.cv_texto).not.toMatch(/\n\s*\n/);
  });

  it('rechaza una respuesta que trae el CV como texto suelto en vez de lista', async () => {
    globalThis.fetch = vi.fn(async () =>
      respuestaDelModelo({
        puesto: 'Project Manager',
        cv_lineas: CV_LINEAS.join('\n'),
        carta_parrafos: CARTA_PARRAFOS,
      }),
    ) as unknown as typeof fetch;

    await expect(generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA)).rejects.toThrow(
      /lista de líneas/i,
    );
  });

  it('rechaza un CV troceado en muy pocas líneas', async () => {
    globalThis.fetch = vi.fn(async () =>
      respuestaDelModelo({
        puesto: 'Project Manager',
        // Todo el contenido en un solo elemento: pasa los mínimos de longitud
        // pero no está troceado en secciones y puntos.
        cv_lineas: [CV_LINEAS.join(' ')],
        carta_parrafos: CARTA_PARRAFOS,
      }),
    ) as unknown as typeof fetch;

    await expect(generarCvYCarta(CV_ORIGINAL, 'Gestora de proyectos', OFERTA)).rejects.toThrow(
      /muy pocas líneas/i,
    );
  });
});
