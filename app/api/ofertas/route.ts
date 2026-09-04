import { NextResponse } from 'next/server';
import { haceDiasEnMadridISO, inicioDeHoyEnMadridISO } from '@/lib/fechas';
import { contarGeneracionesDeHoy, LIMITE_DIARIO } from '@/lib/generaciones';
import { normalizarPalabrasClave } from '@/lib/palabras-clave';
import { createClient } from '@/lib/supabase/server';

// Añadido el 23/08/2026 (T85), a petición de Mar: una oferta se queda
// visible 15 días desde que se encontró, aunque siga coincidiendo con el
// perfil — así hay margen para pensárselo sin que la lista crezca sin fin.
// Pasados los 15 días desaparece de verdad (no es solo un separador visual).
const DIAS_CADUCIDAD_OFERTAS = 15;

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
    .select('puestos, palabras_clave, usar_experiencia_cv, empresas_cv, titulos_cv, salario_minimo')
    .eq('user_id', user.id)
    .maybeSingle();

  if (errorPerfil) {
    console.error('Error leyendo perfil:', errorPerfil);
    return NextResponse.json({ error: 'No se pudo leer tu perfil.' }, { status: 500 });
  }

  if (!perfil || !perfil.puestos || perfil.puestos.length === 0) {
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

  // Cada término se busca literalmente dentro del título y la descripción, así
  // que antes se recorta al núcleo: un título de perfil o una titulación
  // enteros ("Grado en Administración y Dirección de Empresas") no coinciden
  // con ninguna oferta. Ver lib/palabras-clave.ts.
  const terminos = normalizarPalabrasClave([
    ...perfil.puestos,
    ...(perfil.palabras_clave ?? []),
    ...(perfil.usar_experiencia_cv
      ? [...(perfil.empresas_cv ?? []), ...(perfil.titulos_cv ?? [])]
      : []),
  ])
    .map(limpiarTermino)
    .filter((t) => t.length > 0);

  if (terminos.length === 0) {
    return NextResponse.json({ sinPerfil: false, huboIngestaHoy, ofertas: [] });
  }

  const filtro = terminos.map((t) => `titulo.ilike.*${t}*,descripcion.ilike.*${t}*`).join(',');

  let consultaOfertas = supabase
    .from('ofertas')
    .select('id, titulo, empresa, enlace, salario_eur, ingerida_en')
    .gte('ingerida_en', haceDiasEnMadridISO(DIAS_CADUCIDAD_OFERTAS))
    .or(filtro)
    .order('ingerida_en', { ascending: false })
    .limit(50);

  // Salario mínimo, opcional y por usuaria (antes era un umbral fijo en la
  // ingesta de n8n, calibrado al perfil de Mar, y aplicaba a todo el mundo).
  // Sin dato conocido en la oferta -> pasa igual, mismo criterio que tenía
  // el filtro viejo.
  if (Number.isFinite(perfil.salario_minimo)) {
    const minimo = Math.trunc(perfil.salario_minimo as number);
    consultaOfertas = consultaOfertas.or(`salario_eur.is.null,salario_eur.gte.${minimo}`);
  }

  const { data: ofertas, error: errorOfertas } = await consultaOfertas;

  if (errorOfertas) {
    console.error('Error consultando ofertas:', errorOfertas);
    return NextResponse.json({ error: 'No se pudieron consultar las ofertas.' }, { status: 500 });
  }

  const ids = (ofertas ?? []).map((o) => o.id);
  let idsConInteres = new Set<string>();
  // Estado de preparación del CV y la carta de cada oferta (Hito 6): es lo que
  // mueve el indicador de "preparando…" y, más adelante, el botón de descarga.
  const generaciones = new Map<
    string,
    { estado: string; avisos: string[]; error: string | null; rehechos: number }
  >();

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
      .select('oferta_id, estado, avisos, error_mensaje, rehechos')
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
          rehechos: fila.rehechos ?? 0,
        });
      }
    }
  }

  const resultado = (ofertas ?? []).map((o) => ({
    id: o.id,
    titulo: o.titulo,
    empresa: o.empresa,
    enlace: o.enlace,
    ingerida_en: o.ingerida_en,
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
