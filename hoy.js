// Pantalla «Hoy»: lo que llevás cobrado, fichar entrada y salida, y la semana.
import { hoy, toMin, nowMin, pad, ahoraHM, lunesDe, addDays, dow, INI, nf1, m0, hTxt, fLarga, fCorta, esc, newId, isHM } from '../utilidades.js';
import { state, AJ, liquidacion, resumen, turnosDe, turnoActivoComo, tarifas, persist } from '../estado.js';
import { periodoDe, nombrePeriodo, textoRango, cobroDe } from '../periodos.js';
import { calcDia } from '../calculo.js';
import { FERIADOS } from '../convenio.js';
import { etiquetaTipo } from '../datos.js';
import { $, toast, dialogo, pedirHora } from '../interfaz.js';
import { abrirEditor } from './editor.js';

function heroCard(aj) {
  const t = hoy(), pk = periodoDe(t, aj);
  const R = liquidacion(pk, true);
  const vacio = !R.dias && !R.diasPagos && !state.activo;
  return '<article class="card"><div class="stripe" aria-hidden="true"></div>' +
    '<p class="eyebrow">' + esc(nombrePeriodo(pk)) + ' · ' + textoRango(pk, aj) + '</p>' +
    '<p class="big" data-live="neto">' + m0(R.neto) + '</p>' +
    '<p class="sub">' + (vacio ? 'Todavía no cargaste días en este período.' : 'de bolsillo hasta ahora (estimado)') + (R.estimado ? ' · <span class="tag">valores estimados</span>' : '') + '</p>' +
    '<div class="stats"><span><b data-live="horas">' + hTxt(R.min) + '</b> trabajadas</span><span><b>' + R.dias + '</b> ' + (R.dias === 1 ? 'día' : 'días') + '</span>' +
    '<span>Cobrás el <b>' + fLarga(cobroDe(pk, aj)) + '</b></span></div></article>';
}
function duracionTxt(a) { const m = (nowMin() - toMin(a.entrada) + 1440) % 1440; return Math.floor(m / 60) + ':' + pad(m % 60); }
function fichajeCard(aj) {
  const t = hoy(), a = state.activo;
  if (a && a.fecha !== t) {
    return '<article class="card"><p class="eyebrow">Turno sin cerrar</p>' +
      '<p class="lead">Quedó abierto el turno del <b>' + fLarga(a.fecha) + '</b> desde las <b class="mono">' + esc(a.entrada) + '</b>.</p>' +
      '<div class="field"><label for="cerrar-salida">¿A qué hora saliste?</label><input class="input mono" type="time" id="cerrar-salida" value="' + esc(aj.horaSalida) + '"></div>' +
      '<div class="row-btns"><button type="button" class="btn btn-primary" data-act="cerrar-abierto">Guardar salida</button><button type="button" class="btn" data-act="descartar-abierto">Descartar</button></div></article>';
  }
  if (a) {
    const D = calcDia([...turnosDe(t), turnoActivoComo()], aj, tarifas());
    return '<article class="card"><p class="eyebrow">En el trabajo desde las <span class="mono">' + esc(a.entrada) + '</span></p>' +
      '<p class="clock" data-live="transcurrido">' + duracionTxt(a) + '</p>' +
      '<p class="sub">Hoy vas <b data-live="hoyneto">' + m0(D.neto) + '</b> de bolsillo</p>' +
      '<button type="button" class="btn btn-xl btn-orange" data-act="sali">Salí <span class="t" data-live="ahora">' + ahoraHM() + '</span></button>' +
      '<div class="row-btns center"><button type="button" class="btn btn-ghost" data-act="editar-entrada">Cambiar hora de entrada</button><button type="button" class="btn btn-ghost" data-act="cancelar-entrada">Cancelar</button></div></article>';
  }
  const ts = turnosDe(t);
  const fer = FERIADOS[t] ? ' · <span class="tag fer">Feriado</span>' : '';
  if (ts.length) {
    const D = calcDia(ts, aj, tarifas());
    const lineas = ts.map(x => x.tipo === 'trabajo' ? esc(x.entrada) + ' → ' + esc(x.salida) : esc(etiquetaTipo(x.tipo))).join(' · ');
    return '<article class="card"><p class="eyebrow">Hoy · ' + fLarga(t) + fer + '</p>' +
      '<div class="today-sum"><span class="mono">' + lineas + '</span><span><b>' + (D.min ? hTxt(D.min) : (D.pago ? 'Día pago' : 'Sin pago')) + '</b>' + (D.e50 + D.e100 ? ' · ' + hTxt(D.e50 + D.e100) + ' extra' : '') + ' · <b>' + m0(D.neto) + '</b> de bolsillo</span></div>' +
      '<div class="row-btns"><button type="button" class="btn" data-act="editar" data-id="' + esc(ts[0].id) + '">Editar</button><button type="button" class="btn" data-act="entre">Volví a entrar</button></div></article>';
  }
  return '<article class="card"><p class="eyebrow">Hoy · ' + fLarga(t) + fer + '</p>' +
    '<button type="button" class="btn btn-xl btn-primary" data-act="entre">Entré <span class="t" data-live="ahora">' + ahoraHM() + '</span></button>' +
    '<div class="row-btns center"><button type="button" class="btn btn-ghost" data-act="nuevo">Cargar un día a mano</button></div></article>';
}
function semanaCard(aj) {
  const t = hoy(), l = lunesDe(t), dias = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(l, i));
  const R = resumen(dias[0], dias[6], { conActivo: true });
  let maxM = 12 * 60;
  for (const D of R.porDia.values()) maxM = Math.max(maxM, D.min);
  const cols = dias.map(f => {
    const D = R.porDia.get(f);
    const n = D ? D.normal : 0, x = D ? D.e50 + D.e100 : 0;
    const lbl = D ? (D.min ? nf1.format(D.min / 60) : (D.pago ? 'pago' : '–')) : '';
    return '<div class="wd' + (f === t ? ' hoy' : '') + '"><b>' + lbl + '</b><div class="bar" aria-hidden="true"><i class="n" style="height:' + (n / maxM * 100).toFixed(1) + '%"></i><i class="x" style="height:' + (x / maxM * 100).toFixed(1) + '%"></i></div><span class="lbl-d">' + INI[dow(f)] + ' ' + (+f.slice(8)) + '</span></div>';
  }).join('');
  return '<article class="card"><div class="split"><h2 class="sec-title">Esta semana</h2><span class="num"><b>' + hTxt(R.min) + '</b> · ' + m0(R.neto) + '</span></div>' +
    '<div class="week" role="img" aria-label="Horas por día de esta semana">' + cols + '</div>' +
    '<div class="legend"><span><i class="sw n"></i>Normales</span><span><i class="sw x"></i>Extra</span></div></article>';
}
function bannerCopia() {
  const n = Object.keys(state.turnos).length;
  if (n < 3) return '';
  if (state.ultimaCopia && Date.now() - state.ultimaCopia < 7 * 864e5) return '';
  return '<div class="banner"><p><b>Tus días están solo en este navegador.</b> Si borrás los datos o cambiás de celular, se pierden. Guardá una copia cada semana.</p><div class="row-btns"><button type="button" class="btn btn-primary" data-act="copia">Guardar copia</button></div></div>';
}
export function renderHoy() {
  const aj = AJ();
  $('tab-hoy').innerHTML = bannerCopia() + heroCard(aj) + fichajeCard(aj) + semanaCard(aj);
}

export const acciones = {
  entre() {
    state.activo = { fecha: hoy(), entrada: ahoraHM() }; state.activoMod = Date.now(); persist();
    toast('Entrada ' + state.activo.entrada, { label: 'Cambiar', fn: () => document.querySelector('[data-act="editar-entrada"]') && document.querySelector('[data-act="editar-entrada"]').click() });
  },
  sali(b, aj) {
    const a = state.activo; if (!a) return;
    const id = newId(), sal = ahoraHM();
    state.turnos[id] = { id, fecha: a.fecha, tipo: 'trabajo', entrada: a.entrada, salida: sal, pausa: 0, feriado: null, te: '', ts: '', nota: '', mod: Date.now() };
    state.activo = null; state.activoMod = Date.now(); persist();
    const D = calcDia(turnosDe(a.fecha), aj, tarifas());
    toast('Salida ' + sal + ' · ' + hTxt(D.min) + ' · ' + m0(D.neto), { label: 'Editar', fn: () => abrirEditor({ id }) });
  },
  async 'editar-entrada'() {
    const a = state.activo; if (!a) return;
    const v = await pedirHora('Hora de entrada', a.entrada);
    if (isHM(v) && state.activo) { state.activo = { ...state.activo, entrada: v }; state.activoMod = Date.now(); persist(); }
  },
  'cancelar-entrada'() {
    const prev = state.activo; if (!prev) return;
    state.activo = null; state.activoMod = Date.now(); persist();
    toast('Cancelaste la entrada', { label: 'Deshacer', fn: () => { state.activo = prev; state.activoMod = Date.now(); persist(); } });
  },
  'cerrar-abierto'() {
    const a = state.activo, sal = $('cerrar-salida') ? $('cerrar-salida').value : '';
    if (!a || !isHM(sal)) { toast('Poné a qué hora saliste.'); return; }
    const id = newId();
    state.turnos[id] = { id, fecha: a.fecha, tipo: 'trabajo', entrada: a.entrada, salida: sal, pausa: 0, feriado: null, te: '', ts: '', nota: '', mod: Date.now() };
    state.activo = null; state.activoMod = Date.now(); persist(); toast('Guardado el ' + fCorta(a.fecha));
  },
  async 'descartar-abierto'() {
    const ok = await dialogo({ titulo: 'Descartar el turno abierto', texto: 'Se borra la entrada del ' + fLarga(state.activo.fecha) + '. Si trabajaste, mejor cargá la salida.', ok: 'Descartar', peligro: true });
    if (ok) { state.activo = null; state.activoMod = Date.now(); persist(); }
  }
};

// Cada 15 segundos: la hora y lo que llevás hoy, sin redibujar toda la pantalla
export function actualizarVivo() {
  document.querySelectorAll('[data-live="ahora"]').forEach(n => { n.textContent = ahoraHM(); });
  if (state.activo && state.activo.fecha === hoy()) {
    const aj = AJ(), pk = periodoDe(hoy(), aj), R = liquidacion(pk, true);
    const D = calcDia([...turnosDe(hoy()), turnoActivoComo()], aj, tarifas());
    const set = (k, v) => document.querySelectorAll('[data-live="' + k + '"]').forEach(n => { n.textContent = v; });
    set('transcurrido', duracionTxt(state.activo)); set('hoyneto', m0(D.neto)); set('neto', m0(R.neto)); set('horas', hTxt(R.min));
  }
}
