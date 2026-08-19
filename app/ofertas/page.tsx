'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TarjetaOferta from '@/components/TarjetaOferta';
import GuiaPasos from '@/components/GuiaPasos';

type Oferta = {
  id: string;
  titulo: string;
  empresa: string;
  enlace: string;
  interesada: boolean;
};

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-perfil' }
  | { tipo: 'sin-ingesta' }
  | { tipo: 'vacia' }
  | { tipo: 'lista'; ofertas: Oferta[] }
  | { tipo: 'error'; mensaje: string };

export default function Ofertas() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

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
        if (datos.sinPerfil) {
          setEstado({ tipo: 'sin-perfil' });
        } else if (!datos.huboIngestaHoy) {
          setEstado({ tipo: 'sin-ingesta' });
        } else if (datos.ofertas.length === 0) {
          setEstado({ tipo: 'vacia' });
        } else {
          setEstado({ tipo: 'lista', ofertas: datos.ofertas });
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
        {estado.tipo === 'sin-perfil' && <GuiaPasos pasoActual={2} />}
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ofertas para ti
        </h1>

        {estado.tipo === 'cargando' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">Buscando ofertas…</p>
        )}

        {estado.tipo === 'sin-perfil' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">
            Todavía no has guardado tu perfil.{' '}
            <Link href="/perfil" className="underline">
              Cuéntanoslo primero
            </Link>{' '}
            para poder buscarte ofertas.
          </p>
        )}

        {estado.tipo === 'sin-ingesta' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">
            Todavía no se ha actualizado la lista de ofertas de hoy. Vuelve a mirar un poco más
            tarde.
          </p>
        )}

        {estado.tipo === 'vacia' && (
          <p className="mt-8 text-zinc-600 dark:text-zinc-400">
            No hay ninguna oferta que coincida con tu perfil ahora mismo. Prueba a ampliar tus
            palabras clave en tu perfil.
          </p>
        )}

        {estado.tipo === 'error' && (
          <p className="mt-8 text-red-600 dark:text-red-400">{estado.mensaje}</p>
        )}

        {estado.tipo === 'lista' && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {estado.ofertas.map((oferta) => (
              <TarjetaOferta key={oferta.id} oferta={oferta} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
