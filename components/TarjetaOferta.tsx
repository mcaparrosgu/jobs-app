'use client';

import { useEffect, useRef, useState } from 'react';
import { encolar } from '@/lib/cola';
import { MAXIMO_REHECHOS, MENSAJE_LIMITE_REHACER } from '@/lib/generaciones';
import { MAXIMO_CARACTERES_INSTRUCCIONES } from '@/lib/ia';

export type EstadoGeneracion = {
  estado: 'generando' | 'listo' | 'error';
  avisos: string[];
  error: string | null;
  // T93 · Cuántas veces se ha pedido "Rehacer" con éxito para este documento
  // (lib/generaciones.ts, MAXIMO_REHECHOS). Opcional y tratado como 0 cuando
  // falta (generaciones de antes de esta columna, o construidas a mano en
  // las pruebas).
  rehechos?: number;
};

// Esperas entre intento e intento (docs/05-ia.md §6.7: "reintento con espera
// creciente"). La causa habitual del fallo es que los modelos gratuitos estén
// saturados en ese momento, y eso se despeja solo en segundos.
const ESPERAS_MS = [6_000, 15_000];

// Paso 15 · El enlace de la oferta lo escribe el portal de empleo del que
// viene, no nosotras, y se pinta como un `href` en la pantalla. Hoy React 19
// bloquea por su cuenta las URL `javascript:` (comprobado en el red team,
// ficha 6.1), pero eso es una red de seguridad del framework, no una decisión
// de esta app: si mañana se pinta ese enlace en otro sitio —o React cambia—
// el agujero vuelve. Aquí se decide explícitamente qué es un enlace: http o
// https, y nada más.
function enlaceSeguro(enlace: string): string | undefined {
  try {
    const url = new URL(enlace);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// "Descargar" pide el PDF con fetch (en vez de dejar que el navegador siga el
// enlace a pelo) para poder reintentar ante el 503 de arranque en frío de la
// función de Vercel: la primera descarga del día lo dispara y falla, y un
// segundo intento ya va (prueba E2E del 01/09). Esperas cortas y crecientes;
// un 404 significa "el documento aún no está listo" y no se reintenta.
const ESPERAS_DESCARGA_MS = [1_500, 4_000];

class ErrorDescarga extends Error {
  constructor(readonly estado: number) {
    super(`la descarga falló con estado ${estado}`);
    this.name = 'ErrorDescarga';
  }
}

async function pedirPdfConReintento(url: string): Promise<Blob> {
  for (let intento = 0; intento <= ESPERAS_DESCARGA_MS.length; intento++) {
    const respuesta = await fetch(url);
    if (respuesta.ok) return respuesta.blob();

    const reintentable = respuesta.status >= 500 && intento < ESPERAS_DESCARGA_MS.length;
    if (!reintentable) throw new ErrorDescarga(respuesta.status);

    await new Promise((listo) => setTimeout(listo, ESPERAS_DESCARGA_MS[intento]));
  }
  // Inalcanzable: la última vuelta del bucle o devuelve el blob o lanza.
  throw new ErrorDescarga(0);
}

// Mismo criterio que el servidor (app/api/descargar/[id]/route.ts): quita solo
// los caracteres que romperían el nombre de archivo en algún sistema operativo.
function nombreArchivoPdf(tituloOferta: string): string {
  const base = tituloOferta ? `CV y carta - ${tituloOferta}` : 'CV y carta';
  return `${base.replace(/[\\/:*?"<>|]/g, '')}.pdf`;
}

function dispararDescargaDeBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera con margen para no cortar una descarga que acaba de arrancar.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

type Oferta = {
  id: string;
  titulo: string;
  empresa: string;
  enlace: string;
  interesada: boolean;
  generacion: EstadoGeneracion | null;
};

export default function TarjetaOferta({ oferta }: { oferta: Oferta }) {
  const [interesada, setInteresada] = useState(oferta.interesada);
  const [guardando, setGuardando] = useState(false);
  const [generacion, setGeneracion] = useState<EstadoGeneracion | null>(oferta.generacion);
  const [limite, setLimite] = useState<string | null>(null);
  // Evita disparar dos veces la misma preparación desde esta pantalla (React
  // monta los componentes dos veces en desarrollo). El cerrojo de verdad está
  // en el servidor; esto es solo para no gastar una petición de más.
  const lanzada = useRef(false);

  // T93 · Estado del botón "Rehacer": el modal que pregunta qué cambiar, el
  // texto que escribe la usuaria, si hay una petición en curso y su error (si
  // lo hay). A diferencia de `generacion`, esto no viene del servidor al
  // cargar la pantalla: solo existe mientras dura la interacción.
  const [mostrarModalRehacer, setMostrarModalRehacer] = useState(false);
  const [instruccionesRehacer, setInstruccionesRehacer] = useState('');
  const [rehaciendo, setRehaciendo] = useState(false);
  const [errorRehacer, setErrorRehacer] = useState<string | null>(null);

  // Estado del botón "Descargar": si hay una descarga en curso y su error, si
  // lo hay. Como el de rehacer, solo vive mientras dura la interacción.
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  // Pide al servidor que prepare el CV y la carta. Va por la cola: si hay
  // varias ofertas marcadas, se preparan de una en una (lib/cola.ts).
  async function prepararDocumentos() {
    lanzada.current = true;
    await encolar(async () => {
      for (let intento = 0; intento <= ESPERAS_MS.length; intento++) {
        try {
          const respuesta = await fetch('/api/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oferta_id: oferta.id }),
          });
          const datos = await respuesta.json();

          if (datos.estado === 'limite') {
            setGeneracion(null);
            setLimite(datos.error);
            return;
          }
          if (datos.estado === 'listo') {
            setGeneracion({ estado: 'listo', avisos: datos.avisos ?? [], error: null, rehechos: 0 });
            return;
          }
          // `enCurso`: otra pestaña se adelantó y lo está preparando. Se deja
          // como está, en "preparando", sin pisarlo ni reintentar.
          if (datos.enCurso) return;

          // 502 = falló la IA (saturada, sin respuesta). Es el único fallo que
          // merece reintentarse: los demás (no hay CV guardado, la oferta ya no
          // existe) volverían a fallar igual dentro de quince segundos.
          //
          // Paso 15 · El 422 es nuevo y NO se reintenta: significa que la IA sí
          // contestó, pero el documento no pasó la validación. Volvería a
          // fallar igual, y cada reintento cuesta una cascada entera de modelos
          // de la cuota que comparten las cinco usuarias
          // (seguridad/red-team-opus.md, ficha 5.4). El botón de "Reintentar"
          // sigue disponible para insistir a mano.
          const merecePenaReintentar = respuesta.status === 502 && intento < ESPERAS_MS.length;

          if (!merecePenaReintentar) {
            setGeneracion({
              estado: 'error',
              avisos: [],
              error: datos.error ?? 'No se pudo preparar el documento.',
              rehechos: 0,
            });
            return;
          }

          await new Promise((listo) => setTimeout(listo, ESPERAS_MS[intento]));
        } catch {
          setGeneracion({
            estado: 'error',
            avisos: [],
            error: 'Se perdió la conexión mientras se preparaba. Vuelve a intentarlo.',
            rehechos: 0,
          });
          return;
        }
      }
    });
  }

  // Si al abrir la pantalla esta oferta ya estaba a medias (se recargó la
  // página, se cerró la pestaña), se retoma sola en vez de quedarse colgada.
  useEffect(() => {
    if (generacion?.estado === 'generando' && !lanzada.current) {
      prepararDocumentos();
    }
    // Solo al montar: es una puesta al día, no algo que deba repetirse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marcarInteres() {
    if (interesada || guardando) return;

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/interes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oferta_id: oferta.id }),
      });
      if (!respuesta.ok) return;

      const datos = await respuesta.json();
      setInteresada(true);

      if (datos.limite) {
        setLimite(datos.limite);
      } else if (datos.generacion?.estado === 'generando') {
        setGeneracion({ estado: 'generando', avisos: [], error: null, rehechos: 0 });
        prepararDocumentos();
      } else if (datos.generacion) {
        setGeneracion({ estado: datos.generacion.estado, avisos: [], error: null, rehechos: 0 });
      }
    } finally {
      setGuardando(false);
    }
  }

  function prepararAhora() {
    setLimite(null);
    setGeneracion({ estado: 'generando', avisos: [], error: null, rehechos: 0 });
    prepararDocumentos();
  }

  // Clic primario en "Descargar": lo gestionamos con fetch para reintentar el
  // arranque en frío. Un clic con modificador, botón central o "abrir en
  // pestaña nueva" deja que el navegador siga el href tal cual.
  async function descargar(evento: React.MouseEvent<HTMLAnchorElement>) {
    if (
      evento.defaultPrevented ||
      evento.button !== 0 ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey
    ) {
      return;
    }
    evento.preventDefault();
    if (descargando) return;

    setErrorDescarga(null);
    setDescargando(true);
    try {
      const blob = await pedirPdfConReintento(`/api/descargar/${oferta.id}`);
      dispararDescargaDeBlob(blob, nombreArchivoPdf(oferta.titulo));
    } catch (error) {
      const aunNoListo = error instanceof ErrorDescarga && error.estado === 404;
      setErrorDescarga(
        aunNoListo
          ? 'El documento todavía no está listo. Espera unos segundos y vuelve a intentarlo.'
          : 'No se pudo descargar el PDF. Espera unos segundos y vuelve a intentarlo.',
      );
    } finally {
      setDescargando(false);
    }
  }

  // T93 · Botón "Rehacer": abre el modal que pregunta qué cambiar.
  function abrirModalRehacer() {
    setErrorRehacer(null);
    setInstruccionesRehacer('');
    setMostrarModalRehacer(true);
  }

  function cerrarModalRehacer() {
    if (rehaciendo) return; // no se cierra a media petición
    setMostrarModalRehacer(false);
  }

  // Pide al servidor que redacte otra vez el CV y la carta con la
  // instrucción de la usuaria. A diferencia de `prepararDocumentos`, no hay
  // reintentos automáticos con espera creciente: si falla, el documento
  // anterior sigue disponible tal cual y la usuaria decide si insiste.
  async function confirmarRehacer() {
    const instrucciones = instruccionesRehacer.trim();
    if (instrucciones.length === 0) return;

    setMostrarModalRehacer(false);
    setRehaciendo(true);
    setErrorRehacer(null);

    try {
      const respuesta = await fetch('/api/rehacer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oferta_id: oferta.id, instrucciones }),
      });
      const datos = await respuesta.json();

      if (datos.estado === 'listo') {
        setGeneracion((previo) =>
          previo ? { ...previo, avisos: datos.avisos ?? [], rehechos: datos.rehechos ?? previo.rehechos } : previo,
        );
      } else {
        setErrorRehacer(datos.error ?? 'No se pudo rehacer el documento.');
      }
    } catch {
      setErrorRehacer('Se perdió la conexión mientras se rehacía. Vuelve a intentarlo.');
    } finally {
      setRehaciendo(false);
    }
  }

  const yaAgotoRehechos = (generacion?.rehechos ?? 0) >= MAXIMO_REHECHOS;

  return (
    <article className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{oferta.titulo}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{oferta.empresa}</p>
      {enlaceSeguro(oferta.enlace) ? (
        <a
          href={enlaceSeguro(oferta.enlace)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-sm text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
        >
          Ver oferta original
        </a>
      ) : (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Esta oferta no trae un enlace válido.
        </p>
      )}

      <button
        type="button"
        onClick={marcarInteres}
        disabled={interesada || guardando}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {interesada ? 'Te interesa ✓' : guardando ? 'Creando…' : 'Me interesa'}
      </button>

      {generacion?.estado === 'generando' && (
        <p className="mt-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            aria-hidden
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
          />
          Preparando tu CV y tu carta… puede tardar un minuto.
        </p>
      )}

      {rehaciendo && (
        <p className="mt-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            aria-hidden
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
          />
          Rehaciendo tu CV y tu carta… puede tardar un minuto.
        </p>
      )}

      {generacion?.estado === 'listo' && !rehaciendo && (
        <>
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            CV y carta preparados ✓
          </p>
          {/* Paso 14 · disparador de intervención humana "acción irreversible":
              enviar el documento a una empresa no se puede deshacer, así que
              este recordatorio aparece SIEMPRE, no solo cuando hay avisos
              concretos (docs/05-ia.md §6.2). Pedido explícito de Mar
              (23/08/2026): aunque no haya nada que advertir, el mensaje se
              mantiene igual — la revisión humana no es opcional nunca. */}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Revisa siempre el documento antes de enviarlo: la IA puede cometer errores, aunque no te avisemos de nada en concreto.
          </p>
        </>
      )}

      {(generacion?.estado === 'generando' || generacion?.estado === 'listo') && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {generacion.estado === 'listo' && !rehaciendo ? (
            <a
              href={`/api/descargar/${oferta.id}`}
              onClick={descargar}
              aria-busy={descargando}
              className={`inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-200${
                descargando ? ' pointer-events-none opacity-60' : ''
              }`}
            >
              {descargando && (
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
                />
              )}
              {descargando ? 'Descargando…' : 'Descargar'}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-400 opacity-60 dark:border-zinc-700 dark:text-zinc-500"
            >
              Descargar
            </button>
          )}

          {/* T93 · "Rehacer" solo tiene sentido sobre un documento ya listo, y
              no mientras ya hay una petición de rehacer en curso. */}
          {generacion.estado === 'listo' && (
            <button
              type="button"
              onClick={abrirModalRehacer}
              disabled={rehaciendo || yaAgotoRehechos}
              title={yaAgotoRehechos ? MENSAJE_LIMITE_REHACER : undefined}
              className="inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
            >
              Rehacer
            </button>
          )}
        </div>
      )}

      {errorDescarga && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">
          {errorDescarga}
        </p>
      )}

      {generacion?.estado === 'listo' && yaAgotoRehechos && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{MENSAJE_LIMITE_REHACER}</p>
      )}

      {errorRehacer && (
        <div className="mt-2 text-sm text-red-700 dark:text-red-400">
          <p>{errorRehacer}</p>
        </div>
      )}

      {generacion?.estado === 'listo' && generacion.avisos.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Revisa esto antes de enviarlo:</p>
          <ul className="mt-1 list-disc pl-5">
            {generacion.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </div>
      )}

      {generacion?.estado === 'error' && (
        <div className="mt-3 text-sm text-red-700 dark:text-red-400">
          <p>{generacion.error ?? 'No se pudo preparar el documento.'}</p>
          <button
            type="button"
            onClick={prepararAhora}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 font-medium dark:border-red-800"
          >
            Reintentar
          </button>
        </div>
      )}

      {limite && <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{limite}</p>}

      {/* Interés marcado pero sin documento: pasa cuando se alcanzó el límite
          diario y la usuaria vuelve al día siguiente. El botón es la forma de
          retomarlo sin tener que desmarcar y volver a marcar. */}
      {interesada && !generacion && (
        <button
          type="button"
          onClick={prepararAhora}
          className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
        >
          Preparar mi CV y mi carta
        </button>
      )}

      {mostrarModalRehacer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={cerrarModalRehacer}
          onKeyDown={(evento) => evento.key === 'Escape' && cerrarModalRehacer()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`rehacer-titulo-${oferta.id}`}
            onClick={(evento) => evento.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg dark:bg-zinc-900"
          >
            <h4 id={`rehacer-titulo-${oferta.id}`} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              ¿Qué te gustaría modificar?
            </h4>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Por ejemplo: «usa un lenguaje más profesional» o «que sea más conciso».
            </p>
            <textarea
              autoFocus
              value={instruccionesRehacer}
              onChange={(evento) => setInstruccionesRehacer(evento.target.value.slice(0, MAXIMO_CARACTERES_INSTRUCCIONES))}
              maxLength={MAXIMO_CARACTERES_INSTRUCCIONES}
              rows={3}
              placeholder="Escribe aquí qué te gustaría cambiar…"
              className="mt-3 w-full rounded-md border border-zinc-300 p-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <p className="mt-1 text-right text-xs text-zinc-400">
              {instruccionesRehacer.length}/{MAXIMO_CARACTERES_INSTRUCCIONES}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarModalRehacer}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRehacer}
                disabled={instruccionesRehacer.trim().length === 0}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Rehacer
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
