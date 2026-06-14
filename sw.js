const CACHE_VERSION = 'tracy-bible-v2.1';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';
const API_CACHE = CACHE_VERSION + '-api';

// All static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/themes.css',
  '/css/glassmorphism.css',
  '/css/typography.css',
  '/css/ios-polish.css',
  '/js/app.js',
  '/js/utils.js',
  '/js/caching.js',
  '/js/themes.js',
  '/js/welcome.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE = 50;
const MAX_API_CACHE = 100;

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('tracy-bible-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests (Bible API)
  if (url.origin === 'https://bible-api.com') {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle external resources (CDN, fonts, etc)
  if (url.origin !== location.origin) {
    event.respondWith(handleExternalRequest(request));
    return;
  }

  // Handle app assets
  event.respondWith(handleAppRequest(request));
});

// Handle Bible API requests with cache-first strategy
async function handleAPIRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] API Cache hit:', request.url);
      return cachedResponse;
    }

    // If not in cache, fetch from network
    console.log('[SW] API Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Trim API cache if too large
      trimCache(API_CACHE, MAX_API_CACHE);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] API fetch failed (offline?):', request.url);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline message
    return new Response(JSON.stringify({
      error: 'You are offline and this content is not cached yet.',
      offline: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle external resources (CDN, fonts)
async function handleExternalRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Trim dynamic cache
      trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE);
    }

    return networkResponse;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('', { status: 404 });
  }
}

// Handle app requests with cache-first strategy
async function handleAppRequest(request) {
  try {
    // Try static cache first
    const cachedResponse = await caches.match(request, { cacheName: STATIC_CACHE });
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try dynamic cache
    const dynamicCached = await caches.match(request);
    if (dynamicCached) {
      return dynamicCached;
    }

    // Fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses in dynamic cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Offline fallback - serve index.html for navigation requests
    if (request.mode === 'navigate') {
      const indexResponse = await caches.match('/index.html');
      return indexResponse || new Response('Offline', { status: 503 });
    }

    return new Response('', { status: 404 });
  }
}

// Trim cache to specified size
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Delete oldest entries
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${cacheName}: deleted ${deleteCount} items`);
  }
}

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      })
    );
  }
});
