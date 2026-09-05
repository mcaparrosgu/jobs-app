import type { SupabaseClient } from '@supabase/supabase-js';

// Único sitio que decide "¿ya contó su perfil?" — lo usan tanto el
// callback del magic link como el guard de sesión de `/`, para no repetir
// la misma consulta en dos sitios.
export async function tienePerfilGuardado(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('perfiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}
