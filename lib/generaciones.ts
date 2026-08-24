// El límite de 5 documentos por usuaria y día (regla de negocio 5 de
// docs/03-spec.md), en un solo sitio.
//
// Lo consultan dos endpoints: el de "me interesa", para no dejar en marcha
// algo que no va a poder hacerse, y el de generar, que es quien de verdad lo
// impone. Tenerlo repetido en dos ficheros sería la forma más fácil de que un
// día dijeran cosas distintas.

import type { SupabaseClient } from '@supabase/supabase-js';
import { inicioDeHoyEnMadridISO } from '@/lib/fechas';

export const LIMITE_DIARIO = 5;

export const MENSAJE_LIMITE =
  `Has llegado al máximo de ${LIMITE_DIARIO} documentos por hoy. Mañana podrás preparar más; ` +
  'los que ya tienes siguen disponibles.';

// El botón "Rehacer" (T93, 23/08/2026): pedido explícito de Mar de que NO
// gaste el cupo diario de arriba, sino que tenga su propio límite por oferta
// — así una mala racha rehaciendo un documento no le come a la usuaria (ni al
// resto de la clase) el cupo de las demás ofertas del día.
export const MAXIMO_REHECHOS = 2;

export const MENSAJE_LIMITE_REHACER =
  `Ya has rehecho este documento ${MAXIMO_REHECHOS} veces, el máximo permitido. ` +
  'El que tienes ahora sigue disponible para descargar.';

// Cuenta lo que la usuaria lleva hoy. Las generaciones que fallaron no cuentan:
// sería injusto gastarle cupo en un intento que no le dio ningún documento.
// "Hoy" es el día natural español, no el del reloj del servidor (lib/fechas.ts).
export async function contarGeneracionesDeHoy(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from('generaciones')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('estado', ['listo', 'generando'])
    .gte('creado_en', inicioDeHoyEnMadridISO());

  if (error) {
    console.error('Error contando las generaciones de hoy:', error);
    return null;
  }
  return count ?? 0;
}
