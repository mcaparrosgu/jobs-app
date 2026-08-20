import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/perfil/route';

function peticionPost(cuerpo: unknown) {
  return new Request('http://localhost/api/perfil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

const BODY_VALIDO = {
  nombre: 'Ana García',
  puesto: 'Project Manager',
  telefono: '',
  enlace: '',
  palabras_clave: ['Project Manager', 'SAP'],
  cv_texto: 'Texto del CV',
  usar_experiencia_cv: false,
  empresas_cv: [],
  titulos_cv: [],
};

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

describe('GET /api/perfil', () => {
  it('devuelve 401 sin sesión', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET();

    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).error).toBe('No has iniciado sesión');
  });

  it('devuelve el perfil de la usuaria con sesión', async () => {
    const perfilGuardado = { nombre: 'Ana García', puesto: 'Project Manager', palabras_clave: ['SAP'] };
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: perfilGuardado, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET();

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual(perfilGuardado);
    // Permisos: la consulta va filtrada por el user_id de quien pregunta.
    const llamadaEq = llamadasPorTabla.perfiles[0].find((l) => l.metodo === 'eq');
    expect(llamadaEq?.args).toEqual(['user_id', USUARIA.id]);
  });

  it('devuelve 500 si falla la consulta a la base de datos', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: new Error('conexión perdida') }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await GET();

    expect(respuesta.status).toBe(500);
  });
});

describe('POST /api/perfil — validación', () => {
  it('devuelve 401 sin sesión', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost(BODY_VALIDO));

    expect(respuesta.status).toBe(401);
  });

  it('rechaza si falta el nombre', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost({ ...BODY_VALIDO, nombre: undefined }));

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error).toMatch(/nombre/i);
  });

  it('rechaza un nombre que son solo espacios en blanco', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost({ ...BODY_VALIDO, nombre: '   ' }));

    expect(respuesta.status).toBe(400);
  });

  it('rechaza si falta el puesto', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost({ ...BODY_VALIDO, puesto: '' }));

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error).toMatch(/puesto/i);
  });

  it('rechaza si no hay ninguna palabra clave (ni propuesta ni añadida a mano)', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost({ ...BODY_VALIDO, palabras_clave: [] }));

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error).toMatch(/palabras clave/i);
  });

  it('rechaza si palabras_clave no es una lista', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost({ ...BODY_VALIDO, palabras_clave: 'SAP' }));

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un cuerpo que no es JSON válido sin reventar el servidor', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const peticionRota = new Request('http://localhost/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ esto no es json',
    });

    await expect(POST(peticionRota)).rejects.toThrow();
  });
});

describe('POST /api/perfil — guardado y permisos', () => {
  it('guarda el perfil bajo el user_id de la sesión, no de lo que venga en el cuerpo', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    // Un cuerpo que intenta colarse con un user_id ajeno: el endpoint no lee
    // ese campo del cuerpo en ningún momento, así que no puede colarse.
    const cuerpoConIntento = { ...BODY_VALIDO, user_id: 'usuaria-ajena' };
    const respuesta = await POST(peticionPost(cuerpoConIntento));

    expect(respuesta.status).toBe(200);
    const llamadaUpsert = llamadasPorTabla.perfiles[0].find((l) => l.metodo === 'upsert');
    const filaGuardada = llamadaUpsert?.args[0] as Record<string, unknown>;
    expect(filaGuardada.user_id).toBe(USUARIA.id);
  });

  it('recorta espacios del nombre y convierte teléfono/enlace vacíos en null', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await POST(peticionPost({ ...BODY_VALIDO, nombre: '  Ana García  ', telefono: '', enlace: '   ' }));

    const llamadaUpsert = llamadasPorTabla.perfiles[0].find((l) => l.metodo === 'upsert');
    const fila = llamadaUpsert?.args[0] as Record<string, unknown>;
    expect(fila.nombre).toBe('Ana García');
    expect(fila.telefono).toBeNull();
    expect(fila.enlace).toBeNull();
  });

  it('devuelve 500 si falla el guardado', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: new Error('fallo de escritura') }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticionPost(BODY_VALIDO));

    expect(respuesta.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Paso 15 · La lista blanca del antifraude no la escribe el navegador
// (seguridad/red-team-opus.md, ficha 1.5).
// ---------------------------------------------------------------------------

describe('POST /api/perfil — empresas y titulaciones ancladas al CV', () => {
  const CV = 'Camarera en Bar Manolo desde 2019. Grado Superior en Hostelería.';

  it('descarta las empresas y titulaciones que no aparecen en el CV pegado', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await POST(
      peticionPost({
        nombre: 'Mar',
        puesto: 'Camarera',
        palabras_clave: ['sala'],
        cv_texto: CV,
        empresas_cv: ['Bar Manolo', 'Google', 'McKinsey'],
        titulos_cv: ['Grado Superior en Hostelería', 'MBA por IESE'],
      }),
    );

    const upsert = llamadasPorTabla.perfiles[0].find((l) => l.metodo === 'upsert');
    expect(upsert?.args[0]).toMatchObject({
      empresas_cv: ['Bar Manolo'],
      titulos_cv: ['Grado Superior en Hostelería'],
    });
  });

  it('rechaza un cv_texto que no pasa la capa de relevancia', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { perfiles: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(
      peticionPost({
        nombre: 'Mar',
        puesto: 'Camarera',
        palabras_clave: ['sala'],
        cv_texto: 'a'.repeat(25_000),
      }),
    );

    expect(respuesta.status).toBe(400);
  });
});
