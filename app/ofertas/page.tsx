'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TarjetaOferta, { type EstadoGeneracion } from '@/components/TarjetaOferta';
import { diaEnMadrid, etiquetaDiaEnMadrid } from '@/lib/fechas';

type Oferta = {
  id: string;
  titulo: string;
  empresa: string;
  enlace: string;
  ingerida_en: string;
  interesada: boolean;
  generacion: EstadoGeneracion | null;
};

// T85 · Las ofertas llegan ya ordenadas de más reciente a más antigua
// (app/api/ofertas/route.ts), así que agrupar solo consiste en trocear la
// lista cada vez que cambia el día de ingesta — sin volver a ordenar nada.
function agruparPorDia(ofertas: Oferta[]): { clave: string; etiqueta: string; ofertas: Oferta[] }[] {
  const grupos: { clave: string; etiqueta: string; ofertas: Oferta[] }[] = [];

  for (const oferta of ofertas) {
    const clave = diaEnMadrid(oferta.ingerida_en);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.clave === clave) {
      ultimo.ofertas.push(oferta);
    } else {
      grupos.push({ clave, etiqueta: etiquetaDiaEnMadrid(oferta.ingerida_en), ofertas: [oferta] });
    }
  }

  return grupos;
}

// No hay estado "sin perfil": quien no lo tiene se va a /perfil antes de
// pintar nada (ver cargar()).
type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-ingesta' }
  | { tipo: 'vacia' }
  | { tipo: 'lista'; ofertas: Oferta[] }
  | { tipo: 'error'; mensaje: string };

export default function Ofertas() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const respuesta = await fetch('/api/ofertas');
        if (respuesta.status === 401) {
          router.replace('/');
          return;
        }
        const datos = await respuesta.json();
        if (cancelado) return;

        if (!respuesta.ok) {
          setEstado({ tipo: 'error', mensaje: datos.error ?? 'No se pudieron cargar las ofertas.' });
          return;
        }
        setLimiteAlcanzado(Boolean(datos.limiteAlcanzado));

        if (datos.sinPerfil) {
          // Quien todavía no ha contado su perfil va a contarlo, no a una
          // pantalla de ofertas vacía que se lo pida por escrito
          // (docs/03-spec.md §3.2 — "aterriza donde le toca según su
          // situación"). El callback de login ya lo hacía, pero el enlace del
          // email de aviso (T68) entra directo aquí sin pasar por él.
          router.replace('/perfil');
          return;
        }

        if (datos.ofertas.length > 0) {
          // Ofertas de días anteriores (dentro de los 15 de caducidad, T85) se
          // muestran aunque la ingesta de hoy todavía no haya corrido: antes de
          // este orden, huboIngestaHoy=false las tapaba con "sin-ingesta" sin
          // necesidad, cada mañana hasta las 13:00.
          setEstado({ tipo: 'lista', ofertas: datos.ofertas });
        } else if (!datos.huboIngestaHoy) {
          setEstado({ tipo: 'sin-ingesta' });
        } else {
          setEstado({ tipo: 'vacia' });
        }
      } catch {
        if (!cancelado) {
          setEstado({ tipo: 'error', mensaje: 'No se pudieron cargar las ofertas.' });
        }
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <main className="w-full max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ofertas para ti
        </h1>

        {estado.tipo === 'cargando' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">Buscando ofertas…</p>
        )}

        {estado.tipo === 'sin-ingesta' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">
            Todavía no se ha actualizado la lista de ofertas de hoy. Vuelve a mirar un poco más
            tarde.
          </p>
        )}

        {estado.tipo === 'vacia' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">
            No hay ninguna oferta que coincida con tu perfil ahora mismo. Prueba a marcar más
            puestos o a ampliar tus palabras clave en tu perfil.
          </p>
        )}

        {estado.tipo === 'error' && (
          <p className="mt-8 text-red-600 dark:text-red-400">{estado.mensaje}</p>
        )}

        {estado.tipo === 'lista' && limiteAlcanzado && (
          <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Hoy ya has preparado los 5 documentos del día. Puedes seguir marcando ofertas que te
            interesen: sus documentos se prepararán mañana.
          </p>
        )}

        {estado.tipo === 'lista' &&
          agruparPorDia(estado.ofertas).map((grupo) => (
            <div key={grupo.clave} className="mt-8">
              <div className="flex items-center gap-3">
                <h2 className="whitespace-nowrap text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {grupo.etiqueta}
                </h2>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {grupo.ofertas.map((oferta) => (
                  <TarjetaOferta key={oferta.id} oferta={oferta} />
                ))}
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}
