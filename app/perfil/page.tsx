import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FormularioPerfil from '@/components/FormularioPerfil';
import GuiaPasos from '@/components/GuiaPasos';

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
    .select('puesto, palabras_clave, cv_texto, usar_experiencia_cv, empresas_cv, titulos_cv')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <main className="w-full max-w-3xl">
        {!perfilGuardado && <GuiaPasos pasoActual={1} />}
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Cuéntanos tu perfil
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Pega tu CV y te proponemos el puesto y las palabras clave con las que
          buscarte ofertas.
        </p>
        <FormularioPerfil perfilInicial={perfilGuardado ?? null} />
      </main>
    </div>
  );
}
