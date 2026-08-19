// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const usePathnameFalso = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => usePathnameFalso() }));

import MenuNavegacion from '@/components/MenuNavegacion';

describe('MenuNavegacion — A4: menú permanente y en qué pantalla se está', () => {
  it('marca "Ofertas" como la pantalla actual cuando se está en /ofertas', () => {
    usePathnameFalso.mockReturnValue('/ofertas');
    render(<MenuNavegacion email="ana@example.com" />);

    expect(screen.getByRole('link', { name: 'Ofertas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Mi perfil' })).not.toHaveAttribute('aria-current');
  });

  it('marca "Mi perfil" como la pantalla actual cuando se está en /perfil', () => {
    usePathnameFalso.mockReturnValue('/perfil');
    render(<MenuNavegacion email="ana@example.com" />);

    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Ofertas' })).not.toHaveAttribute('aria-current');
  });

  it('muestra el email de la usuaria y un botón para salir', () => {
    usePathnameFalso.mockReturnValue('/ofertas');
    render(<MenuNavegacion email="ana@example.com" />);

    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
  });

  it('el botón "Salir" envía el formulario a /auth/salir por POST (cierre de sesión real)', () => {
    usePathnameFalso.mockReturnValue('/ofertas');
    render(<MenuNavegacion email="ana@example.com" />);

    const boton = screen.getByRole('button', { name: 'Salir' });
    const formulario = boton.closest('form');
    expect(formulario).toHaveAttribute('action', '/auth/salir');
    expect(formulario).toHaveAttribute('method', 'post');
  });
});
