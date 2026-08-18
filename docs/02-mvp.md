# 02 · MVP

> Basado en `docs/01-historias.md`. Revisado con Mar tras una segunda
> vuelta de decisiones: algunas cosas que se habían aparcado en Versión 2
> vuelven al MVP porque Mar las considera fundamentales (autorregistro,
> carta de presentación, historial de resultados, aviso por email). El MVP
> ha crecido respecto a la primera versión de este documento — se explica
> por qué en cada punto.

## 1. Recorrido crítico

La única secuencia que una usuaria debe poder completar de principio a fin
para que el producto tenga algún valor:

1. **Se registra ella misma** con su email y una contraseña que elige
   (nadie más crea la cuenta por ella — privacidad y protección de datos).
2. **Rellena el formulario**: puesto que busca, palabras clave, años de
   experiencia, y **pega el texto de su CV** en un campo de texto (sin
   subir archivo).
3. **Pulsa "Buscar"**. Espera viendo un indicador de "buscando" mientras
   corre la ingesta.
4. **Ve la lista de ofertas** remotas asalariadas encontradas.
5. **Marca "me interesa"** en las ofertas que quiere. Espera viendo
   "generando" mientras se crean el CV y la carta de presentación
   adaptados, en una sola llamada.
6. **Descarga un único archivo** con el CV (1-2 páginas) y la carta de
   presentación (página 3) de esa oferta.
7. Lo envía ella misma a la empresa (fuera del producto).

Además, **por fuera** de este recorrido (pero igual de necesario para que
el producto funcione en la práctica, no solo en la demo):

- Cada día a las 13:00, la ingesta compartida corre automáticamente vía
  el schedule/trigger de n8n (sin que nadie la dispare a mano), y si
  encuentra ofertas nuevas que coinciden con el perfil de una usuaria, le
  llega un email corto con enlace a sus resultados.
- Si una usuaria vuelve a entrar otro día, ve sus resultados anteriores
  sin tener que repetir la búsqueda desde cero.

Si esta secuencia funciona de principio a fin para 1 persona, el MVP ya
demuestra el valor central: ahorrar el trabajo manual de adaptar el CV (y
ahora la carta) a cada oferta.

## 2. Historias del MVP

- **A1 · Registrarme y entrar con email y contraseña.** Tal cual, **sin
  recortar**: cada usuaria crea su propia cuenta y contraseña. Decisión
  explícita de Mar por privacidad — nadie más debe poder crear ni conocer
  la contraseña de otra persona del grupo.
- **A3 · Volver a ver mis resultados sin repetir la búsqueda.** Vuelve al
  MVP (estaba aparcada): Mar señala que sin esto la usuaria se cansa a
  mitad de proceso y abandona la búsqueda de empleo. Se implementa como
  parte natural de guardar los datos por cuenta, no hace falta una
  pantalla nueva compleja — solo mostrar lo último guardado al entrar.
- **B1 · Formulario de perfil.** Recortado: un solo campo de puesto (no
  varios), sin autosugerencias mientras escribe. Texto libre.
- **B2 · Pegar CV base en texto.** Recortado respecto a la idea original
  de subir archivo: **solo textarea de texto plano**, sin subida de PDF.
  Evita depender de que un PDF se lea bien — menos piezas que puedan
  fallar, sin perder la función.
- **C1 · Lanzar búsqueda.** Recortado: mientras haya una búsqueda en curso
  para esa usuaria, el botón "Buscar" se deshabilita — no hay lógica de
  detectar duplicados por campo ni de permitir paralelas. Una a la vez.
- **E1 · Ver lista de ofertas.** Tal cual, es el corazón del recorrido.
- **C2 · Seleccionar "me interesa".** Tal cual: sin esto no hay forma de
  decidir qué generar, y es lo que mantiene bajo control el coste (riesgo
  del Paso 1). Mar lo confirma como fundamental.
- **C3 · Generar CV y carta de presentación juntos.** Vuelve al MVP
  (estaba aparcada): Mar confirma que sin carta es más difícil conseguir
  entrevista, especialmente para los perfiles no-tech de la clase
  (marketing, educación, traducción) y para quien está en transición de
  carrera. Se generan en **una sola llamada** al modelo (mismo contexto,
  mismo prompt) — no duplica coste como se pensaba en el primer recorte.
- **C4 · Descargar CV + carta en un único archivo.** Vuelve ampliada: CV
  en las primeras 1-2 páginas, carta en la página 3, un solo archivo
  descargable.
- **D1 + D2 · Espera.** Fusionadas en un único estado simple: "procesando"
  mientras dura cualquiera de las dos fases (búsqueda o generación).
- **F1 + F2 · Sin resultados / error.** Fusionadas en un mensaje mínimo:
  "no se encontraron ofertas" o "algo falló, inténtalo de nuevo" — sin
  sugerencias accionables ni botón de reintento automático.
- **G1 · Límite de uso.** Recortado a lo mínimo: un número fijo
  hardcodeado (a decidir en el Paso 5) de búsquedas/generaciones por
  usuaria y día. Sin panel, sin aviso proactivo.
- **G2 · Ingesta compartida automática a las 13:00.** Tal cual: vía
  schedule/trigger de n8n, reutilizando el cron que el backend ya tiene
  montado — Mar confirma que debe ser automático, no manual.
- **G3 · Email de aviso cuando hay ofertas nuevas.** Nueva, entra al MVP:
  aviso corto + enlace a la web (sin listar el detalle de las ofertas
  dentro del correo, para no duplicar la plantilla de la web). Solo se
  envía si hay ofertas relevantes nuevas y la usuaria ya tiene perfil
  guardado.

## 3. Versión 2 (aparcado)

Lo que queda fuera del MVP porque el recorrido crítico funciona sin ello:

- **A2 · Recuperar contraseña (self-service).** Mientras tanto: si alguien
  de las 5 personas la olvida, se lo resuelve Mar manualmente (p. ej.
  borrando y dejando que se re-registre). Construir un flujo de
  recuperación por email para 5 personas es esfuerzo que no compra
  validación todavía — aunque ahora que el registro es autoservicio, esto
  habrá que revisarlo pronto si el grupo crece.
- **B1 · Autosugerencias de puesto mientras se escribe, y varios puestos a
  la vez.** Azúcar de UX, cero impacto en si el producto funciona.
- **C1 · Búsquedas en paralelo cuando no hay campos duplicados.** Lógica
  fina que no aporta nada si de partida solo se permite una búsqueda a la
  vez por usuaria.
- **F1/F2 · Mensajes de error accionables** (sugerir ampliar palabras
  clave, botón de reintento, distinguir causa del fallo).
- **G1 · Panel de uso / aviso proactivo antes de llegar al límite.**
- **G3 · Detalle de las ofertas dentro del email.** El email del MVP es
  solo un aviso con enlace; listar título/empresa/enlace directamente en
  el correo es una mejora posterior.

## 4. Hipótesis

Creemos que **las 5 personas de la clase** (perfiles diversos: profesora,
marketing, traducción, developer, Marta) **usarán el MVP para su búsqueda
real de empleo remoto asalariado y generarán al menos un CV y carta
adaptados cada una**, porque **les ahorra el trabajo manual y repetitivo
de adaptar el CV y escribir una carta a cada oferta, algo que hoy hacen a
mano sin método (o directamente no hacen, en el caso de la carta)**.

Sabremos que acertamos si, durante el periodo de prueba, **las 5 personas
entran con su propia cuenta y generan CVs+cartas de verdad para ofertas
que les interesan** (no solo prueban la web una vez) — el mismo criterio
de éxito ya fijado en `docs/00-problema.md`: 5 de 5 usuarias activas, al
menos 5 CVs generados en total.

## 5. Esfuerzo

Para alguien sin experiencia técnica previa trabajando con Claude Code,
partiendo de que **el backend de n8n ya existe y funciona** (hay que
conectarlo y **adaptar el nodo de ingesta de empleo existente** a este
MVP, no construir el pipeline desde cero):

| Bloque | Días estimados |
| :---- | :---- |
| Registro + login (email/contraseña, autoservicio) | 1–1,5 |
| Formulario + textarea de CV + guardado de perfil | 1 |
| Conectar el botón "Buscar" al webhook + estado de espera | 1–2 |
| Lista de ofertas + selección "me interesa" + disparo de generación | 1–2 |
| Generación conjunta de CV + carta (prompt) y ensamblado en un único archivo descargable | 1–1,5 |
| Ver resultados anteriores al volver a entrar (persistencia simple) | 0,5–1 |
| Adaptar el nodo n8n de ingesta de empleo al schedule de las 13:00 + email de aviso personalizado | 1–1,5 |
| Límite de uso por usuaria/día | 0,5 |
| Mensajes de error/sin resultados mínimos | 0,5 |
| Pruebas con la clase real y arreglos | 1–2 |

**Total estimado: 9–13 días** de trabajo enfocado (no necesariamente
jornada completa), con apoyo de Claude Code en cada tarea del Paso 9.

## 6. Veredicto

**El MVP ha crecido respecto a la primera versión de este documento**,
porque varias historias que parecían recortables (carta de presentación,
autorregistro, historial, email automático) resultaron ser importantes
para Mar por razones de fondo — no caprichos, sino privacidad de datos y
tasa real de conversión a entrevista. Eso es válido y hay que respetarlo,
pero como founder tengo que decirlo con la misma honestidad que antes:
**sigue sin ser un MVP pequeño para un primer proyecto sin experiencia
técnica.** Ahora son 9 piezas técnicas (auth con registro propio, textarea
de perfil, llamada asíncrona con estado, selección, generación conjunta
CV+carta, ensamblado de archivo, persistencia entre sesiones, cron +
email automático, control de cuota), no 7.

Lo que sí puedo recortar sin tocar ninguna de las decisiones de Mar:

- **B1 y C1 ya vienen recortados al hueso** (un puesto, sin paralelismo) —
  no hay más grasa ahí.
- **El email (G3) puede simplificarse dentro de sí mismo**: un solo nodo
  de n8n que reutiliza la plantilla más simple posible (texto plano, sin
  diseño), no un email con estilo — ya está reflejado arriba.
- **La persistencia (A3) no necesita una pantalla de "historial" separada**
  — basta con que la pantalla de resultados sea la misma tanto si vengo de
  buscar ahora como si vengo de una sesión anterior. Ya está reflejado
  arriba como parte de A3, no como pieza nueva.

No voy a proponer otra ronda de "MVP v0" recortando registro, carta o
persistencia — ya se decidió explícitamente que son fundamentales, y
insistir en recortarlas otra vez sería ignorar lo que Mar ya resolvió. Si
en algún momento el plazo aprieta, la palanca que queda es **secuenciar el
Paso 9 en dos tandas dentro del propio MVP**: primero el recorrido crítico
sin G2/G3 (ingesta y email automáticos), probando con ingesta manual
bajo demanda; y añadir el cron + email al final, una vez que el resto
funciona de punta a punta. Eso no cambia el alcance, solo el orden de
construcción — lo dejo anotado para el Paso 7 (tareas).
