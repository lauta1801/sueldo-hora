// Pantalla «Días»: el historial por semana, con las horas y lo que suma cada día.
import { hoy, fromISO, toMin, lunesDe, addDays, MESES, dm, hTxt, m0, DIAS3, dow, esc } from '../utilidades.js';
import { state, AJ, tarifas, resumen, turnosDe } from '../estado.js';
import { FERIADOS, NO_LABORABLES } from '../convenio.js';
import { calcDia } from '../calculo.js';
import { etiquetaTipo } from '../datos.js';
import { $ } from '../interfaz.js';

export function renderDias() {
  const aj = AJ(), tl = tarifas(), t = hoy();
  const todos = Object.values(state.turnos);
  const fechas = new Set(todos.map(x => x.fecha));
  const ghosts = aj.ingreso ? Object.keys(FERIADOS).filter(f => f >= aj.ingreso && f <= t && !fechas.has(f)) : [];
  const keys = [...new Set([...fechas, ...ghosts])].sort().reverse();
  let html = '<div class="row-btns"><button type="button" class="btn btn-primary btn-block" data-act="nuevo">+ Cargar un día</button></div>';
  if (!keys.length) {
    html += '<div class="card empty"><h2 class="sec-title">Todavía no hay días cargados</h2><p class="hint">Fichá con «Entré» cuando llegues, o cargá a mano los días que ya trabajaste.</p></div>';
    $('tab-dias').innerHTML = html; return;
  }
  // Descanso entre jornadas: salida anterior → entrada siguiente
  const trab = todos.filter(x => x.tipo === 'trabajo' && x.entrada && x.salida).map(x => {
    const a = fromISO(x.fecha).getTime() / 6e4 - 720 + toMin(x.entrada);
    let b = fromISO(x.fecha).getTime() / 6e4 - 720 + toMin(x.salida); if (b <= a) b += 1440;
    return { id: x.id, fecha: x.fecha, a, b };
  }).sort((p, q) => p.a - q.a);
  const descanso = new Map();
  for (let i = 1; i < trab.length; i++) { const gap = trab[i].a - trab[i - 1].b; if (gap >= 0 && gap < 720) descanso.set(trab[i].fecha, gap); }
  const semanas = new Map();
  for (const f of keys) { const l = lunesDe(f); if (!semanas.has(l)) semanas.set(l, []); semanas.get(l).push(f); }
  for (const [l, fs] of semanas) {
    const dom = addDays(l, 6);
    const R = resumen(l, dom);
    const mesTxt = l.slice(5, 7) === dom.slice(5, 7) ? (+l.slice(8)) + ' al ' + (+dom.slice(8)) + ' de ' + MESES[+dom.slice(5, 7) - 1] : dm(l) + ' al ' + dm(dom);
    html += '<div class="weekhead"><h3>Semana del ' + mesTxt + '</h3><span>' + hTxt(R.min) + ' · ' + m0(R.neto) + '</span></div><div class="daylist">';
    for (const f of fs) {
      const ts = turnosDe(f);
      if (!ts.length) {
        html += '<div class="dayrow ghost"><div class="dnum"><small>' + DIAS3[dow(f)] + '</small><b>' + (+f.slice(8)) + '</b></div><div class="dmid"><button type="button" class="ghostbtn" data-act="nuevo" data-fecha="' + f + '" data-tipo="feriado">Feriado: ' + esc(FERIADOS[f]) + '. <u>Si no lo trabajaste, cargalo como día pago.</u></button></div><div></div></div>';
        continue;
      }
      const D = calcDia(ts, aj, tl);
      const lines = ts.map(x => '<button type="button" class="tline' + (x.tipo === 'trabajo' ? '' : ' lbl') + '" data-act="editar" data-id="' + esc(x.id) + '">' + (x.tipo === 'trabajo' ? esc(x.entrada) + ' – ' + esc(x.salida) : esc(etiquetaTipo(x.tipo))) + '</button>').join('');
      const tags = [];
      if (D.e50 + D.e100) tags.push('<span class="tag x">' + hTxt(D.e50 + D.e100) + ' extra' + (D.e100 && !D.e50 ? ' al 100%' : '') + '</span>');
      if (D.fer || FERIADOS[f]) tags.push('<span class="tag fer">Feriado</span>');
      else if (NO_LABORABLES[f]) tags.push('<span class="tag">No laborable</span>');
      if (D.tarde) tags.push('<span class="tag warn">Tarde ' + hTxt(D.tarde) + '</span>');
      if (D.falta && D.falta !== D.tarde) tags.push('<span class="tag warn">Se descuentan ' + hTxt(D.falta) + '</span>');
      if (descanso.has(f)) tags.push('<span class="tag warn">Descanso de ' + hTxt(descanso.get(f)) + '</span>');
      if (D.estimado) tags.push('<span class="tag">valor estimado</span>');
      const notas = ts.filter(x => x.nota).map(x => '<p class="note">' + esc(x.nota) + '</p>').join('');
      const horas = D.min ? hTxt(D.min) : (D.pago ? 'día pago' : 'sin pago');
      html += '<div class="dayrow"><div class="dnum"><small>' + DIAS3[dow(f)] + '</small><b>' + (+f.slice(8)) + '</b></div>' +
        '<div class="dmid">' + lines + (tags.length ? '<div class="tags">' + tags.join('') + '</div>' : '') + notas + '</div>' +
        '<div class="amt"><b>' + m0(D.neto) + '</b><small>' + horas + '</small></div></div>';
    }
    html += '</div>';
  }
  html += '<p class="hint">Tocá el horario de un día para corregirlo o borrarlo. Los montos son de bolsillo, estimados.</p>';
  $('tab-dias').innerHTML = html;
}
