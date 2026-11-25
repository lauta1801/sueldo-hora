// Los datos de la app en memoria. Las pantallas leen y cambian `state` y después llaman a persist(),
// que guarda en el navegador y avisa a la interfaz para que se redibuje.
import { emptyState, normalize, mergeStates } from './datos.js';
import { ajustesEfectivos, migrarAjustes } from './ajustes.js';
import { tarifasDe } from './convenio.js';
import { resumenDe } from './calculo.js';
import { periodoDe, rango } from './periodos.js';
import { hoy } from './utilidades.js';
import { leerEstado, guardarEstado, leerPestana, escucharOtrasPestanas } from './almacenamiento.js';

export const TABS = ['hoy', 'dias', 'cobro', 'ajustes'];
export let state = emptyState();
export const ui = { tab: 'hoy', periodo: null };

export function reemplazarEstado(nuevo) { state = nuevo; }

const oyentes = new Set();
export function suscribir(fn) { oyentes.add(fn); }
const avisar = cambio => { for (const fn of oyentes) fn(cambio); };

// Guarda y redibuja (salvo que se pida noRender)
export function persist(opt = {}) {
  state.mod = Date.now();
  const guardado = guardarEstado(state);
  avisar({ guardado, redibujar: !opt.noRender });
}

export function iniciarEstado() {
  const tab = leerPestana(); if (TABS.includes(tab)) ui.tab = tab;
  const guardado = leerEstado();
  if (guardado) state = normalize(guardado);
  if (migrar()) guardarEstado(state);
  escucharOtrasPestanas(otro => { state = mergeStates(state, normalize(otro)); avisar({ suave: true }); });
}

/* Atajos sobre el estado actual */
export const AJ = () => ajustesEfectivos(state.ajustes, primeraFecha);
export const tarifas = () => tarifasDe(state.tarifas);
export function migrar() {
  const n = migrarAjustes(state.ajustes);
  if (!n) return false;
  state.ajustes = n; state.ajustesMod = Date.now();
  return true;
}
export function primeraFecha() { let m = null; for (const t of Object.values(state.turnos)) if (!m || t.fecha < m) m = t.fecha; return m; }
export function turnosDe(f) { return Object.values(state.turnos).filter(t => t.fecha === f).sort((a, b) => (a.entrada || '') < (b.entrada || '') ? -1 : 1); }
export function turnoActivoComo() { const a = state.activo; return a ? { id: '_activo', fecha: a.fecha, tipo: 'trabajo', entrada: a.entrada, salida: '', enCurso: true } : null; }
export function resumen(d1, d2, opt = {}) {
  const act = opt.conActivo ? turnoActivoComo() : null;
  return resumenDe(Object.values(state.turnos), d1, d2, AJ(), tarifas(), { activo: act && act.fecha === hoy() ? act : null, premioReal: opt.premioReal });
}
// El premio producción real de un período, si lo cargaste del recibo
export function premioRealDe(pk) {
  const r = state.recibos[pk];
  return r && r.premioProd != null && r.premioProd !== '' && Number.isFinite(+r.premioProd) ? +r.premioProd : null;
}
export function liquidacion(pk, conActivo) {
  const [d1, d2] = rango(pk);
  return resumen(d1, d2, { conActivo, premioReal: premioRealDe(pk) });
}
export function listaPeriodos(aj) {
  const s = new Set([periodoDe(hoy(), aj)]);
  for (const t of Object.values(state.turnos)) s.add(periodoDe(t.fecha, aj));
  return [...s].sort();
}
