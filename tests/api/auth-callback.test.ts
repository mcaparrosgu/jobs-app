import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { GET } from '@/app/auth/callback/route';

function clienteFalso(opciones: { error?: unknown; user?: { id: string } | null; tienePerfil?: boolean }) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({
        data: { user: opciones.user ?? null },
        error: opciones.error ?? null,
      })),
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: opciones.tienePerfil ? { user_id: opciones.user?.id } : null }),
        }),
      }),
    })),
  };
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

describe('GET /auth/callback — A1: enlace de un solo uso', () => {
  it('sin código en la URL, redirige a la pantalla de acceso con el aviso de enlace caducado', async () => {
    const respuesta = await GET(new Request('http://localhost/auth/callback'));

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get('location')).toBe('http://localhost/?error=enlace-caducado');
  });

  it('un enlace ya usado o caducado (el intercambio de código falla) deniega el acceso con un mensaje claro', async () => {
    vi.mocked(createClient).mockResolvedValue(
      clienteFalso({ error: new Error('caducado'), user: null }) as never,
    );

    const respuesta = await GET(new Request('http://localhost/auth/callback?code=usado-antes'));

    expect(respuesta.headers.get('location')).toBe('http://localhost/?error=enlace-caducado');
  });

  it('un código válido pero sin usuario resultante también deniega el acceso', async () => {
    vi.mocked(createClient).mockResolvedValue(clienteFalso({ error: null, user: null }) as never);

    const respuesta = await GET(new Request('http://localhost/auth/callback?code=raro'));

    expect(respuesta.headers.get('location')).toBe('http://localhost/?error=enlace-caducado');
  });
});

describe('GET /auth/callback — A4: aterriza donde toca', () => {
  it('con perfil ya guardado, entra directa a sus ofertas', async () => {
    vi.mocked(createClient).mockResolvedValue(
      clienteFalso({ error: null, user: { id: 'usuaria-1' }, tienePerfil: true }) as never,
    );

    const respuesta = await GET(new Request('http://localhost/auth/callback?code=valido'));

    expect(respuesta.headers.get('location')).toBe('http://localhost/ofertas');
  });

  it('sin perfil todavía, entra a la pantalla de perfil', async () => {
    vi.mocked(createClient).mockResolvedValue(
      clienteFalso({ error: null, user: { id: 'usuaria-1' }, tienePerfil: false }) as never,
    );

    const respuesta = await GET(new Request('http://localhost/auth/callback?code=valido'));

    expect(respuesta.headers.get('location')).toBe('http://localhost/perfil');
  });
});
