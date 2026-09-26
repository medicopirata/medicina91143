// Service worker mínimo.
//
// No guarda nada: cada petición va a la red. Está aquí porque Chrome solo
// ofrece "Instalar aplicación" si la página registra un service worker con un
// manejador de fetch; sin él no aparece el botón en el móvil.
//
// Lo único que hace de verdad es pedir sin caché los archivos que cambian a
// menudo (catalogo.js, escritorio.js, indice_temas.json…). GitHub Pages los
// sirve con caché de varios minutos y el navegador se quedaba con la versión
// vieja: se añadía una plataforma al catálogo y no aparecía hasta al rato.
// Con "no-cache" sigue habiendo petición condicional (ETag), así que no
// cuesta datos, pero nunca se sirve algo viejo sin preguntar.
//
// Si algún día se quiere modo sin conexión, este es el sitio: habría que
// cachear la plataforma visitada y sus imágenes. Son archivos grandes
// (Histología ~7 MB), así que conviene hacerlo por plataforma y no de golpe.

const FRESCOS = /\.(?:js|json|webmanifest)$/i;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const propio = url.origin === self.location.origin;
  if (propio && e.request.method === 'GET' && FRESCOS.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }));
    return;
  }
  e.respondWith(fetch(e.request));
});
