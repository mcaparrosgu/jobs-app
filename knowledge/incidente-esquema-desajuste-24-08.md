---
type: Incidente
title: Producción rota para cualquier usuaria con perfil — desajuste de esquema
description: El código publicado (22/08) pedía la columna `puesto`, ya borrada por la migración 0017 (23/08); cualquier perfil guardado devolvía "No se pudo leer tu perfil."
tags: [jobs-app, incidente, publicacion, supabase]
okf_version: "0.2"
timestamp: 2026-08-24T13:30:00Z
---

# Qué pasó

El bloqueo de publicación documentado en
[arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md) (T95 NO
CONCLUYENTE, push del 24/08 sin desplegar) tenía una consecuencia que no se
había visto todavía: **la versión en producción (commit `c1049ed`, 22/08) se
quedó activamente rota**, no solo desactualizada.

- El código de esa versión (`app/api/ofertas/route.ts`) pide a Supabase la
  columna `perfiles.puesto` (un único texto).
- La migración `0017_perfiles_puestos.sql` (parte de T89, 23/08) **borró esa
  columna** (`alter table ... drop column if exists puesto`) y la sustituyó
  por `puestos` (una lista). Las migraciones de este proyecto se aplican a
  mano en el SQL Editor de Supabase, así que ya estaba en vigor sin esperar
  a ningún despliegue.
- Resultado: cualquier usuaria con perfil guardado que entra en `/ofertas`
  (o pincha el enlace del email de aviso, T68) recibe `errorPerfil` de
  Supabase (columna inexistente) y ve "No se pudo leer tu perfil." — en
  cualquier dispositivo, porque el fallo está en el servidor.

Se descubrió cuando Mar probó el enlace del email de aviso de la ingesta
real de las 13:00 (primer día de clase con las 5 usuarias).

# Por qué no se vio antes

Producción llevaba desde el 22/08 sin que nadie con perfil guardado abriera
`/ofertas` de verdad. El código que sí espera `puestos` está commiteado
(pusheado a `origin/master` el mismo 24/08) pero bloqueado por la puerta de
calidad de los evals — ver `arreglo-puerta-motivo-real.md`.

# Decisión

Ante una incidencia en vivo con usuarias reales afectadas, Mar decide
publicar ya la versión commiteada (275/275 pruebas unitarias en verde,
incluye el arreglo de T94) usando el freno `[sin evals]`, en vez de esperar
a mañana con cuota fresca. Es exactamente el caso para el que existe el
freno: falta de cuota bloqueando un cambio ya probado por otra vía, no un
intento de esquivar un rojo real.

**Pendiente en paralelo**: T99 (añadir `CLOUDFLARE_ACCOUNT_ID` y
`CLOUDFLARE_API_TOKEN` en Vercel) no depende de este despliegue — sin esas
claves, `generarCvYCarta`/`extraerPerfil` en producción caen automáticamente
al respaldo de OpenRouter (cascada ya prevista en `lib/ia.ts`), no se rompen,
pero gastan el cupo compartido de 50/día en vez del cupo propio de
Cloudflare (10.000/día). Añadir las claves cuanto antes.

# Relacionado

- [arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md)
- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md)
- `docs/06-tareas.md` — T95, T99, T100, T101
