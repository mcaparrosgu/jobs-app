'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ENLACES = [
  { href: '/ofertas', texto: 'Ofertas' },
  { href: '/perfil', texto: 'Mi perfil' },
];

export default function MenuNavegacion({ email }: { email: string }) {
  const rutaActual = usePathname();

  return (
    // El px-6 va en el header y el max-w-3xl dentro, igual que en las
    // páginas, para que la barra y el contenido compartan borde izquierdo.
    <header className="border-b border-zinc-200 bg-white px-6 font-sans dark:border-zinc-800 dark:bg-zinc-950">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 py-3"
      >
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Jobs App</span>

        <ul className="flex items-center gap-4">
          {ENLACES.map((enlace) => {
            const activo = rutaActual === enlace.href;
            return (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  aria-current={activo ? 'page' : undefined}
                  className={
                    activo
                      ? 'font-medium text-zinc-900 underline underline-offset-8 decoration-2 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                  }
                >
                  {enlace.texto}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-zinc-500 sm:inline dark:text-zinc-500">{email}</span>
          <form action="/auth/salir" method="post">
            <button
              type="submit"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Salir
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
