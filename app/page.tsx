import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { tienePerfilGuardado } from '@/lib/perfil';
import FormularioAcceso from '@/components/FormularioAcceso';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const tienePerfil = await tienePerfilGuardado(supabase, user.id);
    redirect(tienePerfil ? '/ofertas' : '/perfil');
    return null;
  }

  return <FormularioAcceso />;
}
