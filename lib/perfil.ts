import type { SupabaseClient } from '@supabase/supabase-js';

// Único sitio que decide "¿ya contó su perfil?" — lo usan tanto el
// callback del magic link como el guard de sesión de `/`, para no repetir
// la misma consulta en dos sitios.
//
// 11/09/2026 (P10, punto 4) · Antes se ignoraba `error` y se devolvía
// `false` ante cualquier fallo, incluido uno transitorio de red o de
// Supabase — eso mandaba a `/perfil` a alguien que sí tenía perfil
// guardado, perdiéndole el paso. Un error real se propaga; solo la
// ausencia de fila (`data === null` sin error) cuenta como "sin perfil".
export async function tienePerfilGuardado(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo comprobar si hay perfil guardado: ${error.message}`);
  }

  return !!data;
}
