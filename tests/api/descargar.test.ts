import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@react-pdf/renderer', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@react-pdf/renderer')>();
  return { ...real, renderToBuffer: vi.fn(async () => Buffer.from('%PDF-falso')) };
});

import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { GET } from '@/app/api/descargar/[id]/route';

function contexto(id: string) {
  return { params: Promise.resolve({ id }) };
}

const GENERACION_LISTA = {
  estado: 'listo',
  puesto_texto: 'Project Manager',
  cv_texto: 'PERFIL\n- Contenido del CV.',
  carta_texto: 'Estimados señores,\n\nCarta.\n\nAtentamente.',
  ofertas: { titulo: 'Project Manager en Acme', descripcion: 'Buscamos un PM en remoto.' },
};

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(renderToBuffer).mockClear();
});

describe('GET /api/descargar/[id] — sesión y permisos', () => {
  it('devuelve 401 sin sesión', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(401);
  });

  it('la consulta de la generación va filtrada por user_id y por la oferta pedida', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: GENERACION_LISTA, error: null }],
        perfiles: [{ data: { nombre: 'Ana', puestos: ['PM'] }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    const filtros = llamadasPorTabla.generaciones[0].filter((l) => l.metodo === 'eq');
    expect(filtros).toEqual([
      { metodo: 'eq', args: ['user_id', USUARIA.id] },
      { metodo: 'eq', args: ['oferta_id', 'oferta-1'] },
    ]);
  });

  it('no permite descargar la generación de otra usuaria (aislamiento): la consulta nunca ignora el user_id', async () => {
    // Aunque alguien intente pedir el id de la oferta de otra persona, la
    // consulta real (RLS + este .eq) siempre incluye el user_id de la sesión
    // activa; aquí comprobamos que el código nunca omite ese filtro.
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { generaciones: [{ data: null, error: null }], perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET(new Request('http://localhost/api/descargar/oferta-ajena'), contexto('oferta-ajena'));

    const eqUserId = llamadasPorTabla.generaciones[0].find(
      (l) => l.metodo === 'eq' && l.args[0] === 'user_id',
    );
    expect(eqUserId?.args).toEqual(['user_id', USUARIA.id]);
  });
});

describe('GET /api/descargar/[id] — casos límite (C4)', () => {
  it('devuelve 500 si falla la consulta', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: null, error: new Error('conexión perdida') }],
        perfiles: [{ data: null, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(500);
  });

  it('devuelve 404 si no existe ninguna generación para esa oferta', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { generaciones: [{ data: null, error: null }], perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(404);
  });

  it('devuelve 404 mientras el documento todavía se está generando (botón desactivado)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: { ...GENERACION_LISTA, estado: 'generando' }, error: null }],
        perfiles: [{ data: null, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(404);
    expect(renderToBuffer).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el estado es "listo" pero falta el texto del CV o la carta (dato corrupto)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: { ...GENERACION_LISTA, cv_texto: null }, error: null }],
        perfiles: [{ data: null, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(404);
  });
});

describe('GET /api/descargar/[id] — descarga (C4)', () => {
  it('devuelve el PDF con las cabeceras correctas cuando el documento está listo', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: GENERACION_LISTA, error: null }],
        perfiles: [{ data: { nombre: 'Ana García', puestos: ['PM'] }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('Content-Type')).toBe('application/pdf');
    expect(respuesta.headers.get('Content-Disposition')).toContain('attachment');
    expect(respuesta.headers.get('Content-Disposition')).toContain('Project%20Manager%20en%20Acme');
  });

  it('quita del nombre de archivo los caracteres que rompen un sistema de archivos', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: { ...GENERACION_LISTA, ofertas: { titulo: 'PM: Backend/Frontend "Senior"?', descripcion: '' } }, error: null },
        ],
        perfiles: [{ data: { nombre: 'Ana', puestos: ['PM'] }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));
    const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
    const nombreCodificado = disposicion.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? '';
    const nombreReal = decodeURIComponent(nombreCodificado);

    expect(nombreReal).not.toMatch(/[\\/:*?"<>|]/);
  });

  it('usa un nombre de archivo genérico cuando la oferta no tiene título', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: { ...GENERACION_LISTA, ofertas: null }, error: null }],
        perfiles: [{ data: { nombre: 'Ana', puestos: ['PM'] }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET(new Request('http://localhost/api/descargar/oferta-1'), contexto('oferta-1'));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('Content-Disposition')).toContain('CV%20y%20carta');
  });
});
