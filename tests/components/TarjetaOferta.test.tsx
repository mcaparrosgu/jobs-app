// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TarjetaOferta from '@/components/TarjetaOferta';

function ofertaBase(extra: Partial<React.ComponentProps<typeof TarjetaOferta>['oferta']> = {}) {
  return {
    id: 'oferta-1',
    titulo: 'Project Manager',
    empresa: 'Acme',
    enlace: 'https://ejemplo.com/oferta',
    interesada: false,
    generacion: null,
    ...extra,
  };
}

function respuesta(cuerpo: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => cuerpo } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TarjetaOferta — C2: marcar "me interesa" dispara la generación', () => {
  it('al pulsar "Me interesa" se marca el interés y arranca la generación (D2: indicador visible)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/interes') return respuesta({ ok: true, generacion: { estado: 'generando' } });
      if (url === '/api/generar') {
        // Un pequeño retraso deliberado: da tiempo a comprobar el indicador
        // de "generando" antes de que la generación termine.
        await new Promise((r) => setTimeout(r, 300));
        return respuesta({ estado: 'listo', avisos: [] });
      }
      throw new Error(`URL no esperada: ${url}`);
    });

    render(<TarjetaOferta oferta={ofertaBase()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Me interesa' }));

    expect(await screen.findByText('Te interesa ✓')).toBeInTheDocument();
    expect(await screen.findByText(/Preparando tu CV y tu carta/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/interes', expect.objectContaining({ method: 'POST' }));

    await waitFor(() => expect(screen.getByText('CV y carta preparados ✓')).toBeInTheDocument());
  });

  it('marcar dos veces seguidas no relanza la petición (el botón se deshabilita tras la primera)', async () => {
    fetchMock.mockResolvedValue(respuesta({ ok: true, generacion: { estado: 'generando' } }));

    render(<TarjetaOferta oferta={ofertaBase()} />);
    const boton = screen.getByRole('button', { name: 'Me interesa' });

    await userEvent.click(boton);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Te interesa ✓' })).toBeDisabled());
  });
});

describe('TarjetaOferta — C4: descarga', () => {
  it('el botón "Descargar" está deshabilitado mientras se está generando', async () => {
    // Se cuelga a propósito para que el estado se quede en "generando"
    // durante la aserción (el montaje relanza la preparación sola).
    // `lib/cola.ts` es una cola compartida por módulo: hay que liberarla
    // antes de terminar, o bloquearía las pruebas siguientes de este archivo.
    let liberar: (valor: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => { liberar = resolve; }));

    render(<TarjetaOferta oferta={ofertaBase({ generacion: { estado: 'generando', avisos: [], error: null } })} />);

    const boton = screen.getByRole('button', { name: 'Descargar' });
    expect(boton).toBeDisabled();

    liberar(respuesta({ estado: 'error', error: 'liberada para no bloquear la cola' }));
    await waitFor(() => expect(screen.getByText('liberada para no bloquear la cola')).toBeInTheDocument());
  });

  it('cuando está listo, "Descargar" es un enlace activo al endpoint de descarga', () => {
    render(<TarjetaOferta oferta={ofertaBase({ generacion: { estado: 'listo', avisos: [], error: null } })} />);

    const enlace = screen.getByRole('link', { name: 'Descargar' });
    expect(enlace).toHaveAttribute('href', '/api/descargar/oferta-1');
  });

  it('muestra los avisos de verificación (T54/T55) cuando el CV generado tiene alguno', () => {
    render(
      <TarjetaOferta
        oferta={ofertaBase({
          generacion: { estado: 'listo', avisos: ['El CV generado menciona "47", que no aparece en el CV que pegaste.'], error: null },
        })}
      />,
    );

    expect(screen.getByText(/Revisa esto antes de enviarlo/)).toBeInTheDocument();
    expect(screen.getByText(/menciona "47"/)).toBeInTheDocument();
  });
});

describe('TarjetaOferta — G1: límite diario', () => {
  it('al alcanzar el límite, muestra el mensaje sin dejar la tarjeta en "generando"', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ ok: true, generacion: null, limite: 'Has llegado al máximo de 5 documentos por hoy.' }),
    );

    render(<TarjetaOferta oferta={ofertaBase()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Me interesa' }));

    expect(await screen.findByText(/Has llegado al máximo de 5 documentos/)).toBeInTheDocument();
    expect(screen.queryByText(/Preparando tu CV/)).not.toBeInTheDocument();
  });
});

describe('TarjetaOferta — F2: errores y reintento', () => {
  it('muestra un mensaje de error claro y un botón de reintentar cuando falla la preparación', async () => {
    render(
      <TarjetaOferta
        oferta={ofertaBase({ generacion: { estado: 'error', avisos: [], error: 'No se pudo preparar el documento.' } })}
      />,
    );

    expect(screen.getByText('No se pudo preparar el documento.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('reintentar vuelve a pedir la generación y, si va bien, acaba en "listo"', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/generar') return respuesta({ estado: 'listo', avisos: [] });
      throw new Error(`URL no esperada: ${url}`);
    });

    render(
      <TarjetaOferta
        oferta={ofertaBase({ generacion: { estado: 'error', avisos: [], error: 'No se pudo preparar.' } })}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.getByText('CV y carta preparados ✓')).toBeInTheDocument());
  });

  it('si se pierde la conexión durante la preparación, muestra un mensaje de error específico', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/interes') return respuesta({ ok: true, generacion: { estado: 'generando' } });
      if (url === '/api/generar') throw new TypeError('Failed to fetch');
      throw new Error(`URL no esperada: ${url}`);
    });

    render(<TarjetaOferta oferta={ofertaBase()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Me interesa' }));

    expect(await screen.findByText(/Se perdió la conexión/)).toBeInTheDocument();
  });
});
