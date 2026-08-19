-- 0008_generaciones_cola_y_avisos.sql
-- Dos columnas nuevas en "generaciones", las dos del Hito 6 (T52-T57).
--
-- iniciado_en: marca el momento en que una peticion se pone a generar de
-- verdad. Es lo que permite que la preparacion vaya de una en una y que no se
-- generen dos veces los mismos documentos: quien quiere generar "coge el
-- turno" escribiendo aqui la hora, y si otra peticion llega y ve un turno
-- reciente, no se mete. Si el turno se quedo colgado (la usuaria cerro la
-- pestana a mitad), pasados unos minutos se puede retomar.
--
-- avisos: lo que ha encontrado la verificacion automatica del CV generado
-- (T54 y T55) - cifras o nombres que no estaban en el CV original. El
-- documento se guarda igual y la usuaria lo ve con la advertencia al lado
-- (docs/05-ia.md §6.2).

alter table public.generaciones add column if not exists iniciado_en timestamptz;
alter table public.generaciones add column if not exists avisos text[] not null default '{}';

comment on column public.generaciones.iniciado_en is 'Momento en que una peticion tomo el turno para generar. Sirve de cerrojo: evita generar dos veces lo mismo y permite retomar una generacion abandonada (T52).';
comment on column public.generaciones.avisos is 'Resultado de la verificacion automatica (T54, T55): cifras o nombres del CV generado que no aparecen en el CV original. Vacio = nada sospechoso.';
