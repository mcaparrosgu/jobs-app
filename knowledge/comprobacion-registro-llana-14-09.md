# Comprobación de registro del nombre "Llana" (14/09/2026, parcial)

## Contexto

P11 en `PENDIENTES.md`: antes de propagar el nombre "Llana" (cerrado el
13/09, ver [decision-nombre-llana-13-09.md](decision-nombre-llana-13-09.md))
más allá de la clase, hacía falta comprobar dominio real en un registrador y
marca en la OEPM — la sesión de naming solo había descartado colisión de
producto por búsqueda web.

## Qué se hizo

Sin la extensión Claude in Chrome conectada (no disponible en esta sesión),
la comprobación se hizo con lo que da RDAP/WHOIS en texto y búsqueda:

- **`llana.com`**: registrado desde el 22/09/2003 (Squarespace Domains II
  LLC), actualizado el 07/09/2026 — **aparcado en venta en Sedo**, activo.
- **`llana.app`**: registrado el 05/03/2026 (GoDaddy). Sin contenido visible
  al comprobarlo.
- **`llana.io`**: es la web oficial de un proyecto real — ver hallazgo
  siguiente.
- **`llana.es`**: **sin confirmar**. España restringe el WHOIS público desde
  2013 (un "no data" no distingue disponible de privado) y el buscador
  oficial de registradores es una SPA en JavaScript, no legible sin
  navegador.
- **OEPM** (`ceo.oepm.es/busquedaMarcas`, Localizador de Marcas): **sin
  hacer** — también una SPA en JavaScript.

## Hallazgo: colisión de marca real, no solo de dominio

`github.com/juicyllama/llana` — proyecto open-source activo, **207
estrellas**, "API Wrapper for Databases" (expone una API REST para
cualquier base de datos). Web oficial: `llana.io`. Categoría de developer
tools, distinta de búsqueda de empleo, pero usa el nombre "Llana" pelado,
sin modificador, con comunidad real. La sesión de naming del 13/09 no lo
encontró porque buscó en el terreno de CV/empleo, no en software en
general.

## Decisión de Mar (14/09/2026)

**Seguir con "Llana"** pese a la colisión: categoría distinta (herramienta
para developers vs. producto de búsqueda de empleo en castellano), riesgo
de marca bajo. **No se reabre el naming.**

Queda pendiente solo terminar la comprobación de `llana.es` y la búsqueda
OEPM — no bloquea P1 (entrega a la clase el 14/09), sí antes de propagar el
nombre a copy público o README. Requiere reconectar la extensión Claude in
Chrome, o que Mar lo compruebe ella misma en `dominios.es` y
`ceo.oepm.es/busquedaMarcas`.
