// Paso 17 (vigilancia) · Métricas de las dos llamadas a IA, en un solo sitio
// (mismo patrón que lib/generaciones.ts y lib/extracciones.ts: un fichero,
// una tabla, sin lógica repetida en cada endpoint).
//
// No hay panel de administración (docs/03-spec.md §2), así que esto no lo ve
// ninguna usuaria — es la vigilancia de Mar, documentada en
// docs/08-rutina.md. Cada fila es UNA interacción con la IA (una llamada a
// extraerPerfil o a generarCvYCarta), acabe bien o mal, con lo necesario
// para las cinco señales que pide el Paso 17: coste (aquí, tokens
// consumidos — 0 € siempre, docs/05-ia.md §5, así que el número que importa
// de verdad es el cupo gastado contra el límite de Groq), tiempo de
// respuesta, tasa de éxito, guardrails saltados y escaladas a humano.
//
// Regla de oro: registrar una métrica NUNCA puede romper la generación real.
// Si el insert falla, se avisa por consola y se sigue — una fila de métrica
// perdida es un problema pequeño; una usuaria sin su CV por un fallo de
// telemetría sería un problema real.

import type { SupabaseClient } from '@supabase/supabase-js';

export type TipoInteraccion = 'perfil' | 'generacion';

// Por qué falló, cuando `exito` es false. No es un catálogo exhaustivo de
// errores técnicos: es el mismo catálogo de fallos de docs/05-ia.md §6,
// reducido a lo que se puede distinguir sin analizar cada mensaje a mano.
export type MotivoFallo =
  | 'error_contenido' // la IA respondió, pero el resultado no pasó la validación (ErrorDeContenido)
  | 'error_proveedor' // ningún modelo respondió a tiempo o con éxito (red, 429, 5xx, timeout)
  | 'limite_diario' // se cortó ANTES de llamar a la IA: cupo diario agotado
  | 'sin_perfil_o_oferta'; // faltaba el CV o la oferta ya no existía

// Qué capa de docs/14 (guardrails) saltó, si alguna. `null` si ninguna.
export type GuardrailSaltado =
  | 'ambito'
  | 'inyeccion'
  | 'contenido_inapropiado'
  | 'titular_inseguro'
  | 'marcador_relleno'
  | null;

export type EventoIA = {
  tipo: TipoInteraccion;
  userId: string;
  ofertaId?: string | null;
  duracionMs: number;
  exito: boolean;
  motivoFallo?: MotivoFallo | null;
  guardrailSaltado?: GuardrailSaltado;
  // Paso 14 · umbral de fallos: true cuando esta misma oferta ya lleva
  // UMBRAL_FALLOS_HUMANO fallos seguidos (app/api/generar/route.ts). Es la
  // señal de "esto ya no es una racha mala, hay que mirarlo a mano".
  escaladoHumano?: boolean;
  tokensEntrada?: number | null;
  tokensSalida?: number | null;
  proveedor?: string | null;
};

// Se le pasa el cliente de Supabase de la propia petición (el de la usuaria,
// no uno con la clave de servicio): RLS en `metricas_ia` solo permite
// insertar filas propias, igual que en `extracciones` y `generaciones`.
export async function registrarEvento(supabase: SupabaseClient, evento: EventoIA): Promise<void> {
  const { error } = await supabase.from('metricas_ia').insert({
    tipo: evento.tipo,
    user_id: evento.userId,
    oferta_id: evento.ofertaId ?? null,
    duracion_ms: Math.round(evento.duracionMs),
    exito: evento.exito,
    motivo_fallo: evento.motivoFallo ?? null,
    guardrail_saltado: evento.guardrailSaltado ?? null,
    escalado_humano: evento.escaladoHumano ?? false,
    tokens_entrada: evento.tokensEntrada ?? null,
    tokens_salida: evento.tokensSalida ?? null,
    proveedor: evento.proveedor ?? null,
  });

  // No se relanza ni se propaga: ver la nota de cabecera.
  if (error) console.error('Error registrando métrica de IA:', error);
}
