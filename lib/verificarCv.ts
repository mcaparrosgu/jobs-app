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

// Gravedad de cada tipo de aviso, para ordenar ANTES de recortar a seis.
// Sin esto, treinta avisos triviales de nombres empujaban fuera de la lista
// el único que importaba —una titulación inventada, un email ajeno— y el tope
// de seis se convertía en un silenciador (red team Opus, ficha 6.4).
const GRAVEDAD = { critico: 0, alto: 1, medio: 2 } as const;
type Gravedad = keyof typeof GRAVEDAD;
type Aviso = { gravedad: Gravedad; texto: string };

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// --- T54 · Las cifras -------------------------------------------------------

// "1.500" y "1,500" son el mismo número escrito a la europea o a la
// americana; el CV original puede usar una forma y el generado la otra.
function digitosDe(texto: string): string[] {
  return (texto.match(/\d[\d.,]*/g) ?? [])
    .map((numero) => numero.replace(/[.,]/g, '').replace(/^0+(?=\d)/, ''))
    .filter((numero) => numero.length > 0);
}

// Números escritos con letra ("tres años", "three years"). Verificado en vivo
// el 21/08/2026 (knowledge/decision-gemini-generarcv.md): Gemini reformula
// "tres meses" del CV original como "3 meses" — fiel al dato, solo cambia la
// forma — y sin esto `verificarCifras` lo marcaba como cifra inventada. Se
// excluyen a propósito "un/una/uno" (artículo indefinido, no cuenta como
// número casi nunca) y "cien/ciento" (colisiona con "por ciento"): admitirlos
// convertiría cualquier CV en "cualquier cifra 1 o 100 vale", que es peor que
// el falso positivo que se está arreglando.
const PALABRAS_NUMERO: Record<string, string> = {
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

function numerosEscritosDe(texto: string): string[] {
  const palabras = normalizar(texto).match(/\b[a-z]+\b/g) ?? [];
  return palabras.map((palabra) => PALABRAS_NUMERO[palabra]).filter((numero): numero is string => Boolean(numero));
}

function numerosDe(texto: string): string[] {
  return [...digitosDe(texto), ...numerosEscritosDe(texto)];
}

function verificarCifras(cvGenerado: string, cvOriginal: string): Aviso[] {
  const originales = new Set(numerosDe(cvOriginal));
  const inventadas = Array.from(new Set(numerosDe(cvGenerado))).filter(
    (numero) => !originales.has(numero),
  );

  return inventadas.map((numero) => ({
    gravedad: 'alto' as const,
    texto: `El CV generado menciona la cifra "${numero}", que no aparece en el CV que pegaste. Compruébala antes de enviarlo.`,
  }));
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
    // Añadidas el 21/08/2026 (knowledge/decision-gemini-generarcv.md):
    // etiquetas y secciones genéricas de CV, no nombres propios. Salieron de
    // Gemini escribiendo "Inglés (Nivel B2)" cuando el original solo decía
    // "inglés B2" — "Nivel" es una etiqueta que añade claridad, no un dato
    // nuevo, y el detector no distinguía eso de una empresa inventada.
    'nivel', 'duracion', 'sector', 'area', 'funcion', 'rol', 'cargo',
    'ubicacion', 'modalidad', 'sueldo', 'salario', 'disponibilidad',
    'referencias', 'objetivo', 'competencias', 'aptitudes', 'logros',
    'responsabilidades', 'funciones', 'tareas', 'herramientas',
    'tecnologias', 'certificados', 'cursos',
  ].map(normalizar),
);

// Añadido el 21/08/2026 (knowledge/decision-gemini-generarcv.md): cuando el
// CV generado expande una sigla que YA estaba en el permitido ("AWS" en el
// original → "Amazon Web Services (AWS)" en el generado), las palabras de esa
// expansión no son una invención — son la misma sigla, con más letras. Se
// exige que la sigla entre paréntesis coincida letra a letra con las
// iniciales de la frase que la precede, para no excusar cualquier cosa que
// por casualidad termine en un paréntesis.
function palabrasDeSiglasExpandidas(texto: string, permitido: string): Set<string> {
  const excusadas = new Set<string>();
  const patron = /((?:\p{Lu}[\p{L}]+\s+){1,4}\p{Lu}[\p{L}]+)\s*\(([\p{Lu}]{2,6})\)/gu;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = patron.exec(texto))) {
    const [, frase, sigla] = coincidencia;
    const iniciales = frase
      .trim()
      .split(/\s+/)
      .map((palabra) => palabra[0])
      .join('')
      .toUpperCase();
    if (iniciales === sigla && normalizar(permitido).includes(normalizar(sigla))) {
      frase.trim().split(/\s+/).forEach((palabra) => excusadas.add(normalizar(palabra)));
    }
  }
  return excusadas;
}

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

// --- Paso 14, capa 3 · Datos de contacto ------------------------------------
//
// El prompt (prompts/system.md, Prompt B) prohíbe explícitamente escribir
// datos de contacto dentro del CV o la carta: ya se muestran aparte, encima
// del documento (lib/pdf.tsx). Un email o teléfono que aparezca de todos
// modos es, en el mejor de los casos, un dato de contacto real de la usuaria
// filtrándose donde no debería, y en el peor, uno directamente inventado —
// las dos cosas merecen el mismo aviso: revisar antes de enviarlo.
const PATRON_EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi;
const PATRON_TELEFONO = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g;

// Un "teléfono" necesita al menos esta cantidad de dígitos seguidos para no
// confundirse con una cifra normal del CV (un año, un porcentaje, un tamaño
// de equipo) — eso ya lo cubre verificarCifras.
const MINIMO_DIGITOS_TELEFONO = 7;

function verificarDatosDeContacto(textoGenerado: string, permitido: string): Aviso[] {
  const avisos: Aviso[] = [];

  const emailsGenerados = new Set(textoGenerado.match(PATRON_EMAIL) ?? []);
  const emailsPermitidos = normalizar(permitido);
  for (const email of emailsGenerados) {
    if (!emailsPermitidos.includes(normalizar(email))) {
      avisos.push({
        gravedad: 'critico',
        texto: `El documento generado menciona el email "${email}", que no aparece en tu CV. Compruébalo antes de enviarlo: podría ser un canal de contacto ajeno.`,
      });
    }
  }

  const telefonosGenerados = (textoGenerado.match(PATRON_TELEFONO) ?? []).filter(
    (candidato) => candidato.replace(/\D/g, '').length >= MINIMO_DIGITOS_TELEFONO,
  );
  const digitosPermitidos = permitido.replace(/\D/g, '');
  for (const telefono of new Set(telefonosGenerados)) {
    const digitos = telefono.replace(/\D/g, '');
    if (!digitosPermitidos.includes(digitos)) {
      avisos.push({
        gravedad: 'critico',
        texto: `El documento generado menciona el teléfono "${telefono.trim()}", que no aparece en tu CV. Compruébalo antes de enviarlo: podría ser un canal de contacto ajeno.`,
      });
    }
  }

  return avisos;
}

function verificarNombres(cvGenerado: string, permitido: string): Aviso[] {
  const textoPermitido = normalizar(permitido);
  const excusadas = palabrasDeSiglasExpandidas(cvGenerado, permitido);

  const sospechosas = palabrasPropiasDe(cvGenerado).filter((palabra) => {
    const normalizada = normalizar(palabra);
    if (MAYUSCULAS_INOCENTES.has(normalizada)) return false;
    if (excusadas.has(normalizada)) return false;
    return !textoPermitido.includes(normalizada);
  });

  return Array.from(new Set(sospechosas)).map((palabra) => ({
    gravedad: 'medio' as const,
    texto: `El CV generado menciona "${palabra}", que no aparece en el CV que pegaste. Compruébalo antes de enviarlo.`,
  }));
}

// --- Paso 15 · ¿Es este CV el de la usuaria? --------------------------------
//
// La comprobación que faltaba, y la única que caza el ataque más grave del
// red team (seguridad/red-team-opus.md, ficha 2.1): una oferta manipulada que
// mete un CV falso dentro de su descripción y consigue que el documento se
// escriba a partir de ESE CV y no del de la usuaria.
//
// La señal es sencilla y aguanta la traducción: los nombres de las empresas
// donde alguien ha trabajado no se traducen. Si el CV original tenía empresas
// y en el generado no aparece NINGUNA, no se ha adaptado el CV: se ha escrito
// otro. No se bloquea (una recién graduada sin empresas es un caso legítimo,
// y ahí la lista está vacía y esto no se aplica), pero es el aviso más grave
// que puede darse.
function verificarQueEsElMismoCv(cvGenerado: string, empresasCv: string[]): Aviso[] {
  const empresas = empresasCv.map(normalizar).filter((empresa) => empresa.length >= 3);
  if (empresas.length === 0) return [];

  const generado = normalizar(cvGenerado);
  if (empresas.some((empresa) => generado.includes(empresa))) return [];

  return [
    {
      gravedad: 'critico',
      texto:
        'El CV generado no menciona ninguna de las empresas de tu CV. Puede que no se haya construido a partir de tu currículum: léelo entero antes de enviarlo.',
    },
  ];
}

// --- La comprobación completa ----------------------------------------------

export type DatosDeVerificacion = {
  cvGenerado: string;
  // Opcional por compatibilidad con las pruebas existentes, que solo pasan
  // el CV: la carta la pide el prompt con las mismas reglas estrictas
  // (Prompt B, "Reglas estrictas") pero antes del Paso 14 nunca se
  // verificaba en código.
  cartaGenerada?: string;
  cvOriginal: string;
  empresasCv: string[];
  titulosCv: string[];
  // El título y el nombre de la empresa sí cuentan como fuente legítima: la
  // carta va dirigida a esa empresa y el CV usa el vocabulario de ese puesto.
  // Son cortos, y desde el Paso 15 se recortan y se vigilan en lib/ia.ts.
  ofertaTitulo: string;
  ofertaEmpresa: string;
  // La DESCRIPCIÓN ya no entra en ninguna lista blanca. Ver la nota de
  // `verificarCv`, más abajo: era la brecha principal del red team.
  ofertaDescripcion: string | null;
};

// ⚠️ Paso 15 · La descripción de la oferta NO es una fuente de verdad.
//
// Hasta el red team, `permitido` incluía `ofertaDescripcion`. Como esa
// descripción la escribe un desconocido en un portal de empleo y llega sola
// por la ingesta, eso significaba que **el atacante decidía qué nombres
// contaban como verificados**: le bastaba nombrar en su anuncio las empresas
// y titulaciones que quería que apareciesen inventadas en el CV para que esta
// función se callara. Medido con el mismo CV generado
// (seguridad/red-team-opus.md, ficha 2.2): 0 avisos con la oferta maliciosa,
// 6 con una limpia.
//
// Desde ahora hay dos listas blancas distintas, y ninguna incluye la
// descripción:
//   · nombres  → el CV original, las empresas y titulaciones extraídas de él,
//                y el título y la empresa de la oferta (cortos y vigilados).
//   · contacto → SOLO el CV original. Un email o un teléfono que no esté en
//                el CV de la usuaria es siempre sospechoso, venga de donde
//                venga (ficha 2.4: phishing incrustado en la oferta).
export function verificarCv({
  cvGenerado,
  cartaGenerada = '',
  cvOriginal,
  empresasCv,
  titulosCv,
  ofertaTitulo,
  ofertaEmpresa,
}: DatosDeVerificacion): string[] {
  const permitidoNombres = [
    cvOriginal,
    ...empresasCv,
    ...titulosCv,
    ofertaTitulo,
    ofertaEmpresa,
  ].join(' \n ');

  // Cifras y nombres se comprueban sobre el CV y la carta juntos: la carta
  // no se verificaba antes del Paso 14 pese a que el prompt le exige las
  // mismas reglas estrictas.
  const generadoCompleto = `${cvGenerado}\n${cartaGenerada}`;

  const avisos: Aviso[] = [
    ...verificarQueEsElMismoCv(cvGenerado, empresasCv),
    ...verificarCifras(generadoCompleto, cvOriginal),
    ...verificarNombres(generadoCompleto, permitidoNombres),
    ...verificarDatosDeContacto(generadoCompleto, cvOriginal),
  ];

  // Se ordena por gravedad ANTES de recortar (`sort` es estable, así que
  // dentro de la misma gravedad se conserva el orden de detección), y si
  // algo se queda fuera se dice, en vez de desaparecer en silencio.
  const ordenados = [...avisos].sort((a, b) => GRAVEDAD[a.gravedad] - GRAVEDAD[b.gravedad]);

  if (ordenados.length <= MAXIMO_AVISOS) {
    return ordenados.map((aviso) => aviso.texto);
  }

  // Si sobran, el último hueco lo ocupa el resumen: la lista sigue teniendo
  // como mucho MAXIMO_AVISOS entradas, pero ya no desaparece nada en silencio.
  const mostrados = ordenados.slice(0, MAXIMO_AVISOS - 1).map((aviso) => aviso.texto);
  const ocultos = ordenados.length - mostrados.length;

  mostrados.push(
    `Y ${ocultos} avisos más parecidos. Con tantas diferencias respecto a tu CV, conviene que lo leas entero antes de enviarlo.`,
  );

  return mostrados;
}
