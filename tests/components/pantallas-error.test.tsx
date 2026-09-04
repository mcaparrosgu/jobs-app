// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorPagina from '@/app/error';
import GlobalError from '@/app/global-error';
import NoEncontrado from '@/app/not-found';

describe('app/error.tsx — barrera de errores de pantalla (frente 1)', () => {
  it('enseña un mensaje honesto y una salida a las ofertas', () => {
    render(<ErrorPagina error={new Error('algo se rompió')} retry={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Algo ha ido mal' })).toBeInTheDocument();
    expect(screen.getByText(/No se ha perdido nada/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mis ofertas' })).toHaveAttribute('href', '/ofertas');
  });

  it('el botón "Volver a intentarlo" llama a retry()', async () => {
    const retry = vi.fn();
    render(<ErrorPagina error={new Error('x')} retry={retry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentarlo' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('muestra el código del error solo cuando viene un digest', () => {
    const { rerender } = render(<ErrorPagina error={new Error('x')} retry={vi.fn()} />);
    expect(screen.queryByText(/Código del error/)).not.toBeInTheDocument();

    const conDigest = Object.assign(new Error('x'), { digest: 'abc123' });
    rerender(<ErrorPagina error={conDigest} retry={vi.fn()} />);
    expect(screen.getByText(/Código del error: abc123/)).toBeInTheDocument();
  });
});

describe('app/global-error.tsx — barrera de último recurso', () => {
  it('enseña el aviso y un botón que llama a retry()', async () => {
    const retry = vi.fn();
    render(<GlobalError error={new Error('layout roto')} retry={retry} />);

    expect(screen.getByText('La aplicación ha tenido un problema')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentarlo' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('app/not-found.tsx — página 404', () => {
  it('explica el 404 y ofrece volver a ofertas o al inicio', () => {
    render(<NoEncontrado />);

    expect(screen.getByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument();
    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mis ofertas' })).toHaveAttribute('href', '/ofertas');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
