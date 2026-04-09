// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open('maptiler-cache').then(async (cache) => {
      const keys = await cache.keys();
      if (keys.length > 500) {
        // Enforce max 500 tiles (approx ~20-30MB)
        for (let i = 0; i < keys.length - 500; i++) {
          await cache.delete(keys[i]);
        }
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Aggressive caching for MapTiler tiles
  if (url.origin === 'https://api.maptiler.com') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          event.waitUntil(
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.ok) {
                return caches.open('maptiler-cache').then((cache) => {
                  return cache.put(event.request, networkResponse.clone());
                });
              }
            }).catch(() => {})
          );
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              event.waitUntil(
                caches.open('maptiler-cache').then((cache) => {
                  return cache.put(event.request, responseClone);
                })
              );
            }
            return networkResponse;
          })
          .catch(() => {
             return new Response(JSON.stringify({ error: 'Offline' }), {
               headers: { 'Content-Type': 'application/json' }
             });
          });
      })
    );
    return;
  }

  // Aggressive caching for OpenChargeMap
  if (url.origin === 'https://api.openchargemap.io') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              event.waitUntil(
                caches.open('ocm-cache').then((cache) => {
                  return cache.put(event.request, responseClone);
                })
              );
            }
            return networkResponse;
          })
          .catch(() => {
             return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
          });
      })
    );
    return;
  }

  // Caching for OSRM routes
  if (url.origin === 'https://router.project-osrm.org') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              event.waitUntil(
                caches.open('osrm-cache').then((cache) => {
                  return cache.put(event.request, responseClone);
                })
              );
            }
            return networkResponse;
          })
          .catch(() => {
             return new Response(JSON.stringify({ code: "Offline", routes: [] }), { 
               headers: { 'Content-Type': 'application/json' } 
             });
          });
      })
    );
    return;
  }
});
