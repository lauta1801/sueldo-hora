// Datos de prueba compartidos
import { ajustesEfectivos } from '../js/ajustes.js';
import { tarifasDe } from '../js/convenio.js';

export const ajustes = (cambios = {}) => ajustesEfectivos(cambios, () => '');
export const escalas = () => tarifasDe({});

let n = 0;
export function turno(fecha, entrada, salida, extra = {}) {
  return { id: 'p' + (n++), fecha, tipo: 'trabajo', entrada, salida, pausa: 0, feriado: null, te: '', ts: '', nota: '', mod: 1, ...extra };
}
export function otro(fecha, tipo) {
  return { id: 'p' + (n++), fecha, tipo, entrada: '', salida: '', pausa: 0, feriado: null, te: '', ts: '', nota: '', mod: 1 };
}
