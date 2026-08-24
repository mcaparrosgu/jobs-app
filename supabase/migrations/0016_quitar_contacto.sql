-- 0016_quitar_contacto.sql
-- Quita `telefono` y `enlace` de `perfiles` (añadidos en 0011). Pedido por
-- Mar el 23/08/2026: ese dato ya suele venir en el cuerpo del CV que se
-- pega, y pedirlo aparte solo añadía fricción al formulario. `nombre` se
-- mantiene tal cual (migración 0009): sigue siendo un dato que escribe la
-- usuaria a mano, no algo que la IA deba adivinar (docs/03-spec.md §4).

alter table public.perfiles drop column if exists telefono;
alter table public.perfiles drop column if exists enlace;
