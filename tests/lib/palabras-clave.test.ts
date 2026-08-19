import { describe, expect, it } from 'vitest';
import {
  MAXIMO_CARACTERES,
  MAXIMO_PALABRAS,
  esPalabraClaveLarga,
  normalizarPalabraClave,
  normalizarPalabrasClave,
  paraComparar,
} from '@/lib/palabras-clave';

describe('normalizarPalabraClave', () => {
  it('deja pasar un término corto tal cual', () => {
    expect(normalizarPalabraClave('Python')).toBe('Python');
  });

  it('recorta una frase larga a las primeras MAXIMO_PALABRAS palabras', () => {
    const resultado = normalizarPalabraClave('gestión de equipos multidisciplinares en entorno internacional');
    expect(resultado).not.toBeNull();
    expect(resultado!.split(' ').length).toBeLessThanOrEqual(MAXIMO_PALABRAS);
  });

  it('quita los prefijos de relleno antes de recortar', () => {
    expect(normalizarPalabraClave('experiencia en gestión de equipos')).toBe('gestión de equipos');
  });

  it('quita palabras vacías al principio y al final', () => {
    expect(normalizarPalabraClave('gestión de')).toBe('gestión');
  });

  it('quita aclaraciones entre paréntesis antes de partir por separadores', () => {
    expect(normalizarPalabraClave('SAP (módulo FI/CO)')).toBe('SAP');
  });

  it('devuelve null para una cadena vacía', () => {
    expect(normalizarPalabraClave('')).toBeNull();
  });

  it('devuelve null para una cadena que son solo espacios', () => {
    expect(normalizarPalabraClave('   ')).toBeNull();
  });

  it('devuelve null para un término compuesto solo de números', () => {
    expect(normalizarPalabraClave('2024')).toBeNull();
  });

  it('devuelve null para un término compuesto solo de símbolos', () => {
    expect(normalizarPalabraClave('+5')).toBeNull();
  });

  it('devuelve null si tras quitar palabras vacías no queda nada aprovechable', () => {
    expect(normalizarPalabraClave('de la para')).toBeNull();
  });

  it('salva las siglas en mayúsculas por debajo del mínimo de caracteres', () => {
    expect(normalizarPalabraClave('UX')).toBe('UX');
    expect(normalizarPalabraClave('QA')).toBe('QA');
  });

  it('descarta un término corto que no es sigla (menos de 3 caracteres, no todo mayúsculas)', () => {
    expect(normalizarPalabraClave('ia')).toBeNull();
  });

  it('respeta el máximo de caracteres, probando con menos palabras si hace falta', () => {
    const larguisimo = 'palabraextremadamentelarga otraigualdelarga unaultimapalabralarga';
    const resultado = normalizarPalabraClave(larguisimo);
    if (resultado !== null) {
      expect(resultado.length).toBeLessThanOrEqual(MAXIMO_CARACTERES);
    }
  });

  it('acepta caracteres raros (tildes, ñ) sin romperse', () => {
    expect(normalizarPalabraClave('atención al cliente')).toBe('atención al cliente');
    expect(normalizarPalabraClave('diseño gráfico')).toBe('diseño gráfico');
  });

  it('no revienta con un texto larguísimo de una sola "palabra"', () => {
    const textoLarguisimo = 'a'.repeat(5000);
    expect(() => normalizarPalabraClave(textoLarguisimo)).not.toThrow();
  });
});

describe('normalizarPalabrasClave', () => {
  it('separa varios términos metidos en una sola casilla por comas', () => {
    const resultado = normalizarPalabrasClave(['Python, SQL, Excel']);
    expect(resultado).toEqual(['Python', 'SQL', 'Excel']);
  });

  it('descarta una sigla de una sola letra (demasiado corta para ser un término de búsqueda útil)', () => {
    expect(normalizarPalabrasClave(['Python, SQL, R'])).toEqual(['Python', 'SQL']);
  });

  it('separa por barra solo cuando lleva espacio a algún lado', () => {
    expect(normalizarPalabrasClave(['UX/UI'])).toEqual(['UX/UI']);
    expect(normalizarPalabrasClave(['Python / SQL'])).toEqual(['Python', 'SQL']);
  });

  it('quita repetidos ignorando mayúsculas y tildes', () => {
    const resultado = normalizarPalabrasClave(['Python', 'python', 'PYTHON']);
    expect(resultado).toEqual(['Python']);
  });

  it('conserva la primera grafía de un término repetido', () => {
    const resultado = normalizarPalabrasClave(['Diseño', 'diseno']);
    expect(resultado).toEqual(['Diseño']);
  });

  it('ignora elementos que no son string (entrada de la IA corrupta)', () => {
    const resultado = normalizarPalabrasClave(['Python', 42, null, undefined, { x: 1 }]);
    expect(resultado).toEqual(['Python']);
  });

  it('devuelve una lista vacía si la entrada está vacía', () => {
    expect(normalizarPalabrasClave([])).toEqual([]);
  });

  it('devuelve una lista vacía si todos los términos son inaprovechables', () => {
    expect(normalizarPalabrasClave(['', '   ', '2024', 'de la'])).toEqual([]);
  });

  it('conserva el orden de aparición', () => {
    expect(normalizarPalabrasClave(['SAP', 'Python', 'Excel'])).toEqual(['SAP', 'Python', 'Excel']);
  });
});

describe('paraComparar', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(paraComparar('Diseño Gráfico')).toBe('diseno grafico');
  });

  it('recorta espacios en los extremos', () => {
    expect(paraComparar('  Python  ')).toBe('python');
  });
});

describe('esPalabraClaveLarga', () => {
  it('es false para un término corto', () => {
    expect(esPalabraClaveLarga('Python')).toBe(false);
  });

  it('es true si supera el máximo de palabras', () => {
    expect(esPalabraClaveLarga('gestión de equipos multidisciplinares')).toBe(true);
  });

  it('es true si supera el máximo de caracteres aunque tenga pocas palabras', () => {
    expect(esPalabraClaveLarga('a'.repeat(MAXIMO_CARACTERES + 1))).toBe(true);
  });

  it('no bloquea nada: solo informa (no lanza, no exige nada)', () => {
    expect(() => esPalabraClaveLarga('')).not.toThrow();
  });
});
