-- 0001_perfiles.sql
-- Tabla "perfiles": un cajón por usuaria con lo que cuenta de sí misma
-- (docs/03-spec.md §4, docs/04-plan-tecnico.md §3.4).
-- RLS (el candado de privacidad) se activa aparte, en la tarea T13.

create table if not exists public.perfiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  puesto text,
  palabras_clave text[] not null default '{}',
  anios_experiencia integer,
  cv_texto text,
  usar_experiencia_cv boolean not null default false,
  empresas_cv text[] not null default '{}',
  titulos_cv text[] not null default '{}',
  actualizado_en timestamptz not null default now()
);

comment on table public.perfiles is 'Un perfil por usuaria: puesto, palabras clave y CV pegado (docs/03-spec.md §4).';
comment on column public.perfiles.user_id is 'Dueña del perfil. Único: una usuaria solo tiene un perfil (regla de negocio 4 de docs/03-spec.md).';
comment on column public.perfiles.empresas_cv is 'Empresas detectadas en el CV pegado, solo para verificar que la IA no invente otras (docs/05-ia.md §6.2). La usuaria no las ve.';
comment on column public.perfiles.titulos_cv is 'Titulaciones detectadas en el CV pegado, mismo uso que empresas_cv.';
comment on column public.perfiles.actualizado_en is 'Marca de tiempo para el borrado automático al mes (regla de negocio 10).';
