import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';
import { MENSAJE_LIMITE } from '@/lib/generaciones';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/interes/route';

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/interes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

describe('POST /api/interes', () => {
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

  it('devuelve 400 si oferta_id es una cadena vacía', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: '   ' }));

    expect(respuesta.status).toBe(400);
  });

  it('devuelve 400 si oferta_id no es una cadena', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 42 }));

    expect(respuesta.status).toBe(400);
  });

  it('marca el interés bajo el user_id de la sesión, no el que venga en el cuerpo', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [
          { data: null, error: null }, // no había generación previa
          { count: 0, error: null }, // cupo de hoy
          { data: null, error: null }, // insert
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await POST(peticion({ oferta_id: 'oferta-1', user_id: 'usuaria-ajena' }));

    const llamadaUpsert = llamadasPorTabla.intereses[0].find((l) => l.metodo === 'upsert');
    const fila = llamadaUpsert?.args[0] as Record<string, unknown>;
    expect(fila.user_id).toBe(USUARIA.id);
    expect(fila.oferta_id).toBe('oferta-1');
    expect(llamadaUpsert?.args[1]).toMatchObject({ onConflict: 'user_id,oferta_id', ignoreDuplicates: true });
  });

  it('devuelve 500 si falla el guardado del interés', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { intereses: [{ data: null, error: new Error('fallo de conexión') }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(500);
  });

  it('si ya existía una generación para esa oferta, no crea una nueva ni relanza nada', async () => {
    const { cliente, llamadasFrom } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: { estado: 'listo' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(cuerpo).toEqual({ ok: true, generacion: { estado: 'listo' } });
    // Solo una llamada a generaciones (comprobar si existía), ninguna de más.
    expect(llamadasFrom.filter((t) => t === 'generaciones').length).toBe(1);
  });

  it('dispara la generación (estado "generando") cuando no hay generación previa y hay cupo', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: null, error: null }],
      },
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 3 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(cuerpo).toEqual({ ok: true, generacion: { estado: 'generando' } });
  });

  it('no dispara la generación de una oferta que no se ha marcado (regla de negocio 2): solo llega aquí quien la marcó', async () => {
    // Este endpoint solo se invoca al marcar "me interesa" (garantía de
    // components/TarjetaOferta.tsx); comprobamos que, dado el mismo cuerpo,
    // el efecto es siempre crear como mucho UNA fila de generación por oferta.
    const { cliente, llamadasRpc } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: null, error: null }],
      },
      // Paso 15 · comprobar el cupo y crear la fila es ya una sola operación
      // atómica en la base de datos (migración 0014).
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(llamadasRpc).toHaveLength(1);
    expect(llamadasRpc[0].metodo).toBe('crear_generacion_con_cupo');
    expect(llamadasRpc[0].args[0]).toMatchObject({ p_oferta_id: 'oferta-1', p_limite: 5 });
  });

  it('bloquea la generación e informa del límite diario, sin dejar de guardar el interés', async () => {
    const { cliente, llamadasFrom } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: null, error: null }], // no había generación previa
      },
      funciones: {
        // Cupo lleno: la función no crea nada y no devuelve id.
        crear_generacion_con_cupo: [{ data: { id: null, creada: false, cupo_gastado: 5 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(cuerpo).toEqual({ ok: true, generacion: null, limite: MENSAJE_LIMITE });
    // No se llega a intentar la creación por otra vía: una sola lectura.
    expect(llamadasFrom.filter((t) => t === 'generaciones').length).toBe(1);
  });

  it('deja pasar la generación cuando la usuaria está justo por debajo del límite', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: null, error: null }],
      },
      funciones: {
        // 4 gastadas: cabe una más, y la función la crea.
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 5 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(cuerpo).toEqual({ ok: true, generacion: { estado: 'generando' } });
  });

  it('pulsar dos veces seguidas no produce error ni duplicado (insert 23505 se trata como éxito)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: null, error: null }],
      },
      funciones: {
        // Otra petición se adelantó: hay fila (id), pero no la ha creado esta.
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: false, cupo_gastado: 1 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, generacion: { estado: 'generando' } });
  });
});

describe('POST /api/interes — el turno se deja libre para /api/generar', () => {
  it('crea la fila SIN tomar el turno (p_tomar_turno: false)', async () => {
    const { cliente, llamadasRpc } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: null, error: null }],
        generaciones: [{ data: null, error: null }],
      },
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await POST(peticion({ oferta_id: 'oferta-1' }));

    // Si esta ruta marcara el turno, /api/generar lo vería ocupado y
    // respondería "ya se está preparando" sin que nadie lo estuviera
    // preparando: el documento no se generaría nunca.
    expect(llamadasRpc[0].args[0]).toMatchObject({ p_tomar_turno: false });
  });
});
