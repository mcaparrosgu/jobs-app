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
