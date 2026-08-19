import { afterEach, describe, expect, it, vi } from 'vitest';
import { inicioDeHoyEnMadridISO } from '@/lib/fechas';

describe('inicioDeHoyEnMadridISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve una fecha ISO válida', () => {
    const resultado = inicioDeHoyEnMadridISO();
    expect(() => new Date(resultado)).not.toThrow();
    expect(new Date(resultado).toString()).not.toBe('Invalid Date');
  });

  it('calcula la medianoche de Madrid en horario de invierno (UTC+1)', () => {
    // 15 de enero de 2026, 10:30 hora de Madrid = 09:30 UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T09:30:00.000Z'));

    const resultado = inicioDeHoyEnMadridISO();

    // Medianoche del 15 de enero en Madrid (UTC+1) es las 23:00 UTC del 14.
    expect(resultado).toBe('2026-01-14T23:00:00.000Z');
  });

  it('calcula la medianoche de Madrid en horario de verano (UTC+2)', () => {
    // 15 de julio de 2026, 10:30 hora de Madrid (verano) = 08:30 UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T08:30:00.000Z'));

    const resultado = inicioDeHoyEnMadridISO();

    // Medianoche del 15 de julio en Madrid (UTC+2) es las 22:00 UTC del 14.
    expect(resultado).toBe('2026-07-14T22:00:00.000Z');
  });

  it('no salta al día anterior durante la primera hora del día en Madrid', () => {
    // 00:30 hora de Madrid en invierno = 23:30 UTC del día anterior.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-14T23:30:00.000Z'));

    const resultado = inicioDeHoyEnMadridISO();

    // Sigue siendo la medianoche del 15 (el "hoy" español), no la del 14.
    expect(resultado).toBe('2026-01-14T23:00:00.000Z');
  });

  it('el resultado es siempre anterior o igual al instante actual', () => {
    const ahora = Date.now();
    const inicio = new Date(inicioDeHoyEnMadridISO()).getTime();
    expect(inicio).toBeLessThanOrEqual(ahora);
  });
});
