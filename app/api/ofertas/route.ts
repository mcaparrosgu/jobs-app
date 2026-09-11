import { NextResponse } from 'next/server';
import { haceDiasEnMadridISO, inicioDeHoyEnMadridISO } from '@/lib/fechas';
import { contarGeneracionesDeHoy, LIMITE_DIARIO } from '@/lib/generaciones';
import { normalizarPalabrasClave, paraComparar } from '@/lib/palabras-clave';
import { createClient } from '@/lib/supabase/server';

// Con una sola palabra clave coincidiendo bastaba para enseñar la oferta, y
// un perfil con términos de herramienta genéricos (Docker, Python, CRUD...)
// hace que cualquier oferta técnica no relacionada cuele con solo uno de
// ellos. Exigir 2 coincidencias distintas reduce mucho esos falsos
// positivos. La excepción es un acierto en un PUESTO (ver más abajo): con
// uno basta, para no dejar sin ofertas a un perfil de nicho con dos títulos
// y pocas palabras clave.
const MINIMO_TERMINOS_COINCIDENTES = 2;

// P10 (11/09/2026, punto 1) · Dos términos del propio perfil pueden estar uno
// dentro del otro ("Project Manager" y "Manager"): sobre una misma oferta que
// dice "Project Manager", los dos contaban como coincidencias distintas y
// bastaban para saltarse `MINIMO_TERMINOS_COINCIDENTES` con una sola señal
// real, no dos. Se cuenta el término más específico que coincide y se
// descarta cualquier otro que sea substring suyo.
function contarTerminosCoincidentes(texto: string, terminos: string[]): number {
  const comparable = paraComparar(texto);
  const coincidentes = terminos.map(paraComparar).filter((t) => comparable.includes(t));
  const independientes = coincidentes.filter(
    (t, i) => !coincidentes.some((otro, j) => i !== j && otro.length > t.length && otro.includes(t)),
  );
  return new Set(independientes).size;
}

// Añadido el 23/08/2026 (T85), a petición de Mar: una oferta se queda
// visible 15 días desde que se encontró, aunque siga coincidiendo con el
// perfil — así hay margen para pensárselo sin que la lista crezca sin fin.
// Pasados los 15 días desaparece de verdad (no es solo un separador visual).
const DIAS_CADUCIDAD_OFERTAS = 15;

// P10 (11/09/2026, punto 3) · El `.limit(150)` de la consulta de candidatas,
// más abajo, es a propósito más amplio que lo que se enseña (el umbral real
// se aplica después en JS). Pero nada recortaba el resultado FINAL a lo que
// de verdad se muestra: con un perfil laxo, `ofertasRelevantes` podía llegar
// hasta 150. Tope explícito, aplicado tras el filtro del umbral.
const LIMITE_OFERTAS_MOSTRADAS = 50;

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

  // Los términos que salen solo de los puestos, para el atajo de "un puesto
  // basta" al aplicar el umbral (ver más abajo).
  const terminosPuesto = normalizarPalabrasClave(perfil.puestos)
    .map(limpiarTermino)
    .filter((t) => t.length > 0);

  if (terminos.length === 0) {
    return NextResponse.json({ sinPerfil: false, huboIngestaHoy, ofertas: [] });
  }

  const filtro = terminos.map((t) => `titulo.ilike.*${t}*,descripcion.ilike.*${t}*`).join(',');

  let consultaOfertas = supabase
    .from('ofertas')
    .select('id, titulo, descripcion, empresa, enlace, salario_eur, ingerida_en')
    .gte('ingerida_en', haceDiasEnMadridISO(DIAS_CADUCIDAD_OFERTAS))
    .or(filtro)
    .order('ingerida_en', { ascending: false })
    // Más candidatas de las que se van a enseñar: el filtro de arriba solo
    // exige 1 coincidencia (es lo más permisivo que sabe hacer `.or()` en
    // SQL sin una consulta gigante); el umbral de verdad se aplica después,
    // en JS, sobre este conjunto más amplio.
    .limit(150);

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

  // Con un perfil de un único término (p. ej. solo un puesto marcado, sin
  // palabras clave) exigir 2 coincidencias dejaría siempre la lista vacía.
  const umbral = Math.min(MINIMO_TERMINOS_COINCIDENTES, terminos.length);
  const ofertasRelevantes = (ofertas ?? []).filter((o) => {
    const texto = `${o.titulo} ${o.descripcion ?? ''}`;
    // Un acierto en un PUESTO que la usuaria eligió es señal fuerte de por
    // sí: con uno basta. El umbral de 2 se reserva para el encaje que es solo
    // de palabras clave, que es donde estaban los falsos positivos (una
    // herramienta genérica —Docker, Python— suelta en una oferta de otro
    // sector). Sin este atajo, un perfil de nicho con dos títulos y pocas
    // palabras clave se quedaba sin ofertas en cuanto el anuncio nombraba
    // solo uno de los dos.
    if (contarTerminosCoincidentes(texto, terminosPuesto) >= 1) return true;
    return contarTerminosCoincidentes(texto, terminos) >= umbral;
  }).slice(0, LIMITE_OFERTAS_MOSTRADAS);

  const ids = ofertasRelevantes.map((o) => o.id);
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

  const resultado = ofertasRelevantes.map((o) => ({
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
