// ============================================
// SERVICE WORKER - TURBINE LOGSHEET PRO
// ============================================
// CATATAN: Versi di sini otomatis tersinkron dengan js/config.js
// melalui URL parameter saat registrasi di js/main.js
// ============================================

// Ambil versi dari URL parameter (dikirim dari main.js saat register)
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
    
    // PWA Icons
    './icon-192x192.png',
    './icon-512x512.png'
];

// ============================================
// INSTALL EVENT - Cache assets
// ============================================
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${VERSION}...`);

    // JANGAN panggil self.skipWaiting() di sini agar browser 
    // bisa mendeteksi status "waiting" untuk memicu notifikasi update di UI.
    
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
                    // Hapus cache versi lama yang dimulai dengan "turbine-logsheets-"
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('turbine-logsheets-')) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Mengambil kendali client segera setelah SW aktif
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH EVENT - Network First / Cache Fallback
// ============================================
self.addEventListener('fetch', (event) => {
    // Abaikan request API ke Google Apps Script (GAS) agar data selalu fresh
    // Abaikan juga metode selain GET (POST untuk simpan data tidak boleh di-cache)
    if (event.request.url.includes('script.google.com') || event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {
                        // Hanya cache response yang valid (status 200)
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
                        // Jika offline dan file tidak ada di cache, berikan respons sederhana
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return new Response('Koneksi terputus. Data tidak tersedia di offline cache.', { 
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// ============================================
// MESSAGE EVENT - Handle perintah dari Main App
// ============================================
self.addEventListener('message', (event) => {
    // Digunakan saat tombol "Update Sekarang" di klik di UI
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting triggered by user interaction');
        self.skipWaiting();
    }
});
