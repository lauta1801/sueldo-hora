// Copias de respaldo (JSON), exportación para Excel (CSV) y borrar todo.
import { hoy, dow, DIAS } from './utilidades.js';
import { state, AJ, tarifas, turnosDe, migrar, persist, reemplazarEstado } from './estado.js';
import { normalize, mergeStates, etiquetaTipo } from './datos.js';
import { calcDia } from './calculo.js';
import { $, toast, dialogo, ofrecerArchivo } from './interfaz.js';

async function guardarCopia() {
  const data = JSON.stringify({ app: 'horas-sueldo', v: 1, exportado: new Date().toISOString(), estado: state }, null, 1);
  const ok = await ofrecerArchivo('horas-sueldo-copia-' + hoy() + '.json', data);
  if (ok) { state.ultimaCopia = Date.now(); persist(); toast('Copia guardada'); }
}
async function exportarCSV() {
  const aj = AJ(), tl = tarifas();
  const n2 = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const rows = [['Fecha', 'Día', 'Tipo', 'Entrada', 'Salida', 'Horas trabajadas', 'Extras 50%', 'Extras 100%', 'Días trabajados ($)', 'Extras ($)', 'Adicional', 'Premio puntualidad', 'Premio producción (estimado)', 'Feriados, enfermedad y horas no trabajadas', 'Remunerativo', 'Comida', 'Viático especial', 'Adicional de viáticos', 'No remunerativo', 'Descuentos', 'Neto estimado', 'Nota']];
  const fechas = [...new Set(Object.values(state.turnos).map(t => t.fecha))].sort();
  for (const f of fechas) {
    const ts = turnosDe(f), D = calcDia(ts, aj, tl);
    rows.push([f, DIAS[dow(f)], ts.map(x => etiquetaTipo(x.tipo)).join(' + '), ts.map(x => x.entrada).filter(Boolean).join(' / '), ts.map(x => x.salida).filter(Boolean).join(' / '),
      n2(D.min / 60), n2(D.e50 / 60), n2(D.e100 / 60), n2(D.jornal), n2(D.m50 + D.m100), n2(D.adic), n2(D.punt), n2(D.prod), n2(D.ferTrab + D.pagoEnf + D.pagoFer - D.mFalta),
      n2(D.rem), n2(D.comida), n2(D.especial), n2(D.adComida + D.adEspecial), n2(D.noRem), n2(D.rem * aj.descTotal / 100), n2(D.neto), ts.map(x => x.nota).filter(Boolean).join(' / ')]);
  }
  const csv = '﻿' + rows.map(r => r.map(c => { const s = String(c); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  const ok = await ofrecerArchivo('horas-sueldo-' + hoy() + '.csv', csv);
  if (ok) toast('Archivo listo');
}
function importarArchivo(file) {
  const fr = new FileReader();
  fr.onload = async () => {
    let o = null;
    try { o = JSON.parse(String(fr.result)); } catch (e) {}
    const est = o && (o.estado || (o.turnos ? o : null));
    if (!est || typeof est.turnos !== 'object') { toast('Ese archivo no es una copia de esta app.'); return; }
    const inc = normalize(est), n = Object.keys(inc.turnos).length;
    const ok = await dialogo({ titulo: 'Cargar copia', texto: 'La copia tiene ' + n + (n === 1 ? ' día' : ' días') + '. Se suman a los que ya tenés; si un día está en los dos lados, queda la versión más nueva.', ok: 'Cargar' });
    if (!ok) return;
    reemplazarEstado(mergeStates(state, inc)); migrar();
    persist(); toast('Copia cargada');
  };
  fr.readAsText(file);
}

export const acciones = {
  copia() { guardarCopia(); },
  csv() { exportarCSV(); },
  importar() { $('imp-file').click(); },
  async 'borrar-todo'() {
    const n = Object.keys(state.turnos).length;
    const ok = await dialogo({ titulo: 'Borrar todos tus días', texto: 'Se borran ' + n + (n === 1 ? ' día cargado' : ' días cargados') + '. Si querés, guardá una copia antes.', ok: 'Borrar todo', peligro: true });
    if (ok) { const ahora = Date.now(); for (const id of Object.keys(state.turnos)) state.borrados[id] = ahora; state.turnos = {}; state.activo = null; state.activoMod = ahora; state.recibos = {}; persist(); toast('Borraste todos tus días'); }
  }
};

export function alCambiarCampo(e) {
  const t = e.target;
  if (t.id === 'imp-file' && t.files && t.files[0]) { importarArchivo(t.files[0]); t.value = ''; return true; }
  return false;
}
