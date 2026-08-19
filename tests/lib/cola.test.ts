import { describe, expect, it } from 'vitest';
import { encolar } from '@/lib/cola';

describe('encolar', () => {
  it('ejecuta las tareas en el orden en que se encolaron, no en paralelo', async () => {
    const orden: number[] = [];

    const tarea = (numero: number, retrasoMs: number) =>
      encolar(async () => {
        await new Promise((r) => setTimeout(r, retrasoMs));
        orden.push(numero);
      });

    // La primera tarda más que la segunda: si corrieran en paralelo, "2"
    // llegaría antes que "1" a la lista.
    const p1 = tarea(1, 30);
    const p2 = tarea(2, 5);

    await Promise.all([p1, p2]);

    expect(orden).toEqual([1, 2]);
  });

  it('una tarea que falla no bloquea a las siguientes', async () => {
    const orden: string[] = [];

    const p1 = encolar(async () => {
      orden.push('primera');
      throw new Error('fallo simulado');
    });
    const p2 = encolar(async () => {
      orden.push('segunda');
      return 'ok';
    });

    await expect(p1).rejects.toThrow('fallo simulado');
    await expect(p2).resolves.toBe('ok');
    expect(orden).toEqual(['primera', 'segunda']);
  });

  it('devuelve el resultado de la propia tarea a quien la encoló', async () => {
    const resultado = await encolar(async () => 42);
    expect(resultado).toBe(42);
  });

  it('tres tareas seguidas (varias ofertas marcadas casi a la vez) se preparan una a una', async () => {
    let enCurso = 0;
    let maximoSimultaneo = 0;

    const tarea = () =>
      encolar(async () => {
        enCurso += 1;
        maximoSimultaneo = Math.max(maximoSimultaneo, enCurso);
        await new Promise((r) => setTimeout(r, 10));
        enCurso -= 1;
      });

    await Promise.all([tarea(), tarea(), tarea()]);

    expect(maximoSimultaneo).toBe(1);
  });
});
