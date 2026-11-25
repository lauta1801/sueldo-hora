// Hoja para cargar, corregir o borrar un día.
import { hoy, addDays, isISO, isHM, parseNum, newId, m0, m2, hTxt, fCorta, esc } from '../utilidades.js';
import { state, AJ, tarifas, turnosDe, persist } from '../estado.js';
import { calcDia } from '../calculo.js';
import { FERIADOS, NO_LABORABLES } from '../convenio.js';
import { $, toast } from '../interfaz.js';

let ed = null;
function ultimoTrabajo() { return Object.values(state.turnos).filter(x => x.tipo === 'trabajo' && x.entrada && x.salida).sort((a, b) => (a.fecha + a.entrada) < (b.fecha + b.entrada) ? 1 : -1)[0] || null; }
export function abrirEditor(o) {
  o = o || {};
  const aj = AJ();
  const t = o.id ? state.turnos[o.id] : null;
  const u = ultimoTrabajo();
  ed = { id: t ? t.id : null, d: t ? { ...t } : { fecha: o.fecha || hoy(), tipo: o.tipo || 'trabajo', entrada: (u && u.entrada) || aj.horaEntrada, salida: (u && u.salida) || aj.horaSalida, pausa: 0, feriado: null, te: '', ts: '', nota: '' }, err: '', conf: false };
  renderEditor();
}
export function cerrarEditor() { ed = null; $('layer').innerHTML = ''; document.body.classList.remove('sheet-open'); }
function previewHTML() {
  const aj = AJ(), d = ed.d;
  if (d.tipo === 'trabajo' && (!isHM(d.entrada) || !isHM(d.salida))) return '<span class="hint">Completá la entrada y la salida.</span>';
  // Si ese día ya hay otro registro de trabajo, se calcula el día entero: el jornal, la comida y los premios van una sola vez
  const otros = d.tipo === 'trabajo' ? turnosDe(d.fecha).filter(x => x.id !== ed.id && x.tipo === 'trabajo') : [];
  const D = calcDia(otros.concat([{ ...d, id: '_prev' }]), aj, tarifas());
  if (d.tipo === 'falta') return '<b>Sin pago</b><span class="hint">Un día de falta no se cobra.</span>';
  if (d.tipo !== 'trabajo') return '<b>' + m0(D.neto) + ' de bolsillo</b><span class="hint">Se paga el jornal (' + m2(D.rem) + ' bruto), sin adicional, premios, comida ni viático.</span>';
  const partes = [D.falta ? 'Jornal menos ' + hTxt(D.falta) : 'Día completo'];
  if (D.e50) partes.push(hTxt(D.e50) + ' extra al ' + aj.recargoComun + '%');
  if (D.e100) partes.push(hTxt(D.e100) + ' extra al ' + aj.recargoEspecial + '%');
  const per = aj.periodo === 'quincenal' ? 'toda la quincena' : 'todo el mes';
  const tarde = D.tarde ? '<span class="hint">Llegaste ' + hTxt(D.tarde) + ' tarde: ' + (aj.puntualidadTarde === 'periodo' ? 'perdés el premio puntualidad de ' + per + '.' : 'no cobrás el premio puntualidad de ese día.') + '</span>' : '';
  const falta = D.falta ? '<span class="hint">Te faltaron ' + hTxt(D.falta) + ' del horario: te descuentan ' + m0(D.mFalta) + ' brutos.</span>' : '';
  return '<b>' + m0(D.neto) + ' de bolsillo' + (otros.length ? ' ese día' : '') + '</b><span>' + partes.join(' + ') + '</span>' + tarde + falta +
    (otros.length ? '<span class="hint">Sumando ' + (otros.length === 1 ? 'el otro registro' : 'los otros registros') + ' de ese día.</span>' : '') +
    (D.fer ? '<span class="hint">Feriado: se paga doble.</span>' : '') + '<span class="hint">Con adicional y premios; el de producción es estimado.</span>';
}
function renderEditor() {
  if (!ed) return;
  const d = ed.d, aj = AJ();
  const ferAuto = !!FERIADOS[d.fecha], ferVal = d.feriado === null ? ferAuto : d.feriado;
  const otro = turnosDe(d.fecha).some(x => x.id !== ed.id);
  const tipos = [['trabajo', 'Trabajé'], ['enfermedad', 'Enfermedad con certificado'], ['feriado', 'Feriado no trabajado'], ['falta', 'Falté']];
  const trabajo = d.tipo === 'trabajo';
  document.body.classList.add('sheet-open');
  $('layer').innerHTML = '<div class="scrim" id="ed-scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ed-t">' +
    '<div class="sheet-head"><h2 class="sec-title" id="ed-t">' + (ed.id ? 'Editar día' : 'Cargar un día') + '</h2><button type="button" class="btn btn-ghost" data-ed="cerrar">Cerrar</button></div>' +
    '<div class="field"><label for="ed-fecha">Fecha</label><input class="input" type="date" id="ed-fecha" value="' + esc(d.fecha) + '"></div>' +
    (FERIADOS[d.fecha] ? '<p class="hint">Es feriado: ' + esc(FERIADOS[d.fecha]) + '.</p>' : (NO_LABORABLES[d.fecha] ? '<p class="hint">' + esc(NO_LABORABLES[d.fecha]) + '.</p>' : '')) +
    (otro ? '<p class="hint">Ya hay otro registro ese día. Se suman los dos.</p>' : '') +
    '<div class="field"><span class="lbl">Qué pasó ese día</span><div class="seg" role="group">' + tipos.map(([v, l]) => '<button type="button" data-edtipo="' + v + '" aria-pressed="' + (d.tipo === v) + '">' + l + '</button>').join('') + '</div></div>' +
    (trabajo ? '<div class="grid2"><div class="field"><label for="ed-entrada">Entrada</label><input class="input mono" type="time" id="ed-entrada" value="' + esc(d.entrada) + '"></div>' +
      '<div class="field"><label for="ed-salida">Salida</label><input class="input mono" type="time" id="ed-salida" value="' + esc(d.salida) + '"></div></div>' +
      '<div class="chips" aria-label="Salidas rápidas">' + [aj.horaSalida, '18:00'].filter((v, i, a) => a.indexOf(v) === i).map(v => '<button type="button" data-edsal="' + v + '">Salí ' + v + '</button>').join('') + '</div>' : '') +
    '<div class="preview" id="ed-prev" aria-live="polite">' + previewHTML() + '</div>' +
    (ed.err ? '<p class="err">' + esc(ed.err) + '</p>' : '') +
    '<details class="more" id="ed-more"' + (ed.more ? ' open' : '') + '><summary>Más opciones</summary>' +
      (trabajo ? '<label class="check"><input type="checkbox" id="ed-feriado"' + (ferVal ? ' checked' : '') + '> Fue feriado (se paga doble)</label>' +
      '<div class="field"><label for="ed-pausa">Pausa sin goce</label><div class="suf"><input class="input mono" id="ed-pausa" inputmode="numeric" value="' + esc(d.pausa || 0) + '"><span>min</span></div></div>' +
      '<div class="grid2"><div class="field"><label for="ed-te">Ese día el turno empezaba</label><input class="input mono" type="time" id="ed-te" value="' + esc(d.te || '') + '"></div>' +
      '<div class="field"><label for="ed-ts">y terminaba</label><input class="input mono" type="time" id="ed-ts" value="' + esc(d.ts || '') + '"></div></div>' +
      '<p class="hint">Dejalo vacío si fue tu horario de siempre (' + aj.horaEntrada + ' a ' + aj.horaSalida + ').</p>' : '') +
      '<div class="field"><label for="ed-nota">Nota</label><textarea class="input" id="ed-nota" maxlength="300">' + esc(d.nota || '') + '</textarea></div>' +
    '</details>' +
    '<div class="row-btns">' +
      '<button type="button" class="btn btn-primary" data-ed="guardar">Guardar</button>' +
      (ed.id ? '' : '<button type="button" class="btn" data-ed="guardar-otro">Guardar y cargar el siguiente</button>') +
      (ed.id ? '<button type="button" class="btn ' + (ed.conf ? 'btn-danger-fill' : 'btn-danger') + '" data-ed="borrar">' + (ed.conf ? '¿Seguro? Borrar' : 'Borrar este día') + '</button>' : '') +
    '</div></div></div>';
}
function leerEditor() {
  if (!ed) return;
  const v = id => { const e = $(id); return e ? e.value : null; };
  const d = ed.d;
  const f = v('ed-fecha'); if (isISO(f)) d.fecha = f;
  if (d.tipo === 'trabajo') {
    const en = v('ed-entrada'), sa = v('ed-salida');
    if (en !== null) d.entrada = en;
    if (sa !== null) d.salida = sa;
    const p = v('ed-pausa'); if (p !== null) d.pausa = Math.max(0, Math.round(parseNum(p) || 0));
    const te = v('ed-te'), ts = v('ed-ts'); if (te !== null) d.te = te || ''; if (ts !== null) d.ts = ts || '';
    const fe = $('ed-feriado'); if (fe) { const auto = !!FERIADOS[d.fecha]; d.feriado = fe.checked === auto ? null : fe.checked; }
  }
  const n = v('ed-nota'); if (n !== null) d.nota = n.slice(0, 300);
}
function guardarEditor(otro) {
  leerEditor();
  const d = ed.d;
  if (!isISO(d.fecha)) { ed.err = 'Elegí una fecha.'; renderEditor(); return; }
  if (d.tipo === 'trabajo' && (!isHM(d.entrada) || !isHM(d.salida))) { ed.err = 'Completá la hora de entrada y de salida.'; renderEditor(); return; }
  const id = ed.id || newId();
  const rec = { id, fecha: d.fecha, tipo: d.tipo, entrada: d.tipo === 'trabajo' ? d.entrada : '', salida: d.tipo === 'trabajo' ? d.salida : '', pausa: d.tipo === 'trabajo' ? (d.pausa || 0) : 0, feriado: d.tipo === 'trabajo' ? d.feriado : null, te: d.tipo === 'trabajo' ? (d.te || '') : '', ts: d.tipo === 'trabajo' ? (d.ts || '') : '', nota: d.nota || '', mod: Date.now() };
  state.turnos[id] = rec;
  persist();
  if (otro) {
    ed = { id: null, d: { ...rec, fecha: addDays(rec.fecha, 1), nota: '', feriado: null }, err: '', conf: false };
    renderEditor();
    toast('Guardado el ' + fCorta(rec.fecha));
  } else {
    cerrarEditor();
    toast('Guardado el ' + fCorta(rec.fecha));
  }
}
function borrarTurno(id) {
  const t = state.turnos[id]; if (!t) return;
  delete state.turnos[id]; state.borrados[id] = Date.now();
  persist();
  toast('Borraste el ' + fCorta(t.fecha), { label: 'Deshacer', fn: () => { state.turnos[id] = { ...t, mod: Date.now() + 1 }; delete state.borrados[id]; persist(); } });
}

export const acciones = {
  nuevo(b) { abrirEditor({ fecha: b.dataset.fecha, tipo: b.dataset.tipo }); },
  editar(b) { abrirEditor({ id: b.dataset.id }); }
};

export function alClic(e) {
  const edb = e.target.closest('[data-ed]');
  if (edb && ed) {
    const a = edb.dataset.ed;
    if (a === 'cerrar') cerrarEditor();
    else if (a === 'guardar') guardarEditor(false);
    else if (a === 'guardar-otro') guardarEditor(true);
    else if (a === 'borrar') { if (!ed.conf) { leerEditor(); ed.conf = true; renderEditor(); setTimeout(() => { if (ed && ed.conf) { ed.conf = false; renderEditor(); } }, 4000); } else { const id = ed.id; cerrarEditor(); borrarTurno(id); } }
    return true;
  }
  const tb = e.target.closest('[data-edtipo]');
  if (tb && ed) { leerEditor(); ed.d.tipo = tb.dataset.edtipo; ed.err = ''; renderEditor(); return true; }
  const sb = e.target.closest('[data-edsal]');
  if (sb && ed) { leerEditor(); ed.d.salida = sb.dataset.edsal; renderEditor(); return true; }
  if (e.target.id === 'ed-scrim') { cerrarEditor(); return true; }
  return false;
}
export function alEscribir(e) {
  if (ed && e.target.closest && e.target.closest('#layer')) { leerEditor(); const p = $('ed-prev'); if (p) p.innerHTML = previewHTML(); }
}
export function alCambiarCampo(e) {
  const t = e.target;
  if (ed && t.id === 'ed-fecha') { leerEditor(); renderEditor(); return true; }
  return false;
}
export function alTeclear(e) { if (e.key === 'Escape' && ed) cerrarEditor(); }
export function alDesplegar(e) { if (ed && e.target && e.target.id === 'ed-more') ed.more = e.target.open; }
