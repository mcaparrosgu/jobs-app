import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';
import { MENSAJE_LIMITE } from '@/lib/generaciones';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ia', () => ({ generarCvYCarta: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { generarCvYCarta } from '@/lib/ia';
import { POST } from '@/app/api/generar/route';

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/generar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

const CV_ORIGINAL = 'Trabajé como gestora de proyectos en varias empresas del sector durante 5 años.';

const GENERACION_IA_OK = {
  puesto: 'Project Manager',
  cv_texto: 'PERFIL\n- Gestora de proyectos con experiencia en el sector.\nEXPERIENCIA\n- Coordiné equipos.',
  carta_texto: 'Estimados señores,\n\nEscribo para presentar mi candidatura a este puesto.\n\nAtentamente.',
  idioma: 'es' as const,
};

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(generarCvYCarta).mockReset();
});

describe('POST /api/generar — sesión y validación', () => {
  it('devuelve 401 sin sesión', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(401);
  });

  it('devuelve 400 si falta oferta_id', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({}));

    expect(respuesta.status).toBe(400);
  });

  it('devuelve 500 si falla la lectura de la generación existente', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { generaciones: [{ data: null, error: new Error('conexión perdida') }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(500);
  });
});

describe('POST /api/generar — regla de negocio 7: un CV generado es definitivo', () => {
  it('si ya está "listo", no vuelve a generarlo: lo devuelve tal cual', async () => {
    const { cliente, llamadasFrom } = crearClienteFalso({
      user: USUARIA,
      tablas: { generaciones: [{ data: { id: 'g1', estado: 'listo', iniciado_en: null }, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(cuerpo).toEqual({ estado: 'listo' });
    expect(generarCvYCarta).not.toHaveBeenCalled();
    // No hace falta ni mirar el cupo: se corta antes.
    expect(llamadasFrom.filter((t) => t === 'generaciones').length).toBe(1);
  });
});

describe('POST /api/generar — límite diario (G1 / regla de negocio 5)', () => {
  it('bloquea con 429 cuando no había fila y el cupo ya está lleno', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null }, // no existía generación
          { count: 5, error: null }, // cupo lleno
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(429);
    expect(cuerpo).toEqual({ estado: 'limite', error: MENSAJE_LIMITE });
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });

  it('devuelve 500 si falla el conteo del cupo diario', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: null, error: new Error('conexión perdida') },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(500);
  });
});

describe('POST /api/generar — concurrencia (varias ofertas casi a la vez)', () => {
  it('si otra petición ya está preparando la misma oferta, responde enCurso sin duplicar trabajo', async () => {
    const errorDuplicado = Object.assign(new Error('duplicado'), { code: '23505' });
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null }, // no existía generación (según esta petición)
          { count: 0, error: null }, // cupo libre
          { data: null, error: errorDuplicado }, // el insert choca: otra petición ya la creó
          { data: null, error: null }, // el update para tomar turno no encuentra fila libre: sigue en curso
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toEqual({ estado: 'generando', enCurso: true });
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });
});

describe('POST /api/generar — casos límite de datos (§6 de la spec)', () => {
  it('si no hay CV pegado en el perfil, marca error y explica qué falta', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: 0, error: null },
          { data: { id: 'g1' }, error: null },
          { error: null }, // marcarError
        ],
        perfiles: [{ data: { cv_texto: null, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(400);
    expect(cuerpo.estado).toBe('error');
    expect(cuerpo.error).toMatch(/necesitamos el texto de tu cv/i);
    const marcarError = llamadasPorTabla.generaciones[3].find((l) => l.metodo === 'update');
    expect(marcarError?.args[0]).toMatchObject({ estado: 'error' });
  });

  it('si la oferta ya no existe, marca error explicando que ya no está disponible', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: 0, error: null },
          { data: { id: 'g1' }, error: null },
          { error: null },
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: null, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(400);
    expect(cuerpo.error).toMatch(/ya no está disponible/i);
  });
});

describe('POST /api/generar — errores del servicio de IA (F2)', () => {
  it('si el modelo de IA falla, marca error con un mensaje claro y accionable (502)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: 0, error: null },
          { data: { id: 'g1' }, error: null },
          { error: null },
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockRejectedValue(new Error('ningún modelo respondió'));

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(502);
    expect(cuerpo.estado).toBe('error');
    expect(cuerpo.error).toMatch(/no se pudo preparar el documento/i);
  });

  it('devuelve 500 si falla el guardado final aunque la IA respondiera bien', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: 0, error: null },
          { data: { id: 'g1' }, error: null },
          { error: new Error('fallo de guardado') }, // el update final falla
          { error: null }, // marcarError en el catch
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockResolvedValue(GENERACION_IA_OK);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(502);
  });
});

describe('POST /api/generar — camino feliz', () => {
  it('genera, verifica y guarda el CV y la carta (C3)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: 2, error: null },
          { data: { id: 'g1' }, error: null },
          { error: null },
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockResolvedValue(GENERACION_IA_OK);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.estado).toBe('listo');
    expect(Array.isArray(cuerpo.avisos)).toBe(true);

    const actualizacion = llamadasPorTabla.generaciones[3].find((l) => l.metodo === 'update');
    const fila = actualizacion?.args[0] as Record<string, unknown>;
    expect(fila.estado).toBe('listo');
    expect(fila.cv_texto).toBe(GENERACION_IA_OK.cv_texto);
    expect(fila.carta_texto).toBe(GENERACION_IA_OK.carta_texto);
    // Permisos: el guardado va filtrado por user_id Y oferta_id de la sesión.
    const filtros = actualizacion ? llamadasPorTabla.generaciones[3].filter((l) => l.metodo === 'eq') : [];
    expect(filtros).toEqual([
      { metodo: 'eq', args: ['user_id', USUARIA.id] },
      { metodo: 'eq', args: ['oferta_id', 'oferta-1'] },
    ]);
  });

  it('marca avisos cuando el CV generado inventa una cifra que no está en el CV original (T54)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: null, error: null },
          { count: 0, error: null },
          { data: { id: 'g1' }, error: null },
          { error: null },
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockResolvedValue({
      ...GENERACION_IA_OK,
      cv_texto: 'PERFIL\n- Aumenté las ventas un 87%.\nEXPERIENCIA\n- Coordiné un equipo de doce personas.',
    });

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(cuerpo.avisos.some((a: string) => a.includes('87'))).toBe(true);
    const actualizacion = llamadasPorTabla.generaciones[3].find((l) => l.metodo === 'update');
    const fila = actualizacion?.args[0] as Record<string, unknown>;
    expect((fila.avisos as string[]).length).toBeGreaterThan(0);
  });
});
