// Página 404 (Next 16, `not-found.tsx`): sustituye a la pantalla genérica de
// Next cuando alguien llega a una URL que no existe (un enlace viejo, una
// dirección tecleada a mano). Se renderiza dentro del layout raíz, así que
// quien tiene sesión sigue viendo el menú de navegación arriba.

import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <main className="w-full max-w-md text-center">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-500">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Esta página no existe
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          El enlace puede estar equivocado o la página se ha movido.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/ofertas"
            className="rounded-lg bg-zinc-900 px-6 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Ir a mis ofertas
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-6 py-2.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
