// Guía de los 3 pasos del recorrido (entrada, perfil, ofertas). Puramente
// presentacional: no consulta nada, cada pantalla llamante decide si se
// muestra y con qué paso activo.

const PASOS = [
  { numero: 1, texto: 'Pide acceso' },
  { numero: 2, texto: 'Pega tu CV' },
  { numero: 3, texto: 'Mira tus ofertas' },
];

export default function GuiaPasos({ pasoActual }: { pasoActual: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {PASOS.map((paso, indice) => {
        const activo = paso.numero === pasoActual;
        return (
          <li key={paso.numero} className="flex items-center gap-3">
            {indice > 0 && <span aria-hidden className="text-zinc-400">→</span>}
            <span
              aria-current={activo ? 'step' : undefined}
              className={
                activo
                  ? 'font-medium text-zinc-900 underline underline-offset-8 decoration-2 dark:text-zinc-50'
                  : 'text-zinc-500 dark:text-zinc-500'
              }
            >
              {paso.numero}. {paso.texto}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
