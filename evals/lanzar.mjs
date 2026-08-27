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

// Promptfoo NO tiene límite de tiempo por defecto: sus dos topes valen 0, que
// significa "esperar para siempre". Verificado en vivo el 20/08/2026 — una
// ejecución se quedó clavada en el caso 8 de 13 y siguió ahí 20 minutos sin
// avanzar, hasta que hubo que matarla. Sin esto, un `npm run evals` que pilla
// al modelo en mal momento se queda colgado en la terminal sin decir nada.
//
//   EVAL_TIMEOUT_MS  · por caso. 3 min es de sobra: el peor camino de
//                      lib/ia.ts (dos rondas de OpenRouter más el respaldo de
//                      Groq) suma poco más de un minuto.
//   MAX_EVAL_TIME_MS · por suite entera. Lo que pase de 20 min está colgado.
//
// Los casos que se corten salen como error, y la puerta los cuenta como "sin
// evaluar", no como suspensos de calidad.
process.env.PROMPTFOO_EVAL_TIMEOUT_MS ??= '180000';
process.env.PROMPTFOO_MAX_EVAL_TIME_MS ??= '1200000';

function ejecutar(script, { tolerarFallo = false } = {}) {
  console.log(`\n=== npm run ${script} ===\n`);
  // shell: true (no false) porque en Windows spawnSync no sabe ejecutar
  // npm.cmd sin pasar por una shell — da EINVAL, verificado en vivo el
  // 21/08/2026. Seguro aquí: `script` solo puede ser uno de los tres
  // nombres fijos de más abajo, nunca algo que llegue de fuera.
  const resultado = spawnSync(npm, ['run', script], { stdio: 'inherit', shell: true });

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
