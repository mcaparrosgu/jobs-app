-- 0006_rls_ofertas.sql
-- RLS (Row Level Security) en ofertas: lectura para cualquier usuaria
-- autenticada, escritura para nadie desde la web (docs/03-spec.md §4/§5,
-- docs/04-plan-tecnico.md §3.5). Solo n8n escribe, con la service role
-- key, que ignora RLS por diseno de Supabase.

alter table public.ofertas enable row level security;

create policy "ofertas_select_autenticadas" on public.ofertas
  for select using (auth.role() = 'authenticated');
