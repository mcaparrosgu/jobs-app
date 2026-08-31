#!/usr/bin/env node
//
// El `jq` de mentira de scripts/probar-paso-decidir.sh.
//
// **Interpreta el filtro que se le pasa**, no uno propio. Es la diferencia
// entre una prueba y un decorado: la primera version traia el camino
// (`.targets.production.meta.sha`) escrito aqui dentro, asi que se podia
// romper el del workflow y las 15 pruebas seguian en verde. Comprobado el
// 26/08/2026 rompiendolo a proposito.
//
// Entiende el trozo de jq que usa publicar.yml y nada mas:
//
//   .un.camino.como.este // .otro.de.respaldo // empty
//
// Imita a jq de verdad en lo que importa: si la entrada no es JSON sale con
// error (para que el `|| echo ''` del workflow entre), indexar algo que no
// existe da null en vez de reventar, y `empty` no imprime nada.

const [, , filtro, entrada] = process.argv;

let datos;
try {
  datos = JSON.parse(entrada);
} catch {
  process.exit(5);
}

function recorrer(camino) {
  if (camino === 'empty') return undefined;
  if (!camino.startsWith('.')) {
    console.error(`El jq de mentira no entiende "${camino}".`);
    console.error('Solo sabe de caminos tipo .a.b.c, de `empty` y del operador //.');
    process.exit(3);
  }
  let valor = datos;
  for (const clave of camino.slice(1).split('.')) {
    if (valor === null || valor === undefined) return undefined;
    if (typeof valor !== 'object') return undefined;
    valor = valor[clave];
  }
  return valor;
}

let salida;
for (const alternativa of filtro.split('//').map((t) => t.trim())) {
  const valor = recorrer(alternativa);
  // El `//` de jq se queda con la primera alternativa que no sea null ni false.
  if (valor !== undefined && valor !== null && valor !== false) {
    salida = valor;
    break;
  }
}

if (salida !== undefined) process.stdout.write(String(salida) + '\n');
