'use client';

// Barrera de último recurso (Next 16, `global-error.tsx`): solo se muestra si
// falla el propio `layout.tsx` raíz — por ejemplo si `await getUser()` lanza.
// Sustituye al layout entero, así que tiene que traer sus propias etiquetas
// <html> y <body>, y NO le llegan ni los estilos globales ni la fuente de la
// app: por eso va todo con estilos en línea y un <style> propio (frente 1).

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: '#fafafa',
          color: '#18181b',
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #000 !important; color: #fafafa !important; }
            .ge-boton-secundario { border-color: #3f3f46 !important; color: #e4e4e7 !important; }
          }
        `}</style>
        <main style={{ width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            La aplicación ha tenido un problema
          </h1>
          <p style={{ marginTop: '0.75rem', opacity: 0.75, lineHeight: 1.6 }}>
            Ha fallado algo al arrancar la página. Vuelve a intentarlo; si sigue
            pasando, recarga la pestaña dentro de un rato.
          </p>

          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => retry()}
              style={{
                borderRadius: '0.5rem',
                border: 'none',
                padding: '0.625rem 1.5rem',
                fontWeight: 500,
                fontSize: '1rem',
                cursor: 'pointer',
                background: '#18181b',
                color: '#fff',
              }}
            >
              Volver a intentarlo
            </button>
            {/* `global-error` sustituye al layout raíz: aquí no hay router de
                Next, así que un enlace normal es lo correcto (lo hace también
                el ejemplo de la doc de Next). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="ge-boton-secundario"
              style={{
                borderRadius: '0.5rem',
                border: '1px solid #d4d4d8',
                padding: '0.625rem 1.5rem',
                fontWeight: 500,
                fontSize: '1rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              Volver al inicio
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.5 }}>
              Código del error: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
