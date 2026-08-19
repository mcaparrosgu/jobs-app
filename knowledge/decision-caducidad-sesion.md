---
type: Decision
title: Caducidad de sesión por inactividad — bloqueada por el plan gratuito
description: T16 no puede forzar los 15 días de inactividad de forma nativa en Supabase (plan Free); se documenta la limitación en vez de pagar.
tags: [jobs-app, okf, auth, presupuesto-0]
timestamp: 2026-08-19T00:00:00Z
---

# Contexto

`docs/03-spec.md` regla de negocio 9 pide que el acceso caduque tras 15 días
sin usarse. T16 de `docs/06-tareas.md` (Paso 9) asumía que esto se configura
en el panel de Supabase, Authentication → Sessions.

# Lo encontrado

Supervisado en Chrome: esa pantalla tiene los campos correctos
("Time-box user sessions" e "Inactivity timeout"), pero Supabase los
bloquea con el aviso **"Configuring user sessions is only available on the
Pro Plan and above"**. En el plan Free ambos quedan fijos en `0` (`never`)
y no se pueden editar sin pasar a un plan de pago.

# Opciones planteadas a Mar

1. Aplicar la caducidad en código propio: guardar la fecha del último
   acceso (por ejemplo en `perfiles`) y comprobarla en cada carga de página
   protegida, cerrando la sesión a mano si pasaron 15 días. Cumple la regla
   9 al pie de la letra, pero añade una tarea de código nueva.
2. Dejar el valor en `never` (comportamiento por defecto del plan Free) y
   documentar la limitación en vez de forzar el número exacto.

# Decisión

**Mar elige la opción 2.** No se paga el plan Pro de Supabase (presupuesto
0 €/mes, restricción dura de [`CLAUDE.md`](../CLAUDE.md)) ni se construye
lógica de caducidad a medida solo para esto. La sesión
sigue protegida por lo que sí garantiza el plan Free (enlace de acceso de
un solo uso, revocación manual si hiciera falta) pero no fuerza el cierre
exacto a los 15 días de inactividad.

Queda anotado como limitación conocida en `docs/03-spec.md` §5 regla 9 y
§7 (Continuidad de sesión), para que la spec siga siendo la verdad
funcional real del proyecto y no una promesa que la infraestructura
gratuita no cumple.

# Impacto

- T16 se cierra con esta decisión, sin cambios de codigo.
- Si en el futuro Jobs App deja de ser gratis (o Mar decide pagar Pro),
  esta es la primera pieza a revisar.
