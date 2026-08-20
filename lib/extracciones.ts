// Paso 15 · El límite diario de análisis de CV, en un solo sitio (mismo
// patrón que lib/generaciones.ts).
//
// Por qué existe: /api/generar tenía su límite de 5/día desde el principio,
// pero /api/extraer-perfil no tenía ninguno, y las dos llamadas gastan de la
// MISMA cuota — 50 peticiones al día para las cinco usuarias juntas. Un bucle
// de `fetch` desde la consola del navegador, o simplemente alguien dándole
// muchas veces a "analizar mi CV", dejaba a todo el mundo sin servicio hasta
// el día siguiente (seguridad/red-team-opus.md, ficha 7.1).
//
// 10 es deliberadamente holgado: pegar el CV, ver que ha salido raro,
// corregirlo y volver a analizarlo son tres o cuatro intentos en una tarde
// mala. Lo que corta es el abuso, no el uso.

import type { SupabaseClient } from '@supabase/supabase-js';
import { inicioDeHoyEnMadridISO } from '@/lib/fechas';

export const LIMITE_EXTRACCIONES_DIARIAS = 10;

export const MENSAJE_LIMITE_EXTRACCIONES =
  `Has analizado tu CV ${LIMITE_EXTRACCIONES_DIARIAS} veces hoy, que es el máximo. ` +
  'Mañana podrás volver a hacerlo; mientras tanto, puedes editar a mano el puesto y las palabras clave.';

// Cuenta los análisis de hoy. "Hoy" es el día natural español, no el del
// reloj del servidor (lib/fechas.ts), igual que en las generaciones.
export async function contarExtraccionesDeHoy(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from('extracciones')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('creado_en', inicioDeHoyEnMadridISO());

  if (error) {
    console.error('Error contando las extracciones de hoy:', error);
    return null;
  }
  return count ?? 0;
}

// Se apunta ANTES de llamar al modelo, no después: si se apuntara al final,
// una ráfaga de peticiones simultáneas pasaría entera el control (todas leen
// el mismo recuento antiguo) y el límite no serviría de nada. Que un intento
// fallido gaste cupo es el precio de que el límite se cumpla de verdad; con
// 10 al día sobra margen.
export async function apuntarExtraccion(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('extracciones').insert({ user_id: userId });
  if (error) console.error('Error apuntando la extracción:', error);
}
