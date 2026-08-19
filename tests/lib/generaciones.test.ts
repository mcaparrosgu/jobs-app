import { describe, expect, it, vi } from 'vitest';
import { contarGeneracionesDeHoy, LIMITE_DIARIO } from '@/lib/generaciones';
import type { SupabaseClient } from '@supabase/supabase-js';

// Un doble mínimo del query-builder encadenable de supabase-js: cada método
// devuelve el propio objeto, y el objeto es "thenable" para poder hacer
// `await` sobre él, igual que hace el cliente real.
function crearSupabaseFalso(resultado: { count: number | null; error: unknown }) {
  const llamadas: Record<string, unknown[]> = {};
  const builder: Record<string, unknown> = {};

  const metodos = ['from', 'select', 'eq', 'in', 'gte'];
  for (const metodo of metodos) {
    builder[metodo] = vi.fn((...args: unknown[]) => {
      llamadas[metodo] = args;
      return builder;
    });
  }
  builder.then = (resolve: (v: typeof resultado) => void) => resolve(resultado);

  return { cliente: builder as unknown as SupabaseClient, llamadas };
}

describe('contarGeneracionesDeHoy', () => {
  it('devuelve el número de generaciones cuando la consulta va bien', async () => {
    const { cliente } = crearSupabaseFalso({ count: 3, error: null });
    const resultado = await contarGeneracionesDeHoy(cliente, 'usuaria-1');
    expect(resultado).toBe(3);
  });

  it('devuelve 0 cuando la usuaria no ha generado nada hoy (count null)', async () => {
    const { cliente } = crearSupabaseFalso({ count: null, error: null });
    const resultado = await contarGeneracionesDeHoy(cliente, 'usuaria-1');
    expect(resultado).toBe(0);
  });

  it('devuelve null si la consulta falla (para no bloquear ni dejar pasar de más)', async () => {
    const { cliente } = crearSupabaseFalso({ count: null, error: new Error('conexión perdida') });
    const resultado = await contarGeneracionesDeHoy(cliente, 'usuaria-1');
    expect(resultado).toBeNull();
  });

  it('filtra siempre por el user_id de quien pregunta (aislamiento entre usuarias)', async () => {
    const { cliente, llamadas } = crearSupabaseFalso({ count: 0, error: null });
    await contarGeneracionesDeHoy(cliente, 'usuaria-especifica');
    expect(llamadas.eq).toEqual(['user_id', 'usuaria-especifica']);
  });

  it('solo cuenta los estados "listo" y "generando", nunca "error"', async () => {
    const { cliente, llamadas } = crearSupabaseFalso({ count: 0, error: null });
    await contarGeneracionesDeHoy(cliente, 'usuaria-1');
    expect(llamadas.in).toEqual(['estado', ['listo', 'generando']]);
  });

  it('el límite diario configurado es 5, como exige la regla de negocio 5', () => {
    expect(LIMITE_DIARIO).toBe(5);
  });
});
