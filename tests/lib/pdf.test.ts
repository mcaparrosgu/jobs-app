import { describe, expect, it } from 'vitest';
import { agruparLineas, bloqueTexto, cartaConFirma, interpretarCv } from '@/lib/pdf';

// Tres bugs de presentación cazados en la prueba E2E en producción del
// 01/09/2026 (ver knowledge/prueba-e2e-produccion-01-09.md):
//  1. Una viñeta entera en mayúsculas ("- NEOLAND") se renderizaba como
//     cabecera de sección, porque `esTitulo` se comprobaba antes que `esPunto`.
//  2. El puesto salía dos veces: en el masthead bajo el nombre y otra vez
//     como primer título del CV (la IA lo abre así).
//  3. La carta terminaba en la despedida ("Sincerely") sin el nombre debajo.
// Y el rediseño de maquetación: negrita en empresa/centro, cargo y periodo
// en gris, dentro de las secciones de experiencia y formación.

describe('agruparLineas — una viñeta en mayúsculas no es un título de sección', () => {
  it('"- NEOLAND" se agrupa como punto de lista, no como título', () => {
    const grupos = agruparLineas('FORMACIÓN\nBootcamp de IA\n- NEOLAND\n- Foco en Python y APIs');

    expect(grupos[0]).toEqual({ tipo: 'titulo', contenido: ['FORMACIÓN'] });
    expect(grupos[1]).toEqual({ tipo: 'parrafo', contenido: ['Bootcamp de IA'] });
    expect(grupos[2]).toEqual({ tipo: 'puntos', contenido: ['NEOLAND', 'Foco en Python y APIs'] });
    expect(grupos.some((g) => g.tipo === 'titulo' && g.contenido[0] === 'NEOLAND')).toBe(false);
  });

  it('una línea entera en mayúsculas que no es viñeta sigue siendo título', () => {
    const grupos = agruparLineas('EXPERIENCIA\n- Punto uno');

    expect(grupos[0]).toEqual({ tipo: 'titulo', contenido: ['EXPERIENCIA'] });
    expect(grupos[1]).toEqual({ tipo: 'puntos', contenido: ['Punto uno'] });
  });
});

describe('interpretarCv — jerarquía de entradas en experiencia y formación', () => {
  const cv = [
    'PERFIL PROFESIONAL',
    'Especialista en operaciones con siete años de experiencia.',
    '',
    'EXPERIENCIA',
    'Althaia',
    'Operations Officer',
    '2019–2023',
    '- Centralicé la logística de 7 centros.',
    '',
    'FORMACIÓN',
    'NEOLAND',
    'Bootcamp de AI Engineering',
    '2024–2025',
  ].join('\n');

  it('un párrafo bajo PERFIL es texto corrido', () => {
    const bloques = interpretarCv(cv);
    expect(bloques[1]).toEqual({
      tipo: 'parrafo',
      texto: 'Especialista en operaciones con siete años de experiencia.',
    });
  });

  it('el bloque bajo EXPERIENCIA es una entrada: empresa arriba, cargo y periodo como meta', () => {
    const bloques = interpretarCv(cv);
    const entrada = bloques.find((b) => b.tipo === 'entrada');
    expect(entrada).toEqual({
      tipo: 'entrada',
      principal: 'Althaia',
      meta: ['Operations Officer', '2019–2023'],
    });
  });

  it('FORMACIÓN también produce entradas', () => {
    const bloques = interpretarCv(cv);
    const entradas = bloques.filter((b) => b.tipo === 'entrada');
    expect(entradas).toHaveLength(2);
    expect(entradas[1]).toMatchObject({ principal: 'NEOLAND', meta: ['Bootcamp de AI Engineering', '2024–2025'] });
  });

  it('parte una cabecera de una sola línea "Empresa — Cargo — 2019"', () => {
    const bloques = interpretarCv('EXPERIENCIA\nAcme — Project Manager — 2018–2021\n- Un punto.');
    expect(bloques[1]).toEqual({
      tipo: 'entrada',
      principal: 'Acme',
      meta: ['Project Manager  ·  2018–2021'],
    });
  });

  it('las viñetas siguen siendo viñetas dentro de una sección de entradas', () => {
    const bloques = interpretarCv('EXPERIENCIA\nAcme\n- Uno\n- Dos');
    expect(bloques[2]).toEqual({ tipo: 'puntos', puntos: ['Uno', 'Dos'] });
  });
});

describe('bloqueTexto — no repite el puesto que ya muestra el masthead', () => {
  const cv = 'MARKETING OPERATIONS MANAGER\n\nPERFIL\n- Diez años de experiencia.';

  it('descarta el primer título si coincide con el puesto (vía estructurada)', () => {
    const elementos = bloqueTexto(cv, { omitirTituloInicial: 'Marketing Operations Manager', estructurada: true });
    const textos = JSON.stringify(elementos);

    expect(textos).toContain('PERFIL');
    expect(textos).not.toContain('MARKETING OPERATIONS MANAGER');
  });

  it('no toca el CV cuando el primer título no es el puesto', () => {
    const elementos = bloqueTexto(cv, { omitirTituloInicial: 'Otra cosa distinta', estructurada: true });
    expect(JSON.stringify(elementos)).toContain('MARKETING OPERATIONS MANAGER');
  });

  it('la carta (sin estructurada) se dibuja como texto corrido', () => {
    const elementos = bloqueTexto('Estimado equipo,\n\nMe interesa.\n\nAtentamente\n\nMar');
    expect(JSON.stringify(elementos)).toContain('Atentamente');
  });
});

describe('cartaConFirma — el nombre cierra la carta', () => {
  it('añade el nombre cuando la carta termina solo con la despedida', () => {
    const carta = 'Estimado equipo,\n\nMe interesa el puesto.\n\nAtentamente';
    expect(cartaConFirma(carta, 'Mar Caparrós Guitart')).toBe(
      'Estimado equipo,\n\nMe interesa el puesto.\n\nAtentamente\n\nMar Caparrós Guitart',
    );
  });

  it('no duplica el nombre si la carta ya lo lleva al final', () => {
    const carta = 'Estimado equipo,\n\nMe interesa.\n\nAtentamente,\nMar Caparrós Guitart';
    expect(cartaConFirma(carta, 'Mar Caparrós Guitart')).toBe(carta);
  });

  it('sin nombre, devuelve la carta tal cual', () => {
    const carta = 'Hola.\n\nAdiós';
    expect(cartaConFirma(carta, '   ')).toBe(carta);
  });
});
