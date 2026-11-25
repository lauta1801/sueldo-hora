// Ajustes de la app: valores por defecto, normalización y migraciones.
import { isHM, isISO } from './utilidades.js';

export const AJ_VER = 3;   // 2: adaptado al recibo de octubre de 2026 · 3: cobro por mes
export const DEFAULTS = {
  horaEntrada: '06:00', horaSalida: '14:00', horasJornada: 8,
  modo: 'salida',          // 'salida': las extras empiezan a la hora de salida del turno | 'total': después de 8 h trabajadas
  tolerancia: 0, bloqueTarde: 1, redondeo: 1, pausa: 0,
  recargoComun: 50, recargoEspecial: 100,
  // Lo que paga la empresa además del convenio (recibo de octubre de 2026)
  adicionalPct: 18,          // 4250, 6089 y 6091: sobre días trabajados, comida y viático especial
  puntualidadDia: 2500,      // 4200: $ 27.500 en 11 días
  puntualidadTarde: 'dia',   // si llegás tarde: 'dia' = perdés el de ese día | 'periodo' = el de todo el período de cobro
  premioProdDia: 23149.88,   // 6690: promedio por día trabajado; cambia según la producción
  descuentos: [
    { id: 'jub', cod: '9010', nombre: 'Jubilación', pct: 11, ley: true },
    { id: 'pami', cod: '9100', nombre: 'Ley 19.032 (PAMI)', pct: 3, ley: true },
    { id: 'os', cod: '9200', nombre: 'Ley 23.660 (obra social)', pct: 3, ley: true },
    { id: 'sep', cod: '9320', nombre: 'Seguro de sepelio (sindicato)', pct: 1.5, conv: true },
    { id: 'sind', cod: '9460', nombre: 'Contribución solidaria (sindicato)', pct: 3, conv: true }
  ],
  periodo: 'mensual', diaCobro: 4,
  ingreso: ''
};
export const DESC_BASE = new Map(DEFAULTS.descuentos.map(d => [d.id, d]));

// Junta los ajustes guardados con los valores por defecto y corrige los que no sirven.
// primeraFecha: función que devuelve el primer día cargado (se usa si no hay fecha de ingreso).
export function ajustesEfectivos(s, primeraFecha) {
  s = s || {};
  const a = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) if (s[k] !== undefined && s[k] !== null && s[k] !== '') a[k] = s[k];
  for (const k of ['horasJornada', 'tolerancia', 'bloqueTarde', 'redondeo', 'pausa', 'recargoComun', 'recargoEspecial', 'diaCobro', 'adicionalPct', 'puntualidadDia', 'premioProdDia']) {
    const n = +a[k]; a[k] = Number.isFinite(n) && n >= 0 ? n : DEFAULTS[k];
  }
  if (a.horasJornada <= 0) a.horasJornada = 8;
  if (a.diaCobro < 1) a.diaCobro = 1;
  if (!isHM(a.horaEntrada)) a.horaEntrada = DEFAULTS.horaEntrada;
  if (!isHM(a.horaSalida)) a.horaSalida = DEFAULTS.horaSalida;
  if (!['salida', 'total'].includes(a.modo)) a.modo = 'salida';
  if (!['mensual', 'quincenal'].includes(a.periodo)) a.periodo = DEFAULTS.periodo;
  if (!['dia', 'periodo'].includes(a.puntualidadTarde)) a.puntualidadTarde = DEFAULTS.puntualidadTarde;
  if (!isISO(a.ingreso)) a.ingreso = primeraFecha() || '';
  const ds = Array.isArray(s.descuentos) ? s.descuentos : DEFAULTS.descuentos;
  a.descuentos = ds.filter(d => d && typeof d === 'object').slice(0, 12).map((d, i) => {
    const pct = Math.max(0, Math.min(60, Number.isFinite(+d.pct) ? +d.pct : 0));
    const b = DESC_BASE.get(d.id);
    return b ? { ...b, pct } : { id: String(d.id || 'd' + i).slice(0, 24), cod: '', nombre: String(d.nombre || 'Descuento').slice(0, 40), pct, ley: false, conv: false };
  });
  a.descTotal = a.descuentos.reduce((t, d) => t + d.pct, 0);
  return a;
}

// Migraciones de los ajustes guardados (se aplican una sola vez):
// v2 pasa a los descuentos del recibo; v3 pasa a cobro por mes.
// Devuelve los ajustes nuevos, o null si ya estaban al día.
export function migrarAjustes(a) {
  a = a || {};
  const ver = +a.ver || 1;
  if (ver >= AJ_VER) return null;
  const n = { ...a }; delete n.periodo; if (ver < 2) delete n.descuentos; n.ver = AJ_VER;
  return n;
}
