# 00 · El problema

> Nota para quien lea esto: este es el primer proyecto "estructurado" de
> Mar (viene de un bootcamp de IA Engineering, nivel técnico principiante).
> Este documento se acompaña con explicaciones didácticas de la skill
> `/profesora` — si algo de aquí no se entiende a la primera, pedir que se
> explique con analogías antes de seguir al Paso 2.

## 1. Problema

Buscar trabajo remoto asalariado obliga a repetir, oferta tras oferta, un
ciclo lento y manual: encontrar ofertas que de verdad encajen entre el
ruido, y adaptar el CV a cada una — perdiendo horas por semana sin
garantía de que el CV resultante pase los filtros (ATS) de la empresa. Esto
le pasa a cualquier persona buscando empleo remoto, **no solo a perfiles
tech** — el sector o profesión concreta no cambia el problema de fondo.

## 2. Usuario

**Marta**, 29 años, participante de un bootcamp de IA Engineering. Nivel
técnico **bajo** — como el resto de sus 5 compañeros de clase, un grupo
deliberadamente diverso: hay una profesora de secundaria, alguien de
marketing, un traductor de videojuegos y un developer, además de Marta.
Cada uno busca empleo en su propio sector, no necesariamente tech. Busca su
próximo empleo **remoto y asalariado** (descarta freelance y puestos
presenciales, por ahora — ver nota de alcance abajo). No tiene experiencia
previa optimizando CVs para ATS ni buscando ofertas de forma sistemática —
hasta ahora lo ha hecho a mano, mirando LinkedIn e Infojobs sin método.

> **Nota sobre el alcance (remoto asalariado y "cualquier sector"):** esto
> es el MVP, la primera versión mínima para validar si la idea funciona
> antes de invertir en construir más (ver analogía de la casa en
> `knowledge/`). No es una limitación permanente del producto: si el MVP
> funciona, una fase posterior amplía a presencial y freelance. El producto
> **nunca se ha limitado a empleos tech** — eso nunca estuvo en alcance,
> el pipeline de ingesta ya trae ofertas de cualquier sector.

## 3. Ejemplo concreto

Marta abre la web del MVP un domingo por la tarde. Rellena un formulario
corto con su perfil (puesto que busca, tecnologías, años de experiencia) y
pulsa "Buscar". Por detrás, la web llama al webhook de n8n que ya existe en
producción: dispara la ingesta de ofertas remotas (Adzuna, Jooble, Apify) y
genera un CV adaptado a cada oferta relevante con Anthropic. A los pocos
minutos, Marta ve en la web una lista de ofertas remotas guardadas bajo su
`user_id`, cada una con su CV adaptado listo para descargar. Copia el CV de
la oferta que más le interesa y lo envía esa misma tarde.

## 4. Criterio de éxito

Dos números, medidos durante el periodo de prueba con la clase (los 5
compañeros del bootcamp):

- **5 de 5** personas de la clase usan el MVP con su búsqueda real (no solo
  lo prueban una vez).
- Se generan **al menos 5 CVs adaptados** en total (mínimo 1 por persona).

## 5. Qué NO es

1. No es una app móvil nativa — es una web mínima.
2. No cubre freelance ni empleo presencial **en esta primera fase** — el
   alcance del MVP es solo trabajo remoto asalariado. Es una decisión de
   secuencia, no un límite permanente: se revisa en fases posteriores si
   el MVP valida la idea.
3. No hace seguimiento del proceso tras enviar la candidatura (entrevistas,
   negociación) — el MVP solo cubre búsqueda + generación de CV, no el
   seguimiento que sí existe en el backend n8n para otros usos.

## 6. Riesgos

1. **Coste variable por usuario** (Apify + Anthropic) sin límite de uso
   claro — con 5 personas probando libremente el coste podría dispararse
   sin control.
2. **Uso simbólico, no real** — al ser solo 5 testers de la misma clase,
   podrían probarlo una vez "por quedar bien" y no usarlo de verdad para su
   búsqueda de empleo, invalidando la métrica de éxito.
3. **Calidad del CV generado insuficiente** — si el CV adaptado no mejora
   de verdad la probabilidad de pasar el filtro ATS o de conseguir
   respuesta, el producto no resuelve el problema aunque se use.

## Relacionado

- Contexto de partida y decisión de MVP ya tomada:
  [`knowledge/contexto-pipeline-n8n.md`](../knowledge/contexto-pipeline-n8n.md)
