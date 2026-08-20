---
type: Incidente
title: Paso 15 — revisión independiente del red team (Opus)
description: Segunda pasada de red teaming sobre el Paso 15 ya hecho. Corrige la conclusión "resistido" de la inyección indirecta —un anuncio manipulado sustituía el CV entero de la usuaria sin un solo aviso, porque la descripción de la oferta estaba dentro de la lista blanca de verificarCv— y recoge los arreglos aplicados el mismo día, verificados relanzando los ataques en vivo.
tags: [jobs-app, seguridad, red-team, paso-15, okf]
timestamp: 2026-08-20T13:00:00Z
---

# Por qué hay una segunda pasada

Mar pidió una revisión independiente del Paso 15 (hecho antes con otro
modelo) para no fiarse de un único juicio sobre la seguridad de un sistema
que maneja los CVs de cuatro personas reales. Informe completo en
[`seguridad/red-team-opus.md`](../seguridad/red-team-opus.md); el primero se
conserva íntegro en `seguridad/red-team.md`.

# El hallazgo que cambia la conclusión

El primer informe dio por **resistida** la inyección indirecta que intenta
inventar experiencia (su ficha 2.1). Con otra forma del payload, no lo está.

El prompt de `generarCvYCarta` separa las piezas con marcadores de texto
plano (`=== OFERTA ===`, `=== CV ORIGINAL ===`) y la descripción de la oferta
se pega **antes** del CV. Quien escribe el anuncio puede cerrar su sección y
abrir la del CV. Ejecutado en vivo contra `lib/ia.ts` con las claves reales:
el CV de una camarera salió convertido en el de una ingeniera de datos con
máster por Harvard Extension School y certificación de Kubernetes. **Cero
avisos.** El PDF llevaría encima el nombre y el email reales de la usuaria.

# La causa raíz, que es de código y no del modelo

`verificarCv` construye su lista blanca (`permitido`) incluyendo
`ofertaDescripcion`. Es decir: **el atacante decide qué nombres cuentan como
verificados**. Medido con el mismo CV generado y cambiando solo la oferta:

- con la descripción maliciosa (que nombra las empresas y titulaciones
  inventadas): **0 avisos**
- con una descripción limpia: **6 avisos**

Sacar la oferta de esa lista blanca es una línea de código y es el arreglo
con mejor relación coste/beneficio de todo el informe.

# Otros puntos ciegos nuevos

- **`oferta.titulo` y `oferta.empresa`** no pasan por
  `detectarIntentoDeInyeccion` ni se recortan, aunque sí entran en el prompt.
  Ejecutado: una instrucción metida en el título hizo que `puesto` valiera
  `CONTROLADO-POR-LA-OFERTA` (que es lo que se imprime en mayúsculas bajo el
  nombre en el PDF) y que la carta empezara por "Este documento ha sido
  intervenido".
- **El registro está abierto**: `signInWithOtp` sin `shouldCreateUser:false`
  ni lista de emails. Cualquiera con la URL entra y gasta la cuota compartida
  (no ve datos ajenos: las políticas RLS son correctas).
- **Privacidad del proveedor**: `CLAUDE.md` exige Zero Data Retention en
  Groq, pero desde el 19/08 el proveedor principal es OpenRouter con modelos
  `:free`, y sobre eso no hay ninguna decisión escrita. Pendiente de
  verificar en el panel de OpenRouter si la cuenta permite entrenar con las
  peticiones. Ver [decision-modelo-ia.md](decision-modelo-ia.md).
- **Amplificación 5×**: cada llamada a la IA gasta hasta 5 de las 50
  peticiones diarias (dos modelos en paralelo en la ronda 1, tres en la 2).
  El límite de 5 documentos por usuaria son hasta 25 peticiones. Verificado
  en vivo el 20/08: `X-RateLimit-Remaining: 0` — la cuota del día ya estaba
  agotada por los evals y el propio red teaming, y la app funcionaba entera
  con el respaldo de Groq.

# Qué se arregló (mismo día)

Todo lo que era código, más las pruebas que lo fijan. Lo importante:

- **La descripción de la oferta ya no es fuente de verdad para nadie.**
  `verificarCv` tiene ahora dos listas blancas: los nombres se comparan con el
  CV, sus empresas y titulaciones, y el título y la empresa de la oferta; los
  datos de contacto, solo con el CV. Un email de phishing metido en el anuncio
  vuelve a producir aviso.
- **Etiquetas con marca aleatoria por petición** (`[a7f3c2:CV_ORIGINAL]`) en
  vez de marcadores fijos, más `neutralizarDelimitadores` sobre todo el texto
  externo. **Relanzado el ataque en vivo: el CV generado vuelve a ser el de la
  camarera, sin rastro del CV inyectado.**
- **`titularSeguro`**: el campo `puesto` tiene que compartir alguna palabra
  con el puesto del perfil o con el título de la oferta; si no, se usa el del
  perfil. Relanzado el ataque del título: `puesto` sale "Camarera de sala" y
  la carta ya no lleva la frase impuesta.
- **Aviso crítico si el CV generado no menciona ninguna empresa del CV
  original**: la señal más simple de "esto no es tu CV", y aguanta la
  traducción porque los nombres propios no se traducen.
- **Cuota**: límite de 10 análisis de CV al día (`lib/extracciones.ts`), y
  cupo diario de generaciones sin condición de carrera, con cerrojo por
  usuaria dentro de la base de datos (migración `0014`, usada por
  `/api/interes` y `/api/generar`).
- Detector de inyección normalizado (espacios, invisibles, homoglifos, y
  comparación también sin espacios), moderación por palabra y no por
  subcadena, avisos ordenados por gravedad antes de recortar a seis,
  `empresas_cv`/`titulos_cv` filtradas contra el CV en `/api/perfil`,
  `/api/generar` exige interés previo, los fallos de contenido responden 422
  y no se reintentan solos, y el enlace de la oferta se valida (solo
  http/https).

218 pruebas en verde, tipos limpios. Detalle por ficha en la tabla de
`seguridad/red-team-opus.md`.

# Un fallo introducido al arreglar, y cómo se cazó

Merece quedar escrito porque es el riesgo típico de una tanda de arreglos de
seguridad: **arreglar rompe cosas**.

La función `crear_generacion_con_cupo` escribía `iniciado_en = now()` al crear
la fila. Eso está bien cuando la llama `/api/generar` (que se pone a trabajar
en ese momento), pero **`/api/interes` también la llama**, y esa ruta solo
apunta que hay trabajo pendiente. Con `iniciado_en` ya marcado, la petición
siguiente de `/api/generar` veía el turno ocupado, respondía "ya se está
preparando"… y no lo estaba preparando nadie. **El documento no se habría
generado nunca**: el camino principal del producto, roto.

No lo cazó ninguna prueba —los tests usaban un cliente falso, y ahí la
función SQL es un mock— sino releer el diff entero preguntándose qué hace
cada uno de los que llaman a lo que he cambiado. Se arregló con un parámetro
`p_tomar_turno` (false en `/api/interes`, true en `/api/generar`) y ahora hay
un test que lo fija en cada ruta.

La lección: cuando un cambio mete lógica en la base de datos, las pruebas con
cliente falso dejan de cubrirla. Ese trozo hay que leerlo, o probarlo contra
la base de datos de verdad.

# Lo que se hizo fuera del código, el mismo día

1. **Migración `0014` ejecutada** en Supabase y verificada contra la base de
   datos real: tabla `extracciones` con sus dos políticas RLS y la función
   `crear_generacion_con_cupo` con la firma de cuatro parámetros.
2. **Política de datos comprobada en los dos proveedores** — y no era una
   sospecha: OpenRouter tenía **activado** el permiso para que los modelos
   gratuitos entrenaran con las peticiones. Apagado. Groq tiene ZDR global.
   Decisión y consecuencias en
   [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md).
3. **Amplificación reducida**: las rondas de OpenRouter bajan de 2+3 modelos
   en paralelo a 1+2 (cada modelo lanzado gasta cuota aunque se aborte).

# Lo que sigue pendiente, y es de Mar

Guion paso a paso en
[`seguridad/pendiente-para-mar.md`](../seguridad/pendiente-para-mar.md).

1. **Cerrar el registro** en Supabase (Authentication → Sign In / Providers →
   "Allow new users to sign up"), **el día en que las cinco tengáis cuenta**.
   Hoy solo existe la de Mar: cerrarlo antes obligaría a invitar a mano a las
   cuatro, con invitaciones que caducan. Un filtro en el navegador no vale:
   cualquiera puede llamar a Supabase directamente con la clave pública.
2. **Pasar los evals antes de publicar**. Han cambiado el prompt y el modelo,
   así que es obligatorio (`CLAUDE.md`). Relanzados el 20/08 con Groq:
   extracción 9/12, generación 5/13 — hay que mirar los fallos uno a uno en el
   Paso 16, porque parte vienen del cambio de modelo (el golden dataset se
   calibró con las respuestas de otros).
3. **Probar el flujo entero a mano** con el CV real, ahora que la IA la sirve
   otro proveedor.

# La lección de método

Un ataque que falla una vez contra un modelo gratuito que rota no demuestra
que el sistema aguante: demuestra que esa tirada salió bien. Lo que sí es
concluyente es lo que se comprueba en código — y ahí es donde estaban las dos
brechas grandes (la lista blanca envenenable y el punto ciego del título).
Por eso el Paso 15 se hace en sesión nueva, y por eso una segunda opinión
sobre la misma superficie no es redundante.

# Relacionado

- [paso-15-red-team.md](paso-15-red-team.md) — la primera pasada.
- [paso-14-guardrails.md](paso-14-guardrails.md) — las capas que se atacan.
- [decision-modelo-ia.md](decision-modelo-ia.md) — por qué OpenRouter, y el
  cupo compartido de 50/día.
