// Plantilla del PDF descargable (docs/03-spec.md, historia C4;
// docs/04-plan-tecnico.md §3.6). Se dibuja en el momento de la descarga a
// partir del texto ya generado y guardado en `generaciones` — no se
// almacena ningún archivo.
//
// Diseño sobrio (C4, "sin plantilla recargada"): tipografía Helvetica, la
// que trae @react-pdf/renderer sin tener que incrustar ninguna fuente
// externa (ni coste ni petición de red), márgenes amplios, una sola
// jerarquía de tamaños y un gris suave para lo secundario. Nada de color
// vivo, iconos ni cajas.
//
// El CV y la carta que devuelve la IA (lib/ia.ts, T50) llegan en texto
// plano con una convención fija: una línea entera en MAYÚSCULAS es un
// título de sección, una línea que empieza por "- " es un punto de lista,
// y una línea en blanco separa párrafos. `bloqueTexto` traduce esa
// convención a los elementos de react-pdf.

import { Text, View, StyleSheet } from '@react-pdf/renderer';

// 'Helvetica' es una de las 14 fuentes estándar de PDF: react-pdf la trae
// integrada (con su negrita) sin incrustar ningún archivo, y su
// codificación WinAnsi cubre tildes y "ñ" sin configuración extra.
export const estilos = StyleSheet.create({
  pagina: {
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    lineHeight: 1.45,
    color: '#1f2328',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
  },
  cabeceraTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cabeceraSubtitulo: {
    fontSize: 10,
    color: '#5b6470',
    marginBottom: 18,
  },
  seccionTitulo: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: '#d3d8de',
  },
  parrafo: {
    marginBottom: 6,
  },
  puntoFila: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 2,
  },
  puntoMarca: {
    width: 10,
    color: '#5b6470',
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

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (limpia.length === 0) continue;

    if (esTitulo(limpia)) {
      grupos.push({ tipo: 'titulo', contenido: [limpia] });
    } else if (esPunto(limpia)) {
      const ultimo = grupos[grupos.length - 1];
      const texto = limpia.slice(2).trim();
      if (ultimo?.tipo === 'puntos') {
        ultimo.contenido.push(texto);
      } else {
        grupos.push({ tipo: 'puntos', contenido: [texto] });
      }
    } else {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.tipo === 'parrafo') {
        ultimo.contenido.push(limpia);
      } else {
        grupos.push({ tipo: 'parrafo', contenido: [limpia] });
      }
    }
  }

  return grupos;
}

// Dibuja un bloque de texto plano (CV o carta) con la jerarquía sobria de
// `estilos`. Se usa para las dos piezas del documento (T59 las combina).
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
              <Text style={estilos.puntoMarca}>–</Text>
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
