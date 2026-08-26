---
type: Hallazgo
title: "Agujero del robot: un cambio de IA que no llegó a publicarse lo arrastra a producción el siguiente commit inocuo"
description: "El detector de .github/workflows/publicar.yml compara con el push anterior, no con lo que hay publicado. Si una publicación se bloquea por la puerta, el cambio de IA se queda pendiente y el siguiente commit que no toque la IA lo lleva a producción sin evals. Descubierto el 26/08/2026 al buscar cómo publicar el arreglo de T109."
tags: [jobs-app, hallazgo, publicacion, evals, puerta-calidad, github-actions, t110, t114]
okf_version: "0.2"
timestamp: 2026-08-26T12:10:00Z
---

# El agujero

El job `decidir` de `.github/workflows/publicar.yml` decide si hay que gastar
cuota en los evals mirando **qué archivos cambiaron en este push**. En `master`
la comparación es contra `github.event.before`, es decir, **el push anterior**:

```sh
CAMBIADOS=$(git diff --name-only "$ANTES" "$AHORA")
```

Eso da por supuesto que el push anterior **se publicó**. Y no siempre es así:
si la puerta lo bloqueó (ROJO o NO CONCLUYENTE), el código se quedó en
`master` sin desplegar, pero el siguiente push ya no lo ve como "cambiado".

Consecuencia: **el siguiente commit que no toque la IA — una nota en `docs/`,
un script de diagnóstico — publica de golpe todo lo que se había quedado
atrás, evals de por medio incluidos.** El robot dice, con toda la razón según
su propia lógica, "El cambio no toca la IA".

# Cómo se descubrió

El 26/08/2026, buscando la manera de llevar a producción el arreglo de T109.
Ese arreglo estaba en `master` desde `93b79ea` pero **sin publicar**: la puerta
había dado NO CONCLUYENTE dos veces (ver
[medicion-t114-desbocamiento.md](medicion-t114-desbocamiento.md)).

Al comprobar si haría falta el freno `[sin evals]` para publicarlo, salió que
**no hacía falta**: un commit con solo la sonda de medición y documentación
bastaba para arrastrarlo. Lo que buscábamos como atajo resultó ser un agujero.

# Por qué importa

Con el agujero abierto, la puerta de calidad es más débil de lo que parece:
no protege a producción de un cambio de IA malo, solo lo **retrasa** hasta el
siguiente commit de cualquier tipo. Nadie se entera, porque el resumen del
robot dice honestamente "El cambio no toca la IA".

Es primo hermano del problema de T110 (nada comprueba que el esquema de
Supabase esté al día antes de publicar): las dos veces, lo que falla es que
el robot mira **el cambio** en vez de mirar **el estado de producción**.

# El arreglo, cuando toque

Comparar contra **lo último que se publicó de verdad**, no contra el push
anterior. Vercel sabe qué commit (`sha`) está en producción; el paso `decidir`
podría preguntárselo con el token que ya tiene y usarlo como base del `git
diff`. Así, un cambio de IA que no se publicó sigue contando como pendiente
hasta que pase la puerta o hasta que alguien use el freno a conciencia.

No se arregla el 26/08 a propósito: producción lleva tres días sin poder
generar un CV y lo primero es desbloquearla. Queda anotado como tarea.

# Nota sobre esta publicación en concreto

El commit del 26/08 que sube esta documentación y la sonda **usa el agujero a
sabiendas**, con permiso explícito de Mar y sabiendo lo que lleva dentro: el
arreglo de T109, verificado a mano de extremo a extremo (13,2 s, CV de 509 y
carta de 1.357 caracteres) pero nunca aprobado por la puerta. No es un
descuido; es la decisión de desbloquear producción primero y arreglar la
calidad después, sin la presión de tener la app rota.
