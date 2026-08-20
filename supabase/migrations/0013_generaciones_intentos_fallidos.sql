-- 0013_generaciones_intentos_fallidos.sql
-- Paso 14 (guardrails): disparador de intervención humana "umbral de
-- fallos". Cuenta cuántas veces seguidas ha fallado la generación de la
-- misma oferta para la misma usuaria; se resetea a 0 en cuanto una
-- generación termina bien. No hay panel de administración
-- (docs/03-spec.md §2), así que esta columna solo alimenta un log
-- distinguible en el servidor y el mensaje que ve la usuaria a partir del
-- tercer fallo seguido (app/api/generar/route.ts).

alter table public.generaciones add column if not exists intentos_fallidos int not null default 0;

comment on column public.generaciones.intentos_fallidos is 'Fallos seguidos generando esta oferta. Se resetea a 0 al generar bien. A partir de 3 (UMBRAL_FALLOS_HUMANO), se registra un log distinguible para revisión manual (Paso 14, sin panel de administración).';
