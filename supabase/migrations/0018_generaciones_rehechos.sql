-- 0018_generaciones_rehechos.sql
-- Añade el botón "Rehacer" (pedido por Mar, 23/08/2026): una vez el CV y la
-- carta están listos, la usuaria puede pedir que se redacten otra vez con una
-- instrucción suya ("más profesional", "más conciso"...).
--
-- Decisión de Mar: NO gasta el cupo diario de 5 documentos (regla de negocio
-- 5) — tiene su propio límite, aparte, de MAXIMO_REHECHOS (lib/generaciones.ts)
-- por oferta. Por eso hace falta un contador propio en vez de reutilizar el
-- conteo de filas que ya usa `contarGeneracionesDeHoy`: esa cuenta filas
-- creadas ese día, y un rehecho actualiza una fila que ya existía.
--
-- Solo cuentan los rehechos que SÍ terminaron en un documento nuevo: igual que
-- el cupo diario, un intento fallido no gasta nada (app/api/rehacer/route.ts).

alter table public.generaciones add column if not exists rehechos int not null default 0;

comment on column public.generaciones.rehechos is 'Cuántas veces se ha pedido "Rehacer" con éxito para este documento. Límite propio (MAXIMO_REHECHOS en lib/generaciones.ts), aparte del cupo diario de 5 generaciones — decisión de Mar, 23/08/2026.';
