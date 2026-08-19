import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { POST } from '@/app/auth/salir/route';

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

describe('POST /auth/salir — A4: cerrar sesión de verdad', () => {
  it('cierra la sesión en Supabase y redirige a la pantalla de acceso', async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    vi.mocked(createClient).mockResolvedValue({ auth: { signOut } } as never);

    const respuesta = await POST(new Request('http://localhost/auth/salir', { method: 'POST' }));

    expect(signOut).toHaveBeenCalled();
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.get('location')).toBe('http://localhost/');
  });

  it('usa 303 (no 307) para que el navegador no repita el POST contra "/"', async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    vi.mocked(createClient).mockResolvedValue({ auth: { signOut } } as never);

    const respuesta = await POST(new Request('http://localhost/auth/salir', { method: 'POST' }));

    expect(respuesta.status).not.toBe(307);
  });
});
