// T51, T53, T56, T57 · El endpoint que prepara el CV y la carta de una oferta.
//
// Se llama desde la pantalla de ofertas justo después de marcar "me interesa"
// (T52). Hace el trabajo dentro de la propia petición y responde cuando ha
// terminado, que es del orden de medio minuto: el estado queda guardado en la
// base de datos en todo momento, así que si la usuaria cierra la pestaña o
// recarga, la pantalla sigue sabiendo por dónde iba.

import { NextResponse } from 'next/server';
import { generarCvYCarta } from '@/lib/ia';
import { verificarCv } from '@/lib/verificarCv';
import { contarGeneracionesDeHoy, LIMITE_DIARIO, MENSAJE_LIMITE } from '@/lib/generaciones';
import { createClient } from '@/lib/supabase/server';

// Generar tarda más que una petición normal. 60 s es el máximo del plan
// gratuito de Vercel; el tiempo de espera de la llamada a la IA está puesto
// justo por debajo, en lib/ia.ts.
export const maxDuration = 60;

// Cuánto se respeta el turno de otra petición antes de darlo por abandonado.
// Si una generación lleva más de esto sin terminar, es que quien la empezó ya
// no está (pestaña cerrada, función cortada), y otra petición puede retomarla.
const MINUTOS_TURNO = 3;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const { oferta_id } = await request.json();

  if (typeof oferta_id !== 'string' || oferta_id.trim().length === 0) {
    return NextResponse.json({ error: 'Falta la oferta' }, { status: 400 });
  }

  // 1. ¿Ya está hecho? Un CV generado es definitivo (regla de negocio 7): no
  //    se regenera aunque se vuelva a pedir.
  const { data: generacion, error: errorGeneracion } = await supabase
    .from('generaciones')
    .select('id, estado, iniciado_en')
    .eq('user_id', user.id)
    .eq('oferta_id', oferta_id)
    .maybeSingle();

  if (errorGeneracion) {
    console.error('Error leyendo la generación:', errorGeneracion);
    return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
  }

  if (generacion?.estado === 'listo') {
    return NextResponse.json({ estado: 'listo' });
  }

  // 2. El límite de 5 al día (T56). Se comprueba aquí aunque la pantalla ya lo
  //    haya comprobado antes: es el servidor quien tiene que garantizarlo.
  //    Las que fallaron no gastan cupo — sería injusto cobrarle a la usuaria
  //    un intento que no le dio ningún documento.
  const cupoGastado = await contarGeneracionesDeHoy(supabase, user.id);

  if (cupoGastado === null) {
    return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
  }

  // Si esta oferta ya tenía su fila creada, esa fila ya está dentro del
  // recuento: lo que se comprueba es si el cupo está pasado, no si cabe una más.
  const yaTieneFila = Boolean(generacion);
  if (cupoGastado > LIMITE_DIARIO || (!yaTieneFila && cupoGastado >= LIMITE_DIARIO)) {
    return NextResponse.json({ estado: 'limite', error: MENSAJE_LIMITE }, { status: 429 });
  }

  // 3. Coger el turno (la "cola" de docs/05-ia.md §6.7): la garantía de que
  //    los mismos documentos no se preparan dos veces a la vez. Quien quiere
  //    generar escribe la hora en `iniciado_en`; si otra petición se le
  //    adelantó, la escritura no afecta a ninguna fila y esta se retira.
  //    Es la propia base de datos la que arbitra, no el orden en que lleguen.
  const ahora = new Date().toISOString();
  const limiteTurno = new Date(Date.now() - MINUTOS_TURNO * 60 * 1000).toISOString();
  let tengoTurno = false;

  if (!yaTieneFila) {
    const { data, error } = await supabase
      .from('generaciones')
      .insert({ user_id: user.id, oferta_id, estado: 'generando', iniciado_en: ahora })
      .select('id')
      .maybeSingle();

    // 23505 = la fila ya existía (otra petición la creó entre medias). No es
    // un fallo: simplemente se sigue por el camino del update de abajo.
    if (error && error.code !== '23505') {
      console.error('Error creando la generación:', error);
      return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
    }
    tengoTurno = Boolean(data);
  }

  if (!tengoTurno) {
    const { data, error } = await supabase
      .from('generaciones')
      .update({ estado: 'generando', iniciado_en: ahora, error_mensaje: null, avisos: [] })
      .eq('user_id', user.id)
      .eq('oferta_id', oferta_id)
      .neq('estado', 'listo')
      .or(`iniciado_en.is.null,iniciado_en.lt.${limiteTurno}`)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error tomando el turno de generación:', error);
      return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
    }
    tengoTurno = Boolean(data);
  }

  if (!tengoTurno) {
    // Otra petición (otra pestaña, un doble clic) ya está en ello.
    return NextResponse.json({ estado: 'generando', enCurso: true });
  }

  // 4. Reunir lo que necesita la IA: el CV de la usuaria y la oferta.
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('cv_texto, empresas_cv, titulos_cv')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: oferta } = await supabase
    .from('ofertas')
    .select('titulo, empresa, descripcion')
    .eq('id', oferta_id)
    .maybeSingle();

  if (!perfil?.cv_texto || !oferta) {
    const mensaje = !oferta
      ? 'Esa oferta ya no está disponible.'
      : 'Necesitamos el texto de tu CV para preparar el documento. Pégalo en tu perfil y vuelve a intentarlo.';
    await marcarError(supabase, user.id, oferta_id, mensaje);
    return NextResponse.json({ estado: 'error', error: mensaje }, { status: 400 });
  }

  // 5. Generar, verificar y guardar.
  try {
    const generado = await generarCvYCarta(perfil.cv_texto, {
      titulo: oferta.titulo,
      empresa: oferta.empresa,
      descripcion: oferta.descripcion,
    });

    const avisos = verificarCv({
      cvGenerado: generado.cv_texto,
      cvOriginal: perfil.cv_texto,
      empresasCv: perfil.empresas_cv ?? [],
      titulosCv: perfil.titulos_cv ?? [],
      ofertaTitulo: oferta.titulo,
      ofertaEmpresa: oferta.empresa,
      ofertaDescripcion: oferta.descripcion,
    });

    const { error: errorGuardado } = await supabase
      .from('generaciones')
      .update({
        estado: 'listo',
        cv_texto: generado.cv_texto,
        carta_texto: generado.carta_texto,
        avisos,
        error_mensaje: null,
      })
      .eq('user_id', user.id)
      .eq('oferta_id', oferta_id);

    if (errorGuardado) throw errorGuardado;

    return NextResponse.json({ estado: 'listo', avisos });
  } catch (error) {
    console.error('Error generando el CV y la carta:', error);
    const mensaje =
      'No se pudo preparar el documento. Vuelve a intentarlo en unos minutos: puede que el servicio de IA esté saturado.';
    await marcarError(supabase, user.id, oferta_id, mensaje);
    return NextResponse.json({ estado: 'error', error: mensaje }, { status: 502 });
  }
}

// Deja la fila en estado "error" con un mensaje que la usuaria pueda entender,
// y suelta el turno para que el botón de reintentar funcione en el acto en vez
// de tener que esperar los minutos del cerrojo.
async function marcarError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  ofertaId: string,
  mensaje: string,
) {
  const { error } = await supabase
    .from('generaciones')
    .update({ estado: 'error', error_mensaje: mensaje, iniciado_en: null })
    .eq('user_id', userId)
    .eq('oferta_id', ofertaId);

  if (error) console.error('Error marcando la generación como fallida:', error);
}
