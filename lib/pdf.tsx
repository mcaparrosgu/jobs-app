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
import type { Idioma } from '@/lib/idioma';

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
  // El contacto (email, teléfono, enlace) va en su propia fila, debajo del
  // puesto: con dos o tres datos de contacto, mezclarlos con el puesto en
  // una sola fila hacía que el ajuste de línea (flexWrap) dejara un "·"
  // suelto al principio de la segunda línea cuando no cabía todo.
  filaContacto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  puesto: {
    fontFamily: 'Jost',
    fontWeight: 600,
    fontSize: 9.5,
    // Tracking contenido: con letterSpacing alto (2+) el hueco entre palabras
    // no se distingue del hueco entre letras y "MARKETING OPERATIONS MANAGER"
    // se lee como un borrón (reportado el 01/09, T83).
    letterSpacing: 1.4,
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
    letterSpacing: 1.5,
    color: GRIS_MUTED,
    marginBottom: 20,
  },
  seccionTitulo: {
    fontFamily: 'Jost',
    fontWeight: 600,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: TINTA,
    marginTop: 24,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 0.75,
    borderBottomColor: GRIS_RAYA,
  },
  parrafo: {
    marginBottom: 10,
  },
  // Cabecera de una entrada de experiencia o formación: empresa/centro en
  // negrita, y debajo el cargo/titulación y el periodo en gris más pequeño.
  // Es lo que da jerarquía visible al CV — sin esto todo salía en el mismo
  // peso y no era presentable (reportado el 01/09, T83).
  entrada: {
    marginTop: 13,
    marginBottom: 6,
  },
  entradaPrincipal: {
    fontFamily: 'Jost',
    fontWeight: 600,
    fontSize: 10.5,
    lineHeight: 1.35,
    color: TINTA,
  },
  entradaMeta: {
    fontFamily: 'Jost',
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.4,
    color: GRIS_MUTED,
  },
  puntoFila: {
    flexDirection: 'row',
    marginBottom: 5,
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
export function agruparLineas(texto: string): { tipo: 'titulo' | 'puntos' | 'parrafo'; contenido: string[] }[] {
  const lineas = texto.split('\n').map((l) => l.trimEnd());
  const grupos: { tipo: 'titulo' | 'puntos' | 'parrafo'; contenido: string[] }[] = [];

  const esPunto = (l: string) => l.trim().startsWith('- ');
  // Un título de sección es una línea entera en mayúsculas. Se excluye la
  // viñeta ("- NEOLAND" puede estar toda en mayúsculas sin ser un título) —
  // por eso `esPunto` se comprueba antes en el bucle, y además aquí.
  const esTitulo = (l: string) => {
    const limpia = l.trim();
    return (
      limpia.length > 0 &&
      !esPunto(limpia) &&
      limpia === limpia.toUpperCase() &&
      /[A-ZÁÉÍÓÚÑ]/.test(limpia)
    );
  };

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

    if (esPunto(limpia)) {
      const ultimo = grupos[grupos.length - 1];
      const texto = limpia.slice(2).trim();
      if (!anteriorEnBlanco && ultimo?.tipo === 'puntos') {
        ultimo.contenido.push(texto);
      } else {
        grupos.push({ tipo: 'puntos', contenido: [texto] });
      }
    } else if (esTitulo(limpia)) {
      grupos.push({ tipo: 'titulo', contenido: [limpia] });
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

export type BloqueCv =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'entrada'; principal: string; meta: string[] }
  | { tipo: 'puntos'; puntos: string[] }
  | { tipo: 'parrafo'; texto: string };

// Secciones cuyo contenido son entradas con fecha (empresa/centro, cargo,
// periodo): dentro de ellas, un grupo de párrafo NO es prosa, es la cabecera
// de una entrada y se dibuja con jerarquía (negrita + gris).
const SECCION_CON_ENTRADAS = /EXPERIEN|FORMACI|EDUCACI|EDUCATION|PROYECT|PROJECT|EMPLOYMENT|TRAYECTORIA/;

// Vocabulario de títulos de sección reales (ES + EN, coincidencia parcial).
// Sirve para distinguir un título de sección de un nombre de empresa o centro
// en mayúsculas ("NEOLAND", "IBM", "BBVA"), que `agruparLineas` también toma
// por título porque su heurística es "línea entera en mayúsculas".
const SECCION_CONOCIDA =
  /EXPERIEN|FORMACI|EDUCACI|EDUCATION|PROYECT|PROJECT|EMPLOYMENT|TRAYECTORIA|PERFIL|RESUMEN|SOBRE M|PROFILE|SUMMARY|ABOUT|HABILIDAD|COMPETENC|SKILL|APTITUD|IDIOMA|LANGUAGE|CERTIFICA|CERTIFICATION|CURSO|COURSE|LOGRO|ACHIEVEMENT|PREMIO|AWARD|PUBLICAC|PUBLICATION|VOLUNTAR|VOLUNTEER|REFERENC|INTERES|INTEREST|CONTACT|TECNOLOG|HERRAMIENTA|TOOL/;

// "Empresa — Cargo — 2019" en una sola línea: si el modelo no separa la
// cabecera en varias líneas, se parte por estos separadores.
const SEPARADOR_ENTRADA = /\s+[—–·|]\s+/;

// Traduce los grupos planos de `agruparLineas` a los bloques del CV, marcando
// las cabeceras de entrada dentro de las secciones de experiencia y
// formación. Pura y exportada para poder probarla sin renderizar el PDF.
export function interpretarCv(texto: string): BloqueCv[] {
  const bloques: BloqueCv[] = [];
  let enSeccionDeEntradas = false;

  const nuevaEntrada = (lineas: string[]) => {
    const partes = [...lineas];
    let principal = (partes.shift() ?? '').trim();
    if (SEPARADOR_ENTRADA.test(principal)) {
      const trozos = principal.split(SEPARADOR_ENTRADA);
      principal = trozos.shift()!.trim();
      partes.unshift(trozos.join('  ·  ').trim());
    }
    bloques.push({ tipo: 'entrada', principal, meta: partes.map((m) => m.trim()).filter(Boolean) });
  };

  for (const grupo of agruparLineas(texto)) {
    const anterior = bloques[bloques.length - 1];

    if (grupo.tipo === 'titulo') {
      const texto = grupo.contenido[0];
      if (SECCION_CONOCIDA.test(texto.toUpperCase())) {
        enSeccionDeEntradas = SECCION_CON_ENTRADAS.test(texto.toUpperCase());
        bloques.push({ tipo: 'titulo', texto });
      } else if (enSeccionDeEntradas) {
        // Un nombre en mayúsculas que no es una sección conocida: es la
        // empresa o el centro de una entrada.
        nuevaEntrada([texto]);
      } else {
        bloques.push({ tipo: 'titulo', texto });
      }
      continue;
    }

    if (grupo.tipo === 'puntos') {
      bloques.push({ tipo: 'puntos', puntos: grupo.contenido });
      continue;
    }

    if (!enSeccionDeEntradas) {
      bloques.push({ tipo: 'parrafo', texto: grupo.contenido.join(' ') });
      continue;
    }

    // Párrafo dentro de una sección de entradas. Si el bloque anterior es una
    // cabecera de entrada que aún no tiene cargo ni fecha (salió de una línea
    // en mayúsculas), estas líneas son su cargo/periodo.
    if (anterior?.tipo === 'entrada' && anterior.meta.length === 0) {
      anterior.meta.push(...grupo.contenido.map((m) => m.trim()).filter(Boolean));
    } else {
      nuevaEntrada(grupo.contenido);
    }
  }

  return bloques;
}

// La carta que genera la IA (lib/ia.ts) suele terminar en la despedida
// ("Atentamente", "Sincerely") sin el nombre debajo, y el documento queda
// como cortado. Si el tramo final de la carta no menciona ya el nombre, se
// añade en su propia línea.
export function cartaConFirma(cartaTexto: string, nombre: string): string {
  const nombreLimpio = nombre.trim();
  if (nombreLimpio.length === 0) return cartaTexto;
  const cola = cartaTexto.trimEnd().slice(-160).toLowerCase();
  if (cola.includes(nombreLimpio.toLowerCase())) return cartaTexto;
  return `${cartaTexto.trimEnd()}\n\n${nombreLimpio}`;
}

function listaDePuntos(puntos: string[], key: number) {
  return (
    <View key={key}>
      {puntos.map((punto, j) => (
        <View key={j} style={estilos.puntoFila}>
          <Text style={estilos.puntoMarca}>›</Text>
          <Text style={estilos.puntoTexto}>{punto}</Text>
        </View>
      ))}
    </View>
  );
}

// Dibuja un bloque de texto (CV o carta) con la jerarquía elegante de
// `estilos`.
//
// `estructurada` (el CV): interpreta las secciones de experiencia y formación
// como entradas con cabecera en negrita — empresa/centro arriba, cargo y
// periodo debajo en gris. Sin ella (la carta) se dibuja el texto corrido de
// siempre: títulos, viñetas y párrafos.
//
// `omitirTituloInicial`: el CV que devuelve la IA suele abrir con el puesto
// en mayúsculas, que el masthead ya muestra bajo el nombre. Si el primer
// bloque es un título igual a ese puesto se descarta, para no repetirlo. Solo
// el primero y solo si coincide exactamente: las secciones legítimas
// ("PERFIL", "EXPERIENCIA"…) no se tocan.
export function bloqueTexto(
  texto: string,
  opciones: { omitirTituloInicial?: string; estructurada?: boolean } = {},
) {
  const omitir = opciones.omitirTituloInicial?.trim().toUpperCase();

  if (opciones.estructurada) {
    let bloques = interpretarCv(texto);
    if (omitir && bloques[0]?.tipo === 'titulo' && bloques[0].texto.trim().toUpperCase() === omitir) {
      bloques = bloques.slice(1);
    }
    return bloques.map((bloque, i) => {
      if (bloque.tipo === 'titulo') {
        return (
          <Text key={i} style={estilos.seccionTitulo}>
            {bloque.texto}
          </Text>
        );
      }
      if (bloque.tipo === 'entrada') {
        return (
          <View key={i} style={estilos.entrada} wrap={false}>
            <Text style={estilos.entradaPrincipal}>{bloque.principal}</Text>
            {bloque.meta.map((linea, j) => (
              <Text key={j} style={estilos.entradaMeta}>
                {linea}
              </Text>
            ))}
          </View>
        );
      }
      if (bloque.tipo === 'puntos') {
        return listaDePuntos(bloque.puntos, i);
      }
      return (
        <Text key={i} style={estilos.parrafo}>
          {bloque.texto}
        </Text>
      );
    });
  }

  const grupos = agruparLineas(texto);
  const visibles =
    omitir &&
    grupos[0]?.tipo === 'titulo' &&
    grupos[0].contenido[0].trim().toUpperCase() === omitir
      ? grupos.slice(1)
      : grupos;
  return visibles.map((grupo, i) => {
    if (grupo.tipo === 'titulo') {
      return (
        <Text key={i} style={estilos.seccionTitulo}>
          {grupo.contenido[0]}
        </Text>
      );
    }
    if (grupo.tipo === 'puntos') {
      return listaDePuntos(grupo.contenido, i);
    }
    return (
      <Text key={i} style={estilos.parrafo}>
        {grupo.contenido.join(' ')}
      </Text>
    );
  });
}

// El masthead del CV: nombre real de la candidata (imprescindible para que
// un ATS identifique de quién es el documento), el puesto al que aspira y,
// debajo, su email — nada de franjas laterales ni texto girado que puedan
// desordenar la lectura automática. Teléfono y LinkedIn se quitaron
// (migración 0016): suelen venir ya en el cuerpo del CV que se pega, y
// pedirlos aparte solo añadía fricción al formulario.
//
// El puesto va en su propia fila, separado del contacto: así el ajuste de
// línea (flexWrap) de cada fila no interfiere con el de la otra.
function Masthead({
  nombre,
  puesto,
  email,
}: {
  nombre: string;
  puesto: string;
  email: string;
}) {
  const contacto = [email].filter((valor) => valor.trim().length > 0);

  return (
    <View>
      {nombre.trim().length > 0 && <Text style={estilos.nombre}>{nombre}</Text>}
      {puesto.trim().length > 0 && (
        <Text style={[estilos.puesto, { marginTop: 14 }]}>{puesto.toUpperCase()}</Text>
      )}
      {contacto.length > 0 && (
        <View style={estilos.filaContacto}>
          {contacto.map((valor, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              {i > 0 && <Text style={estilos.separador}>·</Text>}
              <Text style={estilos.email}>{valor}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={estilos.rayaCabecera} />
    </View>
  );
}

// La única etiqueta fija del documento (todo lo demás sale del texto ya
// generado en el idioma de la oferta, lib/ia.ts). Tiene que seguir ese mismo
// idioma o el documento queda con los títulos en uno y el contenido en otro
// — el fallo que reportó Mar sobre "Global Marketing Operations Manager":
// esta etiqueta estaba fija en castellano pase lo que pase.
const ETIQUETA_CARTA: Record<Idioma, string> = {
  es: 'CARTA DE PRESENTACIÓN',
  en: 'COVER LETTER',
};

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
  idioma = 'es',
}: {
  cvTexto: string;
  cartaTexto: string;
  nombre?: string;
  puesto?: string;
  email?: string;
  idioma?: Idioma;
}) {
  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.rayaVertical} fixed />
        <Masthead nombre={nombre} puesto={puesto} email={email} />
        {bloqueTexto(cvTexto, { omitirTituloInicial: puesto, estructurada: true })}
      </Page>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.rayaVertical} fixed />
        <Text style={estilos.etiquetaCarta}>{ETIQUETA_CARTA[idioma]}</Text>
        {bloqueTexto(cartaConFirma(cartaTexto, nombre))}
      </Page>
    </Document>
  );
}
