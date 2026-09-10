import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tienePerfilGuardado } from '@/lib/perfil';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Quien ya tiene perfil guardado entra directa a sus ofertas
      // (docs/03-spec.md §3.2); quien entra por primera vez, a contarnos
      // su perfil.
      const tienePerfil = await tienePerfilGuardado(supabase, data.user.id);

      return NextResponse.redirect(`${origin}${tienePerfil ? '/ofertas' : '/perfil'}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/?error=enlace-caducado`,
  );
}
