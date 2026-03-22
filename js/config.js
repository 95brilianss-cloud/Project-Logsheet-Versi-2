// ============================================
// CONFIGURATION - TURBINE LOGSHEET PRO
// ============================================
// Versi ini digunakan untuk sinkronisasi Service Worker dan UI
const APP_VERSION = '2.0.0'; 
const APP_NAME = 'Turbine Logsheet Pro';

// URL Google Apps Script Backend (Ganti dengan URL Deployment Anda)
const GAS_URL = "https://script.google.com/macros/s/AKfycbwQi2_FjAH6rLX3oKeZ7JJbftMiU99NYKhEzfPxPQ_68RHJDMKxaPVyqVDbWbbk46T_/exec";

// Konfigurasi Autentikasi
const AUTH_CONFIG = {
    SESSION_KEY: 'turbine_session',
    USER_KEY: 'turbine_user',
    USERS_CACHE_KEY: 'turbine_users_cache',
    SESSION_DURATION: 8 * 60 * 60 * 1000,        // Sesi aktif 8 jam
    REMEMBER_ME_DURATION: 30 * 24 * 60 * 60 * 1000  // Ingat saya 30 hari
};

// Kunci Penyimpanan LocalStorage (Draft & Offline)
const DRAFT_KEYS = {
    LOGSHEET: 'draft_turbine',
    LOGSHEET_BACKUP: 'draft_turbine_backup',
    BALANCING: 'balancing_draft',
    TPM_OFFLINE: 'tpm_offline',
    LOGSHEET_OFFLINE: 'offline_logsheets',
    BALANCING_OFFLINE: 'balancing_offline',
    TPM_HISTORY: 'tpm_history',
    BALANCING_HISTORY: 'balancing_history'
};

const DRAFT_KEYS_CT = {
    LOGSHEET: 'draft_ct_logsheet',
    OFFLINE: 'offline_ct_logsheets'
};

const PHOTO_DRAFT_KEYS = {
    TURBINE: 'draft_turbine_photos',
    CT: 'draft_ct_photos'
};

// ============================================
// DATA STRUKTUR AREA & PARAMETER
// ============================================

// Struktur Area Turbine Logsheet
const AREAS = {
    "Steam Inlet Turbine": [
        "MPS Inlet 30-TP-6101 PI-6114 (kg/cm2)", 
        "MPS Inlet 30-TP-6101 TI-6153 (°C)", 
        "MPS Inlet 30-TP-6101 PI-6116 (kg/cm2)", 
        "LPS Extrac 30-TP-6101 PI-6123 (kg/cm2)", 
        "Gland Steam TI-6156 (°C)", 
        "MPS Inlet 30-TP-6101 PI-6108 (Kg/cm2)", 
        "Exhaust Steam PI-6111 (kg/cm2)", 
        "Gland Steam PI-6118 (Kg/cm2)"
    ],
    "Low Pressure Steam": [
        "LPS from U-6101 PI-6104 (kg/cm2)", 
        "LPS from U-6101 TI-6102 (°C)", 
        "LPS Header PI-6106 (Kg/cm2)", 
        "LPS Header TI-6107 (°C)"
    ],
    "Lube Oil": [
        "Lube Oil 30-TK-6102 LI-6104 (%)", 
        "Lube Oil 30-TK-6102 TI-6125 (°C)", 
        "Lube Oil 30-C-6101 (On/Off)", 
        "Lube Oil 30-EH-6102 (On/Off)", 
        "Lube Oil Cartridge FI-6143 (%)", 
        "Lube Oil Cartridge PI-6148 (mmH2O)", 
        "Lube Oil PI-6145 (kg/cm2)", 
        "Lube Oil TI-6127 (°C)", 
        "Lube Oil PDI-6146 (Kg/cm2)", 
        "Lube Oil TI-6144 (°C)", 
        "Lube Oil TI-6146 (°C)", 
        "Lube Oil TI-6145 (°C)"
    ],
    "Control Oil": [
        "Control Oil 30-TK-6103 LI-6106 (%)", 
        "Control Oil 30-TK-6103 TI-6128 (°C)", 
        "Control Oil P-6106 (A/B)", 
        "Control Oil FIL-6103 (A/B)", 
        "Control Oil PI-6152 (Bar)"
    ],
    "BFW System": [
        "Condensate Tank TK-6201 (%)", 
        "Condensate Tank TI-6216 (°C)", 
        "P-6202 (A/B)", 
        "P-6202 Suction (kg/cm2)", 
        "P-6202 Discharge (kg/cm2)", 
        "Deaerator LI-6202 (%)", 
        "Deaerator TI-6201 (°C)", 
        "30-P-6201 (A/B)", 
        "Condensate Drum 30-D-6201 LI-6209 (%)"
    ]
};

// Struktur Area Cooling Tower Logsheet
const AREAS_CT = {
    "BASIN SA": [
        "D-6511 LEVEL BASIN",
        "D-6511 PH BASIN", 
        "30-P-6511 A PRESS (kg/cm2)", 
        "30-P-6511 B PRESS (kg/cm2)", 
        "MT-6511 A STATUS", 
        "MT-6511 B STATUS"
    ], 
    "BASIN SU": [
        "D-6521 LEVEL BASIN",
        "D-6521 PH BASIN", 
        "30-P-6521 A PRESS (kg/cm2)", 
        "30-P-6521 B PRESS (kg/cm2)", 
        "MT-6521 A STATUS", 
        "MT-6521 B STATUS"
    ]
};

// Mapping Tipe Input Khusus (Status Pompa/Mesin)
const INPUT_TYPES = {
    PUMP_STATUS: {
        patterns: ['(A/B)', '(ON/OFF)', '(On/Off)', '(Running/Stop)', '(Remote/Running/Stop)', '(A/M)'],
        options: {
            '(A/B)': ['A', 'B', 'AB'],
            '(ON/OFF)': ['ON', 'OFF'],
            '(On/Off)': ['On', 'Off'],
            '(Running/Stop)': ['Running', 'Stop'],
            '(Remote/Running/Stop)': ['Remote', 'Running', 'Stop'],
            '(A/M)': ['Auto', 'Manual']
        }
    }
};

// Field untuk Form Balancing
const BALANCING_FIELDS = [
    'balancingDate', 'balancingTime', 'loadMW', 'eksporMW',
    'plnMW', 'ubbMW', 'pieMW', 'tg65MW', 'tg66MW', 'gtgMW',
    'ss6500MW', 'ss2000Via', 'activePowerMW', 'reactivePowerMVAR', 
    'currentS', 'voltageV', 'hvs65l02MW', 'hvs65l02Current', 'total3BMW',
    'fq1105', 'stgSteam', 'pa2Steam', 'puri2Steam', 'melterSA2', 
    'ejectorSteam', 'glandSealSteam', 'deaeratorSteam', 'dumpCondenser', 'pcv6105',
    'pi6122', 'ti6112', 'ti6146', 'ti6126', 'axialDisplacement', 'vi6102', 'te6134',
    'ctSuFan', 'ctSuPompa', 'ctSaFan', 'ctSaPompa', 'kegiatanShift'
];
