// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuiaPasos from '@/components/GuiaPasos';

describe('GuiaPasos — A4: en qué paso está la usuaria', () => {
  it('marca el paso 1 como actual cuando todavía no ha pegado el CV', () => {
    render(<GuiaPasos pasoActual={1} />);

    expect(screen.getByText('1. Pega tu CV')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('2. Mira tus ofertas')).not.toHaveAttribute('aria-current');
  });

  it('marca el paso 2 como actual tras guardar el perfil', () => {
    render(<GuiaPasos pasoActual={2} />);

    expect(screen.getByText('2. Mira tus ofertas')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('1. Pega tu CV')).not.toHaveAttribute('aria-current');
  });

  it('muestra siempre los dos pasos, en orden', () => {
    render(<GuiaPasos pasoActual={1} />);

    expect(screen.getByText('1. Pega tu CV')).toBeInTheDocument();
    expect(screen.getByText('2. Mira tus ofertas')).toBeInTheDocument();
  });
});
