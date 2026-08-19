// T54 y T55 · Verificación automática del CV generado.
//
// Es la defensa 3 de docs/05-ia.md §6.1 ("verificar con código") contra el
// fallo más grave del sistema: que la IA invente experiencia que no está en el
// CV (§6.2). No es un filtro perfecto ni pretende serlo — es un detector de
// humo: comprueba dos cosas que sí se pueden comprobar con certeza mecánica.
//
//   T54 · Toda cifra del CV generado tiene que estar en el CV original.
//         Caza "aumenté las ventas un 30 %" cuando el original no menciona
//         ningún 30, o fechas de empleo que nadie escribió nunca.
//   T55 · Todo nombre propio del CV generado tiene que estar en el CV
//         original o en la lista de empresas y titulaciones que la IA extrajo
//         al leerlo (docs/05-ia.md §6.2, punto 3).
//
// Lo que sale de aquí son **avisos, no bloqueos**: el documento se guarda
// igual y la usuaria lo ve, pero con una advertencia de qué mirar antes de
// enviarlo. Bloquear por un falso positivo sería peor que avisar de más.
//
// ⚠️ Lo que esto NO caza, y conviene tener presente: una responsabilidad
// inventada que suene plausible y no lleve ni cifras ni nombres propios
// ("lideré la migración a la nube"). Contra eso solo hay revisión humana,
// tal como advierte docs/05-ia.md §6.2.

// Nunca más de estos avisos: una lista de veinte cosas no se lee, y el
// objetivo es que la usuaria mire de verdad las que salgan.
const MAXIMO_AVISOS = 6;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// --- T54 · Las cifras -------------------------------------------------------

// "1.500" y "1,500" son el mismo número escrito a la europea o a la
// americana; el CV original puede usar una forma y el generado la otra.
function numerosDe(texto: string): string[] {
  return (texto.match(/\d[\d.,]*/g) ?? [])
    .map((numero) => numero.replace(/[.,]/g, '').replace(/^0+(?=\d)/, ''))
    .filter((numero) => numero.length > 0);
}

function verificarCifras(cvGenerado: string, cvOriginal: string): string[] {
  const originales = new Set(numerosDe(cvOriginal));
  const inventadas = Array.from(new Set(numerosDe(cvGenerado))).filter(
    (numero) => !originales.has(numero),
  );

  return inventadas.map(
    (numero) =>
      `El CV generado menciona la cifra "${numero}", que no aparece en el CV que pegaste. Compruébala antes de enviarlo.`,
  );
}

// --- T55 · Los nombres propios ---------------------------------------------

// Palabras que van en mayúscula por costumbre y no son nombres de empresa.
// Sin ellas la lista de avisos se llenaría de "Enero" y "Inglés".
const MAYUSCULAS_INOCENTES = new Set(
  [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
    'espanol', 'castellano', 'ingles', 'frances', 'aleman', 'italiano',
    'portugues', 'catalan', 'gallego', 'euskera', 'nativo', 'bilingue',
    'actualidad', 'presente', 'remoto', 'freelance', 'autonomo',
    'experiencia', 'formacion', 'educacion', 'habilidades', 'idiomas',
    'perfil', 'resumen', 'contacto', 'proyectos', 'certificaciones',
    'estimados', 'atentamente', 'cordialmente', 'senores', 'senoras',
  ].map(normalizar),
);

// La unidad de comparación es la **palabra suelta**, no la frase entera.
// Comparar frases ("Operations Scheduling Officer Althaia Healthcare
// Institution") falla siempre: basta que el orden cambie un poco para que la
// frase no aparezca literalmente en el CV original, aunque cada palabra sí
// esté. Palabra a palabra, un nombre de empresa que la IA se haya inventado
// destaca, y una reordenación legítima no molesta.
const MINIMO_LETRAS = 4;

// Trocea el texto en "frases" a efectos de esta comprobación. Además de la
// puntuación normal, empieza frase nueva cada viñeta: los modelos devuelven el
// CV con los puntos seguidos en un mismo párrafo ("…exigentes. - Experiencia
// en mejora de procesos - Documento los procesos…"), y sin esto la primera
// palabra de cada punto parecería un nombre propio solo por ir en mayúscula.
const SEPARADOR_DE_FRASE = /(?<=[.;:!?])\s+|\s*(?:[-•*·—–]|\d+[.)])\s+/;

// Devuelve las palabras que empiezan por mayúscula y NO están al principio de
// una frase (donde la mayúscula es pura gramática). También descarta las que
// van TODO EN MAYÚSCULAS: en este formato son títulos de sección.
function palabrasPropiasDe(texto: string): string[] {
  const propias: string[] = [];

  for (const frase of texto.split(/\n+/).flatMap((linea) => linea.split(SEPARADOR_DE_FRASE))) {
    frase
      .trim()
      .split(/\s+/)
      .forEach((palabraSucia, indice) => {
        if (indice === 0) return; // primera palabra de la frase: no cuenta
        const palabra = palabraSucia.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');
        if (palabra.length < MINIMO_LETRAS) return;
        if (palabra === palabra.toUpperCase()) return;
        if (!/^\p{Lu}/u.test(palabra)) return;
        propias.push(palabra);
      });
  }

  return propias;
}

function verificarNombres(cvGenerado: string, permitido: string): string[] {
  const textoPermitido = normalizar(permitido);

  const sospechosas = palabrasPropiasDe(cvGenerado).filter((palabra) => {
    const normalizada = normalizar(palabra);
    if (MAYUSCULAS_INOCENTES.has(normalizada)) return false;
    return !textoPermitido.includes(normalizada);
  });

  return Array.from(new Set(sospechosas)).map(
    (palabra) =>
      `El CV generado menciona "${palabra}", que no aparece en el CV que pegaste. Compruébalo antes de enviarlo.`,
  );
}

// --- La comprobación completa ----------------------------------------------

export type DatosDeVerificacion = {
  cvGenerado: string;
  cvOriginal: string;
  empresasCv: string[];
  titulosCv: string[];
  // La oferta entera cuenta como fuente legítima: el CV y la carta pueden
  // nombrar a la empresa, su producto o su sector sin estar inventándose nada.
  ofertaTitulo: string;
  ofertaEmpresa: string;
  ofertaDescripcion: string | null;
};

export function verificarCv({
  cvGenerado,
  cvOriginal,
  empresasCv,
  titulosCv,
  ofertaTitulo,
  ofertaEmpresa,
  ofertaDescripcion,
}: DatosDeVerificacion): string[] {
  const permitido = [
    cvOriginal,
    ...empresasCv,
    ...titulosCv,
    ofertaTitulo,
    ofertaEmpresa,
    ofertaDescripcion ?? '',
  ].join(' \n ');

  return [
    ...verificarCifras(cvGenerado, cvOriginal),
    ...verificarNombres(cvGenerado, permitido),
  ].slice(0, MAXIMO_AVISOS);
}
