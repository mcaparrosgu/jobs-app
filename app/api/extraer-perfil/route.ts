import { NextResponse } from 'next/server';
import { extraerPerfil } from '@/lib/ia';
import { createClient } from '@/lib/supabase/server';

// Dos rondas de OpenRouter más el respaldo en Groq (lib/ia.ts) pueden sumar
// hasta ~40 s en el peor caso. Sin esto, la función se corta a los 10 s por
// defecto del plan gratuito de Vercel antes de que le dé tiempo a intentarlo
// todo — el mismo motivo por el que app/api/generar/route.ts ya lo tenía.
export const maxDuration = 60;

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
