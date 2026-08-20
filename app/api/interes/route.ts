import { NextResponse } from 'next/server';
import { inicioDeHoyEnMadridISO } from '@/lib/fechas';
import { LIMITE_DIARIO, MENSAJE_LIMITE } from '@/lib/generaciones';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const cuerpo = await request.json();
  const { oferta_id } = cuerpo;

  if (typeof oferta_id !== 'string' || oferta_id.trim().length === 0) {
    return NextResponse.json({ error: 'Falta la oferta' }, { status: 400 });
  }

  // upsert + ignoreDuplicates: pulsar dos veces "me interesa" en la misma
  // oferta no da error ni duplica la fila (regla de negocio 2).
  const { error } = await supabase
    .from('intereses')
    .upsert({ user_id: user.id, oferta_id }, { onConflict: 'user_id,oferta_id', ignoreDuplicates: true });

  if (error) {
    console.error('Error guardando interés:', error);
    return NextResponse.json({ error: 'No se pudo guardar el interés.' }, { status: 500 });
  }

  // T52 · Marcar "me interesa" es lo único que dispara la preparación del CV
  // y la carta (regla de negocio 2: nunca automáticamente). Aquí solo se
  // *apunta* que hay trabajo pendiente, dejando la fila en "generando" para
  // que la pantalla lo diga de inmediato; el trabajo de verdad lo hace
  // /api/generar, que tarda del orden de medio minuto.
  const { data: existente, error: errorExistente } = await supabase
    .from('generaciones')
    .select('estado')
    .eq('user_id', user.id)
    .eq('oferta_id', oferta_id)
    .maybeSingle();

  if (errorExistente) {
    console.error('Error consultando la generación:', errorExistente);
    return NextResponse.json({ ok: true, generacion: null });
  }

  if (existente) {
    return NextResponse.json({ ok: true, generacion: { estado: existente.estado } });
  }

  // El límite diario se comprueba antes de crear nada (regla de negocio 5).
  // El interés queda guardado igual: la usuaria podrá preparar el documento
  // mañana sin tener que volver a buscar la oferta.
  //
  // Paso 15 · Contar y luego insertar no era atómico: cinco pestañas marcando
  // interés a la vez leían todas "0 gastadas" y se saltaban el límite de 5
  // (seguridad/red-team-opus.md, ficha 5.3). `crear_generacion_con_cupo`
  // (migración 0014) hace las dos cosas en la misma transacción, con un
  // cerrojo por usuaria dentro de la propia base de datos.
  const { data: creacion, error: errorCrear } = await supabase
    .rpc('crear_generacion_con_cupo', {
      p_oferta_id: oferta_id,
      p_limite: LIMITE_DIARIO,
      p_inicio_del_dia: inicioDeHoyEnMadridISO(),
      // Aquí solo se apunta que hay trabajo pendiente: el turno lo coge
      // /api/generar, que es quien de verdad se pone a ello. Si se marcara
      // desde aquí, esa petición vería el turno ocupado y contestaría "ya se
      // está preparando" sin que nadie lo estuviera preparando.
      p_tomar_turno: false,
    })
    .maybeSingle<{ id: string | null; creada: boolean; cupo_gastado: number }>();

  if (errorCrear) {
    console.error('Error creando la generación:', errorCrear);
    return NextResponse.json({ ok: true, generacion: null });
  }

  // Sin fila y sin haberla creado: el cupo del día estaba lleno.
  if (!creacion?.id) {
    return NextResponse.json({ ok: true, generacion: null, limite: MENSAJE_LIMITE });
  }

  return NextResponse.json({ ok: true, generacion: { estado: 'generando' } });
}
