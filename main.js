// Punto de entrada
import { iniciar } from './app.js';

iniciar();

// Guarda la app para que abra sin internet
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
