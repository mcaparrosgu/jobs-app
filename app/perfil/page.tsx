import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Perfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ya has entrado
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Sesión iniciada como <strong>{user.email}</strong>.
        </p>
      </main>
    </div>
  );
}
