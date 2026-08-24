-- 0017_perfiles_puestos.sql
-- Sustituye `puesto` (un único texto) por `puestos` (una lista) en
-- `perfiles`. Pedido por Mar el 23/08/2026: la IA ahora sugiere entre 3 y 5
-- puestos posibles (T88) y el formulario deja marcar varios con casillas
-- más una barra para añadir los propios (T90) — expande las ofertas que
-- puede encontrar cada usuaria, no solo las de un único puesto.
--
-- Este cambio REVIERTE una frase de docs/03-spec.md §8 ("Fuera de alcance"),
-- que excluía explícitamente varios puestos a la vez — T92 actualiza la
-- spec en consecuencia.
--
-- No hay usuarias reales todavía (vuelta de la clase: 24/08/2026), así que
-- el backfill es solo por si Mar tiene un perfil de prueba guardado: se
-- convierte su `puesto` en una `puestos` de un elemento antes de borrar la
-- columna vieja, en vez de perder el dato sin más.

alter table public.perfiles add column if not exists puestos text[] not null default '{}';

update public.perfiles
set puestos = array[puesto]
where puesto is not null and trim(puesto) <> '' and puestos = '{}';

alter table public.perfiles drop column if exists puesto;

comment on column public.perfiles.puestos is 'Puestos que busca la usuaria: el principal que propone la IA (T88) más los que ella marque o añada a mano. Al generar un CV/carta para una oferta concreta, lib/ia.ts (puestoMasRelevante) elige de esta lista el que más palabras comparte con el título de esa oferta, o el primero si ninguno coincide.';
