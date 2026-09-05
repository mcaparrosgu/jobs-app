// @vitest-environment jsdom
//
// Guard de sesión de `/` (app/page.tsx): sin sesión, se pinta el formulario
// de acceso; con sesión, redirige a /ofertas o /perfil según tenga perfil
// guardado — antes de este arreglo, una usuaria ya logueada volvía a ver el
// formulario de email al visitar `/` directamente (pestaña nueva, recargar).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/perfil', () => ({ tienePerfilGuardado: vi.fn() }));

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { tienePerfilGuardado } from '@/lib/perfil';
import Home from '@/app/page';

const redirectFalso = vi.mocked(redirect);

function clienteFalso(user: { id: string } | null) {
  return { auth: { getUser: async () => ({ data: { user } }) } };
}

beforeEach(() => {
  redirectFalso.mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(tienePerfilGuardado).mockReset();
});

describe('/ — aterriza donde toca según la sesión', () => {
  it('sin sesión, pinta el formulario de acceso, sin redirigir', async () => {
    vi.mocked(createClient).mockResolvedValue(clienteFalso(null) as never);

    render(await Home());

    expect(redirectFalso).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Tu email')).toBeInTheDocument();
  });

  it('con sesión y perfil guardado, redirige a /ofertas', async () => {
    vi.mocked(createClient).mockResolvedValue(clienteFalso({ id: 'usuaria-1' }) as never);
    vi.mocked(tienePerfilGuardado).mockResolvedValue(true);

    await Home();

    expect(redirectFalso).toHaveBeenCalledWith('/ofertas');
  });

  it('con sesión y sin perfil guardado, redirige a /perfil', async () => {
    vi.mocked(createClient).mockResolvedValue(clienteFalso({ id: 'usuaria-1' }) as never);
    vi.mocked(tienePerfilGuardado).mockResolvedValue(false);

    await Home();

    expect(redirectFalso).toHaveBeenCalledWith('/perfil');
  });
});
