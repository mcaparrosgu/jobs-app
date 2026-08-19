import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre, puesto, telefono, enlace, palabras_clave, cv_texto, usar_experiencia_cv, empresas_cv, titulos_cv')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error leyendo perfil:', error);
    return NextResponse.json({ error: 'No se pudo leer el perfil.' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const cuerpo = await request.json();
  const { nombre, puesto, telefono, enlace, palabras_clave, cv_texto, usar_experiencia_cv, empresas_cv, titulos_cv } =
    cuerpo;

  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    return NextResponse.json({ error: 'Falta tu nombre completo' }, { status: 400 });
  }
  if (typeof puesto !== 'string' || puesto.trim().length === 0) {
    return NextResponse.json({ error: 'Falta el puesto' }, { status: 400 });
  }
  if (!Array.isArray(palabras_clave) || palabras_clave.length === 0) {
    return NextResponse.json({ error: 'Faltan palabras clave' }, { status: 400 });
  }

  const { error } = await supabase.from('perfiles').upsert(
    {
      user_id: user.id,
      nombre: nombre.trim(),
      puesto,
      telefono: typeof telefono === 'string' && telefono.trim().length > 0 ? telefono.trim() : null,
      enlace: typeof enlace === 'string' && enlace.trim().length > 0 ? enlace.trim() : null,
      palabras_clave,
      cv_texto: cv_texto ?? null,
      usar_experiencia_cv: Boolean(usar_experiencia_cv),
      empresas_cv: Array.isArray(empresas_cv) ? empresas_cv : [],
      titulos_cv: Array.isArray(titulos_cv) ? titulos_cv : [],
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('Error guardando perfil:', error);
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
