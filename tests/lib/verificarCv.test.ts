import { describe, expect, it } from 'vitest';
import { verificarCv, type DatosDeVerificacion } from '@/lib/verificarCv';

const BASE: DatosDeVerificacion = {
  cvGenerado: '',
  cvOriginal: '',
  empresasCv: [],
  titulosCv: [],
  ofertaTitulo: '',
  ofertaEmpresa: '',
  ofertaDescripcion: null,
};

describe('verificarCv — cifras (T54)', () => {
  it('no avisa de ninguna cifra si el CV generado no menciona ninguna nueva', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Gestioné un equipo de 12 personas durante 3 años.',
      cvGenerado: 'Lideré un equipo de 12 personas a lo largo de 3 años de trayectoria.',
    });
    expect(avisos).toEqual([]);
  });

  it('caza una cifra inventada que no aparece en el CV original', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Responsable de atención al cliente en una tienda.',
      cvGenerado: 'Aumenté las ventas un 30% gestionando un equipo de 47 personas.',
    });
    expect(avisos.some((a) => a.includes('30'))).toBe(true);
    expect(avisos.some((a) => a.includes('47'))).toBe(true);
  });

  it('trata "1.500" y "1,500" como el mismo número (formato europeo vs americano)', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Gestioné una cartera de 1.500 clientes.',
      cvGenerado: 'Cartera de 1,500 clientes gestionada con éxito.',
    });
    expect(avisos).toEqual([]);
  });

  it('no avisa por fechas o números que sí están en el original, aunque cambie el formato', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Empresa X, 2019 - 2022.',
      cvGenerado: 'Trabajé en Empresa X entre 2019 y 2022.',
    });
    expect(avisos).toEqual([]);
  });
});

describe('verificarCv — nombres propios (T55)', () => {
  it('caza un nombre de empresa inventado que no está en el CV original ni en empresas_cv', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Trabajé como gestora de proyectos en varias empresas del sector.',
      cvGenerado: 'Experiencia previa. Trabajé en Zumbatrónica Ibérica gestionando equipos internacionales.',
      empresasCv: [],
    });
    expect(avisos.some((a) => a.includes('Zumbatrónica'))).toBe(true);
  });

  it('no avisa de una empresa real que está en empresas_cv aunque no esté en el texto del CV pegado', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Trabajé como gestora de proyectos en varias empresas del sector.',
      cvGenerado: 'Experiencia previa. Trabajé en Acme Consulting gestionando equipos.',
      empresasCv: ['Acme Consulting'],
    });
    expect(avisos).toEqual([]);
  });

  it('no avisa de una titulación que está en titulos_cv', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Graduada en Administración de Empresas.',
      cvGenerado: 'Formación. Graduada en Administración y Dirección Universidad Complutense.',
      titulosCv: ['Universidad Complutense'],
    });
    expect(avisos.some((a) => a.includes('Complutense'))).toBe(false);
  });

  it('no avisa del nombre de la empresa de la oferta ni de su título', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Busco un puesto de atención al cliente.',
      cvGenerado: 'Motivación. Quiero aportar mi experiencia a Globex Corporation en su equipo.',
      ofertaEmpresa: 'Globex Corporation',
      ofertaTitulo: 'Atención al cliente',
    });
    expect(avisos).toEqual([]);
  });

  it('no avisa de la primera palabra de una frase aunque vaya en mayúscula y no esté en el original', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Busco un puesto de atención al cliente en remoto.',
      cvGenerado: 'Perfil. Diseñé procesos de atención al cliente en remoto.',
    });
    expect(avisos.some((a) => a.includes('Diseñé'))).toBe(false);
  });

  it('no avisa de palabras en TODO MAYÚSCULAS (son títulos de sección, no nombres propios)', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Con experiencia en atención al cliente.',
      cvGenerado: 'EXPERIENCIA PROFESIONAL\nCon experiencia en atención al cliente.',
    });
    expect(avisos.some((a) => a.includes('PROFESIONAL'))).toBe(false);
  });

  it('no avisa de meses, días o idiomas comunes (lista de mayúsculas inocentes)', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Trabajé en un puesto de atención al cliente.',
      cvGenerado: 'Experiencia. Trabajé desde Enero hasta Diciembre, con nivel de Inglés bilingüe.',
    });
    expect(avisos).toEqual([]);
  });

  it('ignora palabras cortas (menos de 4 letras) aunque empiecen en mayúscula', () => {
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Con experiencia comercial.',
      cvGenerado: 'Perfil. Con Sol experiencia comercial.',
    });
    expect(avisos.some((a) => a.includes('Sol'))).toBe(false);
  });
});

describe('verificarCv — límites', () => {
  it('nunca devuelve más de 6 avisos', () => {
    const cifrasInventadas = Array.from({ length: 5 }, (_, i) => `${100 + i}`).join(' y ');
    const nombresInventados = ['Zumbatronica', 'Globorama', 'Innovatek', 'Contoso', 'Umbrella'].join(', ');
    const avisos = verificarCv({
      ...BASE,
      cvOriginal: 'Un CV muy escueto sin cifras ni nombres.',
      cvGenerado: `Cifras: ${cifrasInventadas}. Empresas: ${nombresInventados}.`,
    });
    expect(avisos.length).toBeLessThanOrEqual(6);
  });

  it('un CV generado idéntico al original no produce ningún aviso', () => {
    const texto = 'Trabajé en Acme Corp como analista durante 5 años, gestionando un presupuesto de 10000 euros.';
    const avisos = verificarCv({ ...BASE, cvOriginal: texto, cvGenerado: texto, empresasCv: ['Acme Corp'] });
    expect(avisos).toEqual([]);
  });

  it('no revienta con textos vacíos', () => {
    expect(() => verificarCv({ ...BASE, cvOriginal: '', cvGenerado: '' })).not.toThrow();
    expect(verificarCv({ ...BASE, cvOriginal: '', cvGenerado: '' })).toEqual([]);
  });
});
