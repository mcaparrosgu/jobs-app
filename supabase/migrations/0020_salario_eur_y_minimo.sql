-- 0020_salario_eur_y_minimo.sql
-- ofertas.salario_eur: ahora lo calcula n8n sin filtrar (nodo "Enriquecer
-- con salario_eur", antes "Filtro salario", Jobs App · ingesta).
-- perfiles.salario_minimo: lo escribe la usuaria, opcional.
-- El filtro por salario deja de aplicarse globalmente en n8n (33000EUR fijo,
-- perfil de Mar) y pasa a app/api/ofertas/route.ts, igual que puestos y
-- palabras clave. Decision de Mar, 04/09/2026.
-- Ambas columnas: enteros en EUR/ano, nullable. Sin dato -> no se filtra.

alter table public.ofertas add column if not exists salario_eur integer null;
alter table public.perfiles add column if not exists salario_minimo integer null;

comment on column public.ofertas.salario_eur is 'Salario detectado por n8n en EUR/ano (promedio si la oferta da un rango), o null si el texto original no traia un dato reconocible.';
comment on column public.perfiles.salario_minimo is 'Salario minimo deseado en EUR/ano, opcional. Vacio = sin filtro. Se compara contra ofertas.salario_eur en app/api/ofertas/route.ts (sin dato conocido en la oferta -> pasa igualmente).';
