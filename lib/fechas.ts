// Fechas en hora de España, sin librerías externas.
//
// Hace falta en dos sitios: para saber si ya ha corrido la renovación de
// ofertas de hoy (Hito 5) y para contar cuántas generaciones lleva la usuaria
// hoy, que es el límite de 5 al día de la regla de negocio 5 (T56).
//
// "Hoy" tiene que significar lo mismo para las dos cosas, y tiene que ser el
// día natural español: si se usara la hora del servidor (que está en UTC), en
// verano el contador se reiniciaría a las dos de la madrugada.

// Instante (UTC) de la medianoche de hoy en hora de España, calculado a
// partir de las horas transcurridas desde esa medianoche — funciona igual
// en horario de invierno y de verano.
export function inicioDeHoyEnMadridISO(): string {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    // h23 explícito: sin esto, algunos entornos devuelven "24" en lugar de
    // "00" durante la primera hora del día y el cálculo se iría un día atrás.
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(ahora);
  const obtener = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const horasTranscurridas = obtener('hour') + obtener('minute') / 60 + obtener('second') / 3600;
  return new Date(ahora.getTime() - horasTranscurridas * 3600 * 1000).toISOString();
}

// Añadido el 23/08/2026 (T85): instante (UTC) de la medianoche de hace
// `dias` días, en hora de España — la caducidad visual de las ofertas
// (docs/03-spec.md, regla de negocio nueva): una oferta encontrada antes de
// ese instante deja de mostrarse, aunque siga coincidiendo con el perfil.
// Se apoya en `inicioDeHoyEnMadridISO` para heredar el mismo cálculo de
// medianoche correcto en invierno y verano.
export function haceDiasEnMadridISO(dias: number): string {
  const inicioDeHoy = new Date(inicioDeHoyEnMadridISO()).getTime();
  return new Date(inicioDeHoy - dias * 24 * 3600 * 1000).toISOString();
}

// Añadido el 23/08/2026 (T85): la fecha (solo día, sin hora) de un instante
// ISO, tal como cae en el calendario de Madrid — es la clave con la que se
// agrupan las ofertas bajo un mismo separador visual en /ofertas. "en-CA"
// devuelve directamente el formato AAAA-MM-DD, sin tener que reordenar nada.
export function diaEnMadrid(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(iso));
}

// Añadido el 23/08/2026 (T85): la misma fecha, pero como la lee una persona
// ("hoy", "ayer" o "10 de agosto de 2026") — el texto del separador visual
// entre tandas de ofertas en /ofertas.
export function etiquetaDiaEnMadrid(iso: string): string {
  const dia = diaEnMadrid(iso);
  const hoy = diaEnMadrid(new Date().toISOString());
  const ayer = diaEnMadrid(haceDiasEnMadridISO(1));

  if (dia === hoy) return 'Encontradas hoy';
  if (dia === ayer) return 'Encontradas ayer';

  const fecha = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
  return `Encontradas el ${fecha}`;
}
