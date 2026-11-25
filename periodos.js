// Períodos de cobro (mes o quincena) y fecha estimada de cobro.
import { pad, dow, addDays, MESES } from './utilidades.js';
import { FERIADOS } from './convenio.js';

export const esHabil = d => { const w = dow(d); return w !== 0 && w !== 6 && !FERIADOS[d]; };
export function periodoDe(f, aj) { const ym = f.slice(0, 7); return aj.periodo === 'quincenal' ? ym + '-' + (+f.slice(8) <= 15 ? 1 : 2) : ym; }
export function rango(key) {
  const p = key.split('-'), y = +p[0], m = +p[1], q = p[2] ? +p[2] : 0;
  const last = new Date(y, m, 0).getDate(), ym = y + '-' + pad(m);
  if (q === 1) return [ym + '-01', ym + '-15'];
  if (q === 2) return [ym + '-16', ym + '-' + pad(last)];
  return [ym + '-01', ym + '-' + pad(last)];
}
export function cobroDe(key, aj) {
  let d = addDays(rango(key)[1], 1), n = 0;
  for (let i = 0; i < 60; i++) { if (esHabil(d)) { n++; if (n >= aj.diaCobro) return d; } d = addDays(d, 1); }
  return d;
}
export function nombrePeriodo(key) { const p = key.split('-'); const mes = MESES[+p[1] - 1]; return p[2] ? (p[2] === '1' ? '1.ª' : '2.ª') + ' quincena de ' + mes : mes + ' ' + p[0]; }
export function textoRango(key, aj) {
  const [d1, d2] = rango(key);
  const ini = aj.ingreso && aj.ingreso > d1 && aj.ingreso <= d2 ? aj.ingreso : d1;
  return 'del ' + (+ini.slice(8)) + ' al ' + (+d2.slice(8));
}
