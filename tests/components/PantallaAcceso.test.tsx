// @vitest-environment jsdom
//
// Formulario de acceso (components/FormularioAcceso.tsx): pedir el enlace de
// acceso. app/page.tsx solo decide si renderizarlo (sin sesión) o redirigir
// (con sesión) — ver tests/app/pagina-inicio.test.tsx para ese guard.
// Cubre los dos cambios del Paso 16 — que un email no invitado recibe un
// mensaje honesto en vez de uno genérico, y que la app ya no crea usuarias
// nuevas por su cuenta (shouldCreateUser: false).
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const parametrosFalsos = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => parametrosFalsos }));

const signInWithOtpFalso = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOtp: signInWithOtpFalso } }),
}));

import FormularioAcceso from '@/components/FormularioAcceso';

async function pedirAcceso(email = 'ana@example.com') {
  render(<FormularioAcceso />);
  await userEvent.type(screen.getByLabelText('Tu email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Pantalla de acceso — entrada solo por invitación (Paso 16)', () => {
  beforeEach(() => {
    parametrosFalsos.delete('error');
    signInWithOtpFalso.mockReset();
  });

  it('no deja que Supabase cree una usuaria nueva al pedir el enlace', async () => {
    signInWithOtpFalso.mockResolvedValue({ error: null });
    await pedirAcceso();

    expect(signInWithOtpFalso).toHaveBeenCalledOnce();
    expect(signInWithOtpFalso.mock.calls[0][0].options.shouldCreateUser).toBe(false);
  });

  it('confirma el envío cuando el email sí está invitado', async () => {
    signInWithOtpFalso.mockResolvedValue({ error: null });
    await pedirAcceso('ana@example.com');

    expect(screen.getByText(/te hemos enviado un enlace/i)).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('explica que el email no está invitado cuando Supabase devuelve otp_disabled', async () => {
    signInWithOtpFalso.mockResolvedValue({
      error: { code: 'otp_disabled', message: 'Signups not allowed for otp' },
    });
    await pedirAcceso('desconocida@example.com');

    expect(screen.getByText(/no está en la lista de personas invitadas/i)).toBeInTheDocument();
  });

  it('reconoce también el mensaje de texto, por si la versión no manda el código', async () => {
    signInWithOtpFalso.mockResolvedValue({ error: { message: 'Signups not allowed for this instance' } });
    await pedirAcceso('desconocida@example.com');

    expect(screen.getByText(/no está en la lista de personas invitadas/i)).toBeInTheDocument();
  });

  it('deja el mensaje genérico para cualquier otro error, sin confundirlo con una no invitada', async () => {
    signInWithOtpFalso.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' },
    });
    await pedirAcceso();

    expect(screen.getByText(/no se ha podido enviar el enlace/i)).toBeInTheDocument();
    expect(screen.queryByText(/lista de personas invitadas/i)).not.toBeInTheDocument();
  });

  it('avisa del enlace caducado ya en el primer render, sin pasar por un efecto', () => {
    parametrosFalsos.set('error', 'enlace-caducado');
    render(<FormularioAcceso />);

    expect(screen.getByText(/ese enlace ya no es válido/i)).toBeInTheDocument();
  });
});
