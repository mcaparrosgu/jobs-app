'use client';

// Barrera de errores de segmento (Next 16, `error.tsx`): recoge cualquier
// excepción que se escape al renderizar `/`, `/perfil`, `/ofertas` y sus hijos,
// y enseña una pantalla honesta en vez del error crudo de Next o una página en
// blanco — importante en una demo delante de gente (frente 1, robustez).
//
// No cubre un fallo dentro del `layout.tsx` raíz (ahí `await getUser()` puede
// lanzar): eso lo recoge `app/global-error.tsx`.

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPagina({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // Next 16.3: la prop estable es `retry` (antes `reset`). Reintenta
  // renderizando otra vez el segmento; si la causa era pasajera, se recupera.
  retry: () => void;
}) {
  useEffect(() => {
    // Deja rastro en la consola del navegador para poder mirarlo luego; el
    // `digest` cruza con los logs del servidor cuando el error viene de allí.
    console.error('Error no controlado en una pantalla:', error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <main className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Algo ha ido mal
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Ha habido un problema al cargar esta pantalla. No se ha perdido nada de
          lo que ya habías guardado: prueba a volver a intentarlo.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Volver a intentarlo
          </button>
          <Link
            href="/ofertas"
            className="rounded-lg border border-zinc-300 px-6 py-2.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Ir a mis ofertas
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-600">
            Código del error: {error.digest}
          </p>
        )}
      </main>
    </div>
  );
}
