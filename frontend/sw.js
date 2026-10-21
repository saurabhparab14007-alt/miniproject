// Sanjeevani Resilient Offline-First Service Worker
// Enables 100% offline usage even after 2-3 days without network or server
const CACHE_NAME = 'sanjeevani-cache-v8';

const STATIC_ASSETS = [
  '/',
  '/login',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/doctor_portal.html',
  '/patient_portal.html',
  '/hospital_portal.html',
  '/asha_worker.html',
  '/village_dashboard.html',
  '/keypad_simulator.html',
  '/js/auth.js',
  '/js/api.js',
  '/js/app.js',
  '/js/asha_worker.js',
  '/js/hospital_portal.js',
  '/js/keypad_sim.js',
  '/js/offline_store.js',
  '/js/components/dashboard.js',
  '/js/components/patient_reg.js',
  '/js/components/case_file.js',
  '/js/components/ai_tools.js',
  '/js/components/report_analyzer.js',
  '/js/components/emergency_qr.js',
  '/js/components/med_schedule.js',
  '/js/components/handover.js',
  '/js/components/followup_flow.js',
  '/js/components/multilingual.js',
  '/js/components/pharmacies.js',
  '/js/components/doctor_signup.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/app-logo.png',
  '/icons/favicon.png',
  '/icons/sanjeevani.ico',
  '/apple-touch-icon.png',
  '/icons/apple-touch-icon.png',
  '/icons/ios_qr_wifi.png',
  '/icons/cloud_qr.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline clinical suite...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

async function getOfflineDocumentFallback(request, url) {
  // 1. Try exact match in cache first
  const cached = await caches.match(request);
  if (cached) return cached;

  // 2. Specific portal fallbacks
  if (url.searchParams.get('portal') === 'patient' || url.pathname.includes('patient')) {
    const patHtml = await caches.match('/patient_portal.html');
    if (patHtml) return patHtml;
  }
  if (url.searchParams.get('portal') === 'doctor' || url.pathname.includes('doctor')) {
    const docHtml = await caches.match('/doctor_portal.html');
    if (docHtml) return docHtml;
  }
  if (url.searchParams.get('portal') === 'hospital' || url.pathname.includes('hospital')) {
    const hospHtml = await caches.match('/hospital_portal.html');
    if (hospHtml) return hospHtml;
  }
  if (url.searchParams.get('portal') === 'asha' || url.pathname.includes('asha')) {
    const ashaHtml = await caches.match('/asha_worker.html');
    if (ashaHtml) return ashaHtml;
  }
  if (url.searchParams.get('portal') === 'village' || url.pathname.includes('village')) {
    const vilHtml = await caches.match('/village_dashboard.html');
    if (vilHtml) return vilHtml;
  }
  if (url.pathname.includes('keypad')) {
    const kpHtml = await caches.match('/keypad_simulator.html');
    if (kpHtml) return kpHtml;
  }

  // 3. Default fallback is index.html
  const fallback = await caches.match('/index.html') || await caches.match('/');
  if (fallback) return fallback;

  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sanjeevani Offline</title></head><body><h2>Sanjeevani Offline Mode Active</h2><p>Server unreachable. Return to <a href="/">Dashboard</a>.</p></body></html>', {
    headers: { 'Content-Type': 'text/html' }
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If API request: intercept non-2xx / Cloudflare 502/530 origin errors and return synthetic offline JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If server is reachable and returned a valid response (< 500)
          if (networkResponse && networkResponse.status < 500 && networkResponse.status !== 404) {
            return networkResponse;
          }
          // Origin server down / Cloudflare 502, 503, 504, 520, 521, 522, 523, 530:
          console.warn(`[ServiceWorker] Origin server down (HTTP ${networkResponse ? networkResponse.status : 'offline'}). Serving synthetic offline response for ${url.pathname}`);
          return new Response(JSON.stringify({
            offline: true,
            server_unreachable: true,
            status: networkResponse ? networkResponse.status : 503,
            message: "Operating in Rural Offline Mode (Server/Laptop Powered Off)."
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
        .catch(async () => {
          return new Response(JSON.stringify({
            offline: true,
            server_unreachable: true,
            status: 503,
            message: "Operating in Rural Offline Mode (Server unreachable)."
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Handle HTML navigation requests (/, /login, /doctor, /patient, etc.)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return networkResponse;
          }
          // Cloudflare 530 / 502 / Origin server down: fallback immediately to cached documents
          return getOfflineDocumentFallback(event.request, url);
        })
        .catch(async () => {
          return getOfflineDocumentFallback(event.request, url);
        })
    );
    return;
  }

  // Static Assets (Cache-First with Background Network Revalidation)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidate in background if online, ignore network errors
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(event.request).then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return networkResponse;
        }
        // If network response was 5xx or not found, try fallback
        if (event.request.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
        const cachedFallback = await caches.match(event.request);
        if (cachedFallback) return cachedFallback;
        return networkResponse;
      }).catch(async () => {
        if (event.request.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
