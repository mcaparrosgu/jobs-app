'use client';

import { useState } from 'react';
import Link from 'next/link';
import { esPalabraClaveLarga } from '@/lib/palabras-clave';

type PerfilGuardado = {
  nombre: string | null;
  puesto: string | null;
  palabras_clave: string[];
  empresas_cv: string[];
  titulos_cv: string[];
  cv_texto: string | null;
  usar_experiencia_cv: boolean;
};

export default function FormularioPerfil({ perfilInicial }: { perfilInicial: PerfilGuardado | null }) {
  const [cvTexto, setCvTexto] = useState(perfilInicial?.cv_texto ?? '');
  const [nombre, setNombre] = useState(perfilInicial?.nombre ?? '');
  const [puesto, setPuesto] = useState(perfilInicial?.puesto ?? '');
  const [palabrasClave, setPalabrasClave] = useState<string[]>(perfilInicial?.palabras_clave ?? []);
  const [empresasCv, setEmpresasCv] = useState<string[]>(perfilInicial?.empresas_cv ?? []);
  const [titulosCv, setTitulosCv] = useState<string[]>(perfilInicial?.titulos_cv ?? []);
  const [usarExperienciaCv, setUsarExperienciaCv] = useState(perfilInicial?.usar_experiencia_cv ?? false);
  const [nuevaPalabra, setNuevaPalabra] = useState('');
  const [avisoPalabra, setAvisoPalabra] = useState<string | null>(null);

  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);

  async function analizarCv() {
    if (cvTexto.trim().length === 0) return;

    setAnalizando(true);
    setMensaje(null);
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
      setPuesto(datos.puesto);
      setPalabrasClave(datos.palabras_clave);
      setEmpresasCv(datos.empresas_cv);
      setTitulosCv(datos.titulos_cv);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo analizar el CV.' });
    } finally {
      setAnalizando(false);
    }
  }

  function quitarPalabra(palabra: string) {
    setPalabrasClave((actuales) => actuales.filter((p) => p !== palabra));
  }

  function anadirPalabra() {
    const palabra = nuevaPalabra.trim();
    if (palabra.length === 0 || palabrasClave.includes(palabra)) {
      setNuevaPalabra('');
      return;
    }
    setPalabrasClave((actuales) => [...actuales, palabra]);
    // Se añade igual: manda ella. Pero conviene que sepa que las ofertas se
    // buscan por coincidencia literal, y una frase larga no coincide con nada.
    setAvisoPalabra(
      esPalabraClaveLarga(palabra)
        ? `Añadida, pero "${palabra}" es larga: las ofertas se buscan palabra por palabra, y los términos de una a tres palabras encuentran muchas más.`
        : null,
    );
    setNuevaPalabra('');
  }

  async function guardarPerfil() {
    if (nombre.trim().length === 0) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu nombre completo: es lo primero que verá quien lea tu CV.' });
      return;
    }
    if (puesto.trim().length === 0 || palabrasClave.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Analiza tu CV primero, o rellena el puesto y al menos una palabra clave.' });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          puesto,
          palabras_clave: palabrasClave,
          empresas_cv: empresasCv,
          titulos_cv: titulosCv,
          cv_texto: cvTexto,
          usar_experiencia_cv: usarExperienciaCv,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? 'No se pudo guardar el perfil.');
      }
      setMensaje({ tipo: 'ok', texto: 'Perfil guardado.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo guardar el perfil.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-8 w-full max-w-xl text-left">
      <label htmlFor="nombre" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Tu nombre completo
      </label>
      <input
        id="nombre"
        type="text"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
        placeholder="Como quieres que aparezca en tu CV y tu carta"
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

      <label htmlFor="cv" className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Tu CV
      </label>
      <textarea
        id="cv"
        value={cvTexto}
        onChange={(evento) => setCvTexto(evento.target.value)}
        rows={10}
        placeholder="Pega el contenido completo de tu CV, tal cual lo tengas escrito..."
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <button
        type="button"
        onClick={analizarCv}
        disabled={cvTexto.trim().length === 0 || analizando}
        className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {analizando ? 'Analizando tu CV…' : puesto ? 'Volver a analizar con la IA' : 'Analizar con la IA'}
      </button>

      <label htmlFor="puesto" className="mt-8 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Puesto
      </label>
      <input
        id="puesto"
        type="text"
        value={puesto}
        onChange={(evento) => setPuesto(evento.target.value)}
        placeholder="Aparecerá aquí al analizar tu CV"
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

      <label className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Palabras clave
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {palabrasClave.map((palabra) => (
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
      {avisoPalabra && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{avisoPalabra}</p>
      )}

      <label className="mt-6 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={usarExperienciaCv}
          onChange={(evento) => setUsarExperienciaCv(evento.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Tener en cuenta la experiencia de mi CV al buscar ofertas
      </label>

      {mensaje && (
        <p
          className={`mt-4 text-sm ${mensaje.tipo === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}
        >
          {mensaje.texto}
          {mensaje.tipo === 'ok' && (
            <>
              {' '}
              <Link href="/ofertas" className="font-medium underline underline-offset-2">
                Ver mis ofertas →
              </Link>
            </>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={guardarPerfil}
        disabled={guardando}
        className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
