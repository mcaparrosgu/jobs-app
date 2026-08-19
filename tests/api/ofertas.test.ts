import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/ofertas/route';

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

describe('GET /api/ofertas — sesión y permisos', () => {
  it('devuelve 401 sin sesión', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET();

    expect(respuesta.status).toBe(401);
  });

  it('la consulta del perfil va filtrada por el user_id de quien pregunta', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET();

    const llamadaEq = llamadasPorTabla.perfiles[0].find((l) => l.metodo === 'eq');
    expect(llamadaEq?.args).toEqual(['user_id', USUARIA.id]);
  });
});

describe('GET /api/ofertas — casos límite (F1)', () => {
  it('indica sinPerfil cuando la usuaria todavía no ha guardado perfil (E1 / A3 estado vacío)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET();
    const cuerpo = await respuesta.json();

    expect(cuerpo).toEqual({ sinPerfil: true, huboIngestaHoy: true, ofertas: [] });
  });

  it('indica sinPerfil cuando el perfil existe pero no tiene puesto', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: { puesto: null, palabras_clave: [] }, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.sinPerfil).toBe(true);
  });

  it('devuelve 500 si falla la lectura del perfil', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: new Error('conexión perdida') }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    expect((await GET()).status).toBe(500);
  });

  it('devuelve 500 si falla la comprobación de la ingesta de hoy', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [{ count: null, error: new Error('conexión perdida') }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    expect((await GET()).status).toBe(500);
  });

  it('indica huboIngestaHoy=false cuando todavía no ha corrido ninguna ingesta ese día', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      // "de" es una palabra vacía: normalizarPalabrasClave la descarta y no
      // queda ningún término, así que no llega a consultar ofertas por filtro.
      tablas: {
        perfiles: [{ data: { puesto: 'de', palabras_clave: [] }, error: null }],
        ofertas: [{ count: 0, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo).toEqual({ sinPerfil: false, huboIngestaHoy: false, ofertas: [] });
  });

  it('indica huboIngestaHoy=true cuando ya hay ofertas ingeridas hoy', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'de', palabras_clave: [] }, error: null }],
        ofertas: [{ count: 4, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.huboIngestaHoy).toBe(true);
  });

  it('devuelve 500 si falla la consulta filtrada de ofertas', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 1, error: null },
          { data: null, error: new Error('conexión perdida') },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    expect((await GET()).status).toBe(500);
  });
});

describe('GET /api/ofertas — resultado y cupo diario (G1)', () => {
  it('devuelve las ofertas con si la usuaria está interesada y el estado de su generación', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{ id: 'oferta-1', titulo: 'PM en Acme', empresa: 'Acme', enlace: 'https://x', ingerida_en: '2026-01-01' }],
            error: null,
          },
        ],
        intereses: [{ data: [{ oferta_id: 'oferta-1' }], error: null }],
        generaciones: [
          { data: [{ oferta_id: 'oferta-1', estado: 'listo', avisos: [], error_mensaje: null }], error: null },
          { count: 2, error: null },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.sinPerfil).toBe(false);
    expect(cuerpo.limiteAlcanzado).toBe(false);
    expect(cuerpo.ofertas).toEqual([
      {
        id: 'oferta-1',
        titulo: 'PM en Acme',
        empresa: 'Acme',
        enlace: 'https://x',
        interesada: true,
        generacion: { estado: 'listo', avisos: [], error: null },
      },
    ]);
  });

  it('una oferta que la usuaria no ha marcado no lleva CV ni carta (regla de negocio 2)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{ id: 'oferta-1', titulo: 'PM en Acme', empresa: 'Acme', enlace: 'https://x', ingerida_en: '2026-01-01' }],
            error: null,
          },
        ],
        intereses: [{ data: [], error: null }],
        generaciones: [{ data: [], error: null }, { count: 0, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.ofertas[0].interesada).toBe(false);
    expect(cuerpo.ofertas[0].generacion).toBeNull();
  });

  it('las consultas de intereses y generaciones van filtradas por el user_id de la sesión (permisos)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          { data: [{ id: 'oferta-1', titulo: 'PM', empresa: 'Acme', enlace: 'x', ingerida_en: '2026-01-01' }], error: null },
        ],
        intereses: [{ data: [], error: null }],
        generaciones: [{ data: [], error: null }, { count: 0, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET();

    const eqIntereses = llamadasPorTabla.intereses[0].find((l) => l.metodo === 'eq');
    expect(eqIntereses?.args).toEqual(['user_id', USUARIA.id]);
    const eqGeneraciones = llamadasPorTabla.generaciones[0].find((l) => l.metodo === 'eq');
    expect(eqGeneraciones?.args).toEqual(['user_id', USUARIA.id]);
  });

  it('un fallo al consultar intereses o generaciones no rompe la respuesta (se degrada, no se cae)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          { data: [{ id: 'oferta-1', titulo: 'PM', empresa: 'Acme', enlace: 'x', ingerida_en: '2026-01-01' }], error: null },
        ],
        intereses: [{ data: null, error: new Error('conexión perdida') }],
        generaciones: [{ data: null, error: new Error('conexión perdida') }, { count: 0, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET();

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.ofertas[0].interesada).toBe(false);
    expect(cuerpo.ofertas[0].generacion).toBeNull();
  });

  it('marca limiteAlcanzado cuando la usuaria ya gastó su cupo diario', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puesto: 'Project Manager', palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 1, error: null },
          { data: [], error: null }, // sin ofertas que coincidan: ids vacío, no hay join con intereses/generaciones
        ],
        generaciones: [{ count: 5, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.limiteAlcanzado).toBe(true);
  });
});
