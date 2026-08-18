-- 0005_rls_privacidad.sql
-- RLS (Row Level Security, seguridad a nivel de fila): "cada una ve solo
-- lo suyo" en perfiles, intereses y generaciones (docs/03-spec.md §5,
-- regla de negocio 1; docs/04-plan-tecnico.md §3.5).
-- RLS en ofertas (lectura para todas, escritura para nadie) se activa
-- aparte, en la tarea T14.

alter table public.perfiles enable row level security;

create policy "perfiles_select_propio" on public.perfiles
  for select using (auth.uid() = user_id);

create policy "perfiles_insert_propio" on public.perfiles
  for insert with check (auth.uid() = user_id);

create policy "perfiles_update_propio" on public.perfiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "perfiles_delete_propio" on public.perfiles
  for delete using (auth.uid() = user_id);

alter table public.intereses enable row level security;

create policy "intereses_select_propio" on public.intereses
  for select using (auth.uid() = user_id);

create policy "intereses_insert_propio" on public.intereses
  for insert with check (auth.uid() = user_id);

create policy "intereses_update_propio" on public.intereses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "intereses_delete_propio" on public.intereses
  for delete using (auth.uid() = user_id);

alter table public.generaciones enable row level security;

create policy "generaciones_select_propio" on public.generaciones
  for select using (auth.uid() = user_id);

create policy "generaciones_insert_propio" on public.generaciones
  for insert with check (auth.uid() = user_id);

create policy "generaciones_update_propio" on public.generaciones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "generaciones_delete_propio" on public.generaciones
  for delete using (auth.uid() = user_id);
