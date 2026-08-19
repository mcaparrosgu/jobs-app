import { NextResponse } from 'next/server';
import { extraerPerfil } from '@/lib/ia';

export async function POST(request: Request) {
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
