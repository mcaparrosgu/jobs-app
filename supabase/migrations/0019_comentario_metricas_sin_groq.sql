-- 0019_comentario_metricas_sin_groq.sql
-- Corrige el `comment on column` de `metricas_ia.tokens_entrada` (puesto en la
-- migración 0015), que seguía describiendo el cupo que aprieta como "el de
-- tokens por minuto de Groq".
--
-- Groq se retiró de la app el 23/08/2026: Cloudflare es el proveedor único
-- (knowledge/decision-cloudflare-generarcv.md,
-- knowledge/medicion-t112-respaldo-openrouter.md) y su cupo no es por minuto,
-- sino un límite diario de "neuronas" (~10.000/día, docs/04-plan-tecnico.md §5).
-- El juez de los evals sigue llamando a Groq (CLAUDE.md), pero eso es el arnés
-- de pruebas, no producción, y no escribe en esta tabla.
--
-- No se toca la 0015: una migración ya aplicada no se edita, se corrige con
-- una nueva. Cambia solo el texto del comentario; el esquema no se altera.

comment on column public.metricas_ia.tokens_entrada is 'Tokens de entrada que informó el proveedor (usage.prompt_tokens), cuando lo informa. No es coste en dinero (0 €, docs/05-ia.md §5): es el proxy del consumo real que aprieta, el cupo diario de "neuronas" de Cloudflare (~10.000/día), proveedor único desde el 23/08/2026.';
