-- 0009_perfiles_nombre.sql
-- Añade el nombre completo al perfil. Sale del rediseño del PDF (Hito 7,
-- T58-T62): un CV a prueba de ATS necesita el nombre real de la candidata
-- arriba del documento, y hasta ahora la app no lo guardaba en ningún
-- sitio (solo el email de la cuenta). Decisión de Mar, ver
-- knowledge/decision-diseno-pdf.md.

alter table public.perfiles add column if not exists nombre text;

comment on column public.perfiles.nombre is 'Nombre completo de la usuaria, tal como debe aparecer en el CV y la carta generados (masthead del PDF, T58-T62).';
