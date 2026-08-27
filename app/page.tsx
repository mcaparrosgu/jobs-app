'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Estado = 'inicial' | 'enviando' | 'enviado' | 'error';

const MENSAJE_ENLACE_CADUCADO =
  'Ese enlace ya no es válido: puede que haya caducado o que ya se haya usado. Pide uno nuevo.';

// Supabase responde esto cuando el registro de usuarias nuevas está apagado
// (Authentication → Sign In / Providers → "Allow new users to sign up") y el
// email no corresponde a ninguna usuaria invitada. Ver docs/07-emergencia.md.
const MENSAJE_NO_INVITADA =
  'Ese email no está en la lista de personas invitadas a Jobs App. Pídele acceso a quien te pasó el enlace.';

const MENSAJE_ERROR_GENERICO =
  'No se ha podido enviar el enlace. Comprueba tu email e inténtalo de nuevo.';

export default function Home() {
  return (
    <Suspense>
      <FormularioAcceso />
    </Suspense>
  );
}

function FormularioAcceso() {
  const searchParams = useSearchParams();
  // El estado inicial se calcula aquí, no en un useEffect: el efecto solo
  // servía para llamar a setState en el primer render, que es justo lo que
  // avisa la regla react-hooks/set-state-in-effect (y una pasada de renderizado
  // de más por nada).
  const enlaceCaducado = searchParams.get('error') === 'enlace-caducado';

  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<Estado>(enlaceCaducado ? 'error' : 'inicial');
  const [errorMensaje, setErrorMensaje] = useState(
    enlaceCaducado ? MENSAJE_ENLACE_CADUCADO : '',
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('enviando');
    setErrorMensaje('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Jobs App es para las personas que Mar invita desde el panel de
        // Supabase, no para quien encuentre la URL: un email desconocido ya no
        // crea una usuaria nueva. La barrera de verdad está en Supabase (el
        // registro apagado); esto es lo que permite dar un mensaje honesto en
        // vez de un error genérico.
        shouldCreateUser: false,
      },
    });

    if (error) {
      setEstado('error');
      setErrorMensaje(esErrorDeRegistroCerrado(error) ? MENSAJE_NO_INVITADA : MENSAJE_ERROR_GENERICO);
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

// Supabase no expone una constante para esto y el código ha cambiado de nombre
// entre versiones, así que se miran las dos señales: el código moderno
// (`otp_disabled`) y el texto del mensaje, por si la versión instalada solo
// manda eso. Cualquier otro error cae en el mensaje genérico.
function esErrorDeRegistroCerrado(error: { code?: string; message?: string }): boolean {
  if (error.code === 'otp_disabled') return true;
  const mensaje = (error.message ?? '').toLowerCase();
  return mensaje.includes('signups not allowed') || mensaje.includes('signup is disabled');
}
