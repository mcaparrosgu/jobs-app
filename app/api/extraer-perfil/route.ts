import { NextResponse } from 'next/server';
import { extraerPerfil } from '@/lib/ia';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Se comprueba antes de leer el cuerpo y antes de llamar al modelo:
  // sin esto, cualquiera que conociera la URL podría gastar la cuota de
  // OpenRouter sin haber entrado nunca en la web.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const { cv } = await request.json();

  if (typeof cv !== 'string' || cv.trim().length === 0) {
    return NextResponse.json({ error: 'Falta el texto del CV' }, { status: 400 });
  }

  try {
    const perfil = await extraerPerfil(cv);
    return NextResponse.json(perfil);
  } catch (error) {
    console.error('Error extrayendo perfil:', error);
    return NextResponse.json(
      { error: 'No se pudo analizar el CV. Inténtalo de nuevo en unos segundos.' },
      { status: 502 },
    );
  }
}
