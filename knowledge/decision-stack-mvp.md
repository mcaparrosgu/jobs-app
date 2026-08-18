---
type: Decision
title: Stack tecnico del MVP — Next.js + Supabase + Groq + Vercel
description: Decision del Paso 5 sobre con que tecnologias se construye la web, bajo la restriccion de presupuesto 0 euros al mes y nivel tecnico principiante.
tags: [jobs-app, paso-5, tecnologia, stack]
timestamp: 2026-08-18T00:00:00Z
---

# Decision

La web de Jobs App se construye con **Next.js** (framework web),
**Supabase** (base de datos + acceso por magic link), **Groq** (modelo de
IA de peso abierto) y **Vercel** (publicacion), conectada al backend n8n
que ya existe en produccion.

Detalle completo en [../docs/04-plan-tecnico.md](../docs/04-plan-tecnico.md).

# Contexto que la condiciona

Mar confirmo en el Paso 5:

- Experiencia programando: ninguna/muy poca.
- **Presupuesto maximo: 0 euros al mes** — restriccion dura, no una
  preferencia.
- ~5 usuarias el primer ano (la clase del bootcamp).
- Se manejan datos sensibles (CV, email, datos de contacto).
- Solo web, no movil.

Ademas arrastraba las preferencias ya registradas en
[preferencias-tecnicas-paso5.md](preferencias-tecnicas-paso5.md): Gmail
como proveedor de email y modelo de IA gratuito y de codigo abierto.

# Alternativas descartadas

- **Lovable (constructor con IA)** — descartada por el plan gratuito: 5
  acciones al dia / 30 al mes. Insuficiente para construir e iterar un
  proyecto de este tamano; riesgo real de quedarse bloqueada a mitad
  esperando a que se renueve la cuota. Ademas, al no ver el codigo, Mar
  aprende menos y depende siempre de la IA de Lovable para arreglar
  fallos.
- **Todo dentro de n8n** — descartada porque **no cubre la spec**, no por
  esfuerzo: sesion persistente de 15 dias, edicion interactiva de
  palabras clave y lista de ofertas con seleccion no encajan en lo que
  n8n sabe hacer. El riesgo no es un bug, es descubrir a media
  construccion que la herramienta no llega.

# Por que esta y no otra

1. Unica de las tres que cubre el 100% de `../docs/03-spec.md` sin
   retorcerla.
2. Es el stack mas documentado que existe, asi que Claude Code lo maneja
   con soltura — importante siendo el primer proyecto estructurado de Mar
   (ver [concepto-mvp.md](concepto-mvp.md) sobre su nivel de partida).
3. Supabase resuelve de fabrica el magic link (historia A1) y la base de
   datos: dos bloques que costarian dias.
4. Groq ejecuta modelos de peso abierto (Llama, Qwen, Mistral) con capa
   gratuita sin tarjeta — cumple la preferencia de IA gratuita/abierta sin
   tener que autoalojar nada (autoalojar si tendria coste de servidor, y
   el presupuesto es 0).
5. Mar aprende viendo el codigo, no delegandolo.

# Decision de arquitectura que simplifica el proyecto

**n8n y la web no se hablan entre si: ambos hablan con la misma base de
datos (Supabase).** n8n escribe las ofertas y lee quien tiene perfil para
el email; la web lee y escribe todo lo demas.

Consecuencia practica: **desaparece el bloque de 1-2 dias de "conectar el
boton Buscar al webhook"** que figuraba en `../docs/02-mvp.md`. Desde la
correccion del Paso 4, "Buscar" solo filtra ofertas ya guardadas, y eso es
una consulta a la base de datos, no una llamada externa. El unico servicio
externo que llama la web es Groq.

# Consecuencias a vigilar

- **Supabase gratis se pausa tras 7 dias sin actividad.** Mitigado por
  accidente: el cron de n8n de las 13:00 escribe en la base de datos a
  diario, asi que nunca llega a 7 dias inactiva.
- **Limite de ~6.000 tokens/minuto en Groq.** Un CV+carta consume
  4.000-5.000, asi que dos generaciones simultaneas chocan. Se mitiga con
  reintento automatico y procesando de una en una.
- **Calidad del modelo gratuito** (riesgo 3 de `../docs/00-problema.md`):
  puede inventar experiencia que no esta en el CV. Se mitiga con
  instrucciones explicitas, prueba con el CV real de Mar antes de ensenar
  la app, y aislando todas las llamadas a IA en `lib/groq.ts` para poder
  cambiar de modelo tocando un solo archivo.
- **Apify es el unico coste con margen ajustado** (5 $/mes de credito
  gratis). Mar planteo programar su propio actor: es una palanca real de
  optimizacion, pero Apify cobra por tiempo de computo tanto si el actor
  es propio como si es de la tienda — aparcado para despues del MVP.
- **Publicar en Vercel obliga a subir el codigo a GitHub.** Hasta ahora
  todo es local por decision expresa de Mar; requiere su permiso explicito
  en el Paso 9.

# Relacionados

- [../docs/04-plan-tecnico.md](../docs/04-plan-tecnico.md) — el plan
  completo (carpetas, modelo de datos, secretos, costes).
- [../docs/03-spec.md](../docs/03-spec.md) — lo que este stack tiene que
  cumplir.
- [preferencias-tecnicas-paso5.md](preferencias-tecnicas-paso5.md) —
  preferencias que alimentaron esta decision.
- [contexto-pipeline-n8n.md](contexto-pipeline-n8n.md) — el backend con el
  que se integra.
