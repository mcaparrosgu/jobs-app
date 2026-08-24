import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';
import { MAXIMO_REHECHOS, MENSAJE_LIMITE_REHACER } from '@/lib/generaciones';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ia', () => ({
  generarCvYCarta: vi.fn(),
  esErrorDeContenido: vi.fn(() => false),
  puestoMasRelevante: vi.fn((puestos: string[]) => puestos[0] ?? ''),
  MAXIMO_CARACTERES_INSTRUCCIONES: 300,
}));

import { createClient } from '@/lib/supabase/server';
import { generarCvYCarta } from '@/lib/ia';
import { POST } from '@/app/api/rehacer/route';

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/rehacer', {
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
  uso: { proveedor: 'Cloudflare', modelo: '@cf/mistralai/mistral-small-3.1-24b-instruct', tokensEntrada: 1200, tokensSalida: 900 },
};

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(generarCvYCarta).mockReset();
});

describe('POST /api/rehacer — sesión y validación', () => {
  it('devuelve 401 sin sesión', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1', instrucciones: 'más conciso' }));

    expect(respuesta.status).toBe(401);
  });

  it('devuelve 400 si falta oferta_id', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ instrucciones: 'más conciso' }));

    expect(respuesta.status).toBe(400);
  });

  it('devuelve 400 si las instrucciones vienen vacías', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1', instrucciones: '   ' }));

    expect(respuesta.status).toBe(400);
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });

  it('devuelve 400 si las instrucciones superan el máximo de caracteres', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(
      peticion({ oferta_id: 'oferta-1', instrucciones: 'x'.repeat(301) }),
    );

    expect(respuesta.status).toBe(400);
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });

  it('devuelve 400 si todavía no hay un documento listo para esa oferta', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { generaciones: [{ data: { id: 'g1', estado: 'generando', rehechos: 0 }, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1', instrucciones: 'más conciso' }));

    expect(respuesta.status).toBe(400);
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });

  it('devuelve 500 si falla la lectura de la generación', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { generaciones: [{ data: null, error: new Error('conexión perdida') }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1', instrucciones: 'más conciso' }));

    expect(respuesta.status).toBe(500);
  });
});

describe('POST /api/rehacer — límite propio de rehechos (T93)', () => {
  it('bloquea con 429 cuando ya se alcanzó el máximo de rehechos', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: { id: 'g1', estado: 'listo', rehechos: MAXIMO_REHECHOS }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1', instrucciones: 'más conciso' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(429);
    expect(cuerpo).toEqual({ estado: 'limite', error: MENSAJE_LIMITE_REHACER });
    expect(generarCvYCarta).not.toHaveBeenCalled();
  });
});

describe('POST /api/rehacer — camino feliz', () => {
  it('genera con la instrucción de la usuaria, verifica, guarda y suma un rehecho', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [
          { data: { id: 'g1', estado: 'listo', rehechos: 0 }, error: null },
          { error: null },
        ],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puestos: ['PM'], empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockResolvedValue(GENERACION_IA_OK);

    const respuesta = await POST(
      peticion({ oferta_id: 'oferta-1', instrucciones: 'usa un lenguaje más profesional' }),
    );
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.estado).toBe('listo');
    expect(cuerpo.rehechos).toBe(1);
    expect(generarCvYCarta).toHaveBeenCalledWith(
      CV_ORIGINAL,
      'PM',
      { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' },
      'usa un lenguaje más profesional',
    );

    const actualizacion = llamadasPorTabla.generaciones[1].find((l) => l.metodo === 'update');
    const fila = actualizacion?.args[0] as Record<string, unknown>;
    expect(fila.cv_texto).toBe(GENERACION_IA_OK.cv_texto);
    expect(fila.carta_texto).toBe(GENERACION_IA_OK.carta_texto);
    expect(fila.rehechos).toBe(1);
    // No se toca `estado`: la fila nunca sale de "listo".
    expect(fila.estado).toBeUndefined();
  });

  it('si falla la IA, no toca la fila: el documento anterior sigue disponible (502)', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        generaciones: [{ data: { id: 'g1', estado: 'listo', rehechos: 0 }, error: null }],
        perfiles: [{ data: { cv_texto: CV_ORIGINAL, puestos: ['PM'], empresas_cv: [], titulos_cv: [] }, error: null }],
        ofertas: [{ data: { titulo: 'PM', empresa: 'Acme', descripcion: 'desc' }, error: null }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(generarCvYCarta).mockRejectedValue(new Error('ningún modelo respondió'));

    const respuesta = await POST(peticion({ oferta_id: 'oferta-1', instrucciones: 'más conciso' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(502);
    expect(cuerpo.estado).toBe('error');
    expect(cuerpo.error).toMatch(/sigue disponible/i);
    expect(llamadasPorTabla.generaciones[0].some((l) => l.metodo === 'update')).toBe(false);
  });
});
