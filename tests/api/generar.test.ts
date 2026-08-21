import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';
import { MENSAJE_LIMITE } from '@/lib/generaciones';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
// `esErrorDeContenido` distingue (Paso 15) el fallo del proveedor del
// documento que llegó pero no pasó la validación: el primero se reintenta
// solo (502), el segundo no (422).
vi.mock('@/lib/ia', () => ({
  generarCvYCarta: vi.fn(),
  esErrorDeContenido: vi.fn(() => false),
}));

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
  intentoDeInyeccion: false,
  uso: { proveedor: 'Groq', modelo: 'qwen/qwen3.6-27b', tokensEntrada: 1200, tokensSalida: 900 },
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
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }], generaciones: [{ data: null, error: new Error('conexión perdida') }] },
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
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }], generaciones: [{ data: { id: 'g1', estado: 'listo', iniciado_en: null }, error: null }] },
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
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [{ data: null, error: null }], // no existía generación
      },
      // La función SQL no crea nada y no devuelve id: el cupo estaba lleno.
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: null, creada: false, cupo_gastado: 5 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(429);
    expect(cuerpo).toEqual({ estado: 'limite', error: MENSAJE_LIMITE });
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });

  it('el cupo se comprueba y la fila se crea en la misma llamada, sin condición de carrera (Paso 15)', async () => {
    const { cliente, llamadasRpc } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [{ data: null, error: null }],
        perfiles: [{ data: null, error: null }], // corta después: aquí solo importa el cupo
        ofertas: [{ data: { titulo: 'T', empresa: 'E', descripcion: null }, error: null }],
      },
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(llamadasRpc).toHaveLength(1);
    expect(llamadasRpc[0].metodo).toBe('crear_generacion_con_cupo');
    // p_tomar_turno: true — esta ruta sí se pone a generar en el acto, a
    // diferencia de /api/interes, que solo apunta el trabajo pendiente.
    expect(llamadasRpc[0].args[0]).toMatchObject({
      p_oferta_id: 'oferta-1',
      p_limite: 5,
      p_tomar_turno: true,
    });
  });

  it('devuelve 500 si falla el conteo del cupo diario de una generación que ya existía', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: { id: 'g1', estado: 'error', iniciado_en: null }, error: null },
          { count: null, error: new Error('conexión perdida') },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));

    expect(respuesta.status).toBe(500);
  });

  it('no genera nada para una oferta que la usuaria no ha marcado (regla de negocio 2, Paso 15)', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { intereses: [{ data: null, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-ajena' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(400);
    expect(cuerpo.error).toMatch(/me interesa/i);
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });
});

describe('POST /api/generar — concurrencia (varias ofertas casi a la vez)', () => {
  it('si otra petición ya está preparando la misma oferta, responde enCurso sin duplicar trabajo', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null }, // no existía generación (según esta petición)
          { data: null, error: null }, // el update para tomar turno no encuentra fila libre: sigue en curso
        ],
      },
      funciones: {
        // La fila ya existe porque otra petición se adelantó: hay id, pero no
        // la ha creado esta llamada.
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: false, cupo_gastado: 1 }, error: null }],
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
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
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
    const marcarError = llamadasPorTabla.generaciones[1].find((l) => l.metodo === 'update');
    expect(marcarError?.args[0]).toMatchObject({ estado: 'error' });
  });

  it('si la oferta ya no existe, marca error explicando que ya no está disponible', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
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
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
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
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
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

describe('POST /api/generar — Paso 14: guardrails', () => {
  it('capa 2 (seguridad): si la IA detectó un intento de inyección, añade un aviso sin bloquear la generación', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
          { error: null },
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockResolvedValue({ ...GENERACION_IA_OK, intentoDeInyeccion: true });

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.estado).toBe('listo');
    expect(cuerpo.avisos.some((a: string) => a.includes('intentaba dar instrucciones') || a.includes('instrucciones a la IA'))).toBe(
      true,
    );
    const actualizacion = llamadasPorTabla.generaciones[1].find((l) => l.metodo === 'update');
    const fila = actualizacion?.args[0] as Record<string, unknown>;
    expect(fila.estado).toBe('listo');
  });

  it('umbral de fallos: en el tercer fallo seguido, cambia el mensaje y avisa por log', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: { id: 'g1', estado: 'error', iniciado_en: null, intentos_fallidos: 2 }, error: null },
          { count: 2, error: null }, // cupo del día (solo se mira cuando la fila ya existía)
          { data: { id: 'g1' }, error: null }, // update para tomar turno (ya tenía fila): éxito
          { error: null }, // marcarError en el catch
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puesto: 'PM', empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockRejectedValue(new Error('ningún modelo respondió'));
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(502);
    expect(cuerpo.error).toMatch(/varias veces seguidas/i);
    expect(espia.mock.calls.some((llamada) => String(llamada[0]).includes('[GUARDRAIL:fallos-repetidos]'))).toBe(
      true,
    );
    const marcarError = llamadasPorTabla.generaciones[3]?.find((l) => l.metodo === 'update');
    expect(marcarError?.args[0]).toMatchObject({ estado: 'error', intentos_fallidos: 3 });

    espia.mockRestore();
  });
});

describe('POST /api/generar — camino feliz', () => {
  it('genera, verifica y guarda el CV y la carta (C3)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
          { count: 2, error: null },
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

    const actualizacion = llamadasPorTabla.generaciones[1].find((l) => l.metodo === 'update');
    const fila = actualizacion?.args[0] as Record<string, unknown>;
    expect(fila.estado).toBe('listo');
    expect(fila.cv_texto).toBe(GENERACION_IA_OK.cv_texto);
    expect(fila.carta_texto).toBe(GENERACION_IA_OK.carta_texto);
    // Permisos: el guardado va filtrado por user_id Y oferta_id de la sesión.
    const filtros = actualizacion ? llamadasPorTabla.generaciones[1].filter((l) => l.metodo === 'eq') : [];
    expect(filtros).toEqual([
      { metodo: 'eq', args: ['user_id', USUARIA.id] },
      { metodo: 'eq', args: ['oferta_id', 'oferta-1'] },
    ]);
  });

  it('marca avisos cuando el CV generado inventa una cifra que no está en el CV original (T54)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      funciones: {
        crear_generacion_con_cupo: [{ data: { id: 'g1', creada: true, cupo_gastado: 1 }, error: null }],
      },
      tablas: {
        intereses: [{ data: { oferta_id: 'oferta-1' }, error: null }],
        generaciones: [
          { data: null, error: null },
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
    const actualizacion = llamadasPorTabla.generaciones[1].find((l) => l.metodo === 'update');
    const fila = actualizacion?.args[0] as Record<string, unknown>;
    expect((fila.avisos as string[]).length).toBeGreaterThan(0);
  });
});
