'use client';

import { useState, type FormEvent } from 'react';

type PerfilExtraido = {
  puesto: string;
  palabras_clave: string[];
  empresas_cv: string[];
  titulos_cv: string[];
};

type PerfilGuardado = PerfilExtraido & {
  anios_experiencia: number | null;
  cv_texto: string | null;
  usar_experiencia_cv: boolean;
};

export default function FormularioPerfil({ perfilInicial }: { perfilInicial: PerfilGuardado | null }) {
  const [cvTexto, setCvTexto] = useState(perfilInicial?.cv_texto ?? '');
  const [perfil, setPerfil] = useState<PerfilExtraido | null>(
    perfilInicial
      ? {
          puesto: perfilInicial.puesto,
          palabras_clave: perfilInicial.palabras_clave,
          empresas_cv: perfilInicial.empresas_cv,
          titulos_cv: perfilInicial.titulos_cv,
        }
      : null,
  );
  const [nuevaPalabra, setNuevaPalabra] = useState('');
  const [aniosExperiencia, setAniosExperiencia] = useState(
    perfilInicial?.anios_experiencia != null ? String(perfilInicial.anios_experiencia) : '',
  );
  const [usarExperienciaCv, setUsarExperienciaCv] = useState(perfilInicial?.usar_experiencia_cv ?? false);

  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analizarCv(evento: FormEvent) {
    evento.preventDefault();
    if (cvTexto.trim().length === 0) return;

    setAnalizando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/extraer-perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: cvTexto }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? 'No se pudo analizar el CV.');
      }
      setPerfil(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar el CV.');
    } finally {
      setAnalizando(false);
    }
  }

  function quitarPalabra(palabra: string) {
    if (!perfil) return;
    setPerfil({ ...perfil, palabras_clave: perfil.palabras_clave.filter((p) => p !== palabra) });
  }

  function anadirPalabra() {
    const palabra = nuevaPalabra.trim();
    if (!perfil || palabra.length === 0 || perfil.palabras_clave.includes(palabra)) {
      setNuevaPalabra('');
      return;
    }
    setPerfil({ ...perfil, palabras_clave: [...perfil.palabras_clave, palabra] });
    setNuevaPalabra('');
  }

  async function guardarPerfil(evento: FormEvent) {
    evento.preventDefault();
    if (!perfil) return;

    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puesto: perfil.puesto,
          palabras_clave: perfil.palabras_clave,
          empresas_cv: perfil.empresas_cv,
          titulos_cv: perfil.titulos_cv,
          cv_texto: cvTexto,
          anios_experiencia: aniosExperiencia === '' ? null : Number(aniosExperiencia),
          usar_experiencia_cv: usarExperienciaCv,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? 'No se pudo guardar el perfil.');
      }
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) {
    return (
      <form onSubmit={analizarCv} className="mt-8 w-full text-left">
        <label htmlFor="cv" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Pega aquí el texto de tu CV
        </label>
        <textarea
          id="cv"
          value={cvTexto}
          onChange={(evento) => setCvTexto(evento.target.value)}
          rows={14}
          placeholder="Pega el contenido completo de tu CV, tal cual lo tengas escrito..."
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={cvTexto.trim().length === 0 || analizando}
          className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {analizando ? 'Analizando tu CV…' : 'Continuar'}
        </button>
      </form>
    );
  }

  if (guardado) {
    return (
      <p className="mt-8 text-lg text-zinc-600 dark:text-zinc-400">
        Perfil guardado. Ya puedes cerrar esta pantalla.
      </p>
    );
  }

  return (
    <form onSubmit={guardarPerfil} className="mt-8 w-full text-left">
      <label htmlFor="puesto" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Puesto
      </label>
      <input
        id="puesto"
        type="text"
        value={perfil.puesto}
        onChange={(evento) => setPerfil({ ...perfil, puesto: evento.target.value })}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

      <label className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Palabras clave
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {perfil.palabras_clave.map((palabra) => (
          <span
            key={palabra}
            className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {palabra}
            <button
              type="button"
              onClick={() => quitarPalabra(palabra)}
              aria-label={`Quitar ${palabra}`}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={nuevaPalabra}
          onChange={(evento) => setNuevaPalabra(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              anadirPalabra();
            }
          }}
          placeholder="Añadir palabra clave"
          className="flex-1 rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={anadirPalabra}
          className="rounded-lg border border-zinc-300 px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Añadir
        </button>
      </div>

      <label htmlFor="anios" className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Años de experiencia
      </label>
      <input
        id="anios"
        type="number"
        min={0}
        value={aniosExperiencia}
        onChange={(evento) => setAniosExperiencia(evento.target.value)}
        className="mt-2 w-32 rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

      <label className="mt-6 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={usarExperienciaCv}
          onChange={(evento) => setUsarExperienciaCv(evento.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Tener en cuenta la experiencia de mi CV al buscar ofertas
      </label>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}
