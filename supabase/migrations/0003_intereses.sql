-- 0003_intereses.sql
-- Tabla "intereses": que usuaria marco "me interesa" en que oferta
-- (docs/03-spec.md §4, regla de negocio 2; docs/04-plan-tecnico.md §3.4).
-- RLS (cada una ve solo lo suyo) se activa aparte, en la tarea T13.

create table if not exists public.intereses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  oferta_id uuid not null references public.ofertas (id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (user_id, oferta_id)
);

comment on table public.intereses is 'Marca "me interesa" de una usuaria sobre una oferta. Es lo que decide si existe o no un CV/carta para esa combinacion (docs/03-spec.md §4, regla de negocio 2).';
comment on constraint intereses_user_id_oferta_id_key on public.intereses is 'user_id + oferta_id unicos: no se puede marcar la misma oferta dos veces (regla de negocio 2).';
