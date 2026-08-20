import { vi } from 'vitest';

// Un doble mínimo del cliente de Supabase para las pruebas de los endpoints.
//
// Cada tabla tiene una COLA de resultados: la primera vez que el endpoint
// hace `.from('esa_tabla')` se resuelve con el primer resultado de la cola,
// la segunda vez con el segundo, y así sucesivamente (algunos endpoints
// consultan la misma tabla dos veces, p. ej. app/api/ofertas/route.ts hace
// `.from('ofertas')` una vez para contar y otra para listar). Si la cola se
// agota, se repite el último resultado.
//
// Cualquier método encadenado (`.select()`, `.eq()`, `.in()`, `.upsert()`…)
// devuelve el mismo objeto y queda registrado en `llamadasPorTabla`, para
// poder comprobar en las pruebas — sobre todo las de permisos — con qué
// argumentos se llamó (p. ej. que siempre se filtra por `user_id`).

type ResultadoConsulta = { data?: unknown; error?: unknown; count?: number | null };
export type LlamadaRegistrada = { metodo: string; args: unknown[] };

export type ClienteFalso = {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

export function crearClienteFalso(config: {
  user?: { id: string; email?: string } | null;
  tablas?: Record<string, ResultadoConsulta[]>;
  // Funciones SQL llamadas con `.rpc()` (Paso 15: `crear_generacion_con_cupo`,
  // que comprueba el cupo y crea la fila en la misma transacción). Misma idea
  // que `tablas`: una cola de resultados por nombre de función.
  funciones?: Record<string, ResultadoConsulta[]>;
}) {
  const llamadasFrom: string[] = [];
  const llamadasPorTabla: Record<string, LlamadaRegistrada[][]> = {};
  const indices: Record<string, number> = {};

  const from = vi.fn((tabla: string) => {
    llamadasFrom.push(tabla);
    const cola = config.tablas?.[tabla] ?? [];
    const indice = indices[tabla] ?? 0;
    indices[tabla] = indice + 1;
    const resultado: ResultadoConsulta = cola[Math.min(indice, cola.length - 1)] ?? { data: null, error: null };

    const llamadas: LlamadaRegistrada[] = [];
    llamadasPorTabla[tabla] = llamadasPorTabla[tabla] ?? [];
    llamadasPorTabla[tabla].push(llamadas);

    const objetivo = {};
    const proxy: unknown = new Proxy(objetivo, {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          return (resolve: (v: ResultadoConsulta) => void, reject: (e: unknown) => void) =>
            Promise.resolve(resultado).then(resolve, reject);
        }
        if (typeof prop !== 'string') return undefined;
        return (...args: unknown[]) => {
          llamadas.push({ metodo: prop, args });
          return proxy;
        };
      },
    });
    return proxy;
  });

  const llamadasRpc: LlamadaRegistrada[] = [];
  const indicesRpc: Record<string, number> = {};

  const rpc = vi.fn((nombre: string, args: unknown) => {
    llamadasRpc.push({ metodo: nombre, args: [args] });

    const cola = config.funciones?.[nombre] ?? [];
    const indice = indicesRpc[nombre] ?? 0;
    indicesRpc[nombre] = indice + 1;
    const resultado: ResultadoConsulta = cola[Math.min(indice, cola.length - 1)] ?? {
      data: null,
      error: null,
    };

    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, prop: string | symbol) {
          if (prop === 'then') {
            return (resolve: (v: ResultadoConsulta) => void, reject: (e: unknown) => void) =>
              Promise.resolve(resultado).then(resolve, reject);
          }
          if (typeof prop !== 'string') return undefined;
          return () => proxy;
        },
      },
    );
    return proxy;
  });

  const cliente: ClienteFalso = {
    auth: { getUser: vi.fn(async () => ({ data: { user: config.user ?? null } })) },
    from,
    rpc,
  };

  return { cliente, llamadasFrom, llamadasPorTabla, llamadasRpc };
}

export const USUARIA = { id: 'usuaria-11111', email: 'usuaria@example.com' };
export const OTRA_USUARIA = { id: 'usuaria-22222', email: 'otra@example.com' };
