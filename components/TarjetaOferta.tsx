'use client';

import { useEffect, useRef, useState } from 'react';
import { encolar } from '@/lib/cola';

export type EstadoGeneracion = {
  estado: 'generando' | 'listo' | 'error';
  avisos: string[];
  error: string | null;
};

// Esperas entre intento e intento (docs/05-ia.md §6.7: "reintento con espera
// creciente"). La causa habitual del fallo es que los modelos gratuitos estén
// saturados en ese momento, y eso se despeja solo en segundos.
const ESPERAS_MS = [6_000, 15_000];

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
            setGeneracion({ estado: 'listo', avisos: datos.avisos ?? [], error: null });
            return;
          }
          // `enCurso`: otra pestaña se adelantó y lo está preparando. Se deja
          // como está, en "preparando", sin pisarlo ni reintentar.
          if (datos.enCurso) return;

          // 502 = falló la IA (saturada, sin respuesta). Es el único fallo que
          // merece reintentarse: los demás (no hay CV guardado, la oferta ya no
          // existe) volverían a fallar igual dentro de quince segundos.
          const merecePenaReintentar = respuesta.status === 502 && intento < ESPERAS_MS.length;

          if (!merecePenaReintentar) {
            setGeneracion({
              estado: 'error',
              avisos: [],
              error: datos.error ?? 'No se pudo preparar el documento.',
            });
            return;
          }

          await new Promise((listo) => setTimeout(listo, ESPERAS_MS[intento]));
        } catch {
          setGeneracion({
            estado: 'error',
            avisos: [],
            error: 'Se perdió la conexión mientras se preparaba. Vuelve a intentarlo.',
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
        setGeneracion({ estado: 'generando', avisos: [], error: null });
        prepararDocumentos();
      } else if (datos.generacion) {
        setGeneracion({ estado: datos.generacion.estado, avisos: [], error: null });
      }
    } finally {
      setGuardando(false);
    }
  }

  function prepararAhora() {
    setLimite(null);
    setGeneracion({ estado: 'generando', avisos: [], error: null });
    prepararDocumentos();
  }

  return (
    <article className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{oferta.titulo}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{oferta.empresa}</p>
      <a
        href={oferta.enlace}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-sm text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
      >
        Ver oferta original
      </a>

      <button
        type="button"
        onClick={marcarInteres}
        disabled={interesada || guardando}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {interesada ? 'Te interesa ✓' : guardando ? 'Guardando…' : 'Me interesa'}
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

      {generacion?.estado === 'listo' && (
        <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          CV y carta preparados ✓
        </p>
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
    </article>
  );
}
