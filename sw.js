const CACHE='gordonvale-touch-timer-v5';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./warning-three-bells.wav','./four-church-bells.wav'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request))));
