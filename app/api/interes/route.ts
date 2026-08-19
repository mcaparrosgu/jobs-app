import { NextResponse } from 'next/server';
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

  return NextResponse.json({ ok: true });
}
