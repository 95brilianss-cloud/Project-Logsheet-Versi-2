// ============================================
// SERVICE WORKER - TURBINE LOGSHEET PRO
// ============================================
// CATATAN: Versi di sini akan otomatis tersinkron dengan js/config.js
// melalui URL parameter saat registrasi di js/main.js
// ============================================

// Ambil versi dari URL parameter (dari main.js saat register)
const getVersionFromURL = () => {
    const url = new URL(self.location.href);
    return url.searchParams.get('v') || '2.0.0';
};

const VERSION = getVersionFromURL();
const CACHE_NAME = `turbine-logsheets-v${VERSION}`;

// ============================================
// DAFTAR ASSETS TERBARU (MODULAR)
// ============================================
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    
    // CSS Modules
    './css/style.css',
    './css/layout.css',
    './css/components.css',
    './css/screens.css',
    
    // JS Modules
    './js/config.js',
    './js/state.js',
    './js/utils.js',
    './js/auth.js',
    './js/users.js',
    './js/logsheet.js',
    './js/tpm.js',
    './js/balancing.js',
    './js/main.js',
    
    // PWA Icons (Minimal masukkan ukuran inti untuk offline mode)
    './icon-192x192.png',
    './icon-512x512.png'
];

// ============================================
// INSTALL EVENT - Cache assets
// ============================================
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${VERSION}...`);

    // Skip waiting langsung agar SW baru segera aktif
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW] Caching modular assets for version ${VERSION}`);
                return cache.addAll(ASSETS);
            })
            .catch((err) => {
                console.error('[SW] Failed to cache assets:', err);
            })
    );
});

// ============================================
// ACTIVATE EVENT - Bersihkan cache lama
// ============================================
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${VERSION}...`);
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('turbine-logsheets-')) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Langsung kendalikan client (browser) tanpa reload
    );
});

// ============================================
// FETCH EVENT - Network fallback to Cache
// ============================================
self.addEventListener('fetch', (event) => {
    // Abaikan request API ke Google Apps Script atau metode selain GET (POST, dll)
    if (event.request.url.includes('script.google.com') || event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cache jika ada
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Jika tidak ada di cache, ambil dari network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache response baru yang berhasil
                        if (networkResponse && networkResponse.status === 200) {
                            const cacheCopy = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, cacheCopy);
                            });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);
                        // Return fallback response standar jika network mati dan tidak ada di cache
                        return new Response('Network error. Anda sedang offline.', { 
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// ============================================
// MESSAGE EVENT - Handle pesan dari main thread
// ============================================
self.addEventListener('message', (event) => {
    // Menerima perintah update dari main.js
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting triggered by client');
        self.skipWaiting();
    }

    // Mengirim info versi ke client
    if (event.data && event.data.type === 'GET_VERSION') {
        event.source.postMessage({
            type: 'VERSION_INFO',
            version: VERSION
        });
    }
});
