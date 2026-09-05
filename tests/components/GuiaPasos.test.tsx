// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuiaPasos from '@/components/GuiaPasos';

describe('GuiaPasos — en qué paso está la usuaria (entrada, perfil, ofertas)', () => {
  it('marca el paso 1 como actual al pedir acceso', () => {
    render(<GuiaPasos pasoActual={1} />);

    expect(screen.getByText('1. Pide acceso')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('2. Pega tu CV')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('3. Mira tus ofertas')).not.toHaveAttribute('aria-current');
  });

  it('marca el paso 2 como actual mientras no ha guardado el perfil', () => {
    render(<GuiaPasos pasoActual={2} />);

    expect(screen.getByText('2. Pega tu CV')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('1. Pide acceso')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('3. Mira tus ofertas')).not.toHaveAttribute('aria-current');
  });

  it('marca el paso 3 como actual en la pantalla de ofertas', () => {
    render(<GuiaPasos pasoActual={3} />);

    expect(screen.getByText('3. Mira tus ofertas')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('1. Pide acceso')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('2. Pega tu CV')).not.toHaveAttribute('aria-current');
  });

  it('muestra siempre los 3 pasos, en orden, sea cual sea el paso activo', () => {
    render(<GuiaPasos pasoActual={2} />);

    expect(screen.getByText('1. Pide acceso')).toBeInTheDocument();
    expect(screen.getByText('2. Pega tu CV')).toBeInTheDocument();
    expect(screen.getByText('3. Mira tus ofertas')).toBeInTheDocument();
  });
});
