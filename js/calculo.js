// Cálculo del sueldo. Son funciones puras: reciben los datos y devuelven números, sin tocar la página.
import { r2, dow, toMin, nowMin } from './utilidades.js';
import { FERIADOS, tarifaPara } from './convenio.js';

export const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
export const esFeriadoT = t => (t.feriado === true || t.feriado === false) ? t.feriado : !!FERIADOS[t.fecha];

// Un registro: minutos normales, extras y llegada tarde. La plata se arma por día, en calcDia.
// o.primero: es el primer registro del día (la llegada tarde se mira solo ahí). o.cupo: minutos normales que le quedan al día.
export function calcTurno(t, aj, tl, nowM, o) {
  o = o || {};
  const tar = tarifaPara(t.fecha, tl);
  const hj = aj.horasJornada, vh = tar.jornal / hj;
  const w = dow(t.fecha), fer = esFeriadoT(t);
  const r = { tar, vh, fer, w, tipo: t.tipo, normal: 0, normalPrev: 0, e50: 0, e100: 0, tarde: 0, min: 0, trabajado: false, pago: t.tipo === 'enfermedad' || t.tipo === 'feriado', ini: null, fin: null };
  if (t.tipo !== 'trabajo') return r;
  const ini = toMin(t.entrada);
  const enCurso = !t.salida && nowM != null;
  let fin = t.salida ? toMin(t.salida) : (nowM == null ? null : nowM);
  if (ini == null || fin == null) return r;
  if (fin <= ini) fin += 1440;
  r.ini = ini; r.fin = fin;
  const E = toMin(t.te || aj.horaEntrada);
  let S = toMin(t.ts || aj.horaSalida);
  if (S <= E) S += 1440;
  const cupo = o.cupo == null ? hj * 60 : Math.max(0, o.cupo);
  // Llegada tarde: pasada la tolerancia cuenta como tarde (premio puntualidad); lo que se descuenta depende del ajuste.
  // Si volviste a entrar más tarde el mismo día, ese registro no es una llegada tarde.
  let iniEff = ini;
  if (o.primero !== false && ini > E) {
    const lateReal = ini - E;
    const esTarde = lateReal > aj.tolerancia;
    let late = 0;
    if (esTarde && aj.bloqueTarde > 0) late = aj.bloqueTarde > 1 ? Math.ceil(lateReal / aj.bloqueTarde) * aj.bloqueTarde : lateReal;
    iniEff = E + late;
    r.tarde = esTarde ? lateReal : 0;
  }
  const pausa = Math.max(0, +t.pausa || 0);
  // Reparte el registro, hasta finX, en minutos normales y extras
  const partir = finX => {
    let normal, extra, xStart;
    if (aj.modo === 'total') {
      const total = Math.max(0, finX - iniEff);
      normal = Math.min(total, cupo);
      extra = total - normal;
      xStart = finX - extra;
    } else {
      normal = overlap(iniEff, finX, E, S);
      xStart = Math.max(S, iniEff);
      extra = Math.max(0, finX - xStart);
    }
    // Pausa sin goce: primero de las normales
    let p = pausa;
    const dn = Math.min(p, normal); normal -= dn; p -= dn;
    if (p > 0) { const de = Math.min(p, extra); extra -= de; xStart += de; }
    if (normal > cupo) { const over = normal - cupo; normal = cupo; extra += over; xStart -= over; }
    return { normal, extra, xStart };
  };
  const { normal, extra, xStart } = partir(fin);
  const rd = Math.max(1, aj.redondeo || 1);
  const xr = Math.floor(extra / rd) * rd;
  let e50 = 0, e100 = 0;
  if (fer || w === 0) e100 = xr;
  else if (w === 6) { e100 = overlap(xStart, xStart + xr, 13 * 60, 1e9); e50 = xr - e100; }
  else e50 = xr;
  r.normal = normal; r.e50 = e50; r.e100 = e100;
  // Para el descuento por horas no trabajadas, un turno en curso cuenta como si fueras a cumplir el horario
  r.normalPrev = enCurso ? partir(Math.max(fin, aj.modo === 'total' ? iniEff + cupo + pausa : S)).normal : normal;
  r.min = normal + xr;
  r.trabajado = r.min > 0;
  return r;
}

// Junta los registros de un día. Un día trabajado paga un jornal entero (2600) con su adicional (4250) y los premios
// (4200 y 6690); la comida (6090) y el viático especial (5180) van una vez por día, cada uno con su adicional (6091 y 6089).
// Si ese día no completaste las horas del jornal (llegaste tarde, te fuiste antes o hubo pausa sin goce), se descuenta lo que faltó.
export function calcDia(ts, aj, tl) {
  const D = { normal: 0, e50: 0, e100: 0, tarde: 0, falta: 0, min: 0, trabajado: false, pago: false, pagoTipo: '', estimado: false, fer: false, tar: null, vh: 0, items: [],
    jornal: 0, ferTrab: 0, pagoEnf: 0, pagoFer: 0, m50: 0, m100: 0, mFalta: 0, adic: 0, punt: 0, prod: 0, comida: 0, adComida: 0, especial: 0, adEspecial: 0, rem: 0, noRem: 0, neto: 0 };
  const orden = ts.slice().sort((a, b) => (a.tipo === 'trabajo' ? 0 : 1) - (b.tipo === 'trabajo' ? 0 : 1) || ((a.entrada || '') < (b.entrada || '') ? -1 : (a.entrada || '') > (b.entrada || '') ? 1 : 0));
  let primero = true, cupo = aj.horasJornada * 60, prev = 0;
  for (const t of orden) {
    const r = calcTurno(t, aj, tl, t.enCurso ? nowMin() : null, { primero, cupo });
    if (r.ini != null) { primero = false; cupo -= r.normal; }
    D.items.push([t, r]);
    D.tar = r.tar; D.vh = r.vh;
    D.normal += r.normal; D.e50 += r.e50; D.e100 += r.e100; D.tarde += r.tarde; D.min += r.min; prev += r.normalPrev;
    if (r.trabajado) D.trabajado = true;
    if (r.pago) { D.pago = true; D.pagoTipo = r.tipo; }
    if (r.fer) D.fer = true;
    if (r.tar.estimado) D.estimado = true;
  }
  if (!D.tar) return D;
  const tar = D.tar, vh = D.vh, ad = aj.adicionalPct / 100;
  D.m50 = D.e50 / 60 * vh * (1 + aj.recargoComun / 100);
  D.m100 = D.e100 / 60 * vh * (1 + aj.recargoEspecial / 100);
  if (D.trabajado) {
    D.jornal = tar.jornal;
    if (D.fer) D.ferTrab = tar.jornal;
    D.falta = Math.max(0, aj.horasJornada * 60 - prev);
    D.mFalta = D.falta / 60 * vh;
    D.adic = tar.jornal * ad;
    D.punt = D.tarde ? 0 : aj.puntualidadDia;
    D.prod = aj.premioProdDia;
    D.comida = tar.comida; D.adComida = tar.comida * ad;
    D.especial = tar.especial; D.adEspecial = tar.especial * ad;
  } else if (D.pago) {
    if (D.pagoTipo === 'enfermedad') D.pagoEnf = tar.jornal; else D.pagoFer = tar.jornal;
  }
  D.rem = D.jornal + D.ferTrab + D.pagoEnf + D.pagoFer + D.m50 + D.m100 - D.mFalta + D.adic + D.punt + D.prod;
  D.noRem = D.comida + D.adComida + D.especial + D.adEspecial;
  D.neto = D.rem * (1 - aj.descTotal / 100) + D.noRem;
  return D;
}
export const LINEAS = ['jornal', 'ferTrab', 'pagoEnf', 'pagoFer', 'm50', 'm100', 'mFalta', 'adic', 'punt', 'prod', 'comida', 'adComida', 'especial', 'adEspecial'];
// Suma los días entre d1 y d2 (inclusive) y arma las líneas del recibo.
// turnos: lista de registros · aj: ajustes efectivos · tl: escalas del convenio
// opt.activo: turno en curso (se suma si cae en el rango) · opt.premioReal: premio producción del recibo, si se cargó
export function resumenDe(turnos, d1, d2, aj, tl, opt) {
  opt = opt || {};
  const byDay = new Map();
  for (const t of turnos) if (t.fecha >= d1 && t.fecha <= d2) { if (!byDay.has(t.fecha)) byDay.set(t.fecha, []); byDay.get(t.fecha).push(t); }
  const act = opt.activo;
  if (act && act.fecha >= d1 && act.fecha <= d2) { if (!byDay.has(act.fecha)) byDay.set(act.fecha, []); byDay.get(act.fecha).push(act); }
  const R = { dias: 0, diasFer: 0, diasPagos: 0, diasEnf: 0, diasFerPago: 0, diasPunt: 0, diasTarde: 0, normal: 0, e50: 0, e100: 0, tarde: 0, falta: 0, min: 0,
    estimado: false, prodReal: false, vhs: new Set(), tarifasUsadas: new Map(), porDia: new Map() };
  for (const k of LINEAS) R[k] = 0;
  for (const [f, ts] of byDay) {
    const D = calcDia(ts, aj, tl);
    R.porDia.set(f, D);
    for (const k of LINEAS) R[k] += D[k];
    R.normal += D.normal; R.e50 += D.e50; R.e100 += D.e100; R.min += D.min; R.tarde += D.tarde; R.falta += D.falta;
    if (D.trabajado) { R.dias++; if (D.fer) R.diasFer++; if (D.punt) R.diasPunt++; if (D.tarde) R.diasTarde++; }
    else if (D.pago) { R.diasPagos++; if (D.pagoTipo === 'enfermedad') R.diasEnf++; else R.diasFerPago++; }
    if (D.tar) { R.vhs.add(D.vh); R.tarifasUsadas.set(D.tar.desde, D.tar); }
    if (D.estimado) R.estimado = true;
  }
  if (aj.puntualidadTarde === 'periodo' && R.diasTarde) { R.punt = 0; R.diasPunt = 0; }
  if (opt.premioReal != null) { R.prod = opt.premioReal; R.prodReal = true; }
  // Como en el recibo: cada línea se redondea al centavo y después se suma
  for (const k of LINEAS) R[k] = r2(R[k]);
  R.rem = r2(R.jornal + R.ferTrab + R.pagoEnf + R.pagoFer + R.m50 + R.m100 - R.mFalta + R.adic + R.punt + R.prod);
  R.noRem = r2(R.comida + R.adComida + R.especial + R.adEspecial);
  R.descuentos = aj.descuentos.map(d => ({ ...d, monto: r2(R.rem * d.pct / 100) }));
  R.descTotal = r2(R.descuentos.reduce((t, d) => t + d.monto, 0));
  R.neto = r2(R.rem + R.noRem - R.descTotal);
  return R;
}
