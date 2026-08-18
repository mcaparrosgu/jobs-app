---
type: Decision
title: El papel de la IA en Jobs App — todo en peldano 1, sin herramientas
description: Decision del Paso 6 sobre que partes del producto usan IA, en que nivel de complejidad, y como se contienen los seis fallos posibles.
tags: [jobs-app, paso-6, ia, groq, prompts, privacidad]
timestamp: 2026-08-18T00:00:00Z
---

# Decision

De todo Jobs App, **solo dos cosas usan IA**, y las dos en **peldano 1**
(una unica llamada al modelo con buenas instrucciones):

1. **Extraer puesto y palabras clave del CV pegado** (historia B2, regla 4).
2. **Redactar el CV y la carta adaptados a una oferta** (historia C3,
   regla 2).

Todo lo demas es codigo determinista. En particular, **el boton "Buscar"
no lleva IA**: es una consulta a la base de datos. Detalle completo en
[../docs/05-ia.md](../docs/05-ia.md).

# La IA no tiene ninguna herramienta

Recibe texto y devuelve texto. No lee ni escribe en la base de datos, no
envia correos, no borra nada, no llama a ningun servicio. Por muy mal que
redacte, **no puede causar dano en el sistema porque no tiene con que**.
Todas las escrituras las hace el codigo determinista que la rodea.

# Por que no se sube de peldano

- **RAG (peldano 2)** para emparejar ofertas por significado: rompe el
  requisito de "en segundos" del boton Buscar, anade coste por busqueda y
  le quita a la usuaria el control que le concede la regla 4. Ademas RAG
  sirve para elegir entre muchos documentos y aqui solo hay uno (su CV),
  que cabe entero en la peticion.
- **Workflow (peldano 3)** partiendo CV y carta en dos llamadas: duplica
  los tokens contra el limite de ~6.000/min de Groq, duplica la espera y
  arriesga que CV y carta se contradigan. El workflow de n8n en produccion
  ya demuestra que una sola llamada basta.
- **Agente (peldano 4)**: no hay nada que decidir, los pasos son siempre
  los mismos.

# Las cuatro defensas (y por que el prompt es la mas debil)

Mar planteo que un prompt excelente bastaria para evitar los seis fallos.
Se corrigio: **un prompt es una peticion, no una garantia**. Su instinto
—limitar las capacidades de la IA— es correcto, pero se hace de cuatro
formas y el prompt es la mas floja:

1. **Quitarle la decision** — si lo puede decidir el codigo, la IA no lo
   decide.
2. **Encajonar la salida** — la forma la impone la API, no el prompt.
3. **Verificar con codigo** — comprobar la respuesta contra la fuente.
4. **Instrucciones en el prompt** — reduce mucho, nunca lleva a cero.

De los seis fallos, para cuatro el prompt no es la defensa principal, y
para uno (Groq caido) no sirve de nada.

# El unico fallo que NO se elimina

**La alucinacion (inventar experiencia que no esta en el CV) se reduce
mucho pero sobrevive.** Se detecta automaticamente la parte comprobable:
toda cifra del CV generado debe aparecer en el original, y toda empresa
debe estar en la lista que la extraccion de perfil ya guarda (campos
`empresas_cv` y `titulos_cv` anadidos a la tabla `perfiles`). Lo que se
escapa es una responsabilidad inventada plausible y sin cifras ni nombres
("lidere la migracion a la nube"). La ultima capa es humana: aviso en la
web y prueba con el CV real de Mar antes de ensenar la app.

Es el riesgo 3 de [../docs/00-problema.md](../docs/00-problema.md) y sigue
abierto por diseno, no por descuido.

# Privacidad: el CV sale hacia Groq

Verificado en la documentacion de Groq (agosto 2026): **no entrenan con
los datos** de entrada ni salida, y la politica es igual en el plan
gratuito. Por defecto no los conservan, aunque pueden registrarlos hasta
30 dias para diagnostico. Se desactiva activando **Zero Data Retention**
en Data Controls.

> Accion pendiente para Mar: activar Zero Data Retention antes de que
> ninguna companera pegue su CV. Son datos personales de terceros.

# Restriccion etica: no usar modelos de OpenAI

Mar decidio **no usar tecnologia de OpenAI** por motivos eticos. Aplica
tambien a los modelos `gpt-oss` de peso abierto alojados en Groq, aunque
en ese caso ningun dato llegue a OpenAI.

**Consecuencia tecnica concreta**: el modo `strict` de salidas
estructuradas de Groq (decodificacion restringida, que hace
*imposible* romper el esquema) solo esta disponible en `gpt-oss-20b` y
`gpt-oss-120b`. Al descartarlos se usa el modo no estricto, donde el
esquema se intenta pero no se garantiza — por eso la validacion por codigo
de la estructura recibida **no es opcional**. Sigue siendo muy superior a
los marcadores de texto (`===CV===`) del workflow n8n actual, que tienen
un fallo conocido documentado.

Modelos candidatos de peso abierto y no-OpenAI, a confirmar en el Paso 9
con el catalogo vigente: `moonshotai/kimi-k2-instruct-0905` (Moonshot AI,
soporta salidas estructuradas), Llama 3.3 70B (Meta), Qwen (Alibaba),
Mistral (Mistral AI). El cambio de modelo se toca en un solo archivo
(`lib/groq.ts`).

# Relacionados

- [../docs/05-ia.md](../docs/05-ia.md) — el documento completo del Paso 6.
- [decision-stack-mvp.md](decision-stack-mvp.md) — la eleccion de Groq como
  proveedor.
- [preferencias-tecnicas-paso5.md](preferencias-tecnicas-paso5.md) — la
  preferencia de IA gratuita y de codigo abierto que esto concreta.
- [../docs/03-spec.md](../docs/03-spec.md) — las reglas de negocio que
  este reparto tiene que cubrir.
