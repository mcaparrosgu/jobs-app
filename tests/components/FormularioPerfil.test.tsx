// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormularioPerfil from '@/components/FormularioPerfil';

function respuesta(cuerpo: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => cuerpo } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FormularioPerfil — B1: pegar el CV', () => {
  it('el botón de analizar está deshabilitado mientras el campo del CV está vacío', () => {
    render(<FormularioPerfil perfilInicial={null} />);

    expect(screen.getByRole('button', { name: 'Analizar con la IA' })).toBeDisabled();
  });

  it('se habilita en cuanto hay texto pegado', async () => {
    render(<FormularioPerfil perfilInicial={null} />);

    await userEvent.type(screen.getByLabelText('Tu CV'), 'Texto de mi CV');

    expect(screen.getByRole('button', { name: 'Analizar con la IA' })).toBeEnabled();
  });

  it('no permite guardar el perfil sin haber pegado ni escrito nada (impide y explica qué falta)', async () => {
    render(<FormularioPerfil perfilInicial={null} />);

    await userEvent.type(screen.getByLabelText('Tu nombre completo'), 'Ana García');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/Analiza tu CV primero/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('FormularioPerfil — B2: propuesta automática de puesto y palabras clave', () => {
  it('al analizar el CV, muestra el puesto y las palabras clave que propone la IA', async () => {
    fetchMock.mockResolvedValue(
      respuesta({
        puesto: 'Profesora de secundaria',
        palabras_clave: ['docencia', 'educación secundaria'],
        empresas_cv: [],
        titulos_cv: [],
      }),
    );

    render(<FormularioPerfil perfilInicial={null} />);
    await userEvent.type(screen.getByLabelText('Tu CV'), 'Texto de mi CV real');
    await userEvent.click(screen.getByRole('button', { name: 'Analizar con la IA' }));

    expect(await screen.findByDisplayValue('Profesora de secundaria')).toBeInTheDocument();
    expect(screen.getByText('docencia')).toBeInTheDocument();
    expect(screen.getByText('educación secundaria')).toBeInTheDocument();
  });

  it('permite quitar una palabra clave propuesta que no representa a la usuaria', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puesto: 'Profesora',
          telefono: null,
          enlace: null,
          palabras_clave: ['docencia', 'python'],
          empresas_cv: [],
          titulos_cv: [],
          cv_texto: 'CV',
          usar_experiencia_cv: false,
        }}
      />,
    );

    expect(screen.getByText('python')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar python' }));

    expect(screen.queryByText('python')).not.toBeInTheDocument();
    expect(screen.getByText('docencia')).toBeInTheDocument();
  });

  it('permite añadir una palabra clave propia que la IA no haya sugerido', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puesto: 'Profesora',
          telefono: null,
          enlace: null,
          palabras_clave: ['docencia'],
          empresas_cv: [],
          titulos_cv: [],
          cv_texto: 'CV',
          usar_experiencia_cv: false,
        }}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText('Añadir palabra clave'), 'tutoría');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(screen.getByText('tutoría')).toBeInTheDocument();
  });

  it('avisa (sin bloquear) si la palabra clave añadida a mano es demasiado larga', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puesto: 'Profesora',
          telefono: null,
          enlace: null,
          palabras_clave: [],
          empresas_cv: [],
          titulos_cv: [],
          cv_texto: 'CV',
          usar_experiencia_cv: false,
        }}
      />,
    );

    const fraseLarga = 'gestión de equipos multidisciplinares en entorno internacional';
    await userEvent.type(screen.getByPlaceholderText('Añadir palabra clave'), fraseLarga);
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(screen.getByText(fraseLarga)).toBeInTheDocument();
    expect(await screen.findByText(/es larga/)).toBeInTheDocument();
  });

  it('muestra un mensaje de error si falla el análisis del CV (F2)', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ error: 'No se pudo analizar el CV. Inténtalo de nuevo en unos segundos.' }, false),
    );

    render(<FormularioPerfil perfilInicial={null} />);
    await userEvent.type(screen.getByLabelText('Tu CV'), 'Texto de mi CV real');
    await userEvent.click(screen.getByRole('button', { name: 'Analizar con la IA' }));

    expect(await screen.findByText(/No se pudo analizar el CV/)).toBeInTheDocument();
  });
});

describe('FormularioPerfil — guardar el perfil', () => {
  function perfilCompleto() {
    return {
      nombre: 'Ana García',
      puesto: 'Profesora de secundaria',
      telefono: null,
      enlace: null,
      palabras_clave: ['docencia'],
      empresas_cv: [],
      titulos_cv: [],
      cv_texto: 'Texto del CV',
      usar_experiencia_cv: false,
    };
  }

  it('exige el nombre antes de guardar, aunque el resto del perfil esté completo', async () => {
    render(<FormularioPerfil perfilInicial={{ ...perfilCompleto(), nombre: '' }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/Escribe tu nombre completo/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('al guardar con éxito, muestra la confirmación y el enlace a "Ver mis ofertas"', async () => {
    fetchMock.mockResolvedValue(respuesta({ ok: true }));

    render(<FormularioPerfil perfilInicial={perfilCompleto()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/Perfil guardado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver mis ofertas/ })).toHaveAttribute('href', '/ofertas');
  });

  it('muestra el error del servidor si falla el guardado', async () => {
    fetchMock.mockResolvedValue(respuesta({ error: 'No se pudo guardar el perfil.' }, false));

    render(<FormularioPerfil perfilInicial={perfilCompleto()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('No se pudo guardar el perfil.')).toBeInTheDocument());
  });
});
