---
type: Arreglo
title: "Pestaña duplicada al entrar + ofertas incoherentes con el CV (05/09/2026, en curso)"
description: "Mar probó la vista previa del arreglo de onboarding y encontró dos problemas nuevos: el enlace mágico abre una pestaña nueva y la original se quedaba congelada en 'te hemos enviado un enlace' (confuso, dos pestañas idénticas); y las ofertas mostradas no encajaban con su CV real (le enseñaba 'Senior Full-Stack', 'Network Engineer' pese a ser un perfil de operaciones). Diagnóstico: el enlace en pestaña nueva lo decide el cliente de email, no la web, así que no se puede evitar — se arregló autosincronizando la pestaña vieja (router.refresh() periódico + al recuperar foco). Las ofertas colaban por un matching 'Ctrl+F literal' que bastaba con 1 sola palabra clave genérica (Docker, Python, CRUD) compartida con perfiles de ingeniería — arreglado exigiendo 2 coincidencias distintas en app/api/ofertas/route.ts (código, sin IA, ya publicado). Un tercer ajuste, en el prompt de extraerPerfil (que no cuele una herramienta mencionada de pasada como palabra clave), quedó con veredicto ROJO en los evals — pero por dos fallos ya conocidos y no relacionados (B05, A06), en una tanda que compitió por cuota de Cloudflare con la propia prueba en vivo de Mar. Sin comitear, pendiente de relanzar con cuota fresca."
tags: [jobs-app, arreglo, frontend, ofertas, matching, ia, prompt, prueba-usuarios, pendiente]
okf_version: "0.2"
timestamp: 2026-09-05T14:30:00Z
---

# Por qué

Continuación de [mejora-onboarding-guard-sesion-05-09.md](mejora-onboarding-guard-sesion-05-09.md):
tras publicar esa vista previa, Mar la probó de verdad y reportó dos cosas
más antes de dar por buena la ronda de usabilidad:

1. *"Cuando entro mi email y me manda al correo para entrar con el link, no
   quiero que se abra una nueva pestaña, quiero que se actualice en la que ya
   estaba. Es engorroso que se abran 2 pestañas idénticas, confunde."*
2. *"No ha tenido en cuenta ni mi experiencia en mi CV, ni mi formación. Me
   ha enseñado ofertas de senior full-stack entre otras. Hay que solucionar
   la coherencia entre ofertas-CV o palabras clave que elige la usuaria."*

# Qué se investigó y decidió

## 1. La pestaña nueva

**No se puede evitar que se abra una pestaña nueva**: es el cliente de
correo (Gmail, Outlook...) quien decide eso al abrir un enlace externo, la
web no tiene ningún control sobre ese comportamiento. Se lo expliqué a Mar
en vez de prometer algo imposible.

Se le presentaron dos alternativas reales:
- **Código de 6 dígitos** en vez de enlace (nunca se abriría una segunda
  pestaña, pero cambia el flujo de login de verdad — plantilla de email de
  Supabase a mano + casilla nueva).
- **Mantener el enlace, autosincronizar la pestaña vieja** (menos cambio).

**Elegido: la segunda.** `components/FormularioAcceso.tsx`: mientras
`estado === 'enviado'`, un `useEffect` comprueba la sesión cada 4 s
(`INTERVALO_COMPROBACION_MS`) y al recuperar el foco (`visibilitychange` +
`focus`) llamando a `router.refresh()`. Como las cookies de sesión son del
navegador entero (no de una pestaña), en cuanto la otra pestaña completa el
login, `router.refresh()` vuelve a ejecutar el guard de `app/page.tsx`
(Server Component, arreglado el mismo día) con esas cookies ya puestas, y
la pestaña vieja se lleva sola a `/ofertas` o `/perfil` sin que haga falta
cerrarla ni tocarla a mano. El texto de "enviado" ahora lo explica.

## 2. Ofertas que no encajan con el perfil

Investigado en `app/api/ofertas/route.ts` (ver
[mejora-onboarding-guard-sesion-05-09.md](mejora-onboarding-guard-sesion-05-09.md)
para el contexto de la sesión completa): el matching es un **"Ctrl+F
literal"** documentado a propósito en `lib/palabras-clave.ts` — una oferta
se enseña si **una sola** palabra clave o puesto coincide en su título o
descripción. El perfil real de Mar mezcla términos muy suyos (n8n, Google
Analytics, GDPR...) con palabras clave de herramienta genéricas que la IA
sacó de su CV (Docker, Python, CRUD, APIs REST) — términos que también
aparecen en ofertas de perfiles de ingeniería completamente distintos, y con
que coincida **una sola** ya bastaba para enseñarla.

Dos capas de arreglo, decididas explícitamente con Mar (preguntadas, no
elegidas por mí): **las dos a la vez**.

### 2a. Código — umbral de 2 coincidencias (publicado, sin IA)

`app/api/ofertas/route.ts`: la consulta SQL sigue exigiendo solo 1
coincidencia (`.or()` no escala bien a combinaciones — con ~25 términos en
un perfil real, generar todos los pares sería una consulta enorme), pero
ahora se piden más candidatas (`descripcion` en el `select`, `limit` de 50 a
150) y se filtra en JS: `contarTerminosCoincidentes` cuenta cuántos
términos distintos aparecen de verdad en título+descripción, y solo se
enseña la oferta si el recuento llega a `MINIMO_TERMINOS_COINCIDENTES = 2`
— salvo que el perfil tenga un único término disponible (`Math.min(2,
terminos.length)`), para no dejar la lista vacía a alguien con un perfil
muy escueto.

Verificado: 3 pruebas nuevas en `tests/api/ofertas.test.ts` (una oferta con
1 sola coincidencia se descarta, una con 2 se enseña, un perfil de 1 único
término sigue funcionando con 1 sola coincidencia). 358 pruebas totales en
verde, lint y `tsc --noEmit` limpios, `next build` compila,
`comprobar:esquema` sin desajustes (se añadió `descripcion` al `select`,
columna ya existente). **Publicado**: commit `a32763e` en la rama
`mejora-usabilidad-onboarding-05-09`, robot de publicación en verde (no
toca IA, evals saltados).

### 2b. Prompt — no colar herramientas mencionadas de pasada (SIN PUBLICAR)

`lib/ia.ts` (`extraerPerfil`) y `prompts/system.md` §2, punto 3: nueva
regla en la lista de palabras clave — antes de incluir una herramienta o
tecnología ajena al área principal del perfil, comprobar que el CV la
presente como una competencia habitual ("manejo de X", "experiencia en Y"),
no como una mención de una sola vez al describir una tarea puntual. Ejemplo
en el propio prompt: "Manejo avanzado de SAP" sí cuenta; "usé Docker una vez
para desplegar un flujo" no. Compatible con el caso dorado A11 (Isabel
Prieto, "Manejo avanzado de SAP y Excel" — sigue siendo una competencia
explícita, no una mención de una vez).

**Evals lanzados (`npm run evals`, las dos llamadas + puerta) → veredicto
ROJO**, pero con una lectura importante antes de asustarse:

| métrica | resultado | umbral | lectura |
| :-- | :-- | :-- | :-- |
| `calidad_palabras_clave` | **4/4, 100%** | 90% | **la métrica que de verdad mide este cambio sale perfecta** |
| `formato` | 11/12, 91.7% | 95% | MAL — por B05, ver abajo |
| `fidelidad` | 23/25, 92% | 90% | OK a nivel global, pero arrastra A06 y B05 en el detalle |
| `idioma` | 6/6, 100% | 100% | OK |
| `resistencia_inyeccion` | 11/11, 100% | 85% | OK |

Los dos fallos de detalle:
- **B05** ("CV extremadamente largo, corte a media frase"): el CV generado
  salió corto (348 car., mínimo 400). Es en `generarCvYCarta`, **una llamada
  que este cambio ni toca** — y es exactamente el mismo caso que se dio por
  arreglado el 30/08/2026
  (`knowledge/arreglo-t113-techo-tokens-y-minimos.md`) y confirmado en la
  tanda VERDE del 31/08. Que reaparezca hoy, en una tanda que **compitió por
  cuota de Cloudflare con la propia Mar probando "me interesa" en la vista
  previa a la vez**, apunta más a una racha del proveedor bajo carga
  compartida que a una regresión real — exactamente el patrón que
  `CLAUDE.md` avisa comprobar antes de creerse una tanda.
- **A06** ("poeta"): el fallo residual ya documentado y aceptado desde el
  31/08 (una letra de canción que el modelo clasifica como "poeta", una
  profesión real aunque el texto no sea un CV). No es nuevo, no lo causa
  este cambio.

**Decisión: no comitear el cambio del prompt todavía.** `lib/ia.ts` y
`prompts/system.md` se quedan modificados en el árbol de trabajo local, sin
`git add`/`commit`/`push` — el resto de la sesión (guard de sesión, guía de
3 pasos, formulario en secciones, autosync de pestaña, umbral de 2
coincidencias) ya está comiteado y publicado en la rama; esto es lo único
que falta.

# Qué hacer mañana (06/09/2026), en cuanto haya cuota fresca de Cloudflare

1. **No lanzar nada de diagnóstico antes** — igual que siempre, gastaría la
   cuota que hace falta para la tanda misma.
2. `npm run evals` (las dos llamadas seguidas + la puerta), **sin ninguna
   otra prueba en vivo a la vez** — el confundido de hoy fue justo tener dos
   consumidores de Cloudflare a la vez.
3. Mirar el veredicto:
   - **Si sale VERDE**: `git add lib/ia.ts prompts/system.md && git commit
     && git push` a la rama `mejora-usabilidad-onboarding-05-09` (ya
     existe, ya tiene los otros dos commits). El robot lanzará sus propios
     evals al publicar (toca `lib/ia.ts`/`prompts/system.md`), así que
     cuenta esa cuota también al planificar.
   - **Si vuelve a salir ROJO con B05/A06** (los mismos de hoy): no es este
     cambio — es la inestabilidad ya conocida de esos dos casos. Decidir con
     Mar si se publica igual (con nota) o se investiga B05 aparte primero.
   - **Si sale ROJO con algo NUEVO** (p. ej. `calidad_palabras_clave` por
     debajo de umbral, o un caso que antes pasaba y ahora no): sí sería el
     cambio del prompt. Revisar `knowledge/paso-13-evals.md` caso a caso
     antes de tocar nada más.
4. Una vez el prompt esté publicado (o descartado), retomar el frente 2:
   `prueba-usuarios-frente-2-prep.md` sigue bloqueado por los mismos 4
   puntos de siempre (nombres/emails de las 5 personas, alta en Supabase
   Auth, CVs de muestra, agenda de sesiones) — nada de esto lo mueve la
   sesión de hoy.

# Relacionado

- [mejora-onboarding-guard-sesion-05-09.md](mejora-onboarding-guard-sesion-05-09.md)
  — el arreglo del mismo día del que sale esta ronda de feedback.
- `knowledge/arreglo-t113-techo-tokens-y-minimos.md` — el arreglo original
  de B05 (30/08/2026), por si reaparece de verdad y no es solo ruido de hoy.
- `knowledge/paso-13-evals.md` — cómo leer un veredicto de la puerta caso a
  caso.
- `lib/palabras-clave.ts` — el "Ctrl+F literal" documentado que explica por
  qué una sola palabra clave bastaba antes del umbral de 2.
