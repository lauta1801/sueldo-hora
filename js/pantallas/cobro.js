// Pantalla «Cobro»: el recibo estimado del período, con los mismos códigos que el recibo real.
import { hoy, r2, nf2, nfd, m0, m2, hDec, hTxt, esc, fFull, fLarga, cap, fmtPct, parseNum } from '../utilidades.js';
import { state, ui, AJ, tarifas, resumen, liquidacion, premioRealDe, listaPeriodos, persist } from '../estado.js';
import { periodoDe, rango, cobroDe, nombrePeriodo, textoRango } from '../periodos.js';
import { tarifaPara } from '../convenio.js';
import { $, toast } from '../interfaz.js';

function unico(set) { return set.size === 1 ? [...set][0] : null; }
export function renderCobro() {
  const aj = AJ(), t = hoy();
  const keys = listaPeriodos(aj);
  if (!ui.periodo || !keys.includes(ui.periodo)) ui.periodo = periodoDe(t, aj);
  const pk = ui.periodo, i = keys.indexOf(pk);
  const actual = pk === periodoDe(t, aj);
  const R = liquidacion(pk, actual);
  const vh = unico(R.vhs);
  const tars = [...R.tarifasUsadas.values()].sort((a, b) => a.desde < b.desde ? -1 : 1);
  const tar = tars.length === 1 ? tars[0] : null;
  const k50 = 1 + aj.recargoComun / 100, k100 = 1 + aj.recargoEspecial / 100, pctAd = fmtPct(aj.adicionalPct) + '%';
  const quinc = aj.periodo === 'quincenal';
  const x = (n, v) => nf2.format(n) + ' × ' + m2(v);
  const dd = n => n + (n === 1 ? ' día' : ' días');
  const plata = v => v < 0 ? '− ' + m2(-v) : m2(v);
  const ln = (cod, k, det, v, cls) => '<div class="ln' + (cls ? ' ' + cls : '') + '"><span class="k">' + (cod ? '<span class="cod">' + cod + '</span>' : '') + k + (det ? '<small>' + det + '</small>' : '') + '</span><span class="v">' + v + '</span></div>';
  // Mismo orden y códigos que el recibo. * = no remunerativo
  const haberes = [
    ['1000', 'Hrs. extras ' + aj.recargoComun + '%', vh ? x(R.e50 / 60, vh * k50) : hDec(R.e50), R.m50],
    ['1500', 'Hrs. extras ' + aj.recargoEspecial + '%', vh ? x(R.e100 / 60, vh * k100) : hDec(R.e100), R.m100],
    ['2600', 'Días trabajados', tar ? x(R.dias, tar.jornal) : dd(R.dias), R.jornal],
    ['', 'Feriado trabajado', tar ? x(R.diasFer, tar.jornal) : dd(R.diasFer), R.ferTrab],
    ['', 'Feriado', tar ? x(R.diasFerPago, tar.jornal) : dd(R.diasFerPago), R.pagoFer],
    ['', 'Enfermedad', tar ? x(R.diasEnf, tar.jornal) : dd(R.diasEnf), R.pagoEnf],
    ['', 'Horas no trabajadas', vh ? x(R.falta / 60, vh) : hDec(R.falta), -R.mFalta],
    ['4200', 'Premio puntualidad', x(R.diasPunt, aj.puntualidadDia), R.punt],
    ['4250', 'Adicional', pctAd + ' de días trabajados', R.adic],
    ['5180', 'Viáticos conv. (especial) *', tar ? x(R.dias, tar.especial) : dd(R.dias), R.especial],
    ['6089', 'Ad. s/ítem 4.1.13 especial *', pctAd + ' del viático especial', R.adEspecial],
    ['6090', 'Comida ítem 4.1.12 *', tar ? x(R.dias, tar.comida) : dd(R.dias), R.comida],
    ['6091', 'Ad. s/ítem 4.1.12 comida *', pctAd + ' de la comida', R.adComida],
    ['6690', 'Premio producción', R.prodReal ? 'el que cargaste de tu recibo' : 'estimado: ' + x(R.dias, aj.premioProdDia), R.prod]
  ].filter(l => Math.abs(l[3]) >= 0.005);
  let rec = '<div class="rs">Haberes</div>';
  rec += haberes.length ? haberes.map(l => ln(l[0], l[1], l[2], plata(l[3]))).join('')
    : '<p class="hint vacio">Todavía no cargaste días en ' + (quinc ? 'esta quincena' : 'este mes') + '.</p>';
  rec += '<div class="rs">Descuentos</div>';
  for (const d of R.descuentos.filter(d => d.pct > 0)) rec += ln(d.cod, esc(d.nombre), fmtPct(d.pct) + '% de lo remunerativo', '− ' + m2(d.monto), 'neg');
  rec += '<dl class="comp"><dt>Remunerativos</dt><dd>' + m2(R.rem) + '</dd><dt>No remunerativos *</dt><dd>' + m2(R.noRem) + '</dd><dt>Descuentos</dt><dd>− ' + m2(R.descTotal) + '</dd></dl>';
  rec += '<div class="neto"><span>Neto estimado</span><b>' + m2(R.neto) + '</b></div>';
  rec += '<p class="hint">* No remunerativo: no tiene descuentos.</p>';

  const r = state.recibos[pk] || {};
  const netoRec = r.neto != null && r.neto !== '' && Number.isFinite(+r.neto) ? +r.neto : null;
  const prodRec = premioRealDe(pk);
  const prodEst = r2(R.dias * aj.premioProdDia);
  let diff = '';
  if (netoRec != null) {
    const d = R.neto - netoRec;
    diff = Math.abs(d) < 1 ? '<p class="diff ok">Coincide con tu recibo.</p>'
      : '<p class="diff bad">La app calculó <b>' + m2(Math.abs(d)) + (d > 0 ? ' más' : ' menos') + '</b> que tu recibo. Revisá las horas, el premio producción y los valores en Ajustes.</p>';
  }
  const tarTxt = tars.length ? tars.map(x => '<p class="hint">Desde ' + fFull(x.desde) + ': jornal ' + m2(x.jornal) + ', comida ' + m2(x.comida) + ', viático especial ' + m2(x.especial) + (x.estimado ? ' <span class="tag">estimado</span>' : '') + (x.propia ? ' <span class="tag">cargado por vos</span>' : '') + '</p>').join('') : '<p class="hint">Todavía no hay días en este período.</p>';

  let html = '<div class="pnav"><button type="button" data-act="per" data-d="-1" aria-label="Período anterior"' + (i <= 0 ? ' disabled' : '') + '>‹</button>' +
    '<div><h2>' + esc(cap(nombrePeriodo(pk))) + '</h2><p class="hint">' + textoRango(pk, aj) + ' · ' + dd(R.dias) + ' · ' + hTxt(R.min) + '</p>' +
    '<p class="hint">Cobro estimado: ' + fLarga(cobroDe(pk, aj)) + ' (' + aj.diaCobro + '.º día hábil)</p></div>' +
    '<button type="button" data-act="per" data-d="1" aria-label="Período siguiente"' + (i >= keys.length - 1 ? ' disabled' : '') + '>›</button></div>';
  html += '<article class="card"><div class="rec">' + rec + '</div>' + (R.estimado ? '<p class="hint">Este período usa valores del convenio estimados. Cuando tengas el recibo, corregilos en Ajustes.</p>' : '') + '</article>';
  html += '<article class="card"><h2 class="sec-title">Cuando llegue el recibo</h2>' +
    '<div class="field"><label for="rec-prod">Premio producción (6690)</label><div class="suf"><span>$</span><input class="input mono" id="rec-prod" inputmode="decimal" autocomplete="off" placeholder="' + esc(nf2.format(prodEst)) + '" value="' + (prodRec != null ? esc(nf2.format(prodRec)) : '') + '"></div>' +
    '<p class="hint">Cambia según lo que producís, así que la app lo estima. Copialo del recibo y la cuenta queda exacta.</p></div>' +
    '<div class="field"><label for="rec-neto">Sueldo neto que cobraste</label><div class="suf"><span>$</span><input class="input mono" id="rec-neto" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (netoRec != null ? esc(nf2.format(netoRec)) : '') + '"></div></div>' + diff + '</article>';
  html += liquidacionCard(aj);
  html += '<article class="card"><h2 class="sec-title">Valores usados</h2>' + tarTxt +
    '<p class="hint">Adicional ' + pctAd + ' · premio puntualidad ' + m2(aj.puntualidadDia) + ' por día · premio producción estimado ' + m2(aj.premioProdDia) + ' por día. Valor hora = jornal ÷ ' + aj.horasJornada + '.</p></article>';
  $('tab-cobro').innerHTML = html;
}
function liquidacionCard(aj) {
  if (!aj.ingreso) return '';
  const t = hoy(), y = t.slice(0, 4), sem1 = t.slice(5, 7) <= '06';
  const s1 = sem1 ? y + '-01-01' : y + '-07-01', s2 = sem1 ? y + '-06-30' : y + '-12-31';
  const desde = aj.ingreso > s1 ? aj.ingreso : s1;
  let remSem = 0;
  for (const k of listaPeriodos(aj)) { const [a, b] = rango(k); if (b >= desde && a <= s2) remSem += liquidacion(k).rem; }
  const Rt = resumen(aj.ingreso, t);
  const diasComputables = Rt.dias + Rt.diasPagos;
  const vac = diasComputables / 20;
  const diaVac = tarifaPara(t, tarifas()).jornal * (1 + aj.adicionalPct / 100);
  return '<article class="card"><h2 class="sec-title">Para la liquidación final</h2>' +
    '<dl class="kv"><dt>Aguinaldo de ' + (sem1 ? 'junio' : 'diciembre') + ' que vas sumando</dt><dd>' + m0(remSem / 12) + '</dd>' +
    '<dt>Vacaciones ganadas (' + diasComputables + ' días trabajados)</dt><dd>' + nfd.format(vac) + (vac === 1 ? ' día' : ' días') + ' ≈ ' + m0(vac * diaVac) + '</dd></dl>' +
    '<p class="hint">Estimación con la regla general de la ley: el aguinaldo es un doceavo de lo remunerativo y con menos de 6 meses te toca 1 día de vacaciones cada 20 trabajados. Son montos brutos; los calcula la agencia al terminar el contrato.</p></article>';
}

export const acciones = {
  per(b, aj) {
    const keys = listaPeriodos(aj), i = keys.indexOf(ui.periodo) + (+b.dataset.d);
    if (i >= 0 && i < keys.length) { ui.periodo = keys[i]; renderCobro(); }
  }
};

// Premio producción y neto del recibo real
export function alCambiarCampo(e) {
  const t = e.target;
  if (t.id === 'rec-neto' || t.id === 'rec-prod') {
    const v = t.value.trim() === '' ? null : parseNum(t.value);
    if (v !== null && (!Number.isFinite(v) || v < 0)) { toast('Escribí el monto como número, por ejemplo 410.250,50'); return; }
    const campo = t.id === 'rec-neto' ? 'neto' : 'premioProd';
    state.recibos[ui.periodo] = { ...(state.recibos[ui.periodo] || {}), [campo]: v, mod: Date.now() };
    persist();
    return true;
  }
  return false;
}
