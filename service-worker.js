const CACHE_NAME = 'albabee-app-v13-20260517-click-bindings';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/images/icons/app-icon.png',
  '/images/icons/excel.png',
  '/images/icons/kakao.png',
  '/images/logo/albabee-logo.png',
  '/images/banners/main-banner-v2.png',
  '/images/og/albabee-og.png'
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

  function shouldCacheResponse(request, response){
    if(!response || !response.ok) return false;
    if(request.destination === 'image' || url.pathname.startsWith('/images/')){
      return (response.headers.get('Content-Type') || '').toLowerCase().startsWith('image/');
    }
    return true;
  }

  if(url.pathname.startsWith('/images/guide/')){
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(function(response){
        if(shouldCacheResponse(request, response)){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function(){
        return caches.match(request).then(function(cached){
          if(cached) return cached;
          throw new Error('offline');
        });
      })
    );
    return;
  }

  const networkFirst = request.mode === 'navigate' || ['style', 'script'].includes(request.destination) || /\.(?:html|css|js)$/i.test(url.pathname);

  if(networkFirst){
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(function(response){
        if(shouldCacheResponse(request, response)){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(request, copy);
          });
        }
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
        if(shouldCacheResponse(request, response)){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function(){
        if(request.mode === 'navigate') return caches.match('/index.html');
        return cached;
      });
    })
  );
});
