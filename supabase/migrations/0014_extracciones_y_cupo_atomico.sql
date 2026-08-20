-- 0014_extracciones_y_cupo_atomico.sql
-- Paso 15 (red team). Dos arreglos que protegen el mismo recurso escaso: las
-- 50 peticiones diarias a la IA que comparten TODAS las usuarias.
--
--   1. Tabla `extracciones`: /api/extraer-perfil no tenia ningun limite, a
--      diferencia de /api/generar (5/dia). Un bucle de fetch desde la consola
--      del navegador dejaba sin cupo a las cinco en segundos.
--   2. Cerrojo por usuaria al crear una generacion: contar y despues insertar
--      no es atomico, asi que diez peticiones a la vez leian "0 gastadas" y
--      pasaban todas. Con pg_advisory_xact_lock, las peticiones de la misma
--      usuaria se ponen en fila dentro de la propia base de datos.
--
-- Detalle en seguridad/red-team-opus.md, fichas 7.1 y 5.3.

-- --- 1. Extracciones de perfil ---------------------------------------------

create table if not exists public.extracciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now()
);

create index if not exists extracciones_user_id_creado_en_idx
  on public.extracciones (user_id, creado_en desc);

alter table public.extracciones enable row level security;

create policy "extracciones_select_propio" on public.extracciones
  for select using (auth.uid() = user_id);

create policy "extracciones_insert_propio" on public.extracciones
  for insert with check (auth.uid() = user_id);

comment on table public.extracciones is 'Una fila por analisis de CV pedido a la IA. Solo existe para poder limitar cuantos hace cada usuaria al dia (Paso 15): sin esto, /api/extraer-perfil podia agotar la cuota compartida de OpenRouter.';

-- --- 2. Cupo diario de generaciones, sin condicion de carrera ---------------

-- `p_tomar_turno` distingue a los dos que llaman a esta funcion:
--   · /api/interes solo APUNTA que hay trabajo pendiente (false): la fila
--     queda con iniciado_en nulo, para que despues /api/generar pueda coger
--     el turno. Si se marcara aqui, /api/generar veria el turno ocupado y
--     respondaria "ya se esta preparando" para siempre: el documento no se
--     generaria nunca.
--   · /api/generar si empieza el trabajo (true).
create or replace function public.crear_generacion_con_cupo(
  p_oferta_id uuid,
  p_limite int,
  p_inicio_del_dia timestamptz,
  p_tomar_turno boolean
)
returns table (id uuid, creada boolean, cupo_gastado int)
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_gastado int;
  v_existente uuid;
begin
  if v_user_id is null then
    raise exception 'Sin sesion';
  end if;

  -- Cerrojo por usuaria, valido hasta el final de la transaccion: dos
  -- peticiones simultaneas de la misma persona se atienden una detras de
  -- otra, y la segunda ya ve la fila que creo la primera. No afecta a las
  -- demas usuarias, que tienen su propio cerrojo.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select g.id into v_existente
  from public.generaciones g
  where g.user_id = v_user_id and g.oferta_id = p_oferta_id;

  select count(*) into v_gastado
  from public.generaciones g
  where g.user_id = v_user_id
    and g.estado in ('listo', 'generando')
    and g.creado_en >= p_inicio_del_dia;

  if v_existente is not null then
    return query select v_existente, false, v_gastado;
    return;
  end if;

  if v_gastado >= p_limite then
    return query select null::uuid, false, v_gastado;
    return;
  end if;

  insert into public.generaciones (user_id, oferta_id, estado, iniciado_en)
  values (v_user_id, p_oferta_id, 'generando', case when p_tomar_turno then now() else null end)
  returning generaciones.id into v_existente;

  return query select v_existente, true, v_gastado + 1;
end;
$$;

comment on function public.crear_generacion_con_cupo is 'Comprueba el cupo diario y crea la fila de generacion en la misma transaccion, con cerrojo por usuaria (Paso 15): sin esto, varias pestanas a la vez se saltaban el limite de 5/dia.';

revoke all on function public.crear_generacion_con_cupo(uuid, int, timestamptz, boolean) from public;
grant execute on function public.crear_generacion_con_cupo(uuid, int, timestamptz, boolean) to authenticated;
