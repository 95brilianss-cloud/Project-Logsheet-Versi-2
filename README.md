# Project-Logsheet-Versi-2
Project Logsheet Versi 2
turbine-logsheet-pro/
├── index.html                  # entry point utama
├── manifest.json               # PWA manifest
├── sw.js                       # Service Worker
├── assets/
│   ├── css/
│   │   └── main.css            # atau pakai tailwind / bootstrap
│   └── images/                 # logo, icons, dll
├── js/
│   ├── main.js                 # hanya inisialisasi & event listener utama
│   │
│   ├── config/
│   │   ├── constants.js        # semua CONSTANTS & CONFIG
│   │   └── areas.js            # AREAS, AREAS_CT, BALANCING_FIELDS, dll
│   │
│   ├── utils/
│   │   ├── storage.js          # localStorage, draft, session handling
│   │   ├── auth.js             # login, logout, session, user cache
│   │   ├── ui.js               # showAlert, navigateTo, custom alert, toast
│   │   ├── compression.js      # fungsi compressImage
│   │   ├── network.js          # fetch wrapper, JSONP cleanup, offline handling
│   │   └── format.js           # format nomor, tanggal, WhatsApp message
│   │
│   ├── core/
│   │   ├── state.js            # global state (currentInput, lastData, dll)
│   │   └── init.js             # initState, register SW, dll
│   │
│   ├── turbine/
│   │   ├── turbine-logsheet.js     # area list, param input, progress, foto
│   │   └── turbine-submit.js       # submit logsheet turbine
│   │
│   ├── ct/
│   │   ├── ct-logsheet.js          # CT area, param, progress, foto
│   │   └── ct-submit.js            # submit logsheet CT
│   │
│   ├── balancing/
│   │   ├── balancing.js            # balancing form, calculation, whatsapp
│   │   └── balancing-submit.js     # submit balancing
│   │
│   ├── tpm/
│   │   └── tpm.js                  # TPM input & foto
│   │
│   ├── admin/
│   │   ├── user-management.js      # manajemen user, add user, toggle status
│   │   └── branch-menu.js          # popup branch & admin visibility
│   │
│   └── pwa/
│       ├── install.js              # PWA install prompt & banner
│       └── update.js               # service worker update detection
└── README.md
