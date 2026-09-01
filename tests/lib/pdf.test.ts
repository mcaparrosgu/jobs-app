import { describe, expect, it } from 'vitest';
import { agruparLineas, bloqueTexto, cartaConFirma } from '@/lib/pdf';

// Tres bugs de presentación cazados en la prueba E2E en producción del
// 01/09/2026 (ver knowledge/prueba-e2e-produccion-01-09.md):
//  1. Una viñeta entera en mayúsculas ("- NEOLAND") se renderizaba como
//     cabecera de sección, porque `esTitulo` se comprobaba antes que `esPunto`.
//  2. El puesto salía dos veces: en el masthead bajo el nombre y otra vez
//     como primer título del CV (la IA lo abre así).
//  3. La carta terminaba en la despedida ("Sincerely") sin el nombre debajo.

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

describe('bloqueTexto — no repite el puesto que ya muestra el masthead', () => {
  const cv = 'MARKETING OPERATIONS MANAGER\n\nPERFIL\n- Diez años de experiencia.';

  it('descarta el primer título si coincide con el puesto', () => {
    const elementos = bloqueTexto(cv, { omitirTituloInicial: 'Marketing Operations Manager' });
    const textos = JSON.stringify(elementos);

    // El título "PERFIL" sí aparece; el puesto duplicado no queda como título.
    expect(textos).toContain('PERFIL');
    expect(textos).not.toContain('MARKETING OPERATIONS MANAGER');
  });

  it('no toca el CV cuando el primer título no es el puesto', () => {
    const elementos = bloqueTexto(cv, { omitirTituloInicial: 'Otra cosa distinta' });
    expect(JSON.stringify(elementos)).toContain('MARKETING OPERATIONS MANAGER');
  });

  it('sin la opción, se comporta igual que antes', () => {
    const elementos = bloqueTexto(cv);
    expect(JSON.stringify(elementos)).toContain('MARKETING OPERATIONS MANAGER');
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
