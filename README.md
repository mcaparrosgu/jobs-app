# Jobs App

Adaptar el CV y la carta de presentación a cada oferta de empleo es un
trabajo manual, repetitivo y que consume horas — y es el mismo trabajo sin
importar el sector de quien busca empleo. Jobs App se encarga de esa parte
mecánica.

## Qué hace

1. Entras con tu email. No hay contraseña que crear ni recordar: te llega
   un enlace de un solo uso.
2. Pegas tu CV. La aplicación te **propone sola** un puesto y unas palabras
   clave; tú las revisas y las ajustas.
3. Ves ofertas de empleo remoto que encajan con tu perfil, de cualquier
   sector.
4. Marcas las que te interesan. Solo esas generan un CV y una carta
   adaptados a esa oferta concreta.
5. Te lo descargas en un PDF, con la carta empezando en página nueva, listo
   para enviar.
6. Si al día siguiente hay ofertas nuevas para ti, recibes un aviso por
   email.

Las ofertas se renuevan una vez al día, a las 13:00 (hora de España), y son
las mismas para todo el mundo: cada persona ve solo las que encajan con su
propio perfil.

## Con qué está hecho

| Pieza | Para qué |
| :---- | :---- |
| **Next.js** | La web y sus pantallas |
| **Supabase** | Base de datos y acceso por enlace de email |
| **Cloudflare Workers AI** | El modelo de IA que lee el CV y redacta |
| **Vercel** | Donde vive la web publicada |
| **n8n** | Trae las ofertas cada día y manda los avisos |

Todo funciona dentro de las capas gratuitas: **coste 0 €/mes**.

## Tu privacidad

- Cada persona ve **solo sus propios datos**. No lo garantiza el código:
  lo garantiza la propia base de datos, que se niega a entregar una ficha a
  quien no es su dueña.
- Los datos (perfil, CV, documentos generados) **se borran solos al mes**.
- El texto de tu CV se procesa en Cloudflare Workers AI, que declara
  oficialmente que no entrena con él por defecto.

> ⚠️ **Revisa siempre el documento antes de enviarlo a una empresa.** La
> aplicación comprueba automáticamente que no aparezcan cifras ni empresas
> que no estén en tu CV original, pero ninguna comprobación automática es
> infalible. El documento lleva tu nombre: léelo entero.

## Cómo arrancarlo en tu ordenador

Hace falta [Node.js](https://nodejs.org) instalado.

```bash
npm install                  # descarga las librerías
cp .env.example .env.local   # crea tu archivo de claves
# rellena .env.local con tus valores reales
npm run dev                  # arranca en http://localhost:3000
```

Las instrucciones de qué clave se saca de dónde están dentro de
`.env.example`.

> `.env.local` **nunca** se sube al repositorio. Ya está en `.gitignore`.

## Comprobar que todo sigue bien

```bash
npm run lint     # el código, según las normas del proyecto
npm test         # 339 pruebas de la parte que no usa IA (segundos)
npm run evals    # los 25 casos de la parte de IA (~25 min, gasta cuota real)

# Y dos comprobaciones sueltas, para cuando toques justo esa pieza:
npm run medir:generacion   # ¿responde bien Cloudflare hoy? (5 casos, poca cuota)
npm run probar:decidir     # ¿acierta el robot al decidir si hacen falta evals?
npm run comprobar:esquema  # ¿le pide el código a Supabase algo que no existe?
npm run medir:respaldo     # ¿sirve de algo el respaldo de OpenRouter? (hoy no)
```

`npm run evals` llama de verdad a Cloudflare y a OpenRouter con tus claves
(más a Groq, para el juez de las aserciones) y **se lleva más o menos la
mitad de la cuota del día**. No lo lances el día que vayas a enseñar la
app. Al terminar da un veredicto: **VERDE**, **ROJO** (calidad de verdad) o
**NO CONCLUYENTE** (sin cuota, clave mala o el modelo juez sin responder —
que no es culpa del prompt).

## Cómo se publica

**Vercel no publica solo.** Publica un robot de GitHub Actions, y solo si lint,
las pruebas y —cuando el cambio toca la IA— los evals pasan. Si algo está en
rojo, la web que ven las usuarias **no cambia**.

```bash
git checkout -b lo-que-voy-a-cambiar   # 1. una rama
git push -u origin lo-que-voy-a-cambiar # 2. el robot publica una VISTA PREVIA
                                        # 3. la abres y la pruebas de verdad
git checkout master && git merge lo-que-voy-a-cambiar && git push
                                        # 4. y ahora sí, a producción
```

- `[sin evals]` en el mensaje del commit salta los evals a conciencia (lint y
  pruebas siguen corriendo). Para cuando necesitas la cuota de IA para otra
  cosa, no para esquivar un rojo.
- Para decidir si el cambio toca la IA, el robot mira **lo que hay publicado**
  en producción, no el último empujón. Así, algo que la puerta bloqueó sigue
  contando como pendiente en vez de colarse con el commit siguiente. Si no
  puede saberlo, evalúa por precaución.
- **Si algo sale mal en producción**: [`docs/07-emergencia.md`](docs/07-emergencia.md)
  §1 — se deshace en 30 segundos desde el panel de Vercel.
- Ese mismo documento tiene la lista de comprobación previa al lanzamiento y
  cómo dar de alta a una compañera nueva.

## Dónde está cada cosa

| Carpeta / archivo | Qué contiene |
| :---- | :---- |
| `app/` | Las pantallas y el código de servidor |
| `components/` | Trozos de pantalla reutilizables |
| `lib/` | Utilidades compartidas (Cloudflare, Supabase, PDF) |
| `supabase/migrations/` | Historial de cambios de la base de datos |
| `evals/` | El arnés de pruebas de la parte de IA (Paso 13) |
| `scripts/` | Comprobaciones sueltas: la sonda de Cloudflare y el banco del robot |
| `docs/` | Cómo se pensó el proyecto, paso a paso |
| `knowledge/` | Las decisiones tomadas y por qué |
| `CLAUDE.md` | Instrucciones para agentes de IA |

### Los documentos del proyecto

Se escribieron en orden, siguiendo el método de los 17 pasos:

| Documento | Responde a |
| :---- | :---- |
| [`docs/00-problema.md`](docs/00-problema.md) | ¿Qué problema resolvemos y para quién? |
| [`docs/01-historias.md`](docs/01-historias.md) | ¿Qué quiere hacer la usuaria? |
| [`docs/02-mvp.md`](docs/02-mvp.md) | ¿Qué es lo mínimo que tiene valor? |
| [`docs/03-spec.md`](docs/03-spec.md) | ¿Qué hace exactamente el producto? |
| [`docs/04-plan-tecnico.md`](docs/04-plan-tecnico.md) | ¿Con qué se construye? |
| [`docs/05-ia.md`](docs/05-ia.md) | ¿Qué partes usan IA y cuáles no? |
| [`docs/06-tareas.md`](docs/06-tareas.md) | ¿En qué orden se construye? |
| [`docs/07-emergencia.md`](docs/07-emergencia.md) | ¿Y si se rompe? ¿Cómo se deshace? |

`docs/03-spec.md` es la referencia: describe qué hace el producto sin
mencionar ninguna tecnología.
