-- 0011_perfiles_contacto.sql
-- Dos campos de contacto opcionales para la cabecera del CV (masthead,
-- lib/pdf.tsx): teléfono y un enlace (LinkedIn u otro — portfolio, web
-- personal). Pedido por Mar tras revisar el PDF: faltaban junto al email.
--
-- Van en `perfiles`, no en el documento generado: son datos fijos de la
-- persona, no algo que la IA deba redactar ni adaptar por oferta — misma
-- regla que ya sigue `nombre` (migración 0009) y que pide la skill
-- diseno-cv-pdf ("nunca inventar datos que no existan: añadirlos como campo
-- explícito del perfil").

alter table public.perfiles add column if not exists telefono text;
alter table public.perfiles add column if not exists enlace text;

comment on column public.perfiles.telefono is 'Teléfono de contacto, opcional. Se muestra en la cabecera del CV (masthead) junto al email.';
comment on column public.perfiles.enlace is 'LinkedIn u otro enlace (portfolio, web personal), opcional. Se muestra en la cabecera del CV (masthead) junto al email.';
