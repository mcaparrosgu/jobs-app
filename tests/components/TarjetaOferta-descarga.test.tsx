// @vitest-environment jsdom
//
// Frente 1 (robustez para la demo): "Descargar" ya no es un enlace a pelo, sino
// un fetch con reintento ante el 503 de arranque en frío de Vercel (hallazgo de
// la prueba E2E del 01/09). Va en su propio archivo porque las esperas del
// reintento (1,5 s + 4 s) son reales: aisladas aquí no frenan al resto de la
// suite, pero mezcladas con las demás pruebas de TarjetaOferta le robaban el
// tiempo a un `findByText` de 1 s y lo volvían intermitente.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TarjetaOferta from '@/components/TarjetaOferta';

function ofertaLista() {
  return {
    id: 'oferta-1',
    titulo: 'Project Manager',
    empresa: 'Acme',
    enlace: 'https://ejemplo.com/oferta',
    interesada: true,
    generacion: { estado: 'listo' as const, avisos: [] as string[], error: null },
  };
}

function respuestaDescarga(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    blob: async () => new Blob(['%PDF-1.3'], { type: 'application/pdf' }),
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
const clickAnclaOriginal = HTMLAnchorElement.prototype.click;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // jsdom no implementa ninguna de las tres: las usa la descarga por blob.
  URL.createObjectURL = vi.fn(() => 'blob:falso');
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  HTMLAnchorElement.prototype.click = clickAnclaOriginal;
});

describe('TarjetaOferta — descarga del PDF con reintento', () => {
  it('el clic primario pide el PDF por fetch y lo baja como archivo, sin navegar', async () => {
    fetchMock.mockResolvedValue(respuestaDescarga(200));

    render(<TarjetaOferta oferta={ofertaLista()} />);
    await userEvent.click(screen.getByRole('link', { name: 'Descargar' }));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/descargar/oferta-1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reintenta tras un 503 de arranque en frío y termina descargando', async () => {
    let llamadas = 0;
    fetchMock.mockImplementation(async () => {
      llamadas += 1;
      return respuestaDescarga(llamadas === 1 ? 503 : 200);
    });

    render(<TarjetaOferta oferta={ofertaLista()} />);
    await userEvent.click(screen.getByRole('link', { name: 'Descargar' }));

    // A la espera del reintento, el botón lo dice.
    expect(await screen.findByText('Descargando…')).toBeInTheDocument();

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1), { timeout: 5_000 });
    expect(llamadas).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Descargar' })).toBeInTheDocument();
  });

  it('si el 5xx no se despeja tras los reintentos, avisa claro y no baja nada', async () => {
    fetchMock.mockResolvedValue(respuestaDescarga(500));

    render(<TarjetaOferta oferta={ofertaLista()} />);
    await userEvent.click(screen.getByRole('link', { name: 'Descargar' }));

    // 1,5 s + 4 s de esperas antes de rendirse: hay que darle margen.
    const aviso = await screen.findByRole('alert', undefined, { timeout: 10_000 });
    expect(aviso).toHaveTextContent(/No se pudo descargar el PDF/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 + 2 reintentos
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  }, 15_000);

  it('un 404 (documento aún no listo) no se reintenta y lo dice con su mensaje', async () => {
    fetchMock.mockResolvedValue(respuestaDescarga(404));

    render(<TarjetaOferta oferta={ofertaLista()} />);
    await userEvent.click(screen.getByRole('link', { name: 'Descargar' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/todavía no está listo/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Y el botón vuelve a estar operativo.
    expect(screen.getByRole('link', { name: 'Descargar' })).not.toHaveClass('pointer-events-none');
  });

  it('un clic con Ctrl no lo intercepta: deja que el navegador siga el href', () => {
    render(<TarjetaOferta oferta={ofertaLista()} />);

    fireEvent.click(screen.getByRole('link', { name: 'Descargar' }), { ctrlKey: true });

    // No arranca la descarga por fetch; jsdom avisa de "navigation not
    // implemented", que aquí es justo lo que debe pasar.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
