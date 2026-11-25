// Piezas de la interfaz que usan todas las pantallas: avisos, diálogos y descargas.
import { esc } from './utilidades.js';

export const $ = id => document.getElementById(id);

// Si estás escribiendo en un campo, no se redibuja la pantalla para no perder lo que tipeaste.
export function hayCampoEnfocado() {
  const a = document.activeElement;
  return !!(a && a.closest && a.closest('main') && /INPUT|TEXTAREA|SELECT/.test(a.tagName));
}

export let toastTimer = null;
export function toast(msg, accion) {
  const t = $('toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (accion ? '<button type="button" id="toast-act">' + esc(accion.label) + '</button>' : '');
  t.hidden = false;
  if (accion) $('toast-act').onclick = () => { t.hidden = true; accion.fn(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, accion ? 6500 : 3200);
}
export function dialogo(o) {
  return new Promise(res => {
    const sc = document.createElement('div');
    sc.className = 'scrim center';
    sc.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h2 id="dlg-t">' + esc(o.titulo) + '</h2>' +
      (o.texto ? '<p class="lead">' + esc(o.texto) + '</p>' : '') + (o.html || '') +
      '<div class="row-btns end">' + (o.cancel === false ? '' : '<button type="button" class="btn" data-r="0">' + esc(o.cancel || 'Cancelar') + '</button>') +
      '<button type="button" class="btn ' + (o.peligro ? 'btn-danger-fill' : 'btn-primary') + '" data-r="1">' + esc(o.ok || 'Aceptar') + '</button></div></div>';
    document.body.appendChild(sc);
    const done = v => { sc.remove(); document.removeEventListener('keydown', onKey); res(v); };
    const onKey = e => { if (e.key === 'Escape') done(null); };
    document.addEventListener('keydown', onKey);
    sc.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) { if (b.dataset.r === '1') { const inp = sc.querySelector('[data-val]'); done(inp ? inp.value : true); } else done(null); }
      else if (e.target === sc) done(null);
    });
    if (o.onMount) o.onMount(sc);
    setTimeout(() => { const f = sc.querySelector('[data-val]') || sc.querySelector('[data-r="1"]'); if (f) f.focus(); }, 40);
  });
}
export const pedirHora = (titulo, valor, texto) => dialogo({ titulo, texto, ok: 'Guardar', html: '<input class="input mono" type="time" id="dlg-hora" data-val value="' + esc(valor || '') + '">' });


// Descarga un archivo; si el navegador no lo permite, muestra el texto para copiarlo.
export async function ofrecerArchivo(filename, data) {
  try {
    const url = URL.createObjectURL(new Blob([data], { type: filename.endsWith('.csv') ? 'text/csv' : 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) { mostrarParaCopiar(filename, data); return false; }
}
export function mostrarParaCopiar(filename, data) {
  dialogo({
    titulo: 'Copiá tu copia', ok: 'Listo', cancel: false,
    html: '<p class="hint">Acá no se pudo descargar el archivo. Copiá el texto y guardalo en una nota o mandátelo por WhatsApp.</p><textarea class="input copybox" id="dlg-copy" readonly>' + esc(data) + '</textarea><button type="button" class="btn" id="dlg-copy-btn">Copiar</button>',
    onMount: sc => {
      sc.querySelector('#dlg-copy-btn').addEventListener('click', () => {
        const ta = sc.querySelector('#dlg-copy');
        const sel = () => { ta.focus(); ta.select(); };
        try { navigator.clipboard.writeText(data).then(() => toast('Copiado'), () => { sel(); toast('Seleccioná y copiá el texto'); }); }
        catch (e) { sel(); toast('Seleccioná y copiá el texto'); }
      });
    }
  });
}
