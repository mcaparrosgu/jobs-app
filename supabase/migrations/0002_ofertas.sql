-- 0002_ofertas.sql
-- Tabla "ofertas": el almacen compartido de ofertas de empleo, comun a
-- todas las usuarias, no propiedad de nadie (docs/03-spec.md §4,
-- docs/04-plan-tecnico.md §3.4).
-- RLS (lectura para todas, escritura para nadie desde la web) se activa
-- aparte, en la tarea T14.

create table if not exists public.ofertas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  empresa text not null,
  enlace text not null,
  descripcion text,
  fuente text not null,
  id_externo text not null,
  ingerida_en timestamptz not null default now(),
  unique (fuente, id_externo)
);

comment on table public.ofertas is 'Ofertas de empleo compartidas por todas las usuarias, renovadas una vez al dia (docs/03-spec.md §4, regla de negocio 6).';
comment on column public.ofertas.descripcion is 'Texto completo de la oferta, lo que la IA lee para adaptar el CV y la carta.';
comment on column public.ofertas.fuente is 'De donde viene la oferta: adzuna / jooble / apify.';
comment on column public.ofertas.id_externo is 'Codigo que da la fuente original a esa oferta.';
comment on constraint ofertas_fuente_id_externo_key on public.ofertas is 'fuente + id_externo unicos: si la misma oferta aparece dos dias seguidos, no se duplica.';
