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

describe('FormularioPerfil — B2: propuesta automática de puestos y palabras clave (T86/T88)', () => {
  it('al analizar el CV, muestra los puestos sugeridos (con el principal ya marcado) y las palabras clave', async () => {
    fetchMock.mockResolvedValue(
      respuesta({
        puesto: 'Profesora de secundaria',
        puestos_sugeridos: ['Profesora de secundaria', 'Profesora de matemáticas', 'Tutora académica'],
        palabras_clave: ['docencia', 'educación secundaria'],
        palabras_clave_sugeridas: ['tutoría', 'evaluación'],
        empresas_cv: [],
        titulos_cv: [],
      }),
    );

    render(<FormularioPerfil perfilInicial={null} />);
    await userEvent.type(screen.getByLabelText('Tu CV'), 'Texto de mi CV real');
    await userEvent.click(screen.getByRole('button', { name: 'Analizar con la IA' }));

    const principal = await screen.findByRole('checkbox', { name: 'Profesora de secundaria' });
    expect(principal).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Profesora de matemáticas' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Tutora académica' })).not.toBeChecked();
    expect(screen.getByText('docencia')).toBeInTheDocument();
    expect(screen.getByText('educación secundaria')).toBeInTheDocument();
  });

  it('permite marcar un puesto alternativo además del principal', async () => {
    fetchMock.mockResolvedValue(
      respuesta({
        puesto: 'Profesora de secundaria',
        puestos_sugeridos: ['Profesora de secundaria', 'Tutora académica'],
        palabras_clave: ['docencia'],
        palabras_clave_sugeridas: [],
        empresas_cv: [],
        titulos_cv: [],
      }),
    );

    render(<FormularioPerfil perfilInicial={null} />);
    await userEvent.type(screen.getByLabelText('Tu CV'), 'Texto de mi CV real');
    await userEvent.click(screen.getByRole('button', { name: 'Analizar con la IA' }));

    const alternativo = await screen.findByRole('checkbox', { name: 'Tutora académica' });
    await userEvent.click(alternativo);

    expect(alternativo).toBeChecked();
  });

  it('permite añadir un puesto propio con la barra libre', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puestos: ['Profesora'],
          palabras_clave: ['docencia'],
          empresas_cv: [],
          titulos_cv: [],
          cv_texto: 'CV',
          usar_experiencia_cv: false,
        }}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText('Añadir otro puesto'), 'Formadora corporativa');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir puesto' }));

    expect(screen.getByRole('checkbox', { name: 'Formadora corporativa' })).toBeChecked();
  });

  it('permite quitar una palabra clave propuesta que no representa a la usuaria', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puestos: ['Profesora'],
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
          puestos: ['Profesora'],
          palabras_clave: ['docencia'],
          empresas_cv: [],
          titulos_cv: [],
          cv_texto: 'CV',
          usar_experiencia_cv: false,
        }}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText('Añadir palabra clave'), 'tutoría');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir palabra clave' }));

    expect(screen.getByText('tutoría')).toBeInTheDocument();
  });

  it('avisa (sin bloquear) si la palabra clave añadida a mano es demasiado larga', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puestos: ['Profesora'],
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
    await userEvent.click(screen.getByRole('button', { name: 'Añadir palabra clave' }));

    expect(screen.getByText(fraseLarga)).toBeInTheDocument();
    expect(await screen.findByText(/es larga/)).toBeInTheDocument();
  });

  it('muestra sugerencias de autocompletado mientras se escribe una palabra clave nueva (T87)', async () => {
    render(
      <FormularioPerfil
        perfilInicial={{
          nombre: 'Ana',
          puestos: ['Profesora'],
          palabras_clave: ['docencia'],
          empresas_cv: [],
          titulos_cv: [],
          cv_texto: 'CV',
          usar_experiencia_cv: false,
        }}
      />,
    );

    // Sin análisis previo no hay sugerencias todavía: analiza primero para
    // rellenar `palabrasClaveSugeridas`.
    fetchMock.mockResolvedValue(
      respuesta({
        puesto: 'Profesora',
        puestos_sugeridos: ['Profesora'],
        palabras_clave: ['docencia'],
        palabras_clave_sugeridas: ['tutoría', 'tutoría académica', 'evaluación'],
        empresas_cv: [],
        titulos_cv: [],
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Volver a analizar con la IA' }));
    await screen.findByText('docencia');

    await userEvent.type(screen.getByPlaceholderText('Añadir palabra clave'), 'tuto');

    expect(await screen.findByRole('button', { name: 'tutoría' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tutoría académica' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'evaluación' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'tutoría' }));
    expect(screen.getByText('tutoría')).toBeInTheDocument();
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
      puestos: ['Profesora de secundaria'],
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

  it('envía los puestos marcados dentro de "puestos" (no "puesto")', async () => {
    fetchMock.mockResolvedValue(respuesta({ ok: true }));

    render(<FormularioPerfil perfilInicial={perfilCompleto()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cuerpo.puestos).toEqual(['Profesora de secundaria']);
    expect(cuerpo.puesto).toBeUndefined();
  });

  it('muestra el error del servidor si falla el guardado', async () => {
    fetchMock.mockResolvedValue(respuesta({ error: 'No se pudo guardar el perfil.' }, false));

    render(<FormularioPerfil perfilInicial={perfilCompleto()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('No se pudo guardar el perfil.')).toBeInTheDocument());
  });
});
