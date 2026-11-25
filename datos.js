// Formato de los datos guardados: validación al cargar y unión de dos copias.
import { isISO, isHM } from './utilidades.js';

export function emptyState() {
  return { v: 1, mod: 0, turnos: {}, borrados: {}, activo: null, activoMod: 0, ajustes: {}, ajustesMod: 0, tarifas: {}, recibos: {}, ultimaCopia: 0 };
}
export const TIPOS = ['trabajo', 'enfermedad', 'feriado', 'falta'];
export function normalize(raw) {
  const s = emptyState();
  if (!raw || typeof raw !== 'object') return s;
  s.mod = +raw.mod || 0;
  const T = raw.turnos && typeof raw.turnos === 'object' ? raw.turnos : {};
  for (const [id, t] of Object.entries(T)) {
    if (!t || typeof t !== 'object' || !isISO(t.fecha)) continue;
    s.turnos[id] = {
      id, fecha: t.fecha, tipo: TIPOS.includes(t.tipo) ? t.tipo : 'trabajo',
      entrada: isHM(t.entrada) ? t.entrada : '', salida: isHM(t.salida) ? t.salida : '',
      pausa: Math.max(0, Math.min(600, +t.pausa || 0)),
      feriado: t.feriado === true || t.feriado === false ? t.feriado : null,
      te: isHM(t.te) ? t.te : '', ts: isHM(t.ts) ? t.ts : '',
      nota: String(t.nota || '').slice(0, 300), mod: +t.mod || 0
    };
  }
  for (const [k, v] of Object.entries(raw.borrados || {})) s.borrados[k] = +v || 0;
  s.activo = raw.activo && isISO(raw.activo.fecha) && isHM(raw.activo.entrada) ? { fecha: raw.activo.fecha, entrada: raw.activo.entrada } : null;
  s.activoMod = +raw.activoMod || 0;
  s.ajustes = raw.ajustes && typeof raw.ajustes === 'object' ? { ...raw.ajustes } : {};
  s.ajustesMod = +raw.ajustesMod || 0;
  for (const [k, v] of Object.entries(raw.tarifas || {})) if (v && typeof v === 'object' && isISO(k)) s.tarifas[k] = { ...v };
  for (const [k, v] of Object.entries(raw.recibos || {})) if (v && typeof v === 'object') s.recibos[k] = { ...v };
  s.ultimaCopia = +raw.ultimaCopia || 0;
  return s;
}
export function mergeStates(a, b) {
  const out = emptyState();
  out.mod = Math.max(a.mod || 0, b.mod || 0);
  for (const src of [a.borrados, b.borrados]) for (const [k, v] of Object.entries(src || {})) out.borrados[k] = Math.max(out.borrados[k] || 0, v || 0);
  for (const src of [a.turnos, b.turnos]) for (const [id, t] of Object.entries(src || {})) {
    const cur = out.turnos[id];
    if (!cur || (t.mod || 0) > (cur.mod || 0)) out.turnos[id] = t;
  }
  for (const id of Object.keys(out.turnos)) if ((out.borrados[id] || 0) >= (out.turnos[id].mod || 0)) delete out.turnos[id];
  const A = (a.activoMod || 0) >= (b.activoMod || 0) ? a : b;
  out.activo = A.activo; out.activoMod = A.activoMod || 0;
  const J = (a.ajustesMod || 0) >= (b.ajustesMod || 0) ? a : b;
  out.ajustes = { ...(J.ajustes || {}) }; out.ajustesMod = J.ajustesMod || 0;
  for (const key of ['tarifas', 'recibos']) for (const src of [a[key], b[key]]) for (const [k, v] of Object.entries(src || {})) {
    const cur = out[key][k];
    if (!cur || (v.mod || 0) > (cur.mod || 0)) out[key][k] = v;
  }
  out.ultimaCopia = Math.max(a.ultimaCopia || 0, b.ultimaCopia || 0);
  return out;
}

export function etiquetaTipo(t) { return { trabajo: 'Trabajé', enfermedad: 'Enfermedad con certificado', feriado: 'Feriado pago', falta: 'Falta' }[t] || t; }
