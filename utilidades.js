// Fechas, horas y formato de números en castellano (es-AR).
// No usan la página, así que también se pueden probar con Node.

export const r2 = n => Math.round(n * 100) / 100;
export const pad = n => String(n).padStart(2, '0');
export const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const fromISO = s => new Date(s + 'T12:00:00');
export const hoy = () => toISO(new Date());
export const addDays = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const dow = s => fromISO(s).getDay();
export const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isHM = s => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
export const toMin = s => { if (!isHM(s)) return null; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const ahoraHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
export const lunesDe = s => { const w = dow(s); return addDays(s, w === 0 ? -6 : 1 - w); };
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const INI = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const dm = s => (+s.slice(8)) + '/' + (+s.slice(5, 7));
export const fCorta = s => DIAS3[dow(s)] + ' ' + dm(s);
export const fLarga = s => DIAS[dow(s)] + ' ' + dm(s);
export const fFull = s => (+s.slice(8)) + '/' + (+s.slice(5, 7)) + '/' + s.slice(0, 4);
export const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
export const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
export const nfd = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
export const m0 = n => '$ ' + nf0.format(Math.round(n || 0));
export const m2 = n => '$ ' + nf2.format(n || 0);
export const hDec = m => nf2.format((m || 0) / 60) + ' h';
export const hTxt = m => { m = Math.round(m || 0); const h = Math.floor(m / 60), r = m % 60; if (!r) return h + ' h'; return h ? h + ' h ' + r + ' min' : r + ' min'; };
export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export function parseNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').replace(/[\s$ ]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', '');
  return Number(s);
}
export const fmtPct = n => nfd.format(n);
