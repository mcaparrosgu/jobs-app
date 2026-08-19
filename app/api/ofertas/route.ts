import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Instante (UTC) de la medianoche de hoy en hora de España, calculado a
// partir de las horas transcurridas desde esa medianoche — funciona igual
// en horario de invierno y de verano, sin librerías externas de fechas.
function inicioDeHoyEnMadridISO(): string {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(ahora);
  const obtener = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const horasTranscurridas = obtener('hour') + obtener('minute') / 60 + obtener('second') / 3600;
  return new Date(ahora.getTime() - horasTranscurridas * 3600 * 1000).toISOString();
}

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
  }

  const resultado = (ofertas ?? []).map((o) => ({
    id: o.id,
    titulo: o.titulo,
    empresa: o.empresa,
    enlace: o.enlace,
    interesada: idsConInteres.has(o.id),
  }));

  return NextResponse.json({ sinPerfil: false, huboIngestaHoy, ofertas: resultado });
}
