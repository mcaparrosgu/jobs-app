# CLAUDE.md — Jobs App

Instrucciones para cualquier agente que trabaje en este repositorio.

## Qué es esto

Web que ayuda a buscar empleo remoto asalariado: la usuaria pega su CV, el
sistema le propone puesto y palabras clave, le muestra ofertas que encajan
y le genera un CV y una carta adaptados a cada oferta que le interese.

Primera prueba: **5 personas** (la clase de un bootcamp de AI Engineering).
Es el primer proyecto estructurado de Mar, que **no tiene experiencia
programando**. Explica cada término técnico la primera vez que lo uses, con
una analogía cotidiana. Todo se escribe **en castellano**.

**Stack**: Next.js + Supabase + Groq + Vercel, más un workflow de n8n.
Detalle en `docs/04-plan-tecnico.md`.

## La restricción principal

**Presupuesto: 0 €/mes. Es una restricción dura, no una preferencia.**

Cualquier propuesta que implique pagar algo —un plan de pago, un modelo de
IA de pago, un servicio con tarjeta— está descartada salvo que Mar lo pida
expresamente. Si una solución técnica solo funciona pagando, dilo
claramente en vez de proponerla como si fuera gratis.

## Datos sensibles

Se manejan **CVs, emails y datos de contacto de personas reales** que no
son Mar: sus cuatro compañeras de clase.

- El aislamiento entre usuarias se garantiza con **RLS** en Supabase (cada
  fila lleva su dueña grabada), no con lógica en el código.
- El texto de los CVs sale hacia **Groq**. Debe estar activado *Zero Data
  Retention* en la consola de Groq.
- Los datos se borran automáticamente al mes (regla 10 de la spec).

## Lo que NUNCA se debe hacer en este repositorio

1. **Escribir una clave, contraseña, token o credencial dentro del
   código**, en una URL o en cualquier archivo que se suba. Van siempre en
   `.env.local` (local) o en Environment Variables de la plataforma.
2. **Poner el prefijo `NEXT_PUBLIC_` a un secreto.** Todo lo que lo lleve
   es visible para cualquiera en el navegador.
3. **Subir nada a GitHub ni hacer `git push` sin permiso explícito de
   Mar**, cada vez. Todo el trabajo vive en git local hasta que ella diga
   lo contrario.
4. **Tocar los workflows `Jobs` de n8n** (`Jobs · ingesta`,
   `Jobs · generación CV`, `Jobs · seguimiento`, `Jobs · archivado`). Son
   la búsqueda de empleo real de Mar, en producción. Jobs App usa un
   workflow **nuevo e independiente**, `Jobs App · ingesta`, creado
   copiando el JSON.
5. **Proponer modelos ni servicios de OpenAI.** Decisión ética de Mar,
   incluye los modelos de peso abierto `gpt-oss`. No relitigarlo.
6. **Renombrar o reestructurar `docs/`.** El esqueleto `00-problema.md` …
   `06-tareas.md` es fijo.
7. **Dar por cerrada una elección entre varias opciones sin habérsela
   preguntado explícitamente.** Presentar opciones con una recomendación
   dentro de un plan no equivale a que ella haya elegido.

## Documentación

- `docs/00-problema.md` … `docs/06-tareas.md` — el método de 17 pasos.
  `docs/03-spec.md` es la verdad funcional del proyecto.
- `knowledge/` — bundle **OKF** con las decisiones y su porqué. Después de
  cada cambio relevante hay que actualizar `knowledge/index.md` y
  `knowledge/log.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
