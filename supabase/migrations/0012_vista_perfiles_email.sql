-- 0012_vista_perfiles_email.sql
-- Vista para el workflow Jobs App · ingesta (n8n): necesita el email de
-- cada usuaria con perfil guardado, para el aviso diario de ofertas
-- nuevas (docs/03-spec.md §3.2, regla de negocio 8; docs/06-tareas.md
-- T63-T67). El email vive solo en auth.users (Supabase Auth), no en
-- perfiles, así que se expone aquí con una unión mínima — sin duplicar
-- el dato en perfiles, para que nunca se desincronice si alguien cambia
-- su email de acceso.
--
-- Solo el rol de servicio (service_role, el que usa la credencial de n8n)
-- puede leer esta vista: se revoca explícitamente a los roles que usa la
-- propia web (anon, authenticated), aunque ninguno de los dos tendría
-- RLS que se lo permitiera de todas formas — doble candado.

create view public.perfiles_con_email as
select
  p.id,
  p.user_id,
  p.nombre,
  u.email
from public.perfiles p
join auth.users u on u.id = p.user_id;

revoke all on public.perfiles_con_email from anon, authenticated;
grant select on public.perfiles_con_email to service_role;

comment on view public.perfiles_con_email is 'Solo para Jobs App · ingesta (n8n, rol de servicio): email (y nombre, para el saludo) de cada usuaria con perfil guardado, para el aviso diario (T63-T67). No accesible desde la web.';
