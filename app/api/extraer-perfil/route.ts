import { NextResponse } from 'next/server';
import { extraerPerfil } from '@/lib/ia';
import { evaluarAmbitoCv } from '@/lib/guardrails';
import {
  apuntarExtraccion,
  contarExtraccionesDeHoy,
  LIMITE_EXTRACCIONES_DIARIAS,
  MENSAJE_LIMITE_EXTRACCIONES,
} from '@/lib/extracciones';
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

  // Paso 14, capa 1 (relevancia): se comprueba también aquí, antes de llamar
  // a extraerPerfil, para que un texto claramente fuera de ámbito no llegue
  // ni a gastar cuota del modelo — el mismo motivo por el que el límite
  // diario (lib/generaciones.ts) también se comprueba en el servidor.
  const ambito = evaluarAmbitoCv(cv);
  if (!ambito.permitido) {
    return NextResponse.json({ error: ambito.motivo }, { status: 400 });
  }

  // Paso 15 · El límite diario (lib/extracciones.ts). Esta llamada gasta de
  // la misma cuota compartida que la generación, y hasta ahora era la única
  // de las dos sin ningún tope: seguridad/red-team-opus.md, ficha 7.1.
  const analisisDeHoy = await contarExtraccionesDeHoy(supabase, user.id);
  if (analisisDeHoy === null) {
    return NextResponse.json({ error: 'No se pudo analizar el CV.' }, { status: 500 });
  }
  if (analisisDeHoy >= LIMITE_EXTRACCIONES_DIARIAS) {
    return NextResponse.json({ error: MENSAJE_LIMITE_EXTRACCIONES }, { status: 429 });
  }

  await apuntarExtraccion(supabase, user.id);

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
