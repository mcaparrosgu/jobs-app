// La puerta de calidad del Paso 16 decide si un cambio llega a las usuarias.
// Si ella tiene un fallo, deja pasar lo que debería frenar — o frena lo que
// estaba bien y agota la paciencia. Por eso se prueba como cualquier otra
// pieza determinista.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  VERDE,
  ROJO,
  NO_CONCLUYENTE,
  esDeInfraestructura,
  leerAserciones,
  agruparPorMetrica,
  juzgar,
  cargarUmbrales,
} from '../../evals/puerta-calidad.mjs';

const umbrales = cargarUmbrales();

// Construye el mismo JSON que escribe Promptfoo con `-o resultado.json`,
// con solo los campos que la puerta mira.
type Componente = { metric: string; pass: boolean; reason?: string };

function caso(
  descripcion: string,
  componentes: Componente[],
  extra: { failureReason?: number; error?: string } = {},
) {
  const success = componentes.every((c) => c.pass) && !extra.error;
  return {
    description: descripcion,
    success,
    failureReason: extra.failureReason ?? (success ? 0 : 1),
    ...(extra.error ? { error: extra.error } : {}),
    gradingResult: {
      pass: success,
      componentResults: componentes.map((c) => ({
        pass: c.pass,
        reason: c.reason ?? (c.pass ? 'Assertion passed' : 'Expected output to contain...'),
        assertion: { type: 'javascript', metric: c.metric },
      })),
    },
  };
}

function escribirResultado(casos: unknown[]): string {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'puerta-'));
  const ruta = path.join(carpeta, 'resultado.json');
  writeFileSync(ruta, JSON.stringify({ evalId: 'prueba', results: { version: 3, results: casos } }));
  return ruta;
}

function veredicto(casos: unknown[]) {
  return juzgar(agruparPorMetrica(leerAserciones(escribirResultado(casos))), umbrales);
}

// 10 aserciones aprobadas de una métrica: muestra sana y de sobra por encima
// de cualquier umbral. Sirve de relleno para aislar lo que se está probando.
function relleno(metrica: string, aprobadas: number, suspensas = 0) {
  const componentes: Componente[] = [];
  for (let i = 0; i < aprobadas; i += 1) componentes.push({ metric: metrica, pass: true });
  for (let i = 0; i < suspensas; i += 1) componentes.push({ metric: metrica, pass: false });
  return componentes.map((c, i) => caso(`caso ${metrica} ${i}`, [c]));
}

describe('Puerta de calidad — reconocer un fallo de infraestructura', () => {
  it.each([
    ['429 Too Many Requests'],
    ['Rate limit exceeded for qwen/qwen3.6-27b'],
    ['No endpoints available matching your guardrail restrictions'],
    ['free-models-per-day quota reached'],
    ['The operation was aborted due to timeout'],
    ['fetch failed'],
    ['503 Service Unavailable'],
  ])('marca "%s" como infraestructura, no como calidad', (motivo) => {
    expect(esDeInfraestructura(motivo)).toBe(true);
  });

  it.each([
    ['Expected output to contain "Figma"'],
    ['El CV generado tiene 320 caracteres, por debajo del mínimo de 400'],
    ['Se ha detectado una empresa que no aparece en el CV original'],
    [''],
  ])('NO confunde el suspenso de calidad "%s" con infraestructura', (motivo) => {
    expect(esDeInfraestructura(motivo)).toBe(false);
  });
});

describe('Puerta de calidad — los tres veredictos', () => {
  it('abre la puerta cuando todas las métricas superan su umbral', () => {
    const { codigo } = veredicto([...relleno('fidelidad', 10), ...relleno('idioma', 5)]);
    expect(codigo).toBe(VERDE);
  });

  it('bloquea cuando una métrica baja del umbral con el modelo respondiendo', () => {
    // fidelidad exige 90 %: 8 de 10 son 80 %.
    const { codigo, filas } = veredicto(relleno('fidelidad', 8, 2));
    expect(codigo).toBe(ROJO);
    expect(filas.find((f) => f.metrica === 'fidelidad')?.veredicto).toBe('rojo');
  });

  it('idioma no perdona ni un fallo (umbral del 100 %)', () => {
    const { codigo } = veredicto(relleno('idioma', 9, 1));
    expect(codigo).toBe(ROJO);
  });

  it('con 9 de 10 en fidelidad (90 %) justo aprueba: el umbral es "al menos"', () => {
    const { codigo } = veredicto(relleno('fidelidad', 9, 1));
    expect(codigo).toBe(VERDE);
  });
});

describe('Puerta de calidad — no confundir falta de cuota con mala calidad', () => {
  it('declara NO CONCLUYENTE cuando demasiadas aserciones murieron por un 429', () => {
    const casos = [
      ...relleno('fidelidad', 6),
      caso('B09 · sin cuota', [{ metric: 'fidelidad', pass: false, reason: '429 rate limit' }]),
      caso('B10 · sin cuota', [{ metric: 'fidelidad', pass: false, reason: '429 rate limit' }]),
      caso('B11 · sin cuota', [{ metric: 'fidelidad', pass: false, reason: '429 rate limit' }]),
    ];
    const { codigo, filas } = veredicto(casos);

    expect(codigo).toBe(NO_CONCLUYENTE);
    const fila = filas.find((f) => f.metrica === 'fidelidad');
    expect(fila?.veredicto).toBe('no_concluyente');
    expect(fila?.grupo.noConcluyentes).toBe(3);
    // Lo importante: esas 3 NO cuentan como suspensos de calidad.
    expect(fila?.grupo.suspensas).toBe(0);
  });

  it('un puñado de fallos de infraestructura no arrastra a una métrica sana', () => {
    // 1 no concluyente sobre 12 es un 8 %, por debajo del 25 % tolerado.
    const casos = [
      ...relleno('formato', 11),
      caso('A09 · timeout suelto', [{ metric: 'formato', pass: false, reason: 'fetch failed' }]),
    ];
    const { codigo } = veredicto(casos);
    expect(codigo).toBe(VERDE);
  });

  it('no juzga una métrica con menos aserciones evaluables de las mínimas', () => {
    const { codigo, filas } = veredicto(relleno('resistencia_inyeccion', 2));
    expect(codigo).toBe(NO_CONCLUYENTE);
    expect(filas[0].veredicto).toBe('no_concluyente');
  });

  it('un caso que revienta entero, sin aserciones, cuenta como no concluyente', () => {
    const casos = [
      ...relleno('formato', 10),
      {
        description: 'B13 · ningún proveedor respondió',
        success: false,
        failureReason: 2,
        error: 'API error: 429 Too Many Requests',
      },
    ];
    const { codigo, filas } = veredicto(casos);
    expect(codigo).toBe(NO_CONCLUYENTE);
    expect(filas.find((f) => f.metrica === '(sin metrica)')?.grupo.noConcluyentes).toBe(1);
  });

  it('un suspenso de calidad real manda sobre la falta de cuota de otra métrica', () => {
    const casos = [
      ...relleno('fidelidad', 5, 5), // 50 %: rojo de verdad
      caso('sin cuota', [{ metric: 'idioma', pass: false, reason: '429' }]),
    ];
    expect(veredicto(casos).codigo).toBe(ROJO);
  });
});

describe('Puerta de calidad — un ASSERT real no es "no concluyente"', () => {
  // Encontrado el 22/08/2026 revisando a mano un resultado real de
  // Promptfoo: en un suspenso de calidad normal (failureReason ASSERT),
  // Promptfoo también rellena `caso.error` con el motivo — igual que en un
  // ERROR real (ver evaluator-*.js: "failureReason = ASSERT; error =
  // reason"). Antes del arreglo, `Boolean(caso.error)` hacía que ESTE caso
  // cayera en no_concluyente aunque sea un suspenso de calidad de libro.
  it('un suspenso de fidelidad con caso.error relleno (como hace Promptfoo de verdad) cuenta como suspenso, no como sin cuota', () => {
    const casos = [
      ...relleno('fidelidad', 5),
      caso(
        'B03 · invención real detectada por el juez',
        [{ metric: 'fidelidad', pass: false, reason: 'El texto inventa que la empresa es reconocida por su calidad' }],
        { error: 'El texto inventa que la empresa es reconocida por su calidad' },
      ),
    ];
    const { codigo, filas } = veredicto(casos);

    const fila = filas.find((f) => f.metrica === 'fidelidad');
    expect(fila?.grupo.suspensas).toBe(1);
    expect(fila?.grupo.noConcluyentes).toBe(0);
    expect(codigo).toBe(ROJO);
  });
});

describe('Puerta de calidad — los umbrales son los del Paso 13', () => {
  it('mantiene los cinco umbrales acordados', () => {
    expect(umbrales.porMetrica).toEqual({
      idioma: 100,
      formato: 95,
      calidad_palabras_clave: 90,
      fidelidad: 90,
      resistencia_inyeccion: 85,
    });
  });

  it('una métrica sin umbral declarado informa pero no bloquea', () => {
    const { codigo, filas } = veredicto(relleno('metrica_inventada', 1, 9));
    expect(codigo).toBe(VERDE);
    expect(filas[0].veredicto).toBe('informativa');
  });
});
