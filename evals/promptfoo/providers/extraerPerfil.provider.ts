// Proveedor de Promptfoo para el Prompt A (extraerPerfil).
//
// No reimplementa el prompt: llama directamente a la función real de
// lib/ia.ts, para que el eval pruebe el mismo camino de código que corre en
// producción (prompt + validación de lib/ia.ts + normalizarPalabrasClave de
// lib/palabras-clave.ts), no una copia que se puede desincronizar.

import type { ApiProvider, ProviderResponse, CallApiContextParams } from 'promptfoo';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');

// `lib/ia.ts` lee las claves de API de `process.env` en cuanto se importa
// (son `const` de módulo). Por eso el entorno tiene que estar cargado ANTES
// de ese `import`, y por eso el import de `lib/ia` es dinámico (dentro de
// `callApi`) en vez de estático arriba del fichero: un `import` estático se
// adelanta (hoisting) a cualquier otra línea, y `process.env` llegaría vacío.
function asegurarEntorno(): void {
  if (process.env.OPENROUTER_API_KEY && process.env.GROQ_API_KEY) return;
  try {
    // Node 20.6+. Jobs App corre en Node 24 (ver package.json / entorno).
    process.loadEnvFile(path.join(repoRoot, '.env.local'));
  } catch {
    // Fichero ausente o Node antiguo: la llamada de más abajo fallará con un
    // error explícito ("apiKey" vacía) en vez de fallar aquí en silencio.
  }
}

export default class ExtraerPerfilProvider implements ApiProvider {
  id(): string {
    return 'extraerPerfil (lib/ia.ts real)';
  }

  async callApi(_prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    asegurarEntorno();
    const { extraerPerfil } = await import('../../../lib/ia');

    const cvTexto = (context?.vars?.cv_texto as string) ?? '';

    try {
      const perfil = await extraerPerfil(cvTexto);
      return { output: perfil };
    } catch (error) {
      // Un error controlado (p. ej. CV vacío, A12) es un resultado válido a
      // evaluar, no un fallo del arnés: se devuelve como salida para que las
      // aserciones puedan comprobar que el fallo fue "limpio" y no inventado.
      return {
        output: { error: true, mensaje: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}
