import { describe, expect, it } from 'vitest';
import { detectarIdioma } from '@/lib/idioma';

const TEXTO_ES =
  'Buscamos una persona para el equipo de nuestra empresa, con experiencia en ' +
  'gestión de proyectos y conocimientos de atención al cliente. Ofrecemos un ' +
  'puesto remoto con buenas condiciones para trabajar en un ambiente colaborativo.';

const TEXTO_EN =
  'We are looking for a person to join our team, with experience in project ' +
  'management and skills in customer support. We offer a remote role with great ' +
  'benefits and the opportunity to work with a talented company.';

describe('detectarIdioma', () => {
  it('detecta un texto en castellano', () => {
    expect(detectarIdioma(TEXTO_ES)).toBe('es');
  });

  it('detecta un texto en inglés', () => {
    expect(detectarIdioma(TEXTO_EN)).toBe('en');
  });

  it('por debajo del mínimo de palabras, elige castellano por defecto', () => {
    expect(detectarIdioma('The work team')).toBe('es');
  });

  it('un texto vacío elige castellano por defecto', () => {
    expect(detectarIdioma('')).toBe('es');
  });

  it('null elige castellano por defecto (no revienta)', () => {
    expect(detectarIdioma(null)).toBe('es');
  });

  it('undefined elige castellano por defecto (no revienta)', () => {
    expect(detectarIdioma(undefined)).toBe('es');
  });

  it('un empate elige castellano por defecto', () => {
    // Ningún texto real empata exactamente, pero un texto raro con muchas
    // palabras ambiguas (fuera de las listas de frecuentes) no debe reventar.
    const textoRaro = Array(20).fill('xyzxyz').join(' ');
    expect(detectarIdioma(textoRaro)).toBe('es');
  });

  it('ignora mayúsculas y tildes al comparar', () => {
    const textoMayusculas = TEXTO_ES.toUpperCase();
    expect(detectarIdioma(textoMayusculas)).toBe('es');
  });

  it('no revienta con caracteres raros o emoji mezclados en el texto', () => {
    const textoRaro = `${TEXTO_EN} 🚀💼 @#$%^&*()`;
    expect(() => detectarIdioma(textoRaro)).not.toThrow();
    expect(detectarIdioma(textoRaro)).toBe('en');
  });

  it('no revienta con un texto larguísimo', () => {
    const textoLarguisimo = `${TEXTO_ES} `.repeat(5000);
    expect(() => detectarIdioma(textoLarguisimo)).not.toThrow();
  });
});
