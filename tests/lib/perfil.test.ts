import { describe, expect, it, vi } from 'vitest';
import { tienePerfilGuardado } from '@/lib/perfil';

function clienteFalso(tienePerfil: boolean) {
  const eq = vi.fn(() => ({
    maybeSingle: async () => ({ data: tienePerfil ? { user_id: 'usuaria-1' } : null }),
  }));
  const select = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ select })), _eq: eq, _select: select } as never;
}

describe('tienePerfilGuardado — único sitio que decide "¿ya contó su perfil?"', () => {
  it('devuelve true cuando existe una fila en perfiles', async () => {
    const supabase = clienteFalso(true);

    await expect(tienePerfilGuardado(supabase, 'usuaria-1')).resolves.toBe(true);
  });

  it('devuelve false cuando no existe fila', async () => {
    const supabase = clienteFalso(false);

    await expect(tienePerfilGuardado(supabase, 'usuaria-1')).resolves.toBe(false);
  });

  it('filtra por el user_id recibido', async () => {
    const supabase = clienteFalso(true);

    await tienePerfilGuardado(supabase, 'usuaria-42');

    expect((supabase as unknown as { _eq: ReturnType<typeof vi.fn> })._eq).toHaveBeenCalledWith(
      'user_id',
      'usuaria-42',
    );
  });
});
