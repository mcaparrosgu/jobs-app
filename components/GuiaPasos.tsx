// Guía de dos pasos para quien entra por primera vez. Solo se muestra
// mientras no haya perfil guardado; en cuanto lo hay, desaparece.
// No consulta nada: cada pantalla ya sabe si hay perfil y le pasa el paso.

const PASOS = [
  { numero: 1, texto: 'Pega tu CV' },
  { numero: 2, texto: 'Mira tus ofertas' },
];

export default function GuiaPasos({ pasoActual }: { pasoActual: 1 | 2 }) {
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
