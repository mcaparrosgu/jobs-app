// Limpieza de las palabras clave del perfil (docs/05-ia.md §6.3, defensa 3:
// "verificar"). Vive aparte de lib/ia.ts porque la usan dos mundos distintos:
// el servidor, para pasar por la aduana lo que devuelve el modelo, y el
// navegador, para avisar a la usuaria cuando escribe una a mano.
//
// El porqué: cada palabra clave acaba en app/api/ofertas/route.ts como una
// búsqueda `ilike *término*` contra el título y la descripción de las ofertas,
// es decir, un Ctrl+F literal. "gestión de equipos multidisciplinares en
// entorno internacional" no aparece tal cual en ninguna oferta del mundo, así
// que una palabra clave larga es una palabra clave muerta. Lo que encuentra
// ofertas es el vocabulario corto de los anuncios: "project manager", "SAP",
// "atención al cliente".

// Una palabra clave de recruiter cabe en tres palabras: "Customer Success
// Manager", "Google Ads", "atención al cliente".
export const MAXIMO_PALABRAS = 3;
export const MAXIMO_CARACTERES = 40;

// Por debajo de 3 caracteres, `ilike` empieza a encontrar cualquier cosa: "ia"
// aparece dentro de "financiación". Se salvan las siglas escritas en
// mayúsculas, que sí son términos reales de anuncio: UX, QA, PM, RR.
const MINIMO_CARACTERES = 3;

// Palabras que no son término de búsqueda por sí solas. Si una palabra clave
// empieza o acaba en una de ellas, sobra: "gestión de" no busca nada.
const PALABRAS_VACIAS = new Set([
  'a', 'al', 'ante', 'como', 'con', 'de', 'del', 'e', 'el', 'en', 'entre',
  'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'que', 'segun', 'sin',
  'sobre', 'su', 'sus', 'tras', 'u', 'un', 'una', 'unos', 'unas', 'y',
]);

// Coletillas que el modelo cuelga delante del término de verdad. Se quitan
// antes de contar palabras, para que "experiencia en gestión de equipos" no
// pierda "equipos" al recortar a tres.
const PREFIJOS_RELLENO = [
  'experiencia en', 'experiencia con', 'experiencia como',
  'conocimientos avanzados de', 'conocimientos avanzados en',
  'conocimientos de', 'conocimientos en', 'conocimiento de', 'conocimiento en',
  'dominio de', 'dominio del', 'manejo de', 'manejo del', 'uso de',
  'capacidad de', 'capacidad para', 'habilidad para', 'habilidades de',
  'nivel avanzado de', 'nivel alto de', 'nivel de',
  'especialista en', 'especializada en', 'especializado en',
  'formacion en', 'trabajo en',
];

// Separadores con los que el modelo mete varios términos en una sola casilla:
// "Python, SQL / R". Cada trozo se trata como una palabra clave propia. La
// barra solo separa si lleva espacio a algún lado: sin espacios une un único
// término y partirlo lo destroza ("SAP FI/CO" → "SAP FI" + "CO", "UX/UI").
const SEPARADORES = /[,;|·]|\s\/|\/\s|\s[-–—]\s/;

// Quita tildes y baja a minúsculas. Solo para comparar, nunca para mostrar:
// lo que se guarda conserva su acentuación (CLAUDE.md, castellano correcto).
export function paraComparar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function quitarPrefijoDeRelleno(texto: string): string {
  const comparable = paraComparar(texto);
  for (const prefijo of PREFIJOS_RELLENO) {
    if (comparable.startsWith(prefijo + ' ')) {
      return texto.slice(prefijo.length).trim();
    }
  }
  return texto;
}

function recortarPalabrasVacias(palabras: string[]): string[] {
  let inicio = 0;
  let fin = palabras.length;
  while (inicio < fin && PALABRAS_VACIAS.has(paraComparar(palabras[inicio]))) inicio += 1;
  while (fin > inicio && PALABRAS_VACIAS.has(paraComparar(palabras[fin - 1]))) fin -= 1;
  return palabras.slice(inicio, fin);
}

// Recorta un término al núcleo buscable, o devuelve null si no queda nada
// aprovechable. No descarta las frases largas: se queda con su principio, que
// es donde el modelo pone el concepto ("gestión de equipos multidisciplinares
// en entorno internacional" → "gestión de equipos").
// Las aclaraciones entre paréntesis se quitan antes de partir por
// separadores: si no, "SAP (módulo FI/CO)" se rompería por la barra en dos
// trozos rotos, "SAP (módulo FI" y "CO)".
function quitarAclaraciones(texto: string): string {
  return texto.replace(/[([{].*?[)\]}]/g, ' ').replace(/[([{].*$/g, ' ');
}

export function normalizarPalabraClave(bruta: string): string | null {
  let texto = quitarAclaraciones(bruta)
    .replace(/["'“”‘’]/g, ' ')
    .replace(/[.:•*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  texto = quitarPrefijoDeRelleno(texto);

  let palabras = recortarPalabrasVacias(texto.split(' ').filter(Boolean));
  if (palabras.length === 0) return null;

  if (palabras.length > MAXIMO_PALABRAS) {
    palabras = recortarPalabrasVacias(palabras.slice(0, MAXIMO_PALABRAS));
  }

  // Tres palabras kilométricas siguen sin caber en un anuncio: se prueba con
  // dos, y si tampoco cabe es que ese término no es una palabra clave.
  if (palabras.join(' ').length > MAXIMO_CARACTERES && palabras.length > 1) {
    palabras = recortarPalabrasVacias(palabras.slice(0, 2));
  }

  const resultado = palabras.join(' ').trim();
  if (resultado.length === 0 || resultado.length > MAXIMO_CARACTERES) return null;
  if (!/[a-zA-ZÀ-ÿ]/.test(resultado)) return null;   // "2024", "+5" y demás
  if (resultado.length < MINIMO_CARACTERES && resultado !== resultado.toUpperCase()) return null;
  if (resultado.length < 2) return null;

  return resultado;
}

// Pasa la lista entera por la aduana: separa las casillas con varios términos,
// recorta cada uno y quita repetidos ignorando mayúsculas y tildes ("Python" y
// "python" son la misma búsqueda). Conserva el orden y la primera grafía.
export function normalizarPalabrasClave(brutas: unknown[]): string[] {
  const vistas = new Set<string>();
  const limpias: string[] = [];

  for (const bruta of brutas) {
    if (typeof bruta !== 'string') continue;
    for (const trozo of quitarAclaraciones(bruta).split(SEPARADORES)) {
      const palabra = normalizarPalabraClave(trozo);
      if (!palabra) continue;
      const clave = paraComparar(palabra);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      limpias.push(palabra);
    }
  }

  return limpias;
}

// Para el formulario del perfil: ¿esto que acaba de escribir la usuaria va a
// encontrar ofertas? No bloquea nada, solo da pie al aviso.
export function esPalabraClaveLarga(texto: string): boolean {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  return limpio.split(' ').length > MAXIMO_PALABRAS || limpio.length > MAXIMO_CARACTERES;
}
