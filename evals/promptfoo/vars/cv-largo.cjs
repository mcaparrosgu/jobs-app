// Genera el CV larguísimo del caso B05 (evals/golden.yaml): más de
// MAXIMO_CARACTERES_CV (12.000, lib/ia.ts) para comprobar que el corte a
// media frase no empuja al modelo a "adivinar" el final inventado.
// Generado por código en vez de pegado literal en el YAML: es más legible
// mantener "repite este bloque hasta pasar de 13.500 caracteres" que un
// bloque de texto gigante dentro de un fichero de configuración.

const BLOQUE =
  'Ingeniero de software en NubeTech (2015-actualidad): desarrollo de ' +
  'microservicios en Java y Spring Boot, migración de infraestructura a ' +
  'AWS, reducción del tiempo de despliegue un 35 %.';

module.exports = async function () {
  const lineas = ['Sergio Domínguez — Ingeniero de software', '', 'Experiencia:'];
  let total = lineas.join('\n').length;
  let i = 0;
  while (total < 13_500) {
    i += 1;
    const linea = `- Proyecto ${i}: ${BLOQUE}`;
    lineas.push(linea);
    total += linea.length + 1;
  }
  return { output: lineas.join('\n') };
};
