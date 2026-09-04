---
type: Nota
title: "Frente 2 · Preparación de la prueba de usabilidad con 5 personas (EN CURSO)"
description: "Preparación previa a las 5 sesiones de la skill prueba-usuarios (entre el Paso 16 y el Paso 17): a quién reclutar, el guion de 3 tareas, las reglas de la sesión y el plan de datos. Ninguna sesión se ha hecho todavía — falta que Mar aporte los 5 nombres/emails."
tags: [jobs-app, prueba-usuarios, frontend, demo, pendiente]
okf_version: "0.2"
timestamp: 2026-09-04T00:00:00Z
---

# Por qué

El frente 1 (robustez del frontend, [robustez-demo-frente-1.md](robustez-demo-frente-1.md))
está publicado. Antes del Paso 17 (publicar el criterio de éxito de
`docs/00-problema.md`: 5/5 personas de la clase usan el MVP de verdad), toca
el **frente 2**: una prueba de usabilidad con 5 personas siguiendo la skill
`prueba-usuarios`. Este documento es la preparación previa a esas sesiones —
se escribirá `docs/prueba-usuarios.md` cuando las 5 sesiones ya se hayan
hecho y Mar traiga las notas.

# A quién reclutar

Perfil de `docs/00-problema.md`: alguien en búsqueda de empleo **remoto y
asalariado**, nivel técnico **bajo**, de cualquier sector.

**Problema detectado y decidido con Mar (04/09/2026):** el perfil documentado
coincide exactamente con las 5 compañeras de la clase, que son también las
usuarias del criterio de éxito ("5/5 personas de la clase"). Usarlas también
como testers de esta prueba de usabilidad solapa las dos mediciones — habrían
visto la web guiadas antes de la medición real.

**Decisión: mezcla.** Propuesto por defecto **2 de la clase + 3 externas**
(perfil similar: búsqueda activa de empleo remoto, fuera de la clase), para
minimizar el solape con el criterio de éxito. Mar puede ajustar el reparto.

**Pendiente — bloquea el arranque de las sesiones:**
- [ ] Mar aporta los 5 nombres/emails concretos (2 de la clase + 3 externas).
- [ ] Alta de esos 5 emails en Supabase Auth antes de cada sesión
  (`shouldCreateUser: false` en el login — un email no invitado no entra, ver
  `app/page.tsx` y `docs/07-emergencia.md`).
- [ ] Decidir si cada persona usa su CV real o uno de muestra (ver "Datos"
  abajo); preparar 2-3 CVs falsos (marketing, docencia, traducción) si hacen
  falta para las externas.
- [ ] Agendar las 5 sesiones (~20-30 min cada una).

# Guion — 3 tareas del recorrido crítico

Formuladas como objetivo de la persona, nunca como instrucción de dónde
pulsar (si se dice dónde hay que hacer clic, la prueba deja de medir nada):

1. **"Acabas de enterarte de esta web por una compañera y quieres empezar a
   usarla para buscar trabajo. Entra y deja todo listo para que te empiece a
   enseñar ofertas que encajen contigo."**
   Cubre: pedir acceso, seguir el enlace del email (magic link), pegar el CV,
   revisar/ajustar el puesto y las palabras clave propuestas, guardar el
   perfil.
2. **"Mira qué ofertas te ha encontrado y consigue que te prepare el CV y la
   carta para la que más te encaje."**
   Cubre: leer la lista de ofertas, marcar "me interesa", entender el estado
   de generación.
3. **"Consigue el documento de esa oferta en tu ordenador y compruébalo antes
   de mandarlo a la empresa."**
   Cubre: esperar a que termine, descargar el PDF, abrirlo, valorar si lo
   enviaría tal cual.

Extra si sobra tiempo (no es una de las 3 tareas oficiales): cerrar la
pestaña y volver a entrar, a ver si encuentra sola lo que ya había hecho
(persistencia, regla de negocio 3.1.8 de `docs/03-spec.md`).

# Reglas de la sesión

- **No ayudar.** Si se atasca, esperar. Solo si sufre de verdad 2-3 minutos
  sin salida, intervenir con lo mínimo y anotarlo como "bloqueo total".
- **No explicar ni justificar el diseño.** Si pregunta "¿esto qué hace?",
  devolver la pregunta: "¿tú qué crees?".
- **Pedir que piense en voz alta** todo el rato: qué mira, qué espera, qué le
  extraña.
- **Anotar**: dónde duda, dónde se para, qué hace en vez de lo esperado, y
  sus palabras textuales entre comillas.
- Dejar claro al empezar: se prueba el producto, no a la persona — si algo no
  se entiende, es fallo del producto.
- Una persona a la vez, ~20-30 min.

# Qué datos pido y cuáles no

- **CV**: a elección de cada persona — su CV real (más realista; sigue el
  mismo circuito que en producción: va al proveedor de IA principal, que
  declara no entrenar con el contenido, y se borra automáticamente al mes,
  regla de negocio 10 de `docs/03-spec.md`) o un CV de muestra preparado, si
  no quiere que se vea en pantalla durante la sesión.
- **Email**: uno real, para recibir el magic link.
- **Aviso previo a cada persona**: qué se anota, que las notas se anonimizan
  en `docs/prueba-usuarios.md` (sin nombres: "persona 1, perfil marketing"),
  y qué pasa con su CV si usa el real (ver arriba).
- **Qué NO se pide**: ningún dato de contacto adicional; no se graba vídeo ni
  cara, solo notas escritas.

# Qué sigue (skill `prueba-usuarios`, pasos 5-8)

Cuando Mar traiga las notas de las 5 sesiones:
5. Escribir `docs/prueba-usuarios.md` con cada tropiezo y palabras textuales.
6. Ordenar hallazgos por frecuencia/gravedad, partidos en "se arregla antes
   de publicar" / "se va a la versión 2".
7. Convertir la primera lista en tareas (formato del Paso 8) en
   `docs/06-tareas.md`.
8. Anotar qué no se llegó a probar con ninguna de las 5 personas.

Al terminar, invocar `/bitacora` con lo que la prueba cambió del producto y
lo que sorprendió.

# Relacionado

- [robustez-demo-frente-1.md](robustez-demo-frente-1.md) — frente 1 (código),
  ya publicado.
- `docs/00-problema.md` — perfil de usuaria y criterio de éxito.
- `docs/02-mvp.md` §1 — recorrido crítico del que salen las 3 tareas.
- `docs/03-spec.md` §3, §5 — recorridos y reglas de negocio citadas arriba.
