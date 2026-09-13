---
name: llana-diseno
description: Dirección de diseño visual de la marca Llana (logotipo, wordmark, icono/favicon, motivo gráfico) — qué pedir y qué evitar, con la lección aprendida de un primer intento fallido en Claude Design. Usar antes de escribir un prompt de diseño para Llana (Claude Design, un generador de imágenes, o directamente en código/CSS/Tailwind), y antes de tocar cualquier logo, wordmark o icono de la marca.
---

# Dirección de diseño visual — Llana

Nombre y posicionamiento de la marca: `docs/marketing/05-identidad-verbal.md`
(§1.e) y `knowledge/decision-nombre-llana-13-09.md`. Esta skill es solo la
parte visual: qué pedir, qué evitar, no el porqué del nombre.

## El objetivo, en tensión a propósito

Mar quiere una marca **seria, sobria y profesional** (así se decidió el
nombre) que **a la vez destaque y se diferencie** de cualquier competidor.
Esas dos cosas no se contradicen si se busca en el sitio correcto:
**identidad corporativa de los años 70 con carácter** — el territorio de
Saul Bass, Massimo Vignelli, el logotipo "worm" de la NASA. Ideas gráficas
contundentes, ejecutadas con rigor, no decoración retro ni nostalgia
infantil.

## Lección de un primer intento fallido (13/09/2026)

Un primer prompt a Claude Design pedía "años 70" y "evitar lo genérico de
IA" sin ser más concreto, y el resultado fue exactamente lo que se quería
evitar: tipografía **Unbounded** (geométrica *redondeada y "amigable"*, muy
de moda en apps de 2023-2025 — no es 70s, es "SaaS moderno" disfrazado) y
un icono cuadrado de esquinas muy redondeadas (formato "app de iOS",
*squircle*) relleno de un degradado — genérico, indistinguible de cualquier
icono de fintech actual. **"Años 70" sin referencias tipográficas
concretas se rellena con lo que la IA ya sabe hacer por defecto.** No
repetir ese error: pedir siempre nombres de fuentes y formas concretas, no
adjetivos sueltos.

## Prohibido explícitamente

- Tipografías geométricas redondeadas "amigables": **Unbounded, Poppins,
  Quicksand, Baloo, Comfortaa** o cualquier cosa de ese aire.
- Icono en formato *squircle* (cuadrado de esquinas muy redondeadas, el
  icono de app por defecto de iOS/Android) relleno de un degradado o
  franjas.
- Gradientes suaves difuminados tipo "blob".

## Tipografía — pedir esto

Letra de verdad de los años 70, con carácter firme, no blanda. Referencias
concretas a nombrar en cualquier prompt: **Bank Gothic, Eurostile Bold
Extended, ITC Avant Garde Gothic Bold, Cooper Black, Windsor** — las que se
usaban en identidad corporativa e impresos de la época (aerolíneas, discos,
revistas). Rasgo clave: ángulos definidos o esquinas solo ligeramente
redondeadas, nunca completamente circulares; trazo grueso y seguro; que se
lea como diseño gráfico de autor, no como interfaz de móvil.

## El motivo gráfico — cinta VHS/cassette, no icono de app

Inspirado en la etiqueta de una cinta de vídeo o cassette en blanco de los
70-80 (referencia real: cuadernos "T-120 VHS Vintage-Rainbow Composition
Notebook"). Debe leerse como **etiqueta de cinta**, no como icono de app:

- Franjas paralelas, rectas, del mismo grosor — nunca dentro de un
  cuadrado de esquinas redondeadas.
- Sobre fondo oscuro o neutro (negro, gris carbón, crema), como el envase
  real de una cinta en blanco.
- El motivo puede acompañar al wordmark al lado, detrás, o como fondo de
  una tarjeta/cabecera — no tiene que convertirse en el icono/favicon
  directamente.

## Paletas a explorar (las dos, sin cerrar cuál gana)

1. **Anclada en la marca actual**: degradado corto de 3-4 tonos que nace
   del coral `#F87C63` y el ámbar `#F5B027` ya elegidos para el marco
   Passe-Partout (`knowledge/marco-passe-partout-04-09.md`), extendido
   hacia un rojo/rosa cálido y un tono frío de contraste (verde azulado o
   azul petróleo oscuro).
2. **Arcoíris VHS más completo**: 5-6 franjas fieles a la estética de cinta
   en blanco de los 70-80, sobre fondo oscuro.

## Qué pedir siempre (deliverables)

- Wordmark de "Llana" en la tipografía correcta, 3-4 variantes.
- El motivo de franjas como elemento separado del wordmark (no fusionado
  en un icono de app).
- Un símbolo reducido para favicon (16-32px) que **no** sea un squircle.
- Verlo en contexto: cabecera de la pantalla de acceso (fondo claro) y en
  un móvil estrecho (~375px) — la app es mobile-first.

## Restricciones que no se negocian

- Tiene que leerse sin esfuerzo: "Llana" es una palabra española corriente,
  no debe volverse un jeroglífico por estilizarla demasiado (público no
  técnico, ver `docs/marketing/05-identidad-verbal.md`).
- El resultado tiene que transmitir seriedad y oficio de diseño — nunca un
  producto infantil ni un icono de app genérico.
