import { NextResponse } from 'next/server';
import { evaluarAmbitoCv } from '@/lib/guardrails';
import { paraComparar } from '@/lib/palabras-clave';
import { createClient } from '@/lib/supabase/server';

// Paso 15 · `empresas_cv` y `titulos_cv` no son cosmética: son la lista
// blanca con la que `verificarCv` decide después qué nombres del CV generado
// son de fiar. Llegan del navegador (el formulario los recibe de
// /api/extraer-perfil y los reenvía al guardar), así que cualquiera con la
// consola abierta podía escribir ahí "Google, McKinsey, MBA por IESE" y
// desactivar de un plumazo el aviso de invención — seguridad/red-team-opus.md,
// ficha 1.5. Se aceptan, pero solo lo que de verdad aparece en el CV pegado:
// misma idea que la verificación de cifras, y no rompe el flujo actual.
const MAXIMO_ENTRADAS_LISTA = 40;
const MAXIMO_CARACTERES_ENTRADA = 120;

function listaAncladaAlCv(valor: unknown, cvTexto: string): string[] {
  if (!Array.isArray(valor)) return [];
  const cv = paraComparar(cvTexto);

  return valor
    .filter((entrada): entrada is string => typeof entrada === 'string')
    .map((entrada) => entrada.trim().slice(0, MAXIMO_CARACTERES_ENTRADA))
    .filter((entrada) => entrada.length > 0 && cv.includes(paraComparar(entrada)))
    .slice(0, MAXIMO_ENTRADAS_LISTA);
}

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
    .select('nombre, puestos, palabras_clave, cv_texto, usar_experiencia_cv, empresas_cv, titulos_cv, salario_minimo')
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
  const { nombre, puestos, palabras_clave, cv_texto, usar_experiencia_cv, empresas_cv, titulos_cv, salario_minimo } =
    cuerpo;

  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    return NextResponse.json({ error: 'Falta tu nombre completo' }, { status: 400 });
  }
  const puestosLimpios = Array.isArray(puestos)
    ? puestos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
    : [];
  if (puestosLimpios.length === 0) {
    return NextResponse.json({ error: 'Falta al menos un puesto' }, { status: 400 });
  }
  if (!Array.isArray(palabras_clave) || palabras_clave.length === 0) {
    return NextResponse.json({ error: 'Faltan palabras clave' }, { status: 400 });
  }

  // El texto del CV entra también por aquí, no solo por /api/extraer-perfil:
  // sin esta comprobación, la capa 1 (relevancia) tenía una puerta trasera.
  const cvGuardado = typeof cv_texto === 'string' ? cv_texto : '';
  if (cvGuardado.length > 0) {
    const ambito = evaluarAmbitoCv(cvGuardado);
    if (!ambito.permitido) {
      return NextResponse.json({ error: ambito.motivo }, { status: 400 });
    }
  }

  // Salario mínimo: opcional, vacío = sin filtro. Se valida como entero
  // igual o mayor que cero cuando llega algo; nunca se guarda un valor no
  // numérico.
  let salarioMinimoLimpio: number | null = null;
  if (salario_minimo !== null && salario_minimo !== undefined && salario_minimo !== '') {
    const numero = Number(salario_minimo);
    if (!Number.isFinite(numero) || numero < 0) {
      return NextResponse.json(
        { error: 'El salario mínimo debe ser un número igual o mayor que cero, o déjalo vacío.' },
        { status: 400 },
      );
    }
    salarioMinimoLimpio = Math.trunc(numero);
  }

  const { error } = await supabase.from('perfiles').upsert(
    {
      user_id: user.id,
      nombre: nombre.trim(),
      puestos: puestosLimpios,
      palabras_clave,
      cv_texto: cv_texto ?? null,
      usar_experiencia_cv: Boolean(usar_experiencia_cv),
      empresas_cv: listaAncladaAlCv(empresas_cv, cvGuardado),
      titulos_cv: listaAncladaAlCv(titulos_cv, cvGuardado),
      salario_minimo: salarioMinimoLimpio,
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
