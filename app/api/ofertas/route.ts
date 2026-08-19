import { NextResponse } from 'next/server';
import { inicioDeHoyEnMadridISO } from '@/lib/fechas';
import { contarGeneracionesDeHoy, LIMITE_DIARIO } from '@/lib/generaciones';
import { createClient } from '@/lib/supabase/server';

// Quita caracteres que romperían la sintaxis del filtro .or() de Supabase.
function limpiarTermino(termino: string): string {
  return termino.replace(/[,()%*]/g, '').trim();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('perfiles')
    .select('puesto, palabras_clave, usar_experiencia_cv, empresas_cv, titulos_cv')
    .eq('user_id', user.id)
    .maybeSingle();

  if (errorPerfil) {
    console.error('Error leyendo perfil:', errorPerfil);
    return NextResponse.json({ error: 'No se pudo leer tu perfil.' }, { status: 500 });
  }

  if (!perfil || !perfil.puesto) {
    return NextResponse.json({ sinPerfil: true, huboIngestaHoy: true, ofertas: [] });
  }

  const inicioHoy = inicioDeHoyEnMadridISO();
  const { count: ofertasHoy, error: errorConteo } = await supabase
    .from('ofertas')
    .select('id', { count: 'exact', head: true })
    .gte('ingerida_en', inicioHoy);

  if (errorConteo) {
    console.error('Error comprobando la ingesta de hoy:', errorConteo);
    return NextResponse.json({ error: 'No se pudieron consultar las ofertas.' }, { status: 500 });
  }

  const huboIngestaHoy = (ofertasHoy ?? 0) > 0;

  const terminos = Array.from(
    new Set(
      [
        perfil.puesto,
        ...(perfil.palabras_clave ?? []),
        ...(perfil.usar_experiencia_cv
          ? [...(perfil.empresas_cv ?? []), ...(perfil.titulos_cv ?? [])]
          : []),
      ]
        .map((t) => limpiarTermino(String(t ?? '')))
        .filter((t) => t.length > 0),
    ),
  );

  if (terminos.length === 0) {
    return NextResponse.json({ sinPerfil: false, huboIngestaHoy, ofertas: [] });
  }

  const filtro = terminos.map((t) => `titulo.ilike.*${t}*,descripcion.ilike.*${t}*`).join(',');

  const { data: ofertas, error: errorOfertas } = await supabase
    .from('ofertas')
    .select('id, titulo, empresa, enlace, ingerida_en')
    .or(filtro)
    .order('ingerida_en', { ascending: false })
    .limit(50);

  if (errorOfertas) {
    console.error('Error consultando ofertas:', errorOfertas);
    return NextResponse.json({ error: 'No se pudieron consultar las ofertas.' }, { status: 500 });
  }

  const ids = (ofertas ?? []).map((o) => o.id);
  let idsConInteres = new Set<string>();
  // Estado de preparación del CV y la carta de cada oferta (Hito 6): es lo que
  // mueve el indicador de "preparando…" y, más adelante, el botón de descarga.
  const generaciones = new Map<string, { estado: string; avisos: string[]; error: string | null }>();

  if (ids.length > 0) {
    const { data: intereses, error: errorIntereses } = await supabase
      .from('intereses')
      .select('oferta_id')
      .eq('user_id', user.id)
      .in('oferta_id', ids);

    if (errorIntereses) {
      console.error('Error consultando intereses:', errorIntereses);
    } else {
      idsConInteres = new Set((intereses ?? []).map((i) => i.oferta_id));
    }

    const { data: filas, error: errorGeneraciones } = await supabase
      .from('generaciones')
      .select('oferta_id, estado, avisos, error_mensaje')
      .eq('user_id', user.id)
      .in('oferta_id', ids);

    if (errorGeneraciones) {
      console.error('Error consultando generaciones:', errorGeneraciones);
    } else {
      for (const fila of filas ?? []) {
        generaciones.set(fila.oferta_id, {
          estado: fila.estado,
          avisos: fila.avisos ?? [],
          error: fila.error_mensaje,
        });
      }
    }
  }

  const resultado = (ofertas ?? []).map((o) => ({
    id: o.id,
    titulo: o.titulo,
    empresa: o.empresa,
    enlace: o.enlace,
    interesada: idsConInteres.has(o.id),
    generacion: generaciones.get(o.id) ?? null,
  }));

  const cupoGastado = await contarGeneracionesDeHoy(supabase, user.id);

  return NextResponse.json({
    sinPerfil: false,
    huboIngestaHoy,
    ofertas: resultado,
    limiteAlcanzado: cupoGastado !== null && cupoGastado >= LIMITE_DIARIO,
  });
}
