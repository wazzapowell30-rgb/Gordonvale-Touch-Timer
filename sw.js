const CACHE_NAME='gordonvale-touch-timer-v2-0-1';
const ASSETS=['./','./index.html','./style.css','./script.js','./manifest.webmanifest','./gordonvale-logo.jpg','./icon-192.png','./icon-512.png','./warning-three-bells.wav','./four-church-bells.wav','./one-minute-warning.mp3'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate'){
   event.respondWith(fetch(event.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',c));return r}).catch(()=>caches.match('./index.html')));return;
 }
 event.respondWith(caches.match(event.request).then(c=>c||fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return r})));
});
