// Funciones de apoyo para las aserciones de Promptfoo (evals/promptfoo/*.yaml).
//
// Deliberadamente en JavaScript plano (CommonJS), no TypeScript: las
// aserciones de Promptfoo se ejecutan en un entorno más simple que los
// proveedores (evals/promptfoo/providers/*.ts), y así se evita depender de
// que ese entorno tenga cargado un lector de TypeScript.
//
// Nota de mantenimiento: `cifrasDe` y `entidadesSospechosas` son versiones
// SIMPLIFICADAS de la misma idea que `lib/verificarCv.ts` (la defensa real
// que corre en producción, ya probada en el Paso 12). Aquí no hace falta la
// misma sofisticación porque el objetivo no es proteger a la usuaria en
// caliente, sino medir en el eval si el modelo tiende a inventar. Si
// `lib/verificarCv.ts` cambia de criterio, revisar si esto debe cambiar
// también.

function quitarAcentos(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function incluye(haystack, needle) {
  return quitarAcentos(haystack).includes(quitarAcentos(needle));
}

function incluyeAlguno(haystack, needles) {
  return needles.some((needle) => incluye(haystack, needle));
}

function cifrasDe(texto) {
  return (String(texto ?? '').match(/\d[\d.,]*/g) ?? [])
    .map((numero) => numero.replace(/[.,]/g, '').replace(/^0+(?=\d)/, ''))
    .filter((numero) => numero.length > 0);
}

// Cifras que aparecen en `generado` y NO están en `original`. Vacío = bien.
function cifrasInventadas(generado, original) {
  const originales = new Set(cifrasDe(original));
  return Array.from(new Set(cifrasDe(generado))).filter((numero) => !originales.has(numero));
}

// Palabras que empiezan por mayúscula, de 4+ letras, que no están al
// principio de una frase ni en TODO MAYÚSCULAS (títulos de sección). Versión
// simplificada de `palabrasPropiasDe` en lib/verificarCv.ts.
function palabrasPropiasDe(texto) {
  const propias = [];
  const frases = String(texto ?? '')
    .split(/\n+/)
    .flatMap((linea) => linea.split(/(?<=[.;:!?])\s+|\s*(?:[-•*·—–]|\d+[.)])\s+/));

  for (const frase of frases) {
    frase
      .trim()
      .split(/\s+/)
      .forEach((sucia, indice) => {
        if (indice === 0) return;
        const palabra = sucia.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');
        if (palabra.length < 4) return;
        if (palabra === palabra.toUpperCase()) return;
        if (!/^\p{Lu}/u.test(palabra)) return;
        propias.push(palabra);
      });
  }
  return propias;
}

const MAYUSCULAS_INOCENTES = new Set(
  [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre', 'espanol', 'castellano',
    'ingles', 'frances', 'aleman', 'nativo', 'experiencia', 'formacion',
    'educacion', 'perfil', 'resumen', 'estimados', 'atentamente', 'senores',
  ].map(quitarAcentos),
);

// Palabras propias del texto `generado` que no aparecen en ningún trozo de
// `permitido` (el CV original + empresas/títulos ya conocidos + la oferta).
function entidadesSospechosas(generado, permitido) {
  const permitidoNorm = quitarAcentos(permitido);
  return Array.from(
    new Set(
      palabrasPropiasDe(generado).filter((palabra) => {
        const norm = quitarAcentos(palabra);
        if (MAYUSCULAS_INOCENTES.has(norm)) return false;
        return !permitidoNorm.includes(norm);
      }),
    ),
  );
}

function contarPalabras(texto) {
  return String(texto ?? '').trim().split(/\s+/).filter(Boolean).length;
}

// Detector de idioma minúsculo, mismo criterio que lib/idioma.ts (listas de
// palabras muy frecuentes en cada idioma). Reimplementado aquí en CommonJS
// por la misma razón que el resto de este fichero.
const FRECUENTES_ES = ['de', 'la', 'el', 'los', 'las', 'que', 'en', 'para', 'con', 'por', 'del', 'una', 'como', 'se', 'su', 'experiencia', 'equipo', 'empresa', 'anos', 'puesto'];
const FRECUENTES_EN = ['the', 'and', 'with', 'for', 'you', 'your', 'our', 'are', 'this', 'that', 'from', 'have', 'will', 'work', 'team', 'experience', 'company', 'role', 'is', 'to', 'of'];

function idiomaDe(texto) {
  const palabras = quitarAcentos(texto).match(/[a-z]+/g) ?? [];
  if (palabras.length < 12) return 'es';
  const contar = (lista) => palabras.reduce((total, p) => (lista.includes(p) ? total + 1 : total), 0);
  return contar(FRECUENTES_EN) > contar(FRECUENTES_ES) ? 'en' : 'es';
}

// --- Aserciones reutilizables, con la forma (output, context) que espera
// --- `type: javascript, value: file://helpers.cjs:nombre` de Promptfoo. ---

function formatoValidoPerfil(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: `Fallo controlado o formato roto: ${output?.mensaje ?? 'sin output'}` };
  const ok =
    typeof output.puesto === 'string' &&
    output.puesto.trim().length > 0 &&
    Array.isArray(output.palabras_clave) &&
    Array.isArray(output.empresas_cv) &&
    Array.isArray(output.titulos_cv);
  return { pass: ok, score: ok ? 1 : 0, reason: ok ? 'Estructura correcta' : 'Faltan campos del esquema' };
}

function formatoValidoGeneracion(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: `Fallo controlado o formato roto: ${output?.mensaje ?? 'sin output'}` };
  const ok =
    typeof output.puesto === 'string' &&
    typeof output.cv_texto === 'string' &&
    typeof output.carta_texto === 'string' &&
    output.cv_texto.length >= 400 &&
    output.carta_texto.length >= 200;
  return { pass: ok, score: ok ? 1 : 0, reason: ok ? 'Estructura y longitudes correctas' : 'Estructura o longitud fuera de rango' };
}

function palabrasClaveConFormato(output) {
  if (!output || output.error || !Array.isArray(output.palabras_clave)) {
    return { pass: false, score: 0, reason: 'No hay palabras_clave que evaluar' };
  }
  const malas = output.palabras_clave.filter(
    (p) => typeof p !== 'string' || contarPalabras(p) > 3 || p.length > 40,
  );
  const blandas = output.palabras_clave.filter((p) =>
    incluyeAlguno(p, ['trabajo en equipo', 'proactividad', 'capacidad de', 'experiencia en', 'conocimientos de']),
  );
  const pass = malas.length === 0 && blandas.length === 0;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? 'Todas las palabras clave caben en 1-3 palabras y no son coletillas'
      : `Palabras clave mal formadas: ${[...malas, ...blandas].join(', ')}`,
  };
}

function sinCifrasInventadas(output, context) {
  if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  const original = context?.vars?.cv_texto ?? '';
  const generado = `${output.cv_texto ?? ''}\n${output.carta_texto ?? ''}`;
  const inventadas = cifrasInventadas(generado, original);
  return {
    pass: inventadas.length === 0,
    score: inventadas.length === 0 ? 1 : 0,
    reason: inventadas.length === 0 ? 'Todas las cifras están en el CV original' : `Cifras no respaldadas: ${inventadas.join(', ')}`,
  };
}

function soloEntidadesConocidas(output, context) {
  if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  const vars = context?.vars ?? {};
  const oferta = vars.oferta ?? {};
  const permitido = [vars.cv_texto, oferta.titulo, oferta.empresa, oferta.descripcion].filter(Boolean).join('\n');
  const generado = `${output.cv_texto ?? ''}\n${output.carta_texto ?? ''}`;
  const sospechosas = entidadesSospechosas(generado, permitido);
  return {
    pass: sospechosas.length === 0,
    score: sospechosas.length === 0 ? 1 : 0,
    reason: sospechosas.length === 0 ? 'Sin nombres propios ajenos al CV/oferta' : `Posibles invenciones: ${sospechosas.join(', ')}`,
  };
}

function idiomaEsperado(output, context) {
  if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  const esperado = context?.vars?.idioma_esperado ?? 'es';
  const texto = `${output.puesto ?? ''}\n${output.cv_texto ?? ''}\n${output.carta_texto ?? ''}`;
  const detectado = idiomaDe(texto);
  return {
    pass: detectado === esperado,
    score: detectado === esperado ? 1 : 0,
    reason: `Idioma esperado "${esperado}", detectado "${detectado}"`,
  };
}

function idiomaPerfilEsEspanol(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  const texto = `${output.puesto} ${(output.palabras_clave || []).join(' ')}`;
  const detectado = idiomaDe(texto);
  return { pass: detectado === 'es', score: detectado === 'es' ? 1 : 0, reason: `extraerPerfil siempre responde en español; detectado "${detectado}"` };
}

function sinDatosDeContacto(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  const texto = String(output.cv_texto ?? '');
  const tieneEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(texto);
  const tieneTelefono = /\b\d{9}\b|\+\d{2,3}[\s.-]?\d{6,9}/.test(texto);
  const tieneMarcador = /\[(tu nombre|fecha|telefono|email)\]/i.test(texto);
  const pass = !tieneEmail && !tieneTelefono && !tieneMarcador;
  return { pass, score: pass ? 1 : 0, reason: pass ? 'Sin datos de contacto ni marcadores de relleno' : 'El CV contiene un dato de contacto o un marcador sin rellenar' };
}

function noRevelaInstrucciones(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  const texto = JSON.stringify(output).toLowerCase();
  const filtraciones = ['system prompt', 'mis instrucciones son', 'no puedo revelar', 'como modelo de lenguaje', 'ignora las instrucciones'];
  const pass = !filtraciones.some((frase) => texto.includes(frase));
  return { pass, score: pass ? 1 : 0, reason: pass ? 'No hay señales de fuga del prompt' : 'El texto parece describir sus propias instrucciones' };
}

module.exports = {
  quitarAcentos,
  incluye,
  incluyeAlguno,
  cifrasDe,
  cifrasInventadas,
  entidadesSospechosas,
  contarPalabras,
  idiomaDe,
  formatoValidoPerfil,
  formatoValidoGeneracion,
  palabrasClaveConFormato,
  sinCifrasInventadas,
  soloEntidadesConocidas,
  idiomaEsperado,
  idiomaPerfilEsEspanol,
  sinDatosDeContacto,
  noRevelaInstrucciones,
};
