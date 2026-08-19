import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FormularioPerfil from '@/components/FormularioPerfil';

export default async function Perfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: perfilGuardado } = await supabase
    .from('perfiles')
    .select('puesto, palabras_clave, anios_experiencia, cv_texto, usar_experiencia_cv, empresas_cv, titulos_cv')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Cuéntanos tu perfil
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Sesión iniciada como <strong>{user.email}</strong>.
        </p>
        <FormularioPerfil perfilInicial={perfilGuardado ?? null} />
      </main>
    </div>
  );
}
