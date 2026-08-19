// La cola de preparación de documentos, en el navegador.
//
// Si marcas "me interesa" en tres ofertas seguidas, las tres se apuntan al
// instante pero se preparan **por turnos**, no las tres a la vez. Es lo que
// pide docs/05-ia.md §6.7: la capa gratuita de OpenRouter es compartida con
// mucha gente y rechaza las peticiones cuando llegan a ráfagas, así que
// esperar es mejor que fallar.
//
// Funciona como la cola de una panadería: cada tarea nueva coge número y
// arranca cuando termina la anterior, salga bien o mal.

let ultimoTurno: Promise<unknown> = Promise.resolve();

export function encolar<T>(tarea: () => Promise<T>): Promise<T> {
  const turno = ultimoTurno.then(tarea, tarea);
  // El `catch` vacío es lo que impide que una tarea que falla atasque la cola
  // entera: la siguiente arranca igual.
  ultimoTurno = turno.catch(() => {});
  return turno;
}
