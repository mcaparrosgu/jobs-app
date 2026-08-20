// Proveedor de Promptfoo para el Prompt B (generarCvYCarta). Ver
// extraerPerfil.provider.ts para el porqué del import dinámico.

import type { ApiProvider, ProviderResponse, CallApiContextParams } from 'promptfoo';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');

function asegurarEntorno(): void {
  if (process.env.OPENROUTER_API_KEY && process.env.GROQ_API_KEY) return;
  try {
    process.loadEnvFile(path.join(repoRoot, '.env.local'));
  } catch {
    // Ver extraerPerfil.provider.ts.
  }
}

type OfertaVar = { titulo: string; empresa: string; descripcion: string | null };

export default class GenerarCvYCartaProvider implements ApiProvider {
  id(): string {
    return 'generarCvYCarta (lib/ia.ts real)';
  }

  async callApi(_prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    asegurarEntorno();
    const { generarCvYCarta } = await import('../../../lib/ia');

    const cvTexto = (context?.vars?.cv_texto as string) ?? '';
    const puestoPerfil = (context?.vars?.puesto_perfil as string) ?? '';
    const oferta = (context?.vars?.oferta as OfertaVar) ?? { titulo: '', empresa: '', descripcion: null };

    try {
      const generado = await generarCvYCarta(cvTexto, puestoPerfil, oferta);
      return { output: generado };
    } catch (error) {
      return {
        output: { error: true, mensaje: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}
