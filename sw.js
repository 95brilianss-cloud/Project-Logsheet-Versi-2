/* ============================================
   SERVICE WORKER - TURBINE LOGSHEET PRO
   ============================================ */

// UPDATE MANUAL: Ubah nilai versi ini setiap kali Anda merilis pembaruan.
// Perubahan pada file sw.js ini akan memicu browser untuk mendeteksi versi baru.
const VERSION = '2.2.1'; 
const CACHE_NAME = `turbine-logsheets-v${VERSION}`;

// ============================================
// DAFTAR ASSETS UNTUK OFFLINE CACHE
// ============================================
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './logo.png',
    
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
    
    // PWA Icons (Lengkap sesuai manifest)
    './icon-16x16.png',
    './icon-32x32.png',
    './icon-72x72.png',
    './icon-96x96.png',
    './icon-128x128.png',
    './icon-144x144.png',
    './icon-152x152.png',
    './icon-192x192.png',
    './icon-384x384.png',
    './icon-512x512.png'
];

// ============================================
// INSTALL EVENT - Caching Assets
// ============================================
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${VERSION}...`);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW] Caching all assets for version ${VERSION}`);
                return cache.addAll(ASSETS);
            })
            .catch((err) => {
                console.error('[SW] Failed to cache assets:', err);
            })
    );
});

// ============================================
// ACTIVATE EVENT - Cleanup Cache Lama
// ============================================
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${VERSION}...`);
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Hapus cache versi lama yang dimulai dengan "turbine-logsheets-"
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('turbine-logsheets-')) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Segera mengambil kendali client setelah SW aktif
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH EVENT - Network First / Cache Fallback
// ============================================
self.addEventListener('fetch', (event) => {
    // 1. Abaikan request API ke Google Apps Script agar data selalu fresh
    // 2. Abaikan metode selain GET (POST tidak boleh di-cache)
    if (event.request.url.includes('script.google.com') || event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Gunakan cache jika ada
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Jika tidak ada di cache, ambil dari network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache response baru yang valid (status 200)
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
                        // Jika offline dan membuka halaman utama, sajikan index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// ============================================
// MESSAGE EVENT - Perintah dari Aplikasi Utama
// ============================================
self.addEventListener('message', (event) => {
    // Digunakan saat tombol "Update Sekarang" di klik di UI (SKIP_WAITING)
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] User triggered SKIP_WAITING');
        self.skipWaiting();
    }
});
