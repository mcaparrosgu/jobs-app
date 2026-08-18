-- 0004_generaciones.sql
-- Tabla "generaciones": el CV y la carta ya redactados por la IA para una
-- oferta marcada como "me interesa" (docs/03-spec.md §4, regla de negocio
-- 7; docs/04-plan-tecnico.md §3.4).
-- RLS (cada una ve solo lo suyo) se activa aparte, en la tarea T13.

create table if not exists public.generaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  oferta_id uuid not null references public.ofertas (id) on delete cascade,
  estado text not null default 'generando' check (estado in ('generando', 'listo', 'error')),
  cv_texto text,
  carta_texto text,
  error_mensaje text,
  creado_en timestamptz not null default now(),
  unique (user_id, oferta_id)
);

comment on table public.generaciones is 'CV y carta generados por la IA para una oferta marcada como interesante, congelados en el momento de generarse (docs/03-spec.md §4, regla de negocio 7).';
comment on column public.generaciones.estado is 'generando / listo / error: mueve el indicador de espera y el boton de descarga.';
comment on column public.generaciones.cv_texto is 'Resultado del CV generado, congelado en el momento en que se genero.';
comment on column public.generaciones.carta_texto is 'Resultado de la carta generada, congelado en el momento en que se genero.';
comment on column public.generaciones.error_mensaje is 'Mensaje de fallo, para poder explicarselo a la usuaria (caso limite).';
comment on constraint generaciones_user_id_oferta_id_key on public.generaciones is 'user_id + oferta_id unicos: un solo documento por oferta (regla de negocio 7).';
