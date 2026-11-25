// Valores del convenio de Camioneros (CCT 40/89) y feriados.
import { r2 } from './utilidades.js';

// Peón, CCT 40/89 (Camioneros). Octubre 2026 según el acuerdo; los meses siguientes, estimados con los aumentos pactados.
export const BASE_OCT = { desde: '2026-10-01', jornal: 42855.24, comida: 17231.89, especial: 8646.93, nota: 'Confirmado con tu recibo' };
export const AUMENTOS = [['2026-11-01', 1.7], ['2026-12-01', 1.6], ['2027-01-01', 1.6], ['2027-02-01', 1.5]];
export const TARIFAS_BASE = (() => {
  const out = [{ ...BASE_OCT, base: true }];
  let prev = BASE_OCT;
  for (const [desde, pct] of AUMENTOS) {
    const k = 1 + pct / 100;
    const t = { desde, jornal: r2(prev.jornal * k), comida: r2(prev.comida * k), especial: r2(prev.especial * k),
      base: true, estimado: true, nota: 'Estimado: +' + String(pct).replace('.', ',') + '% del acuerdo' };
    out.push(t); prev = t;
  }
  return out;
})();

export const FERIADOS = {
  '2026-11-23': 'Día de la Soberanía Nacional',
  '2026-12-08': 'Inmaculada Concepción de María',
  '2026-12-25': 'Navidad',
  '2027-01-01': 'Año Nuevo',
  '2027-02-08': 'Carnaval',
  '2027-02-09': 'Carnaval',
  '2027-03-24': 'Día de la Memoria',
  '2027-03-26': 'Viernes Santo',
  '2027-04-02': 'Día de Malvinas'
};
export const NO_LABORABLES = { '2026-12-07': 'Día no laborable (decide la empresa)', '2027-03-25': 'Jueves Santo (no laborable)' };

// Escalas que usa el cálculo: las del acuerdo más las que cargó el usuario (aumentos o correcciones).
export function tarifasDe(propias) {
  const map = new Map(TARIFAS_BASE.map(t => [t.desde, t]));
  for (const [k, t] of Object.entries(propias || {})) {
    if (t.borrada) { const b = TARIFAS_BASE.find(x => x.desde === k); if (b) map.set(k, b); else map.delete(k); }
    else if (t.oculta) map.delete(k);
    else if (+t.jornal > 0) map.set(k, { desde: k, jornal: +t.jornal, comida: +t.comida || 0, especial: +t.especial || 0, nota: t.nota || 'Cargado por vos', propia: true });
  }
  const list = [...map.values()].sort((x, y) => x.desde < y.desde ? -1 : 1);
  return list.length ? list : [BASE_OCT];
}
// La escala vigente en una fecha
export function tarifaPara(fecha, list) {
  let t = list[0];
  for (const x of list) if (x.desde <= fecha) t = x;
  return t;
}
