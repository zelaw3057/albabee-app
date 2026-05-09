const CACHE_NAME = 'albabee-app-v4-20260509-ui4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/app-icon.png',
  '/images/hero-banner.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(){
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if(key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve();
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== location.origin) return;
  if(url.pathname.startsWith('/s')) return;
  const networkFirst = request.mode === 'navigate' || ['style', 'script'].includes(request.destination) || /\.(?:html|css|js)$/i.test(url.pathname);

  if(networkFirst){
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(function(response){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(request, copy);
        });
        return response;
      }).catch(function(){
        return caches.match(request).then(function(cached){
          if(cached) return cached;
          if(request.mode === 'navigate') return caches.match('/index.html');
          throw new Error('offline');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cached){
      return cached || fetch(request).then(function(response){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(request, copy);
        });
        return response;
      }).catch(function(){
        if(request.mode === 'navigate') return caches.match('/index.html');
        return cached;
      });
    })
  );
});
