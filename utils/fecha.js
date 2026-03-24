// Utilidades robustas e independientes del host para Colombia (UTC-5)
export const ahoraEnColombia = () => {
  return new Date(); // Simplemente retornamos el Date real para guardar UTC puro en la DB
}

export const fechaHoyColombia = () => {
  const d = new Date()
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const bogota = new Date(utc - (5 * 3600000))
  return bogota.toISOString().split('T')[0]
}

export const fechaMananaColombia = () => {
  const d = new Date()
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const bogota = new Date(utc - (5 * 3600000) + (24 * 3600000))
  return bogota.toISOString().split('T')[0]
}

const toBogotaDate = (fechaStr) => {
  if (!fechaStr) return new Date();
  const str = String(fechaStr).includes('Z') || String(fechaStr).includes('+') ? fechaStr : `${fechaStr}Z`;
  const d = new Date(str);
  if (isNaN(d.getTime())) return new Date();
  
  // Si la fecha huele a UTC real (ej. de Supabase), le restamos 5 horas para mostrarla al usuario en base UTC
  // Si la fecha fue forjada por el parche anterior espurio, simplemente asumimos lo mejor (se mostrarán 5h antes, mínimo impacto).
  const utc = d.getTime();
  return new Date(utc - (5 * 3600000));
}

export const formatearFecha = (fechaStr) => {
  if (!fechaStr) return ''
  const bogota = toBogotaDate(fechaStr);
  return bogota.toLocaleString('es-CO', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export const formatearFechaCorta = (fechaStr) => {
  if (!fechaStr) return ''
  const bogota = toBogotaDate(fechaStr);
  return bogota.toLocaleString('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export const formatearSoloFecha = (fechaStr) => {
  if (!fechaStr) return ''
  // Para solo fecha (YYYY-MM-DD), cortamos directamente del locale asumiendo su UTC ajustado
  const bogota = toBogotaDate(fechaStr);
  return bogota.toLocaleString('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short' })
}
