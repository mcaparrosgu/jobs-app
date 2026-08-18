# 02 · MVP

> Basado en `docs/01-historias.md`. Aquí no se añade nada — solo se
> recorta. Si una historia no está en el recorrido crítico, se aparca en
> VERSIÓN 2, aunque estuviera marcada IMPRESCINDIBLE en el Paso 2. La
> etiqueta de prioridad de una historia describe su importancia para el
> producto completo, no si entra en esta primera tanda.

## 1. Recorrido crítico

La única secuencia que una usuaria debe poder completar de principio a fin
para que el producto tenga algún valor:

1. **Entra** con su email y contraseña (cuenta creada de antemano por Mar
   para los 5 de la clase — sin auto-registro).
2. **Rellena el formulario**: puesto que busca, palabras clave, años de
   experiencia. Sube su CV en PDF.
3. **Pulsa "Buscar"**. Espera viendo un indicador de "buscando" mientras
   corre la ingesta.
4. **Ve la lista de ofertas** remotas asalariadas encontradas.
5. **Marca "me interesa"** en las ofertas que quiere. Espera viendo
   "generando" mientras se crea el CV adaptado.
6. **Descarga el CV** adaptado a esa oferta.
7. Lo envía ella misma a la empresa (fuera del producto).

Si esta secuencia funciona de principio a fin para 1 persona, el MVP ya
demuestra el valor central: ahorrar el trabajo manual de adaptar el CV.

## 2. Historias del MVP

Solo las que forman el recorrido de arriba — y recortadas dentro de sí
mismas donde se podía:

- **A1 · Entrar con email y contraseña.** Recortado: sin auto-registro.
  Las 5 cuentas las crea Mar a mano antes de empezar la prueba. Elimina
  toda la lógica de validación de registro.
- **B1 · Formulario de perfil.** Recortado: un solo campo de puesto (no
  varios), sin autosugerencias mientras escribe. Texto libre.
- **B2 · Subir CV base.** Recortado: solo PDF, un único formato aceptado.
  Sin opción de pegar texto.
- **C1 · Lanzar búsqueda.** Recortado: mientras haya una búsqueda en curso
  para esa usuaria, el botón "Buscar" se deshabilita — no hay lógica de
  detectar duplicados por campo ni de permitir paralelas. Una a la vez.
- **E1 · Ver lista de ofertas.** Tal cual, es el corazón del recorrido.
- **C2 · Seleccionar "me interesa".** Tal cual: sin esto no hay forma de
  decidir qué CV generar, y es lo que mantiene bajo control el coste
  (riesgo del Paso 1).
- **C3 · Generar CV por oferta seleccionada.** Recortado: **solo CV, sin
  carta de presentación.** La carta duplica llamadas a Anthropic y
  complejidad de prompt por una funcionalidad que ni siquiera estaba en el
  problema original del Paso 1 — se añadió en la revisión del Paso 2, pero
  no es necesaria para demostrar el valor central.
- **C4 · Descargar el CV.** Tal cual (sin carta que descargar).
- **D1 + D2 · Espera.** Fusionadas en un único estado simple: "procesando"
  mientras dura cualquiera de las dos fases (búsqueda o generación). No
  hace falta que el mensaje diferencie cuál de las dos es.
- **F1 + F2 · Sin resultados / error.** Fusionadas en un mensaje mínimo:
  "no se encontraron ofertas" o "algo falló, inténtalo de nuevo" — sin
  sugerencias accionables ni botón de reintento automático.
- **G1 · Límite de uso.** Recortado a lo mínimo: un número fijo
  hardcodeado (a decidir en el Paso 5) de búsquedas/generaciones por
  usuaria y día. Sin panel, sin aviso proactivo — solo bloquea y dice "has
  alcanzado tu límite de hoy".
- **G2 · Ingesta compartida diaria a las 13:00.** Tal cual: reutiliza el
  cron que el backend de n8n ya tiene montado, así que no añade esfuerzo
  nuevo — de hecho ahorra construir una llamada a la API bajo demanda por
  cada búsqueda.

## 3. Versión 2 (aparcado)

Todo esto queda fuera del MVP. No porque no importe, sino porque el
recorrido crítico funciona sin ello:

- **A2 · Recuperar contraseña.** Mientras tanto: si alguien de las 5
  personas la olvida, se la resetea Mar a mano. Construir un flujo de
  recuperación por email para 5 personas conocidas es esfuerzo que no
  compra validación.
- **A3 · Volver a ver resultados anteriores sin relanzar búsqueda** (como
  pantalla explícita). El dato queda igualmente guardado por debajo, pero
  no se construye una vista dedicada de "historial" en el MVP.
- **B1 · Autosugerencias de puesto mientras se escribe, y varios puestos a
  la vez.** Puro azúcar de UX, cero impacto en si el producto funciona.
- **B2 · Subir CV en Word o pegar texto**, además de PDF.
- **C1 · Búsquedas en paralelo cuando no hay campos duplicados.** Lógica
  fina que no aporta nada si de partida solo se permite una búsqueda a la
  vez por usuaria.
- **C3/C4 · Carta de presentación.** Se añade en cuanto el CV solo
  demuestre que la gente lo usa de verdad.
- **F1/F2 · Mensajes de error accionables** (sugerir ampliar palabras
  clave, botón de reintento, distinguir causa del fallo).
- **G1 · Panel de uso / aviso proactivo antes de llegar al límite.**

## 4. Hipótesis

Creemos que **las 5 personas de la clase** (perfiles diversos: profesora,
marketing, traducción, developer, Marta) **usarán el MVP para su búsqueda
real de empleo remoto asalariado y generarán al menos un CV adaptado cada
una**, porque **les ahorra el trabajo manual y repetitivo de adaptar el CV
a cada oferta, algo que hoy hacen a mano sin método**.

Sabremos que acertamos si, durante el periodo de prueba, **las 5 personas
entran con su cuenta y generan CVs de verdad para ofertas que les
interesan** (no solo prueban la web una vez) — el mismo criterio de éxito
ya fijado en `docs/00-problema.md`: 5 de 5 usuarias activas, al menos 5 CVs
generados en total.

## 5. Esfuerzo

Para alguien sin experiencia técnica previa trabajando con Claude Code,
partiendo de que **el backend de n8n ya existe y funciona** (solo hay que
conectarlo, no construirlo):

| Bloque | Días estimados |
| :---- | :---- |
| Cuentas + login (email/contraseña, sin auto-registro) | 1 |
| Formulario + subida de CV en PDF | 1 |
| Conectar el botón "Buscar" al webhook + estado de espera | 1–2 |
| Lista de ofertas + selección "me interesa" + disparo de generación | 1–2 |
| Descarga del CV generado | 0,5 |
| Límite de uso por usuaria/día | 0,5 |
| Ajustar la ingesta compartida a las 13:00 (reusa cron existente) | 0,5 |
| Mensajes de error/sin resultados mínimos | 0,5 |
| Pruebas con la clase real y arreglos | 1–2 |

**Total estimado: 7–10 días** de trabajo enfocado (no necesariamente
jornada completa), con apoyo de Claude Code en cada tarea del Paso 9.

## 6. Veredicto

**Sigue siendo grande para un primer proyecto estructurado de alguien sin
experiencia técnica.** Tiene autenticación, subida de archivos, una
llamada asíncrona a un sistema externo con estado de espera, una pantalla
de selección, generación condicionada, descarga de archivo y control de
cuota — son 7 piezas técnicas distintas, aunque cada una sea pequeña.

Si el objetivo fuera aprender más rápido con menos riesgo, una versión
**todavía más reducida (MVP v0)** sería:

- **Sin login real**: una lista fija de 5 nombres para elegir "quién soy"
  (sigue separando los datos por persona, pero sin contraseña ni
  formulario de alta — nota: esto reabre el riesgo de privacidad que Mar
  señaló, así que solo tendría sentido si las 5 personas aceptan
  explícitamente que no hace falta contraseña para esta prueba tan
  acotada).
- **Sin subida de PDF**: un textarea donde la usuaria pega su experiencia
  en texto plano. Evita parsear PDFs, que es donde más cosas raras pasan.
- **Sin pantalla de selección**: se genera CV automáticamente para las 3
  primeras ofertas encontradas, sin marcar "me interesa" una por una.
  Menos control de coste por persona, pero una pantalla y un estado menos.
- **Descarga en texto plano**, no PDF con formato.

Esta versión reduce el esfuerzo a unos **4–5 días**, a costa de una
experiencia más tosca. Mi recomendación: **mantener el MVP tal como está
descrito arriba (con login real, ya que Mar lo pidió explícitamente por
privacidad) pero sí adoptar del MVP v0** el textarea en vez de subida de
PDF y la generación automática de las primeras ofertas en vez de la
pantalla de selección — recorta ~2 días sin tocar la decisión de
contraseña, que no es negociable.
