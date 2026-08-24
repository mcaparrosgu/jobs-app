// T93 · El endpoint del botón "Rehacer" (docs/03-spec.md, regla de negocio 7:
// un documento generado es definitivo — "Rehacer" es la única excepción, y
// solo porque la pide explícitamente la propia usuaria). Tiene su propio
// límite (MAXIMO_REHECHOS, lib/generaciones.ts), aparte del cupo diario de 5
// documentos/día: decisión de Mar, 23/08/2026, para que una mala racha
// rehaciendo un documento no le coma a nadie el cupo del resto de ofertas del
// día.
//
// A diferencia de /api/generar, aquí NO hay cerrojo de turno ni recuperación
// tras recargar la página: la fila nunca sale de estado "listo" (el documento
// anterior sigue siendo válido y descargable en todo momento), así que si la
// petición falla o se corta a medias no hay nada que reanudar — la usuaria
// simplemente vuelve a pulsar "Rehacer" y conserva lo que ya tenía.

import { NextResponse } from 'next/server';
import {
  esErrorDeContenido,
  generarCvYCarta,
  puestoMasRelevante,
  MAXIMO_CARACTERES_INSTRUCCIONES,
} from '@/lib/ia';
import { verificarCv } from '@/lib/verificarCv';
import { MAXIMO_REHECHOS, MENSAJE_LIMITE_REHACER } from '@/lib/generaciones';
import { registrarEvento } from '@/lib/metricas';
import { createClient } from '@/lib/supabase/server';

// Mismo margen que /api/generar: una llamada a la IA puede tardar del orden
// de medio minuto (lib/ia.ts).
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
  }

  const { oferta_id, instrucciones } = await request.json();

  if (typeof oferta_id !== 'string' || oferta_id.trim().length === 0) {
    return NextResponse.json({ error: 'Falta la oferta' }, { status: 400 });
  }

  const instruccionesLimpias = typeof instrucciones === 'string' ? instrucciones.trim() : '';
  if (instruccionesLimpias.length === 0) {
    return NextResponse.json({ error: 'Cuéntanos qué te gustaría cambiar.' }, { status: 400 });
  }
  if (instruccionesLimpias.length > MAXIMO_CARACTERES_INSTRUCCIONES) {
    return NextResponse.json(
      {
        error: `Esa petición es demasiado larga (máximo ${MAXIMO_CARACTERES_INSTRUCCIONES} caracteres).`,
      },
      { status: 400 },
    );
  }

  // Paso 17 (vigilancia): igual que /api/generar, cualquier salida de aquí en
  // adelante es una interacción real con la IA (o un intento de una) y se
  // mide.
  const inicio = Date.now();

  // 1. Solo se puede rehacer un documento que YA está listo. RLS ya limita
  //    esta fila a las de esta usuaria; el .eq de abajo es además la forma de
  //    pedir la oferta concreta.
  const { data: generacion, error: errorGeneracion } = await supabase
    .from('generaciones')
    .select('id, estado, rehechos')
    .eq('user_id', user.id)
    .eq('oferta_id', oferta_id)
    .maybeSingle();

  if (errorGeneracion) {
    console.error('Error leyendo la generación para rehacer:', errorGeneracion);
    return NextResponse.json({ error: 'No se pudo rehacer el documento.' }, { status: 500 });
  }

  if (!generacion || generacion.estado !== 'listo') {
    return NextResponse.json(
      { error: 'Todavía no tienes un documento generado para esa oferta.' },
      { status: 400 },
    );
  }

  // 2. El límite propio de rehechos (T93). Las que fallan no cuentan: se
  //    incrementa el contador más abajo, solo si termina en un documento
  //    nuevo guardado con éxito.
  if (generacion.rehechos >= MAXIMO_REHECHOS) {
    return NextResponse.json({ estado: 'limite', error: MENSAJE_LIMITE_REHACER }, { status: 429 });
  }

  // 3. Reunir lo que necesita la IA: el CV de la usuaria y la oferta — mismos
  //    datos que /api/generar.
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('cv_texto, puestos, empresas_cv, titulos_cv')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: oferta } = await supabase
    .from('ofertas')
    .select('titulo, empresa, descripcion')
    .eq('id', oferta_id)
    .maybeSingle();

  if (!perfil?.cv_texto || !oferta) {
    const mensaje = !oferta
      ? 'Esa oferta ya no está disponible.'
      : 'Necesitamos el texto de tu CV para rehacer el documento. Pégalo en tu perfil y vuelve a intentarlo.';
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }

  // 4. Generar, verificar y guardar — SOLO si todo sale bien. Si algo falla,
  //    no se toca la fila: el documento anterior (todavía en `cv_texto` /
  //    `carta_texto`) sigue siendo el que se descarga.
  try {
    const puestoPerfil = puestoMasRelevante(perfil.puestos ?? [], oferta.titulo);
    const generado = await generarCvYCarta(
      perfil.cv_texto,
      puestoPerfil,
      { titulo: oferta.titulo, empresa: oferta.empresa, descripcion: oferta.descripcion },
      instruccionesLimpias,
    );

    const avisos = verificarCv({
      cvGenerado: generado.cv_texto,
      cartaGenerada: generado.carta_texto,
      cvOriginal: perfil.cv_texto,
      empresasCv: perfil.empresas_cv ?? [],
      titulosCv: perfil.titulos_cv ?? [],
      ofertaTitulo: oferta.titulo,
      ofertaEmpresa: oferta.empresa,
      ofertaDescripcion: oferta.descripcion,
    });

    if (generado.intentoDeInyeccion) {
      avisos.unshift(
        'Detectamos texto dentro de tu CV o de la descripción de la oferta que parecía intentar dar instrucciones a la IA. Revisa el documento con más atención antes de enviarlo.',
      );
      console.warn(`[GUARDRAIL:inyeccion] user=${user.id} oferta=${oferta_id}`);
    }

    const rehechosNuevo = generacion.rehechos + 1;
    const { error: errorGuardado } = await supabase
      .from('generaciones')
      .update({
        puesto_texto: generado.puesto,
        cv_texto: generado.cv_texto,
        carta_texto: generado.carta_texto,
        avisos,
        rehechos: rehechosNuevo,
      })
      .eq('user_id', user.id)
      .eq('oferta_id', oferta_id);

    if (errorGuardado) throw errorGuardado;

    await registrarEvento(supabase, {
      tipo: 'generacion',
      userId: user.id,
      ofertaId: oferta_id,
      duracionMs: Date.now() - inicio,
      exito: true,
      guardrailSaltado: generado.intentoDeInyeccion ? 'inyeccion' : null,
      proveedor: generado.uso.proveedor,
      tokensEntrada: generado.uso.tokensEntrada,
      tokensSalida: generado.uso.tokensSalida,
    });

    return NextResponse.json({ estado: 'listo', avisos, rehechos: rehechosNuevo });
  } catch (error) {
    console.error('Error rehaciendo el CV y la carta:', error);
    const deContenido = esErrorDeContenido(error);

    const mensaje = deContenido
      ? 'Lo que preparó la IA esta vez no pasó nuestras comprobaciones de calidad, así que no lo guardamos: el documento que ya tenías sigue disponible. Puedes volver a intentarlo.'
      : 'No se pudo rehacer el documento; puede que el servicio de IA esté saturado. El documento que ya tenías sigue disponible.';

    await registrarEvento(supabase, {
      tipo: 'generacion',
      userId: user.id,
      ofertaId: oferta_id,
      duracionMs: Date.now() - inicio,
      exito: false,
      motivoFallo: deContenido ? 'error_contenido' : 'error_proveedor',
    });

    return NextResponse.json({ estado: 'error', error: mensaje }, { status: deContenido ? 422 : 502 });
  }
}
