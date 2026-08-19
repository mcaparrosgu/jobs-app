-- 0007_quitar_anios_experiencia.sql
-- Se retira "años de experiencia" del perfil (historia B3, docs/01-historias.md):
-- el dato no participaba en el emparejamiento con ofertas (regla de negocio 3
-- de docs/03-spec.md), solo se mostraba. Decisión de Mar durante T25-T31,
-- ver knowledge/hito-3-perfil.md.

alter table public.perfiles drop column if exists anios_experiencia;
