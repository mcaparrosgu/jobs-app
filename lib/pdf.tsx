// Plantilla del PDF descargable (docs/03-spec.md, historia C4;
// docs/04-plan-tecnico.md §3.6). Se dibuja en el momento de la descarga a
// partir del texto ya generado y guardado en `generaciones` — no se
// almacena ningún archivo.
//
// Diseño elegante y a prueba de ATS (rediseño tras revisión de Mar sobre la
// primera versión, ver knowledge/decision-diseno-pdf.md): una sola columna
// de lectura de arriba abajo, texto real seleccionable (nunca imágenes ni
// tablas), y el nombre de la candidata en la primera línea — lo que
// cualquier lector automático de currículums espera encontrar ahí. El
// aspecto "revista minimalista" (serif elegante para el nombre, mayúsculas
// espaciadas para las secciones, flechas finas como viñetas, mucho blanco)
// viene de una plantilla de referencia que Mar señaló, adaptada para que
// nada de eso dependa de columnas paralelas ni de texto girado: ambas cosas
// hacen que un ATS mezcle el orden de lectura.
//
// El CV y la carta que devuelve la IA (lib/ia.ts, T50) llegan en texto
// plano con una convención fija: una línea entera en MAYÚSCULAS es un
// título de sección, una línea que empieza por "- " es un punto de lista,
// y una línea en blanco separa párrafos. `bloqueTexto` traduce esa
// convención a los elementos de react-pdf.

import path from 'path';
import { Document, Page, Text, View, Font, StyleSheet } from '@react-pdf/renderer';

// Playfair Display (nombre) y Jost (todo lo demás): las dos son fuentes
// libres de Google Fonts (licencia SIL OFL, ver public/fonts/LICENCIA.txt),
// incrustadas desde public/ para que el archivo exista siempre en el
// despliegue de Vercel, sin depender de rutas internas de node_modules.
const FUENTES = path.join(process.cwd(), 'public/fonts');

Font.register({
  family: 'Playfair Display',
  fonts: [{ src: path.join(FUENTES, 'playfair-display-700.woff'), fontWeight: 700 }],
});
Font.register({
  family: 'Jost',
  fonts: [
    { src: path.join(FUENTES, 'jost-400.woff'), fontWeight: 400 },
    { src: path.join(FUENTES, 'jost-600.woff'), fontWeight: 600 },
  ],
});

const TINTA = '#1e1e1c';
const GRIS_TEXTO = '#33322f';
const GRIS_MUTED = '#736f66';
const GRIS_RAYA = '#dcd8d0';

export const estilos = StyleSheet.create({
  pagina: {
    fontFamily: 'Jost',
    fontWeight: 400,
    fontSize: 10,
    lineHeight: 1.6,
    color: GRIS_TEXTO,
    paddingTop: 50,
    paddingBottom: 50,
    paddingLeft: 64,
    paddingRight: 56,
  },
  // Raya vertical decorativa en el margen izquierdo: un guiño al carril
  // lateral de la plantilla de referencia, pero sin texto dentro — así no
  // hay nada que un lector automático pueda leer en un orden extraño.
  rayaVertical: {
    position: 'absolute',
    top: 50,
    bottom: 50,
    left: 40,
    width: 1.5,
    backgroundColor: GRIS_RAYA,
  },
  nombre: {
    fontFamily: 'Playfair Display',
    fontWeight: 700,
    fontSize: 25,
    lineHeight: 1.15,
    color: TINTA,
  },
  filaSubtitulo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  puesto: {
    fontFamily: 'Jost',
    fontWeight: 600,
    fontSize: 9.5,
    letterSpacing: 2,
    color: GRIS_MUTED,
  },
  separador: {
    fontSize: 9.5,
    color: GRIS_RAYA,
    marginHorizontal: 8,
  },
  email: {
    fontFamily: 'Jost',
    fontWeight: 400,
    fontSize: 9.5,
    color: GRIS_MUTED,
  },
  rayaCabecera: {
    marginTop: 16,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: TINTA,
  },
  etiquetaCarta: {
    fontFamily: 'Jost',
    fontWeight: 600,
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: GRIS_MUTED,
    marginBottom: 20,
  },
  seccionTitulo: {
    fontFamily: 'Jost',
    fontWeight: 600,
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: TINTA,
    marginTop: 22,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 0.75,
    borderBottomColor: GRIS_RAYA,
  },
  parrafo: {
    marginBottom: 10,
  },
  puntoFila: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  puntoMarca: {
    width: 14,
    fontFamily: 'Jost',
    fontWeight: 600,
    color: GRIS_MUTED,
  },
  puntoTexto: {
    flex: 1,
  },
});

// Une líneas sueltas en párrafos, listas de puntos y títulos de sección,
// respetando el orden en que llegan.
function agruparLineas(texto: string): { tipo: 'titulo' | 'puntos' | 'parrafo'; contenido: string[] }[] {
  const lineas = texto.split('\n').map((l) => l.trimEnd());
  const grupos: { tipo: 'titulo' | 'puntos' | 'parrafo'; contenido: string[] }[] = [];

  const esTitulo = (l: string) => {
    const limpia = l.trim();
    return limpia.length > 0 && limpia === limpia.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(limpia);
  };
  const esPunto = (l: string) => l.trim().startsWith('- ');

  // Una línea en blanco corta la continuidad: aunque la siguiente línea sea
  // del mismo tipo que la anterior, empieza un grupo nuevo en vez de
  // fundirse con él (si no, dos párrafos distintos separados a propósito
  // acababan pegados en uno solo).
  let anteriorEnBlanco = true;

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (limpia.length === 0) {
      anteriorEnBlanco = true;
      continue;
    }

    if (esTitulo(limpia)) {
      grupos.push({ tipo: 'titulo', contenido: [limpia] });
    } else if (esPunto(limpia)) {
      const ultimo = grupos[grupos.length - 1];
      const texto = limpia.slice(2).trim();
      if (!anteriorEnBlanco && ultimo?.tipo === 'puntos') {
        ultimo.contenido.push(texto);
      } else {
        grupos.push({ tipo: 'puntos', contenido: [texto] });
      }
    } else {
      const ultimo = grupos[grupos.length - 1];
      if (!anteriorEnBlanco && ultimo?.tipo === 'parrafo') {
        ultimo.contenido.push(limpia);
      } else {
        grupos.push({ tipo: 'parrafo', contenido: [limpia] });
      }
    }
    anteriorEnBlanco = false;
  }

  return grupos;
}

// Dibuja un bloque de texto plano (CV o carta) con la jerarquía elegante de
// `estilos`. Se usa para las dos piezas del documento.
export function bloqueTexto(texto: string) {
  return agruparLineas(texto).map((grupo, i) => {
    if (grupo.tipo === 'titulo') {
      return (
        <Text key={i} style={estilos.seccionTitulo}>
          {grupo.contenido[0]}
        </Text>
      );
    }
    if (grupo.tipo === 'puntos') {
      return (
        <View key={i}>
          {grupo.contenido.map((punto, j) => (
            <View key={j} style={estilos.puntoFila}>
              <Text style={estilos.puntoMarca}>›</Text>
              <Text style={estilos.puntoTexto}>{punto}</Text>
            </View>
          ))}
        </View>
      );
    }
    return (
      <Text key={i} style={estilos.parrafo}>
        {grupo.contenido.join(' ')}
      </Text>
    );
  });
}

// El masthead del CV: nombre real de la candidata (imprescindible para que
// un ATS identifique de quién es el documento), el puesto al que aspira y
// su email, en una sola línea corta — nada de franjas laterales ni texto
// girado que puedan desordenar la lectura automática.
function Masthead({ nombre, puesto, email }: { nombre: string; puesto: string; email: string }) {
  const detalles = [puesto, email].filter((valor) => valor.trim().length > 0);

  return (
    <View>
      {nombre.trim().length > 0 && <Text style={estilos.nombre}>{nombre}</Text>}
      {detalles.length > 0 && (
        <View style={estilos.filaSubtitulo}>
          {detalles.map((valor, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              {i > 0 && <Text style={estilos.separador}>·</Text>}
              <Text style={i === 0 && puesto ? estilos.puesto : estilos.email}>
                {i === 0 && puesto ? valor.toUpperCase() : valor}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={estilos.rayaCabecera} />
    </View>
  );
}

// El CV y la carta, como un único PDF descargable (historia C4). Cada texto
// va en su propio `<Page>`: react-pdf reparte el contenido de una misma
// `<Page>` en tantas páginas físicas como haga falta si se desborda
// (comportamiento por defecto, `wrap`), así que el CV puede ocupar una o
// varias páginas sin que la carta se mueva — al vivir en su propio `<Page>`,
// siempre empieza en una página nueva, sin importar cuánto ocupe el CV.
export function DocumentoGeneracion({
  cvTexto,
  cartaTexto,
  nombre = '',
  puesto = '',
  email = '',
}: {
  cvTexto: string;
  cartaTexto: string;
  nombre?: string;
  puesto?: string;
  email?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.rayaVertical} fixed />
        <Masthead nombre={nombre} puesto={puesto} email={email} />
        {bloqueTexto(cvTexto)}
      </Page>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.rayaVertical} fixed />
        <Text style={estilos.etiquetaCarta}>CARTA DE PRESENTACIÓN</Text>
        {bloqueTexto(cartaTexto)}
      </Page>
    </Document>
  );
}
