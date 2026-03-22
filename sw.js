// ============================================
// SERVICE WORKER - TURBINE LOGSHEET PRO
// ============================================
// Versi disinkronkan melalui parameter URL saat registrasi: sw.js?v=2.0.0
// ============================================

const getVersionFromURL = () => {
    const url = new URL(self.location.href);
    return url.searchParams.get('v') || '1.0.0';
};

const VERSION = getVersionFromURL();
const CACHE_NAME = `turbine-logsheets-v${VERSION}`;

// Daftar aset inti yang akan di-cache untuk akses offline
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/config.js',
    './js/ui-utils.js',
    './js/auth.js',
    './js/turbine.js',
    './js/cooling-tower.js',
    './js/balancing.js',
    './js/tpm.js',
    './js/app.js',
    './logo.png'
];

// INSTALL EVENT: Menyiapkan cache awal
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${VERSION}...`);
    self.skipWaiting(); // Memaksa SW baru segera aktif

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW] Caching all modular assets`);
                return cache.addAll(ASSETS);
            })
            .catch((err) => {
                console.error('[SW] Failed to cache assets:', err);
            })
    );
});

// ACTIVATE EVENT: Pembersihan cache lama
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${VERSION}...`);

    event.waitUntil(
        clients.claim()
            .then(() => {
                return caches.keys().then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            // Hapus cache yang versinya sudah tidak sesuai
                            if (cacheName !== CACHE_NAME) {
                                console.log(`[SW] Deleting old cache: ${cacheName}`);
                                return caches.delete(cacheName);
                            }
                        })
                    );
                });
            })
            .then(() => {
                console.log(`[SW] Version ${VERSION} is now active!`);
                // Notifikasi ke aplikasi bahwa update selesai
                return clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'SW_ACTIVATED',
                            version: VERSION
                        });
                    });
                });
            })
    );
});

// FETCH EVENT: Strategi Cache First, then Network
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Update cache di background jika network tersedia
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const cacheCopy = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, cacheCopy);
                            });
                        }
                    }).catch(() => {});

                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const cacheCopy = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, cacheCopy);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        return new Response('Offline: Resource not found', { 
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// MESSAGE EVENT: Komunikasi dengan main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
