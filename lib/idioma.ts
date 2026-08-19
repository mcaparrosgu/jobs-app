// T49 · Detectar el idioma de una oferta con código, no con IA
// (docs/05-ia.md §6.5: "el fallo desaparece porque se le ha retirado la
// decisión al modelo").
//
// El método es el más simple que funciona: contar cuántas palabras muy
// frecuentes del castellano y del inglés aparecen en el texto. Son palabras
// que ningún texto real puede evitar ("de", "para" / "the", "with"), así que
// con unas pocas frases ya hay diferencia clara. Sin librerías externas y
// sin llamadas a nada: la misma oferta da siempre el mismo resultado.
//
// Solo distingue castellano e inglés porque son los dos idiomas que traen
// las fuentes de ofertas (Adzuna, Jooble, Himalayas, We Work Remotely…).
// Ante la duda —texto muy corto o empate— se elige castellano, que es el
// idioma de la app y de la mayoría de sus usuarias.

export type Idioma = 'es' | 'en';

// Sin tildes a propósito: el texto se compara ya normalizado (ver `palabrasDe`).
const FRECUENTES_ES = [
  'de', 'la', 'el', 'los', 'las', 'que', 'en', 'para', 'con', 'por', 'del',
  'una', 'como', 'se', 'su', 'sus', 'nuestra', 'nuestro', 'trabajo',
  'experiencia', 'equipo', 'empresa', 'anos', 'requisitos', 'conocimientos',
  'puesto', 'buscamos', 'ofrecemos',
];

const FRECUENTES_EN = [
  'the', 'and', 'with', 'for', 'you', 'your', 'our', 'are', 'this', 'that',
  'from', 'have', 'will', 'they', 'their', 'work', 'team', 'experience',
  'company', 'role', 'skills', 'requirements', 'looking', 'years', 'about',
  'we', 'is', 'to', 'of',
];

// Mínimo de palabras para fiarse del recuento. Por debajo de esto (un título
// suelto, una descripción vacía) el resultado sería una moneda al aire.
const MINIMO_PALABRAS = 12;

function palabrasDe(texto: string): string[] {
  return (
    texto
      .toLowerCase()
      // Quita las tildes: "años" → "anos", "diseño" → "diseno". Así las listas
      // de arriba se escriben sin acentos y no hay que preocuparse de si la
      // oferta viene bien acentuada, que muchas veces no lo está.
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z]+/g) ?? []
  );
}

function contarCoincidencias(palabras: string[], frecuentes: string[]): number {
  const buscadas = new Set(frecuentes);
  return palabras.reduce((total, palabra) => (buscadas.has(palabra) ? total + 1 : total), 0);
}

export function detectarIdioma(texto: string | null | undefined): Idioma {
  const palabras = palabrasDe(texto ?? '');
  if (palabras.length < MINIMO_PALABRAS) return 'es';

  return contarCoincidencias(palabras, FRECUENTES_EN) > contarCoincidencias(palabras, FRECUENTES_ES)
    ? 'en'
    : 'es';
}

export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: 'español (castellano)',
  en: 'inglés',
};
