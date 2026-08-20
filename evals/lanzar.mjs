#!/usr/bin/env node
//
// Lanza los dos evals seguidos y después la puerta de calidad (Paso 16).
//
//   npm run evals
//
// Existe como script de Node y no como una línea de package.json porque
// encadenar tres comandos ignorando el código de salida de los dos primeros no
// se escribe igual en PowerShell que en Git Bash, y Jobs App se trabaja desde
// las dos. Aquí funciona igual en cualquier sitio.
//
// El código de salida es el de la PUERTA, no el de promptfoo: que un caso
// suelto salga en rojo no es lo que decide nada — lo decide el porcentaje por
// métrica frente a los umbrales de evals/umbrales.json.

import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function ejecutar(script, { tolerarFallo = false } = {}) {
  console.log(`\n=== npm run ${script} ===\n`);
  const resultado = spawnSync(npm, ['run', script], { stdio: 'inherit', shell: false });

  if (resultado.error) {
    console.error(`No se ha podido ejecutar "npm run ${script}": ${resultado.error.message}`);
    process.exit(1);
  }
  if (!tolerarFallo && resultado.status !== 0) process.exit(resultado.status ?? 1);

  return resultado.status ?? 1;
}

// Los dos evals pueden terminar en rojo y aun así haber dejado un archivo de
// resultados perfectamente legible: eso es justo lo que la puerta tiene que
// leer. Por eso su código de salida se tolera aquí.
ejecutar('evals:perfil', { tolerarFallo: true });
ejecutar('evals:generar', { tolerarFallo: true });

process.exit(ejecutar('evals:puerta', { tolerarFallo: true }));
