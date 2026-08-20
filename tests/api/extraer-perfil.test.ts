import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearClienteFalso, USUARIA } from '../helpers/supabase-fake';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ia', () => ({ extraerPerfil: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { extraerPerfil } from '@/lib/ia';
import { POST } from '@/app/api/extraer-perfil/route';

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/extraer-perfil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(extraerPerfil).mockReset();
});

describe('POST /api/extraer-perfil — T81: exige sesión', () => {
  it('devuelve 401 sin sesión, sin llegar a llamar al modelo de IA', async () => {
    const { cliente } = crearClienteFalso({ user: null });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ cv: 'Texto de un CV real' }));

    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).error).toBe('No has iniciado sesión');
    expect(extraerPerfil).not.toHaveBeenCalled();
  });
});

describe('POST /api/extraer-perfil — validación (B1)', () => {
  it('devuelve 400 si falta el texto del CV', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({}));

    expect(respuesta.status).toBe(400);
    expect(extraerPerfil).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el CV es una cadena vacía o solo espacios', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ cv: '   ' }));

    expect(respuesta.status).toBe(400);
  });

  it('devuelve 400 si el CV no es una cadena de texto', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ cv: 12345 }));

    expect(respuesta.status).toBe(400);
  });
});

describe('POST /api/extraer-perfil — Paso 14, capa 1 (relevancia)', () => {
  it('devuelve 400 sin llamar al modelo si el texto es demasiado largo para ser un CV', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ cv: 'a'.repeat(40_001) }));

    expect(respuesta.status).toBe(400);
    expect(extraerPerfil).not.toHaveBeenCalled();
  });

  it('devuelve 400 sin llamar al modelo si el texto es predominantemente código', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    const codigo = `
      function calcularTotal(items) { return items.reduce((a, i) => a + i, 0); }
      import { crearCliente } from './db';
      const cliente = require('./cliente');
    `;

    const respuesta = await POST(peticion({ cv: codigo }));

    expect(respuesta.status).toBe(400);
    expect(extraerPerfil).not.toHaveBeenCalled();
  });
});

describe('POST /api/extraer-perfil — respuesta del modelo (B2)', () => {
  it('devuelve el perfil propuesto por la IA cuando todo va bien', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    const perfilPropuesto = {
      puesto: 'Profesora de secundaria',
      palabras_clave: ['docencia', 'educación secundaria'],
      empresas_cv: ['IES Ejemplo'],
      titulos_cv: ['Grado en Matemáticas'],
    };
    vi.mocked(extraerPerfil).mockResolvedValue(perfilPropuesto);

    const respuesta = await POST(peticion({ cv: 'Texto de un CV real' }));

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual(perfilPropuesto);
  });

  it('devuelve 502 con un mensaje claro si falla el modelo de IA (F2: servicio externo caído)', async () => {
    const { cliente } = crearClienteFalso({ user: USUARIA });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(extraerPerfil).mockRejectedValue(new Error('ningún modelo respondió'));

    const respuesta = await POST(peticion({ cv: 'Texto de un CV real' }));

    expect(respuesta.status).toBe(502);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toMatch(/no se pudo analizar/i);
  });
});

// ---------------------------------------------------------------------------
// Paso 15 · El límite diario (seguridad/red-team-opus.md, ficha 7.1).
//
// Esta llamada gasta de la misma cuota compartida que la generación —50
// peticiones al día para las cinco usuarias— y era la única de las dos sin
// ningún tope: un bucle de `fetch` desde la consola dejaba a todo el mundo sin
// servicio hasta el día siguiente.
// ---------------------------------------------------------------------------

describe('POST /api/extraer-perfil — límite diario de análisis', () => {
  it('corta con 429 cuando ya se han hecho los análisis del día', async () => {
    const { cliente } = crearClienteFalso({
      user: USUARIA,
      tablas: { extracciones: [{ count: 10, error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);

    const respuesta = await POST(peticion({ cv: 'Texto de un CV real' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(429);
    expect(cuerpo.error).toMatch(/máximo/i);
    expect(extraerPerfil).not.toHaveBeenCalled();
  });

  it('deja pasar y apunta el análisis cuando queda cupo', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: {
        extracciones: [
          { count: 3, error: null }, // el recuento
          { error: null }, // el apunte
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(extraerPerfil).mockResolvedValue({
      puesto: 'Camarera',
      palabras_clave: ['sala'],
      empresas_cv: [],
      titulos_cv: [],
    });

    const respuesta = await POST(peticion({ cv: 'Texto de un CV real' }));

    expect(respuesta.status).toBe(200);
    const apunte = llamadasPorTabla.extracciones[1].find((l) => l.metodo === 'insert');
    expect(apunte?.args[0]).toMatchObject({ user_id: USUARIA.id });
  });

  it('el recuento se hace siempre contra el user_id de la sesión', async () => {
    const { cliente, llamadasPorTabla } = crearClienteFalso({
      user: USUARIA,
      tablas: { extracciones: [{ count: 0, error: null }, { error: null }] },
    });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    vi.mocked(extraerPerfil).mockResolvedValue({
      puesto: 'Camarera',
      palabras_clave: ['sala'],
      empresas_cv: [],
      titulos_cv: [],
    });

    await POST(peticion({ cv: 'Texto de un CV real' }));

    const filtro = llamadasPorTabla.extracciones[0].find((l) => l.metodo === 'eq');
    expect(filtro?.args).toEqual(['user_id', USUARIA.id]);
  });
});
