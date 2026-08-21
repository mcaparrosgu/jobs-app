// T51, T53, T56, T57 · El endpoint que prepara el CV y la carta de una oferta.
//
// Se llama desde la pantalla de ofertas justo después de marcar "me interesa"
// (T52). Hace el trabajo dentro de la propia petición y responde cuando ha
// terminado, que es del orden de medio minuto: el estado queda guardado en la
// base de datos en todo momento, así que si la usuaria cierra la pestaña o
// recarga, la pantalla sigue sabiendo por dónde iba.

import { NextResponse } from 'next/server';
import { esErrorDeContenido, generarCvYCarta } from '@/lib/ia';
import { verificarCv } from '@/lib/verificarCv';
import { inicioDeHoyEnMadridISO } from '@/lib/fechas';
import { contarGeneracionesDeHoy, LIMITE_DIARIO, MENSAJE_LIMITE } from '@/lib/generaciones';
import { registrarEvento } from '@/lib/metricas';
import { createClient } from '@/lib/supabase/server';

// Generar tarda más que una petición normal. 60 s es el máximo del plan
// gratuito de Vercel; el tiempo de espera de la llamada a la IA está puesto
// justo por debajo, en lib/ia.ts.
export const maxDuration = 60;

// Cuánto se respeta el turno de otra petición antes de darlo por abandonado.
// Si una generación lleva más de esto sin terminar, es que quien la empezó ya
// no está (pestaña cerrada, función cortada), y otra petición puede retomarla.
const MINUTOS_TURNO = 3;

// Paso 14 · Disparador de intervención humana "umbral de fallos". No hay
// panel de administración (docs/03-spec.md §2), así que "intervención
// humana" aquí significa: un log distinguible que Mar puede revisar en
// Vercel, y un mensaje distinto para la usuaria a partir del tercer fallo
// seguido en la misma oferta.
const UMBRAL_FALLOS_HUMANO = 3;

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

  // Paso 17 (vigilancia) · desde aquí, cualquier salida de esta función es
  // una interacción real con la generación (o un intento de una) y se mide.
  const inicio = Date.now();

  // 0. Regla de negocio 2: preparar documentos SOLO para una oferta que la
  //    usuaria ha marcado como "me interesa". La pantalla ya lo respeta, pero
  //    hasta el Paso 15 el servidor no lo comprobaba: con un `oferta_id`
  //    cualquiera se podía generar para una oferta nunca marcada
  //    (seguridad/red-team-opus.md, ficha 5.2). RLS ya limita la consulta a
  //    las filas de esta usuaria.
  const { data: interes, error: errorInteres } = await supabase
    .from('intereses')
    .select('oferta_id')
    .eq('user_id', user.id)
    .eq('oferta_id', oferta_id)
    .maybeSingle();

  if (errorInteres) {
    console.error('Error comprobando el interés:', errorInteres);
    return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
  }

  if (!interes) {
    return NextResponse.json(
      { error: 'Marca antes la oferta como "me interesa".' },
      { status: 400 },
    );
  }

  // 1. ¿Ya está hecho? Un CV generado es definitivo (regla de negocio 7): no
  //    se regenera aunque se vuelva a pedir.
  const { data: generacion, error: errorGeneracion } = await supabase
    .from('generaciones')
    .select('id, estado, iniciado_en, intentos_fallidos')
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
  //    Cuando la fila todavía no existe, de esto se encarga entero
  //    `crear_generacion_con_cupo` unas líneas más abajo (migración 0014), que
  //    cuenta y crea sin dejar hueco a una condición de carrera. Aquí solo se
  //    comprueba el caso de la fila que YA existe (un reintento), donde no hay
  //    nada que crear y basta con mirar que el cupo no esté pasado.
  const yaTieneFila = Boolean(generacion);

  if (yaTieneFila) {
    const cupoGastado = await contarGeneracionesDeHoy(supabase, user.id);

    if (cupoGastado === null) {
      return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
    }

    // Esa fila ya está dentro del recuento: lo que se comprueba es si el cupo
    // está pasado, no si cabe una más.
    if (cupoGastado > LIMITE_DIARIO) {
      await registrarEvento(supabase, {
        tipo: 'generacion',
        userId: user.id,
        ofertaId: oferta_id,
        duracionMs: Date.now() - inicio,
        exito: false,
        motivoFallo: 'limite_diario',
      });
      return NextResponse.json({ estado: 'limite', error: MENSAJE_LIMITE }, { status: 429 });
    }
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
    // Paso 15 · La misma función atómica que usa /api/interes (migración
    // 0014): comprueba el cupo y crea la fila en una sola transacción, con
    // cerrojo por usuaria. Devuelve `creada: false` si otra petición se
    // adelantó, y sin `id` si el cupo estaba lleno.
    const { data, error } = await supabase
      .rpc('crear_generacion_con_cupo', {
        p_oferta_id: oferta_id,
        p_limite: LIMITE_DIARIO,
        p_inicio_del_dia: inicioDeHoyEnMadridISO(),
        // Aquí sí: esta petición se pone a generar ahora mismo.
        p_tomar_turno: true,
      })
      .maybeSingle<{ id: string | null; creada: boolean; cupo_gastado: number }>();

    if (error) {
      console.error('Error creando la generación:', error);
      return NextResponse.json({ error: 'No se pudo preparar el documento.' }, { status: 500 });
    }

    if (!data?.id) {
      await registrarEvento(supabase, {
        tipo: 'generacion',
        userId: user.id,
        ofertaId: oferta_id,
        duracionMs: Date.now() - inicio,
        exito: false,
        motivoFallo: 'limite_diario',
      });
      return NextResponse.json({ estado: 'limite', error: MENSAJE_LIMITE }, { status: 429 });
    }

    tengoTurno = Boolean(data.creada);
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
    .select('cv_texto, puesto, empresas_cv, titulos_cv')
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
    await registrarEvento(supabase, {
      tipo: 'generacion',
      userId: user.id,
      ofertaId: oferta_id,
      duracionMs: Date.now() - inicio,
      exito: false,
      motivoFallo: 'sin_perfil_o_oferta',
    });
    return NextResponse.json({ estado: 'error', error: mensaje }, { status: 400 });
  }

  // 5. Generar, verificar y guardar.
  try {
    const generado = await generarCvYCarta(perfil.cv_texto, perfil.puesto ?? '', {
      titulo: oferta.titulo,
      empresa: oferta.empresa,
      descripcion: oferta.descripcion,
    });

    const avisos = verificarCv({
      cvGenerado: generado.cv_texto,
      cartaGenerada: generado.carta_texto,
      cvOriginal: perfil.cv_texto,
      empresasCv: perfil.empresas_cv ?? [],
      titulosCv: perfil.titulos_cv ?? [],
      ofertaTitulo: oferta.titulo,
      ofertaEmpresa: oferta.empresa,
      ofertaDescripcion: oferta.descripcion,
    });

    // Paso 14, capa 2: el intento de inyección no bloqueó la generación, pero
    // sí se avisa aquí porque este documento se descarga y se envía a una
    // empresa real (docs/05-ia.md §6.2) — a diferencia de extraerPerfil,
    // donde la usuaria ya revisa el resultado siempre.
    if (generado.intentoDeInyeccion) {
      avisos.unshift(
        'Detectamos texto dentro de tu CV o de la descripción de la oferta que parecía intentar dar instrucciones a la IA. Revisa el documento con más atención antes de enviarlo.',
      );
      console.warn(`[GUARDRAIL:inyeccion] user=${user.id} oferta=${oferta_id}`);
    }

    const { error: errorGuardado } = await supabase
      .from('generaciones')
      .update({
        estado: 'listo',
        puesto_texto: generado.puesto,
        cv_texto: generado.cv_texto,
        carta_texto: generado.carta_texto,
        avisos,
        error_mensaje: null,
        intentos_fallidos: 0,
      })
      .eq('user_id', user.id)
      .eq('oferta_id', oferta_id);

    if (errorGuardado) throw errorGuardado;

    await registrarEvento(supabase, {
      tipo: 'generacion',
      userId: user.id,
      ofertaId: oferta_id,
      duracionMs: Date.now() - inicio,
      exito: true,
      guardrailSaltado: generado.intentoDeInyeccion ? 'inyeccion' : null,
      proveedor: generado.uso.proveedor,
      tokensEntrada: generado.uso.tokensEntrada,
      tokensSalida: generado.uso.tokensSalida,
    });

    return NextResponse.json({ estado: 'listo', avisos });
  } catch (error) {
    console.error('Error generando el CV y la carta:', error);
    const intentosPrevios = generacion?.intentos_fallidos ?? 0;
    const intentosFallidos = intentosPrevios + 1;

    // Paso 14 · Disparador de intervención humana "umbral de fallos": tres
    // fallos seguidos en la misma oferta sugieren un problema sistemático
    // (la oferta, no un modelo saturado puntual). Sin panel de
    // administración, la "intervención" es este log distinguible más un
    // mensaje distinto para la usuaria.
    // Paso 15 · Un fallo de contenido (el documento llegó, pero no pasó la
    // validación) no se reintenta solo: volvería a fallar igual y cada
    // reintento cuesta una cascada entera de modelos. Se responde con 422
    // para que la pantalla no entre en el bucle automático; el botón de
    // "Reintentar" sigue ahí para quien quiera insistir a mano.
    const deContenido = esErrorDeContenido(error);

    let mensaje = deContenido
      ? 'El documento que preparó la IA no pasó nuestras comprobaciones de calidad, así que no te lo mostramos. Puedes volver a intentarlo o probar con otra oferta.'
      : 'No se pudo preparar el documento. Vuelve a intentarlo en unos minutos: puede que el servicio de IA esté saturado.';

    if (intentosFallidos >= UMBRAL_FALLOS_HUMANO) {
      mensaje =
        'Ha fallado varias veces seguidas para esta oferta. Puede que haya un problema con esta oferta en concreto: prueba con otra, o inténtalo de nuevo más tarde.';
      console.error(`[GUARDRAIL:fallos-repetidos] user=${user.id} oferta=${oferta_id} intentos=${intentosFallidos}`);
    }

    await marcarError(supabase, user.id, oferta_id, mensaje, intentosFallidos);
    await registrarEvento(supabase, {
      tipo: 'generacion',
      userId: user.id,
      ofertaId: oferta_id,
      duracionMs: Date.now() - inicio,
      exito: false,
      motivoFallo: deContenido ? 'error_contenido' : 'error_proveedor',
      escaladoHumano: intentosFallidos >= UMBRAL_FALLOS_HUMANO,
    });
    return NextResponse.json({ estado: 'error', error: mensaje }, { status: deContenido ? 422 : 502 });
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
  intentosFallidos?: number,
) {
  const { error } = await supabase
    .from('generaciones')
    .update({
      estado: 'error',
      error_mensaje: mensaje,
      iniciado_en: null,
      ...(intentosFallidos !== undefined ? { intentos_fallidos: intentosFallidos } : {}),
    })
    .eq('user_id', userId)
    .eq('oferta_id', ofertaId);

  if (error) console.error('Error marcando la generación como fallida:', error);
}
