-- 0010_generaciones_puesto_texto.sql
-- Arregla el CV con títulos en un idioma y contenido en otro (reportado por
-- Mar sobre la oferta "Global Marketing Operations Manager"): el CV y la
-- carta se generan en el idioma de la oferta (lib/ia.ts, T49), pero el
-- titular bajo el nombre en el PDF (lib/pdf.tsx) usaba siempre
-- perfiles.puesto, fijado en castellano para siempre al pegar el CV
-- (T25-T31) — un documento en inglés terminaba con un titular en castellano
-- encima.
--
-- La IA adapta ahora también ese titular, en el mismo idioma y con el mismo
-- vocabulario de la oferta que el resto del documento (lib/ia.ts), y se
-- guarda congelado aquí junto al cv_texto y carta_texto (misma regla de
-- negocio 7 que esos dos: una vez generado, no cambia).
--
-- Las generaciones ya existentes se quedan con esta columna a NULL: la
-- pantalla de descarga (app/api/descargar/[id]/route.ts) cae al
-- perfiles.puesto de siempre para esos documentos antiguos, que no se
-- regeneran (regla de negocio 7: un CV generado es definitivo).

alter table public.generaciones add column if not exists puesto_texto text;

comment on column public.generaciones.puesto_texto is 'Titular del CV (bajo el nombre), adaptado por la IA al mismo idioma y vocabulario que cv_texto y carta_texto. NULL en generaciones anteriores a esta columna: la descarga cae entonces a perfiles.puesto.';
