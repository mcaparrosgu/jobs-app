#!/usr/bin/env node
//
// Saca del workflow el guion del paso `decidir` para poder ejecutarlo suelto.
// Lo usa scripts/probar-paso-decidir.sh; no lo llama nadie mas.
//
//   node scripts/lib/extraer-paso-decidir.mjs <raiz-del-repo> <carpeta-destino>
//
// Se lee del YAML en vez de copiarlo aqui a proposito: una copia se queda
// vieja sin que nadie se entere, y entonces las pruebas dirian que todo va
// bien mientras el robot de verdad hace otra cosa.
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

const [, , raiz, destino] = process.argv;

const workflow = path.join(raiz, '.github', 'workflows', 'publicar.yml');
const doc = yaml.load(fs.readFileSync(workflow, 'utf8'));

const paso = doc?.jobs?.decidir?.steps?.find((s) => s.id === 'mirar');
if (!paso || typeof paso.run !== 'string') {
  console.error('No se encuentra el paso `mirar` del job `decidir` en publicar.yml.');
  console.error('Si le has cambiado el id, cambialo tambien aqui.');
  process.exit(1);
}

fs.writeFileSync(path.join(destino, 'paso.sh'), paso.run);
