'use client';

import { useState } from 'react';

type Oferta = {
  id: string;
  titulo: string;
  empresa: string;
  enlace: string;
  interesada: boolean;
};

export default function TarjetaOferta({ oferta }: { oferta: Oferta }) {
  const [interesada, setInteresada] = useState(oferta.interesada);
  const [guardando, setGuardando] = useState(false);

  async function marcarInteres() {
    if (interesada || guardando) return;

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/interes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oferta_id: oferta.id }),
      });
      if (respuesta.ok) {
        setInteresada(true);
      }
    } finally {
      setGuardando(false);
    }
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
    </article>
  );
}
