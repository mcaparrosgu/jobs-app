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
