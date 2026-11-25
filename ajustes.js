// Pantalla «Ajustes»: valores del convenio, premios, horario, recargos, descuentos y cobro.
import { hoy, pad, r2, nf2, m2, esc, toISO, fFull, fmtPct, parseNum, isHM, isISO } from '../utilidades.js';
import { state, ui, AJ, tarifas, persist } from '../estado.js';
import { AJ_VER } from '../ajustes.js';
import { TARIFAS_BASE, tarifaPara } from '../convenio.js';
import { $, toast, dialogo, hayCampoEnfocado } from '../interfaz.js';

function segHTML(key, opts, val) {
  return '<div class="seg" role="group">' + opts.map(([v, l]) => '<button type="button" data-ajseg="' + key + '" data-v="' + esc(v) + '" aria-pressed="' + (String(val) === String(v)) + '">' + esc(l) + '</button>').join('') + '</div>';
}
function numHTML(key, label, val, suf, hint) {
  return '<div class="field"><label for="aj-' + key + '">' + label + '</label><div class="suf"><input class="input mono" id="aj-' + key + '" data-aj="' + key + '" inputmode="decimal" autocomplete="off" value="' + esc(nf2.format(val).replace(/,00$/, '')) + '">' + (suf ? '<span>' + suf + '</span>' : '') + '</div>' + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
}
function moneyHTML(key, label, val, hint) {
  return '<div class="field"><label for="aj-' + key + '">' + label + '</label><div class="suf"><span>$</span><input class="input mono" id="aj-' + key + '" data-aj="' + key + '" inputmode="decimal" autocomplete="off" value="' + esc(nf2.format(val)) + '"></div>' + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
}
export function renderAjustes() {
  const aj = AJ(), tl = tarifas(), vig = tarifaPara(hoy(), tl);
  const tarHTML = tl.map(x => '<div class="tarifa' + (x === vig ? ' vig' : '') + '">' +
    '<div class="tarifa-head"><p><b>Desde el ' + fFull(x.desde) + '</b>' + (x === vig ? ' · vigente' : '') + '</p><button type="button" class="btn btn-ghost" data-act="tarifa" data-desde="' + x.desde + '">Editar</button></div>' +
    '<dl class="vals"><dt>Jornal</dt><dd>' + m2(x.jornal) + '</dd><dt>Hora</dt><dd>' + m2(x.jornal / aj.horasJornada) + '</dd><dt>Comida</dt><dd>' + m2(x.comida) + '</dd><dt>Viático</dt><dd>' + m2(x.especial) + '</dd></dl>' +
    '<div class="tags">' + (x.estimado ? '<span class="tag">estimado</span>' : '') + (x.propia ? '<span class="tag">cargado por vos</span>' : '') + '<span class="note">' + esc(x.nota || '') + '</span></div></div>').join('');
  const modoTxt = 'Se guardan solo en este navegador y nadie más los ve. Abrí la app siempre desde el mismo lugar: en otro navegador o en otro celular empieza vacía. Si borrás los datos del navegador, se pierden, así que guardá una copia cada semana.';
  const ult = state.ultimaCopia ? 'Última copia: ' + fFull(toISO(new Date(state.ultimaCopia))) + '.' : 'Todavía no guardaste ninguna copia.';
  $('tab-ajustes').innerHTML =
    '<article class="card"><h2 class="sec-title">Valores del convenio</h2><p class="hint">Peón, convenio de Camioneros (CCT 40/89). Octubre está confirmado con tu recibo; los meses que siguen son estimados con los aumentos del acuerdo.</p><div>' + tarHTML + '</div>' +
    '<button type="button" class="btn" data-act="tarifa">+ Cargar un aumento</button></article>' +

    '<article class="card"><h2 class="sec-title">Adicional y premios</h2>' +
    '<p class="hint">Los paga la empresa además del convenio. Los valores salen del recibo de octubre.</p>' +
    numHTML('adicionalPct', 'Adicional (4250, 6089 y 6091)', aj.adicionalPct, '%', 'Se suma a los días trabajados, a la comida y al viático especial.') +
    moneyHTML('puntualidadDia', 'Premio puntualidad por día (4200)', aj.puntualidadDia) +
    '<div class="field"><span class="lbl">Si llegás tarde, perdés</span>' + segHTML('puntualidadTarde', [['dia', 'El premio de ese día'], ['periodo', aj.periodo === 'quincenal' ? 'El de toda la quincena' : 'El de todo el mes']], aj.puntualidadTarde) +
    '<p class="hint">Esto no lo dice el recibo: confirmalo con tu encargado.</p></div>' +
    moneyHTML('premioProdDia', 'Premio producción por día, estimado (6690)', aj.premioProdDia, 'Cambia según lo que producís: es un promedio. En la pestaña Cobro podés cargar el real que te pagaron.') +
    '</article>' +

    '<article class="card"><h2 class="sec-title">Horario</h2>' +
    '<div class="grid2"><div class="field"><label for="aj-horaEntrada">Entrada</label><input class="input mono" type="time" id="aj-horaEntrada" data-aj="horaEntrada" value="' + aj.horaEntrada + '"></div>' +
    '<div class="field"><label for="aj-horaSalida">Salida del turno</label><input class="input mono" type="time" id="aj-horaSalida" data-aj="horaSalida" value="' + aj.horaSalida + '"></div></div>' +
    numHTML('horasJornada', 'Horas de la jornada', aj.horasJornada, 'h') +
    '<div class="field"><span class="lbl">Desde cuándo cuentan las extras</span>' + segHTML('modo', [['salida', 'Desde la salida del turno'], ['total', 'Después de ' + aj.horasJornada + ' h trabajadas']], aj.modo) +
    '<p class="hint">Si llegás tarde: con la primera opción te descuentan el tiempo y las extras igual arrancan a las ' + aj.horaSalida + '; con la segunda, primero completás las ' + aj.horasJornada + ' h.</p></div>' +
    numHTML('tolerancia', 'Tolerancia de llegada tarde', aj.tolerancia, 'min', 'Si llegás dentro de estos minutos, no te descuentan nada ni perdés el premio puntualidad.') +
    '<div class="field"><span class="lbl">Descuento por llegar tarde</span>' + segHTML('bloqueTarde', [[0, 'Nada'], [1, 'Los minutos justos'], [15, 'De a 15 min'], [30, 'De a 30 min'], [60, 'De a 1 h']], aj.bloqueTarde) + '</div>' +
    '<div class="field"><span class="lbl">Las extras se cuentan</span>' + segHTML('redondeo', [[1, 'Por minuto'], [15, 'De a 15 min'], [30, 'De a 30 min'], [60, 'Por hora completa']], aj.redondeo) + '</div>' +
    '</article>' +

    '<article class="card"><h2 class="sec-title">Recargos de las extras</h2>' +
    '<div class="grid2">' + numHTML('recargoComun', 'Extras días comunes', aj.recargoComun, '%') + numHTML('recargoEspecial', 'Sábado desde 13 h, domingo y feriado', aj.recargoEspecial, '%') + '</div>' +
    '</article>' +

    descuentosCard(aj) +

    '<article class="card"><h2 class="sec-title">Cobro</h2>' +
    '<div class="field"><span class="lbl">Te pagan</span>' + segHTML('periodo', [['mensual', 'Por mes'], ['quincenal', 'Por quincena']], aj.periodo) +
    '<p class="hint">Por mes va del 1 a fin de mes; por quincena, la 1.ª va del 1 al 15 y la 2.ª del 16 a fin de mes. Se cobra el 4.º día hábil después de que termina.</p></div>' +
    '<div class="grid2">' + numHTML('diaCobro', 'Día hábil de cobro', aj.diaCobro, '.º') +
    '<div class="field"><label for="aj-ingreso">Fecha de ingreso</label><input class="input" type="date" id="aj-ingreso" data-aj="ingreso" value="' + esc(aj.ingreso) + '"></div></div>' +
    '<button type="button" class="btn" data-act="reset-aj">Volver a los ajustes iniciales</button></article>' +

    '<article class="card" id="datos"><h2 class="sec-title">Tus datos</h2><p class="lead">' + modoTxt + '</p><p class="hint">' + ult + '</p>' +
    '<div class="row-btns"><button type="button" class="btn btn-primary" data-act="copia">Guardar copia</button><button type="button" class="btn" data-act="importar">Cargar copia</button><button type="button" class="btn" data-act="csv">Exportar para Excel</button></div>' +
    '<button type="button" class="btn btn-ghost btn-danger" data-act="borrar-todo" style="justify-self:start">Borrar todos mis días</button></article>' +

    '<article class="card"><h2 class="sec-title">Tenela como app</h2><p class="hint"><b>Android (Chrome):</b> menú ⋮ → «Agregar a la pantalla principal» o «Instalar app».</p><p class="hint"><b>iPhone (Safari):</b> botón Compartir → «Agregar a inicio».</p><p class="hint">Una vez que la abriste, funciona aunque no tengas internet.</p></article>' +

    '<article class="card"><h2 class="sec-title">Cómo calcula</h2><p class="hint">Cada día trabajado suma un jornal entero (2600), el adicional del ' + fmtPct(aj.adicionalPct) + '% (4250), el premio puntualidad (4200) y el premio producción estimado (6690). Las horas extra van aparte, con el valor hora (jornal ÷ ' + aj.horasJornada + '): ' + aj.recargoComun + '% de lunes a sábado hasta las 13 h (1000) y ' + aj.recargoEspecial + '% los sábados desde las 13, domingos y feriados (1500). Un feriado trabajado se paga doble. Si un día no completás las ' + aj.horasJornada + ' h del horario (llegás tarde, te vas antes o hacés una pausa sin goce), se descuenta lo que faltó con el valor hora. La comida (6090) y el viático especial (5180) se pagan una vez por día trabajado, cada uno con su adicional (6091 y 6089), y no tienen descuentos. Los descuentos se restan de lo remunerativo. Todo es una estimación hasta que lo compares con tu recibo.</p></article>';
}
function descuentosCard(aj) {
  const filas = aj.descuentos.map((d, i) => '<div class="drow">' +
    '<div class="dleft">' + (d.ley || d.conv ? '<span class="dname">' + (d.cod ? '<span class="cod">' + d.cod + '</span>' : '') + esc(d.nombre) + '</span>'
      : '<input class="input" data-desc-nombre="' + i + '" aria-label="Nombre del descuento" maxlength="40" value="' + esc(d.nombre) + '">') +
    '<span class="dtag">' + (d.ley ? 'por ley' : d.conv ? 'del convenio' : 'agregado por vos') + '</span></div>' +
    '<div class="suf"><input class="input mono" data-desc-pct="' + i + '" inputmode="decimal" autocomplete="off" aria-label="Porcentaje de ' + esc(d.nombre) + '" value="' + esc(fmtPct(d.pct)) + '"><span>%</span></div>' +
    (d.ley ? '<span></span>' : '<button type="button" class="btn btn-ghost btn-danger" data-act="desc-del" data-i="' + i + '">Quitar</button>') +
    '</div>').join('');
  const opts = aj.descuentos.map((d, i) => '<option value="' + i + '">' + esc(d.nombre) + '</option>').join('');
  return '<article class="card"><h2 class="sec-title">Descuentos</h2>' +
    '<p class="hint">Se restan de lo remunerativo. La comida y el viático especial no tienen descuentos.</p>' +
    '<div class="dlist">' + filas + '</div>' +
    '<div class="split"><button type="button" class="btn" data-act="desc-add">+ Agregar otro descuento</button><span class="num">Total: <b id="desc-total">' + fmtPct(aj.descTotal) + '%</b></span></div>' +
    '<div class="calc"><h3 class="lbl">¿Qué porcentaje es un descuento de tu recibo?</h3>' +
    '<p class="hint">Copiá del recibo el total remunerativo y el monto del descuento. El porcentaje es el descuento dividido el total, por 100.</p>' +
    '<div class="grid2"><div class="field"><label for="calc-rem">Total remunerativo</label><div class="suf"><span>$</span><input class="input mono" id="calc-rem" inputmode="decimal" autocomplete="off" placeholder="1.000.000,00"></div></div>' +
    '<div class="field"><label for="calc-monto">Monto del descuento</label><div class="suf"><span>$</span><input class="input mono" id="calc-monto" inputmode="decimal" autocomplete="off" placeholder="30.000,00"></div></div></div>' +
    '<p class="preview" id="calc-res" aria-live="polite">Completá los dos montos.</p>' +
    '<div class="field"><label for="calc-para">Usarlo para</label><select class="input" id="calc-para">' + opts + '</select></div>' +
    '<button type="button" class="btn btn-primary" data-act="calc-usar">Usar este porcentaje</button></div>' +
    '<button type="button" class="btn btn-ghost" data-act="desc-reset" style="justify-self:start">Volver a los descuentos iniciales</button>' +
    '</article>';
}
function calcPct() {
  const rem = parseNum(($('calc-rem') || {}).value), monto = parseNum(($('calc-monto') || {}).value);
  return rem > 0 && monto >= 0 ? monto / rem * 100 : NaN;
}
function renombrarOpcion(i, nombre) {
  const n = String(nombre || '').trim() || 'Descuento';
  const opt = document.querySelector('#calc-para option[value="' + i + '"]'); if (opt) opt.textContent = n;
  const pct = document.querySelector('[data-desc-pct="' + i + '"]'); if (pct) pct.setAttribute('aria-label', 'Porcentaje de ' + n);
}
function setDescuentos(list, opt) { state.ajustes = { ...state.ajustes, descuentos: list }; state.ajustesMod = Date.now(); persist(opt); }

/* Aumentos y valores del convenio */
async function editarTarifa(desde) {
  const tl = tarifas(), cur = desde ? tl.find(x => x.desde === desde) : null;
  const base = cur || tarifaPara(hoy(), tl);
  const nextMonth = (() => { const t = hoy(); const y = +t.slice(0, 4), m = +t.slice(5, 7); return (m === 12 ? (y + 1) + '-01' : y + '-' + pad(m + 1)) + '-01'; })();
  const html = '<div class="field"><label for="tf-desde">Desde</label><input class="input" type="date" id="tf-desde" value="' + (desde || nextMonth) + '"' + (desde ? ' disabled' : '') + '></div>' +
    (desde ? '' : '<div class="field"><label for="tf-pct">Aumento sobre los valores vigentes</label><div class="suf"><input class="input mono" id="tf-pct" inputmode="decimal" placeholder="1,7"><span>%</span></div><p class="hint">O escribí los valores exactos abajo.</p></div>') +
    '<div class="field"><label for="tf-jornal">Jornal</label><div class="suf"><span>$</span><input class="input mono" id="tf-jornal" inputmode="decimal" value="' + nf2.format(base.jornal) + '"></div></div>' +
    '<div class="grid2"><div class="field"><label for="tf-comida">Comida</label><div class="suf"><span>$</span><input class="input mono" id="tf-comida" inputmode="decimal" value="' + nf2.format(base.comida) + '"></div></div>' +
    '<div class="field"><label for="tf-especial">Viático especial</label><div class="suf"><span>$</span><input class="input mono" id="tf-especial" inputmode="decimal" value="' + nf2.format(base.especial) + '"></div></div></div>' +
    (cur && (cur.propia || cur.estimado) ? '<button type="button" class="btn btn-ghost btn-danger" id="tf-quitar" style="justify-self:start">' + (cur.propia && TARIFAS_BASE.some(b => b.desde === cur.desde) ? 'Volver al valor del acuerdo' : 'Quitar estos valores') + '</button>' : '');
  let quitar = false, vals = null;
  const ok = await dialogo({
    titulo: desde ? 'Valores desde el ' + fFull(desde) : 'Cargar un aumento', ok: 'Guardar', html,
    onMount: sc => {
      const pct = sc.querySelector('#tf-pct');
      if (pct) pct.addEventListener('input', () => {
        const p = parseNum(pct.value); if (!Number.isFinite(p)) return;
        const k = 1 + p / 100;
        sc.querySelector('#tf-jornal').value = nf2.format(r2(base.jornal * k));
        sc.querySelector('#tf-comida').value = nf2.format(r2(base.comida * k));
        sc.querySelector('#tf-especial').value = nf2.format(r2(base.especial * k));
      });
      const q = sc.querySelector('#tf-quitar');
      if (q) q.addEventListener('click', () => { quitar = true; sc.querySelector('[data-r="1"]').click(); });
      sc.querySelector('[data-r="1"]').addEventListener('click', () => {
        vals = { desde: sc.querySelector('#tf-desde').value, jornal: parseNum(sc.querySelector('#tf-jornal').value), comida: parseNum(sc.querySelector('#tf-comida').value), especial: parseNum(sc.querySelector('#tf-especial').value) };
      }, true);
    }
  });
  if (!ok || !vals) return;
  const k = desde || vals.desde;
  if (!isISO(k)) { toast('Elegí desde qué fecha rige.'); return; }
  if (quitar) {
    const esBase = TARIFAS_BASE.some(b => b.desde === k);
    state.tarifas[k] = cur && cur.propia ? { borrada: true, mod: Date.now() } : (esBase ? { oculta: true, mod: Date.now() } : { borrada: true, mod: Date.now() });
    persist(); toast('Listo'); return;
  }
  if (!(vals.jornal > 0) || !(vals.comida >= 0) || !(vals.especial >= 0)) { toast('Revisá los montos: tienen que ser números.'); return; }
  state.tarifas[k] = { jornal: r2(vals.jornal), comida: r2(vals.comida), especial: r2(vals.especial), nota: 'Cargado por vos', mod: Date.now() };
  persist(); toast('Valores guardados desde el ' + fFull(k));
}

// Botones segmentados de los ajustes
export function alClicSegmento(e) {
  const sg = e.target.closest('[data-ajseg]');
  if (sg) {
    const k = sg.dataset.ajseg, v = sg.dataset.v;
    state.ajustes = { ...state.ajustes, [k]: ['bloqueTarde', 'redondeo'].includes(k) ? +v : v };
    state.ajustesMod = Date.now();
    if (k === 'periodo') ui.periodo = null;
    persist();
    return true;
  }
  return false;
}

export const acciones = {
  'desc-add'(b, aj) {
    const l = aj.descuentos.map(d => ({ ...d })); l.push({ id: 'c' + Date.now().toString(36), nombre: 'Otro descuento', pct: 0 }); setDescuentos(l);
    const inp = document.querySelector('[data-desc-nombre="' + (l.length - 1) + '"]'); if (inp) { inp.focus(); inp.select(); }
  },
  'desc-del'(b, aj) {
    const l = aj.descuentos.map(d => ({ ...d })); const q = l.splice(+b.dataset.i, 1)[0]; setDescuentos(l); if (q) toast('Quitaste ' + q.nombre, { label: 'Deshacer', fn: () => { const l2 = AJ().descuentos.map(d => ({ ...d })); l2.splice(+b.dataset.i, 0, q); setDescuentos(l2); } });
  },
  'desc-reset'() {
    const n = { ...state.ajustes }; delete n.descuentos; state.ajustes = n; state.ajustesMod = Date.now(); persist(); toast('Descuentos iniciales');
  },
  'calc-usar'(b, aj) {
    const pct = calcPct(), i = +(($('calc-para') || {}).value || 0);
    if (!Number.isFinite(pct)) { toast('Completá el total remunerativo y el monto del descuento.'); return; }
    const l = aj.descuentos.map(d => ({ ...d })); if (!l[i]) return;
    l[i].pct = r2(pct); setDescuentos(l); toast(l[i].nombre + ': ' + fmtPct(l[i].pct) + '%'); return;
  },
  tarifa(b) { editarTarifa(b.dataset.desde || null); },
  async 'reset-aj'() {
    const ok = await dialogo({ titulo: 'Volver a los ajustes iniciales', texto: 'Se restablecen el horario, los recargos, el adicional, los premios, los descuentos y el cobro. Tus días y los valores del convenio no cambian.', ok: 'Restablecer' });
    if (ok) { const ing = state.ajustes.ingreso; state.ajustes = ing ? { ver: AJ_VER, ingreso: ing } : { ver: AJ_VER }; state.ajustesMod = Date.now(); persist(); toast('Ajustes restablecidos'); }
  }
};

export function alEscribir(e) {
  if (e.target.dataset && e.target.dataset.descNombre !== undefined) renombrarOpcion(e.target.dataset.descNombre, e.target.value);
  if (e.target.id === 'calc-rem' || e.target.id === 'calc-monto') {
    const pct = calcPct(), res = $('calc-res');
    if (res) res.innerHTML = Number.isFinite(pct) ? 'Es el <b>' + nf2.format(pct) + '%</b> del total remunerativo.' : 'Completá los dos montos.';
  }
}

export function alCambiarCampo(e) {
  const t = e.target;
  if (t.dataset && (t.dataset.descPct !== undefined || t.dataset.descNombre !== undefined)) {
    const l = AJ().descuentos.map(d => ({ ...d }));
    if (t.dataset.descPct !== undefined) {
      const i = +t.dataset.descPct, v = parseNum(t.value);
      if (!Number.isFinite(v) || v < 0 || v > 60) { toast('Escribí un porcentaje entre 0 y 60.'); renderAjustes(); return true; }
      if (l[i]) l[i].pct = v;
    } else { const i = +t.dataset.descNombre; if (l[i]) { l[i].nombre = (t.value.trim() || 'Descuento').slice(0, 40); renombrarOpcion(i, l[i].nombre); } }
    setDescuentos(l, { noRender: true });
    const tot = $('desc-total'); if (tot) tot.textContent = fmtPct(l.reduce((a, d) => a + (+d.pct || 0), 0)) + '%';
    toast('Guardado');
    return true;
  }
  if (t.dataset && t.dataset.aj) {
    const k = t.dataset.aj;
    let v = t.value;
    if (['horaEntrada', 'horaSalida'].includes(k)) { if (!isHM(v)) return true; }
    else if (k === 'ingreso') { if (v && !isISO(v)) return true; }
    else { v = parseNum(v); if (!Number.isFinite(v) || v < 0) { toast('Escribí un número.'); renderAjustes(); return true; } }
    state.ajustes = { ...state.ajustes, [k]: v }; state.ajustesMod = Date.now();
    persist({ noRender: true });
    if (['horasJornada', 'horaSalida', 'recargoComun', 'recargoEspecial', 'adicionalPct', 'puntualidadDia', 'premioProdDia'].includes(k)) setTimeout(() => { if (!hayCampoEnfocado()) renderAjustes(); }, 0);
    toast('Guardado');
    return true;
  }
  return false;
}
