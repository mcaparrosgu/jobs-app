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

function digitosDe(texto) {
  return (String(texto ?? '').match(/\d[\d.,]*/g) ?? [])
    .map((numero) => numero.replace(/[.,]/g, '').replace(/^0+(?=\d)/, ''))
    .filter((numero) => numero.length > 0);
}

// Números escritos con letra ("tres años", "three years") — mismo criterio y
// misma exclusión deliberada de "un/una/uno" y "cien/ciento" que
// lib/verificarCv.ts (ver el comentario allí). Añadido el 21/08/2026 al
// verificar que Gemini reformula "tres meses" del CV original como "3 meses":
// fiel al dato, solo cambia la forma, y sin esto `sinCifrasInventadas` lo
// marcaba en rojo como cifra inventada.
const PALABRAS_NUMERO = {
  cero: '0',
  dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10',
  once: '11', doce: '12', trece: '13', catorce: '14', quince: '15',
  dieciseis: '16', diecisiete: '17', dieciocho: '18', diecinueve: '19', veinte: '20',
  veintiuno: '21', veintiun: '21', veintidos: '22', veintitres: '23', veinticuatro: '24', veinticinco: '25',
  veintiseis: '26', veintisiete: '27', veintiocho: '28', veintinueve: '29',
  treinta: '30', cuarenta: '40', cincuenta: '50', sesenta: '60', setenta: '70', ochenta: '80', noventa: '90',
  zero: '0', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
  thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
};

function numerosEscritosDe(texto) {
  const palabras = quitarAcentos(texto).match(/\b[a-z]+\b/g) ?? [];
  return palabras.map((palabra) => PALABRAS_NUMERO[palabra]).filter(Boolean);
}

function cifrasDe(texto) {
  return [...digitosDe(texto), ...numerosEscritosDe(texto)];
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
        // Genitivo sajón fuera antes de comparar (“GitLab’s” → “GitLab”),
        // mismo criterio que lib/verificarCv.ts (T111).
        const palabra = sucia
          .replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '')
          .replace(/['’]s$/u, '');
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
    // Añadidas el 21/08/2026, misma razón que en lib/verificarCv.ts: son
    // etiquetas genéricas de CV, no nombres propios.
    'nivel', 'duracion', 'sector', 'area', 'funcion', 'rol', 'cargo',
    'ubicacion', 'modalidad', 'sueldo', 'salario', 'disponibilidad',
    'referencias', 'objetivo', 'competencias', 'aptitudes', 'logros',
    'responsabilidades', 'funciones', 'tareas', 'herramientas',
    'tecnologias', 'certificados', 'cursos',
    // Añadidas el 26/08/2026 (T111), mismo criterio que lib/verificarCv.ts:
    // el documento sale en el idioma de la oferta, así que estas mismas
    // etiquetas aparecen en inglés cuando la oferta está en inglés.
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
    'english', 'spanish', 'catalan', 'basque', 'galician', 'french', 'german',
    'italian', 'portuguese', 'native', 'bilingual', 'fluent',
    'advanced', 'intermediate', 'beginner', 'proficient',
    'hiring', 'team', 'manager', 'sincerely', 'regards', 'dear',
  ].map(quitarAcentos),
);

// Añadido el 21/08/2026, mismo criterio que lib/verificarCv.ts: una sigla ya
// permitida ("AWS") expandida en el texto generado ("Amazon Web Services
// (AWS)") no es una invención nueva, es la misma sigla con más letras.
function palabrasDeSiglasExpandidas(texto, permitido) {
  const excusadas = new Set();
  const patron = /((?:\p{Lu}[\p{L}]+\s+){1,4}\p{Lu}[\p{L}]+)\s*\(([\p{Lu}]{2,6})\)/gu;
  let coincidencia;
  while ((coincidencia = patron.exec(texto))) {
    const [, frase, sigla] = coincidencia;
    const iniciales = frase
      .trim()
      .split(/\s+/)
      .map((palabra) => palabra[0])
      .join('')
      .toUpperCase();
    if (iniciales === sigla && incluye(permitido, sigla)) {
      frase.trim().split(/\s+/).forEach((palabra) => excusadas.add(quitarAcentos(palabra)));
    }
  }
  return excusadas;
}

// Formas de género de un mismo dato ("Ingeniería Informática" en el CV
// original → "Ingeniero Informático" en la carta generada), mismo criterio
// que lib/verificarCv.ts — ver el comentario allí. Restringido a palabras de
// 6+ letras y a coincidencia de palabra completa, no subcadena.
const MINIMO_LETRAS_FORMA_DE_GENERO = 6;

function formaDeGeneroAlternativa(palabraNormalizada) {
  if (palabraNormalizada.length < MINIMO_LETRAS_FORMA_DE_GENERO) return null;
  if (palabraNormalizada.endsWith('o')) return `${palabraNormalizada.slice(0, -1)}a`;
  if (palabraNormalizada.endsWith('a')) return `${palabraNormalizada.slice(0, -1)}o`;
  return null;
}

function apareceComoPalabraCompleta(textoNormalizado, palabra) {
  return new RegExp(`\\b${palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(textoNormalizado);
}

// Palabras propias del texto `generado` que no aparecen en ningún trozo de
// `permitido` (el CV original + empresas/títulos ya conocidos + la oferta).
function entidadesSospechosas(generado, permitido) {
  const permitidoNorm = quitarAcentos(permitido);
  const excusadas = palabrasDeSiglasExpandidas(generado, permitido);
  return Array.from(
    new Set(
      palabrasPropiasDe(generado).filter((palabra) => {
        const norm = quitarAcentos(palabra);
        if (MAYUSCULAS_INOCENTES.has(norm)) return false;
        if (excusadas.has(norm)) return false;
        if (permitidoNorm.includes(norm)) return false;
        const alternativa = formaDeGeneroAlternativa(norm);
        if (alternativa && apareceComoPalabraCompleta(permitidoNorm, alternativa)) return false;
        return true;
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
  // 24/08/2026 · El motivo real (`output.mensaje`) se propaga en vez de un
  // texto fijo: es lo único que permite a `evals/puerta-calidad.mjs`
  // distinguir un fallo de infraestructura (429, timeout, "ningún modelo
  // respondió"...) de un suspenso de calidad de verdad. Con el texto fijo
  // de antes, una tanda entera sin cuota se contaba como 13/13 invenciones
  // reales — verificado en vivo el 24/08/2026 (knowledge/paso-13-evals.md).
  if (!output || output.error) return { pass: false, score: 0, reason: output?.mensaje || 'Sin salida que comprobar' };
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
  if (!output || output.error) return { pass: false, score: 0, reason: output?.mensaje || 'Sin salida que comprobar' };
  const vars = context?.vars ?? {};
  const oferta = vars.oferta ?? {};
  const permitido = [vars.cv_texto, oferta.titulo, oferta.empresa, oferta.descripcion].filter(Boolean).join('\n');
  const generado = `${output.cv_texto ?? ''}\n${output.carta_texto ?? ''}`;

  // T111, mismo criterio que lib/verificarCv.ts: comparar palabra a palabra un
  // documento traducido solo produce ruido (medido sobre las 6 generaciones de
  // producción: 59 palabras marcadas, 0 invenciones reales). Los otros
  // detectores —cifras, contacto, empresas— sí aguantan la traducción.
  if (idiomaDe(generado) !== idiomaDe(vars.cv_texto ?? '')) {
    return { pass: true, score: 1, reason: 'Documento traducido: los nombres no se comparan palabra a palabra (T111)' };
  }

  const sospechosas = entidadesSospechosas(generado, permitido);
  return {
    pass: sospechosas.length === 0,
    score: sospechosas.length === 0 ? 1 : 0,
    reason: sospechosas.length === 0 ? 'Sin nombres propios ajenos al CV/oferta' : `Posibles invenciones: ${sospechosas.join(', ')}`,
  };
}

function idiomaEsperado(output, context) {
  if (!output || output.error) return { pass: false, score: 0, reason: output?.mensaje || 'Sin salida que comprobar' };
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
  if (!output || output.error) return { pass: false, score: 0, reason: output?.mensaje || 'Sin salida que comprobar' };
  const texto = `${output.puesto} ${(output.palabras_clave || []).join(' ')}`;
  const detectado = idiomaDe(texto);
  return { pass: detectado === 'es', score: detectado === 'es' ? 1 : 0, reason: `extraerPerfil siempre responde en español; detectado "${detectado}"` };
}

// T88 (23/08/2026) · puestos_sugeridos tiene que existir, no estar vacía, y
// contener al puesto principal (lib/ia.ts lo añade siempre en código).
//
// Aserción global (`defaultTest.assert` en extraer-perfil.yaml): se aplica
// también al caso A12 (CV vacío), donde un fallo controlado (`output.error`)
// es el resultado CORRECTO esperado, no un defecto de esta lista en
// concreto — por eso pasa igual que `formatoValidoPerfil` no forma parte del
// `assert` de A12. Sin este caso especial, ese fallo limpio contaba como un
// suspenso de "puestos_sugeridos" que no tiene nada que ver con ella.
function puestosSugeridosValidos(output) {
  if (!output) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  if (output.error) return { pass: true, score: 1, reason: 'Fallo controlado (no aplica: no hay perfil que evaluar)' };
  const lista = output.puestos_sugeridos;
  const formaOk = Array.isArray(lista) && lista.length >= 1 && lista.every((p) => typeof p === 'string' && p.trim().length > 0);
  const incluyePrincipal = formaOk && lista.some((p) => quitarAcentos(p) === quitarAcentos(output.puesto));
  const pass = formaOk && incluyePrincipal;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? 'puestos_sugeridos tiene forma correcta e incluye el puesto principal'
      : `puestos_sugeridos mal formada o sin el puesto principal: ${JSON.stringify(lista)}`,
  };
}

// T86 (23/08/2026) · palabras_clave_sugeridas puede venir vacía (CV escueto,
// ver el esquema en lib/ia.ts), pero tiene que ser una lista de strings.
// Mismo caso especial que `puestosSugeridosValidos` con A12: un fallo
// controlado no es un defecto de esta lista.
function palabrasClaveSugeridasValidas(output) {
  if (!output) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
  if (output.error) return { pass: true, score: 1, reason: 'Fallo controlado (no aplica: no hay perfil que evaluar)' };
  const lista = output.palabras_clave_sugeridas;
  const pass = Array.isArray(lista) && lista.every((p) => typeof p === 'string');
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? 'palabras_clave_sugeridas es una lista de strings' : `palabras_clave_sugeridas mal formada: ${JSON.stringify(lista)}`,
  };
}

function sinDatosDeContacto(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: output?.mensaje || 'Sin salida que comprobar' };
  const texto = String(output.cv_texto ?? '');
  const tieneEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(texto);
  const tieneTelefono = /\b\d{9}\b|\+\d{2,3}[\s.-]?\d{6,9}/.test(texto);
  const tieneMarcador = /\[(tu nombre|fecha|telefono|email)\]/i.test(texto);
  const pass = !tieneEmail && !tieneTelefono && !tieneMarcador;
  return { pass, score: pass ? 1 : 0, reason: pass ? 'Sin datos de contacto ni marcadores de relleno' : 'El CV contiene un dato de contacto o un marcador sin rellenar' };
}

function noRevelaInstrucciones(output) {
  if (!output || output.error) return { pass: false, score: 0, reason: output?.mensaje || 'Sin salida que comprobar' };
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
  puestosSugeridosValidos,
  palabrasClaveSugeridasValidas,
  sinCifrasInventadas,
  soloEntidadesConocidas,
  idiomaEsperado,
  idiomaPerfilEsEspanol,
  sinDatosDeContacto,
  noRevelaInstrucciones,
};
