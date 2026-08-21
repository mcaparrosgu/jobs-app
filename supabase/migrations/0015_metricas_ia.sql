-- 0015_metricas_ia.sql
-- Paso 17 (vigilancia). Una fila por cada llamada a la IA (extraerPerfil o
-- generarCvYCarta), acabe bien o mal. Es la base de la vigilancia de
-- docs/08-rutina.md: sin panel de administración (docs/03-spec.md §2), esta
-- tabla es lo único que le permite a Mar distinguir un fallo puntual de una
-- degradación real sin adivinarlo mirando los logs de Vercel, que en el
-- plan gratuito no se conservan más que unas horas.
--
-- Solo se puede INSERTAR desde la web, nunca LEER: ninguna usuaria, ni
-- siquiera la autora de la fila, tiene motivo para leer esto desde la app
-- (no hay ninguna pantalla que lo muestre). Mar la consulta desde el SQL
-- Editor de Supabase con el rol de servicio, que se salta RLS igual que ya
-- se salta la de `ofertas` (docs/04-plan-tecnico.md §3.5).

create table if not exists public.metricas_ia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  oferta_id uuid references public.ofertas (id) on delete set null,
  tipo text not null check (tipo in ('perfil', 'generacion')),
  exito boolean not null,
  motivo_fallo text check (
    motivo_fallo in ('error_contenido', 'error_proveedor', 'limite_diario', 'sin_perfil_o_oferta')
  ),
  guardrail_saltado text check (
    guardrail_saltado in ('ambito', 'inyeccion', 'contenido_inapropiado', 'titular_inseguro', 'marcador_relleno')
  ),
  escalado_humano boolean not null default false,
  duracion_ms integer not null,
  tokens_entrada integer,
  tokens_salida integer,
  proveedor text,
  creado_en timestamptz not null default now()
);

create index if not exists metricas_ia_creado_en_idx on public.metricas_ia (creado_en desc);
create index if not exists metricas_ia_tipo_exito_idx on public.metricas_ia (tipo, exito);

alter table public.metricas_ia enable row level security;

create policy "metricas_ia_insert_propio" on public.metricas_ia
  for insert with check (auth.uid() = user_id);

comment on table public.metricas_ia is 'Paso 17 · una fila por llamada a la IA (extraerPerfil o generarCvYCarta), para la vigilancia de docs/08-rutina.md. A proposito sin politica de lectura: no hay panel de administracion (docs/03-spec.md §2); se consulta desde el SQL Editor de Supabase con el rol de servicio.';
comment on column public.metricas_ia.motivo_fallo is 'Por que fallo, cuando exito=false: error_contenido (la IA respondio pero no paso la validacion), error_proveedor (ningun modelo respondio), limite_diario (cupo agotado antes de llamar), sin_perfil_o_oferta (faltaba algo que leer).';
comment on column public.metricas_ia.guardrail_saltado is 'Que capa de docs/14 (guardrails) salto, si alguna. Null si ninguna.';
comment on column public.metricas_ia.escalado_humano is 'True cuando la misma oferta lleva UMBRAL_FALLOS_HUMANO fallos seguidos (app/api/generar/route.ts): la senal de docs/05-ia.md de que hace falta mirarlo a mano.';
comment on column public.metricas_ia.tokens_entrada is 'Tokens de entrada que informo el proveedor (usage.prompt_tokens), cuando lo informa. No es coste en dinero (0 €, docs/05-ia.md §5): es el proxy del cupo real que aprieta, el de tokens por minuto de Groq.';
comment on column public.metricas_ia.duracion_ms is 'Milisegundos entre que llega la peticion al endpoint y se responde (incluye validacion, guardrails y llamada a la IA).';
