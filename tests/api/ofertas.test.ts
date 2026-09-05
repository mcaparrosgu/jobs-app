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
      tablas: { perfiles: [{ data: { puestos: null, palabras_clave: [] }, error: null }] },
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
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
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
        perfiles: [{ data: { puestos: ['de'], palabras_clave: [] }, error: null }],
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
        perfiles: [{ data: { puestos: ['de'], palabras_clave: [] }, error: null }],
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
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
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
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Project Manager en Acme',
              descripcion: 'Buscamos perfil con experiencia en SAP',
              empresa: 'Acme',
              enlace: 'https://x',
              ingerida_en: '2026-01-01',
            }],
            error: null,
          },
        ],
        intereses: [{ data: [{ oferta_id: 'oferta-1' }], error: null }],
        generaciones: [
          {
            data: [
              { oferta_id: 'oferta-1', estado: 'listo', avisos: [], error_mensaje: null, rehechos: 1 },
            ],
            error: null,
          },
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
        titulo: 'Project Manager en Acme',
        empresa: 'Acme',
        enlace: 'https://x',
        ingerida_en: '2026-01-01',
        interesada: true,
        generacion: { estado: 'listo', avisos: [], error: null, rehechos: 1 },
      },
    ]);
  });

  it('una oferta que la usuaria no ha marcado no lleva CV ni carta (regla de negocio 2)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Project Manager en Acme',
              descripcion: 'Buscamos perfil con experiencia en SAP',
              empresa: 'Acme',
              enlace: 'https://x',
              ingerida_en: '2026-01-01',
            }],
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
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Project Manager',
              descripcion: 'Con SAP',
              empresa: 'Acme',
              enlace: 'x',
              ingerida_en: '2026-01-01',
            }],
            error: null,
          },
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
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Project Manager',
              descripcion: 'Con SAP',
              empresa: 'Acme',
              enlace: 'x',
              ingerida_en: '2026-01-01',
            }],
            error: null,
          },
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

  it('las ofertas de hace más de 15 días quedan fuera de la consulta (caducidad, T85)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          { data: [], error: null },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET();

    const llamadaGte = llamadasPorTabla.ofertas[1].find((l) => l.metodo === 'gte');
    expect(llamadaGte?.args[0]).toBe('ingerida_en');
    expect(() => new Date(llamadaGte?.args[1] as string)).not.toThrow();
    expect(new Date(llamadaGte?.args[1] as string).toString()).not.toBe('Invalid Date');
  });

  it('aplica el filtro de salario_minimo del perfil (sin dato en la oferta -> pasa igual)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'], salario_minimo: 30000 }, error: null }],
        ofertas: [
          { count: 5, error: null },
          { data: [], error: null },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET();

    const llamadasOr = llamadasPorTabla.ofertas[1].filter((l) => l.metodo === 'or');
    expect(llamadasOr.some((l) => l.args[0] === 'salario_eur.is.null,salario_eur.gte.30000')).toBe(true);
  });

  it('no aplica filtro de salario si la usuaria no ha puesto salario_minimo', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          { data: [], error: null },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await GET();

    const llamadasOr = llamadasPorTabla.ofertas[1].filter((l) => l.metodo === 'or');
    expect(llamadasOr.length).toBe(1); // solo el .or() de puestos/palabras clave
  });

  it('marca limiteAlcanzado cuando la usuaria ya gastó su cupo diario', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puestos: ['Project Manager'], palabras_clave: ['SAP'] }, error: null }],
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

describe('GET /api/ofertas — coincidencia mínima de 2 términos (falsos positivos por palabra genérica)', () => {
  it('descarta una oferta que solo coincide en 1 término, aunque sea de un puesto totalmente distinto', async () => {
    // Perfil de operaciones con una palabra clave de herramienta genérica
    // (Docker) que también aparece en ofertas de ingeniería no relacionadas
    // — el caso real reportado: "Senior Full-Stack"/"Network Engineer" colando
    // por mencionar Docker, sin que nada más del perfil encaje.
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{
          data: { puestos: ['Especialista en Operaciones'], palabras_clave: ['Docker', 'n8n'] },
          error: null,
        }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Senior Full-Stack Engineer',
              descripcion: 'Buscamos experiencia con Docker y Kubernetes en producción',
              empresa: 'TechCorp',
              enlace: 'https://x',
              ingerida_en: '2026-01-01',
            }],
            error: null,
          },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.ofertas).toEqual([]);
  });

  it('muestra una oferta que coincide en 2 términos distintos del perfil', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{
          data: { puestos: ['Especialista en Operaciones'], palabras_clave: ['Docker', 'n8n'] },
          error: null,
        }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Especialista en Operaciones',
              descripcion: 'Automatizamos procesos con n8n',
              empresa: 'Acme',
              enlace: 'https://x',
              ingerida_en: '2026-01-01',
            }],
            error: null,
          },
        ],
        intereses: [{ data: [], error: null }],
        generaciones: [{ data: [], error: null }, { count: 0, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.ofertas).toHaveLength(1);
    expect(cuerpo.ofertas[0].id).toBe('oferta-1');
  });

  it('con un perfil de un único término, 1 sola coincidencia basta (no deja la lista vacía siempre)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        perfiles: [{ data: { puestos: ['Traductora'], palabras_clave: [] }, error: null }],
        ofertas: [
          { count: 5, error: null },
          {
            data: [{
              id: 'oferta-1',
              titulo: 'Traductora de inglés a español',
              descripcion: 'Puesto remoto',
              empresa: 'Acme',
              enlace: 'https://x',
              ingerida_en: '2026-01-01',
            }],
            error: null,
          },
        ],
        intereses: [{ data: [], error: null }],
        generaciones: [{ data: [], error: null }, { count: 0, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const cuerpo = await (await GET()).json();

    expect(cuerpo.ofertas).toHaveLength(1);
  });
});
