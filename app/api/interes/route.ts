import { NextResponse } from 'next/server';
import { contarGeneracionesDeHoy, LIMITE_DIARIO, MENSAJE_LIMITE } from '@/lib/generaciones';
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
  const cupoGastado = await contarGeneracionesDeHoy(supabase, user.id);
  if (cupoGastado !== null && cupoGastado >= LIMITE_DIARIO) {
    return NextResponse.json({ ok: true, generacion: null, limite: MENSAJE_LIMITE });
  }

  const { error: errorCrear } = await supabase
    .from('generaciones')
    .insert({ user_id: user.id, oferta_id, estado: 'generando' });

  // 23505 = ya existía (dos pulsaciones a la vez). No es un fallo.
  if (errorCrear && errorCrear.code !== '23505') {
    console.error('Error creando la generación:', errorCrear);
    return NextResponse.json({ ok: true, generacion: null });
  }

  return NextResponse.json({ ok: true, generacion: { estado: 'generando' } });
}
