'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Estado = 'inicial' | 'enviando' | 'enviado' | 'error';

export default function Home() {
  return (
    <Suspense>
      <FormularioAcceso />
    </Suspense>
  );
}

function FormularioAcceso() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<Estado>('inicial');
  const [errorMensaje, setErrorMensaje] = useState('');

  useEffect(() => {
    if (searchParams.get('error') === 'enlace-caducado') {
      setEstado('error');
      setErrorMensaje(
        'Ese enlace ya no es válido: puede que haya caducado o que ya se haya usado. Pide uno nuevo.',
      );
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('enviando');
    setErrorMensaje('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setEstado('error');
      setErrorMensaje(
        'No se ha podido enviar el enlace. Comprueba tu email e inténtalo de nuevo.',
      );
      return;
    }

    setEstado('enviado');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Jobs App
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Pega tu CV, mira las ofertas de empleo remoto que encajan contigo y
          descarga un CV y una carta adaptados a cada una.
        </p>

        {estado === 'enviado' ? (
          <p className="mt-10 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Te hemos enviado un enlace a <strong>{email}</strong>. Ábrelo
            desde ese mismo correo para entrar.
          </p>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
            >
              <label htmlFor="email" className="sr-only">
                Tu email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tú@email.com"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none sm:w-72 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={estado === 'enviando'}
                className="rounded-lg bg-zinc-900 px-6 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {estado === 'enviando' ? 'Enviando…' : 'Entrar'}
              </button>
            </form>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
              Te enviamos un enlace de acceso a tu email, sin contraseña.
            </p>
            {estado === 'error' && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {errorMensaje}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
