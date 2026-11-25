// Guardado en el navegador (localStorage). Los datos no salen del celular.
export const CACHE_KEY = 'horas-sueldo:v1';
export const UI_KEY = 'horas-sueldo:ui';

export function leerEstado() {
  try { const o = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return o && o.estado ? o.estado : null; } catch (e) { return null; }
}
// Devuelve false si el navegador no deja guardar (modo incógnito, sin espacio, etc.)
export function guardarEstado(estado) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ estado })); return true; } catch (e) { return false; }
}
export function leerPestana() {
  try { const u = JSON.parse(localStorage.getItem(UI_KEY) || 'null'); return u ? u.tab : null; } catch (e) { return null; }
}
export function guardarPestana(tab) {
  try { localStorage.setItem(UI_KEY, JSON.stringify({ tab })); } catch (e) {}
}
export function sePuedeGuardar() {
  try { localStorage.setItem(CACHE_KEY + ':prueba', '1'); localStorage.removeItem(CACHE_KEY + ':prueba'); return true; } catch (e) { return false; }
}
// Si la app está abierta en otra pestaña del mismo navegador, avisa cuando allá cambian los datos
export function escucharOtrasPestanas(fn) {
  window.addEventListener('storage', e => {
    if (e.key !== CACHE_KEY || !e.newValue) return;
    try { const o = JSON.parse(e.newValue); if (o && o.estado) fn(o.estado); } catch (err) {}
  });
}
