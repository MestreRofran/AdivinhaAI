/* AdivinhaAI 1.3 • PWA cache do aplicativo (não armazena dados do Firebase). */
const CACHE_NAME = 'adivinhaai-v1.7';
const APP_FILES = [
  './', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/favicon-16.png', './icons/favicon-32.png', './icons/favicon-48.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-1024.png',
  './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Instalação resiliente: os ícones opcionais não impedem o app de funcionar.
    await cache.add('./index.html');
    await Promise.allSettled(APP_FILES.filter(url => url !== './index.html').map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(k => k.startsWith('adivinhaai-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Não interceptar Firebase Auth, Firestore, CDN ou recursos externos.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  // Arquivos locais de aparência, manifest e ícones: cache primeiro.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
