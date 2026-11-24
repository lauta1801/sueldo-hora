// Guarda la app para que abra sin internet. Con internet, siempre trae la última versión.
// Cambiá el número de CACHE si agregás o sacás archivos de la lista.
const CACHE = 'horas-sueldo-v2';
const ARCHIVOS = [
  './',
  './index.html',
  './css/estilos.css',
  './js/ajustes.js',
  './js/almacenamiento.js',
  './js/app.js',
  './js/calculo.js',
  './js/convenio.js',
  './js/copias.js',
  './js/datos.js',
  './js/estado.js',
  './js/interfaz.js',
  './js/main.js',
  './js/pantallas/ajustes.js',
  './js/pantallas/cobro.js',
  './js/pantallas/dias.js',
  './js/pantallas/editor.js',
  './js/pantallas/hoy.js',
  './js/periodos.js',
  './js/utilidades.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })));
  }
});
