// Arma la app: navegación entre pantallas, eventos de la página, reloj e indicador de guardado.
import { hoy } from './utilidades.js';
import { $, toast, hayCampoEnfocado } from './interfaz.js';
import { ui, TABS, AJ, suscribir, iniciarEstado } from './estado.js';
import { guardarPestana, sePuedeGuardar } from './almacenamiento.js';
import { renderHoy, actualizarVivo, acciones as accionesHoy } from './pantallas/hoy.js';
import { renderDias } from './pantallas/dias.js';
import { renderCobro, acciones as accionesCobro, alCambiarCampo as cambioCobro } from './pantallas/cobro.js';
import { renderAjustes, acciones as accionesAjustes, alClicSegmento, alEscribir as escrituraAjustes, alCambiarCampo as cambioAjustes } from './pantallas/ajustes.js';
import * as editor from './pantallas/editor.js';
import { acciones as accionesCopias, alCambiarCampo as cambioCopias } from './copias.js';

const PANTALLAS = { hoy: renderHoy, dias: renderDias, cobro: renderCobro, ajustes: renderAjustes };
// Cada botón con data-act="..." ejecuta la acción del mismo nombre
const ACCIONES = { ...accionesHoy, ...editor.acciones, ...accionesCobro, ...accionesAjustes, ...accionesCopias };

/* Navegación */
export function irA(tab) {
  ui.tab = tab; guardarPestana(tab);
  for (const t of TABS) $('tab-' + t).hidden = t !== tab;
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.go === tab)));
  renderCurrent();
  window.scrollTo(0, 0);
}
function renderCurrent() { (PANTALLAS[ui.tab] || renderAjustes)(); }
function renderSoft() { if (!hayCampoEnfocado()) renderCurrent(); }

/* Indicador de guardado */
let guardadoOk = true;
function setChip() {
  $('chip-dot').className = 'dot ' + (guardadoOk ? 'ok' : 'err');
  $('chip-txt').textContent = guardadoOk ? 'En este navegador' : 'No se está guardando';
}
function actualizarGuardado(ok) {
  if (ok && !guardadoOk) { guardadoOk = true; setChip(); }
  else if (!ok && guardadoOk) { guardadoOk = false; setChip(); toast('Este navegador no deja guardar. Guardá una copia para no perder tus días.'); }
}

/* Eventos */
function instalarEventos() {
  document.addEventListener('click', async e => {
    const go = e.target.closest('[data-go]');
    if (go) { irA(go.dataset.go); if (go.id === 'chip-store') setTimeout(() => { const d = $('datos'); if (d) d.scrollIntoView({ block: 'start' }); }, 30); return; }
    if (editor.alClic(e) || alClicSegmento(e)) return;
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const accion = ACCIONES[b.dataset.act];
    if (accion) await accion(b, AJ());
  });
  document.addEventListener('input', e => { editor.alEscribir(e); escrituraAjustes(e); });
  document.addEventListener('change', e => { editor.alCambiarCampo(e) || cambioAjustes(e) || cambioCobro(e) || cambioCopias(e); });
  document.addEventListener('keydown', editor.alTeclear);
  document.addEventListener('toggle', editor.alDesplegar, true);
}

// Reloj: si cambia el día redibuja; si no, actualiza lo que cambia con la hora
function iniciarReloj() {
  let ultimoDia = hoy();
  setInterval(() => {
    if (hoy() !== ultimoDia) { ultimoDia = hoy(); renderSoft(); return; }
    if (ui.tab === 'hoy') actualizarVivo();
  }, 15000);
}

export function iniciar() {
  suscribir(c => {
    if (c.guardado !== undefined) actualizarGuardado(c.guardado);
    if (c.suave) renderSoft(); else if (c.redibujar) renderCurrent();
  });
  iniciarEstado();
  if (!sePuedeGuardar()) guardadoOk = false;
  instalarEventos();
  irA(ui.tab);
  setChip();
  iniciarReloj();
}
