// T60 · El endpoint de descarga (docs/01-historias.md, historia C4).
//
// `[id]` es el id de la OFERTA, el mismo que usa el resto de la app
// (components/TarjetaOferta.tsx), no el id de la fila de `generaciones`:
// así el botón de descarga (T61) no necesita saber nada nuevo, solo
// enlazar a /api/descargar/{oferta.id}.
//
// El PDF se dibuja en el momento de la petición, con lib/pdf.tsx — no hay
// ningún archivo guardado en ningún sitio (docs/04-plan-tecnico.md §3.6).

import { renderToBuffer } from '@react-pdf/renderer';
import { DocumentoGeneracion } from '@/lib/pdf';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ofertaId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('No has iniciado sesión', { status: 401 });
  }

  // RLS ya limita esta fila a las de `user_id = user.id`; el .eq de aquí es
  // además la forma de pedir la oferta concreta, no una capa de seguridad
  // extra.
  const [{ data: generacion, error }, { data: perfil }] = await Promise.all([
    supabase
      .from('generaciones')
      .select('estado, cv_texto, carta_texto, ofertas(titulo)')
      .eq('user_id', user.id)
      .eq('oferta_id', ofertaId)
      .maybeSingle(),
    supabase.from('perfiles').select('nombre, puesto').eq('user_id', user.id).maybeSingle(),
  ]);

  if (error) {
    console.error('Error leyendo la generación para descargar:', error);
    return new Response('No se pudo preparar la descarga.', { status: 500 });
  }

  if (!generacion || generacion.estado !== 'listo' || !generacion.cv_texto || !generacion.carta_texto) {
    return new Response('El documento todavía no está listo.', { status: 404 });
  }

  const pdf = await renderToBuffer(
    DocumentoGeneracion({
      cvTexto: generacion.cv_texto,
      cartaTexto: generacion.carta_texto,
      nombre: perfil?.nombre ?? '',
      puesto: perfil?.puesto ?? '',
      email: user.email ?? '',
    }),
  );

  const oferta = Array.isArray(generacion.ofertas) ? generacion.ofertas[0] : generacion.ofertas;
  const nombreArchivo = nombreDeArchivo(oferta?.titulo);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cv-carta.pdf"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`,
    },
  });
}

// "CV y carta - Puesto de la oferta.pdf", sin caracteres que puedan romper
// el nombre de archivo en algún sistema operativo.
function nombreDeArchivo(tituloOferta: string | undefined): string {
  const base = tituloOferta ? `CV y carta - ${tituloOferta}` : 'CV y carta';
  return `${base.replace(/[\\/:*?"<>|]/g, '')}.pdf`;
}
