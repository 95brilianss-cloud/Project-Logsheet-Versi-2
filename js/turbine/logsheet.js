// js/turbine/logsheet.js
// ============================================
// TURBINE LOGSHEET - CORE LOGIC
// Area list, parameter input, progress, photo validation, draft, submit
// ============================================

import { 
  AREAS, 
  INPUT_TYPES, 
  DRAFT_KEYS, 
  PHOTO_DRAFT_KEYS,
  GAS_URL 
} from '../config/constants.js';

import { 
  saveTurbineDraft, 
  loadTurbineDraft, 
  saveParamPhotos, 
  loadParamPhotos, 
  addToOfflineLogsheet 
} from '../utils/storage.js';

import { 
  showCustomAlert, 
  showUploadProgress, 
  navigateTo 
} from '../utils/ui.js';

import { getCurrentUser, requireAuth } from '../utils/auth.js';

// ============================================
// State Khusus Turbine
// ============================================

let lastData = {};
let currentInput = {};                // { "Steam Inlet Turbine": { "param1": "value", ... } }
let activeArea = "";
let activeIdx = 0;
let totalParams = 0;
let currentInputType = 'text';
let currentParamPhoto = null;         // foto sementara untuk parameter saat ini
let paramPhotos = {};                 // { "areaName": { "paramName": base64string, ... } }

// ============================================
// Inisialisasi & Load Draft
// ============================================

export function initTurbineLogsheet() {
  try {
    currentInput = loadTurbineDraft();
    paramPhotos = loadParamPhotos();

    totalParams = Object.values(AREAS).reduce((acc, arr) => acc + arr.length, 0);

    console.log('[TURBINE] Logsheet diinisialisasi. Draft terload:', 
      Object.keys(currentInput).length, 'areas');
  } catch (err) {
    console.error('[TURBINE] Gagal inisialisasi draft:', err);
    currentInput = {};
    paramPhotos = {};
  }
}

// ============================================
// Fetch & Tampilkan Data Terakhir
// ============================================

export function fetchLastData() {
  const timeout = setTimeout(() => renderAreaList(), 8000);
  const callbackName = 'jsonp_turbine_' + Date.now();

  window[callbackName] = (data) => {
    clearTimeout(timeout);
    lastData = data || {};
    cleanupJSONP(callbackName);
    renderAreaList();
  };

  const script = document.createElement('script');
  script.src = `${GAS_URL}?action=getLastTurbine&callback=${callbackName}`;
  script.onerror = () => {
    clearTimeout(timeout);
    cleanupJSONP(callbackName);
    renderAreaList();
  };
  document.body.appendChild(script);
}

function cleanupJSONP(name) {
  if (window[name]) delete window[name];
}

// ============================================
// Render Daftar Area + Progress
// ============================================

export function renderAreaList() {
  const container = document.getElementById('areaList');
  if (!container) return;

  let completedAreas = 0;
  let html = '';

  Object.entries(AREAS).forEach(([areaName, params]) => {
    const areaData = currentInput[areaName] || {};
    const filled = Object.keys(areaData).length;
    const total = params.length;
    const percent = Math.round((filled / total) * 100);
    const isCompleted = filled === total && total > 0;

    if (isCompleted) completedAreas++;

    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (percent / 100) * circumference;

    const hasAbnormal = params.some(p => {
      const val = areaData[p] || '';
      return val.includes('ERROR') || val.includes('MAINTENANCE') || val.includes('NOT_INSTALLED');
    });

    html += `
      <div class="area-item ${isCompleted ? 'completed' : ''} ${hasAbnormal ? 'has-warning' : ''}" 
           onclick="openTurbineArea('${areaName}')">
        <div class="area-progress-ring">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
            <circle cx="20" cy="20" r="18" fill="none" stroke="${isCompleted ? '#10b981' : '#3b82f6'}" 
                    stroke-width="3" stroke-linecap="round" 
                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
                    transform="rotate(-90 20 20)"/>
            <text x="20" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${isCompleted ? '#10b981' : '#f8fafc'}">
              ${filled}
            </text>
          </svg>
        </div>
        <div class="area-info">
          <div class="area-name">${areaName}</div>
          <div class="area-meta ${hasAbnormal ? 'warning' : ''}">
            ${hasAbnormal ? '⚠️ Ada parameter bermasalah • ' : ''}${filled}/${total}
          </div>
        </div>
        <div class="area-status">
          ${hasAbnormal ? '<span style="color:#ef4444;margin-right:4px;">!</span>' : ''}
          ${isCompleted ? '✓' : '❯'}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Tampilkan tombol submit jika ada data
  const submitBtn = document.getElementById('turbineSubmitBtn');
  if (submitBtn) {
    submitBtn.style.display = Object.keys(currentInput).length > 0 ? 'flex' : 'none';
  }

  updateTurbineOverallProgress(completedAreas, Object.keys(AREAS).length);
}

function updateTurbineOverallProgress(completed, total) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const elPercent = document.getElementById('overallPercent');
  const elBar = document.getElementById('overallProgressBar');

  if (elPercent) elPercent.textContent = `${percent}%`;
  if (elBar) elBar.style.width = `${percent}%`;
}

// ============================================
// Buka Area & Mulai Input Step-by-Step
// ============================================

export function openTurbineArea(areaName) {
  if (!requireAuth()) return;

  activeArea = areaName;
  activeIdx = 0;

  navigateTo('paramScreen');
  const titleEl = document.getElementById('currentAreaName');
  if (titleEl) titleEl.textContent = areaName;

  renderProgressDots();
  showTurbineStep();
}

// ============================================
// Progress Dots (visualisasi step)
// ============================================

function renderProgressDots() {
  const container = document.getElementById('progressDots');
  if (!container) return;

  const params = AREAS[activeArea] || [];
  let html = '';

  params.forEach((label, idx) => {
    const value = currentInput[activeArea]?.[label] || '';
    const isFilled = value.trim() !== '';
    const isActive = idx === activeIdx;
    const firstLine = value.split('\n')[0];
    const hasIssue = ['ERROR','MAINTENANCE','NOT_INSTALLED'].includes(firstLine);

    let className = '';
    if (isActive) className = 'active';
    else if (hasIssue) className = 'has-issue';
    else if (isFilled) className = 'filled';

    html += `<div class="progress-dot ${className}" 
                  onclick="jumpToTurbineStep(${idx})" 
                  title="${hasIssue ? firstLine : ''}"></div>`;
  });

  container.innerHTML = html;
}

export function jumpToTurbineStep(index) {
  saveCurrentTurbineStep(); // simpan dulu step saat ini
  activeIdx = index;
  showTurbineStep();
  renderProgressDots();
}

// ============================================
// Tampilkan Step Saat Ini
// ============================================

function showTurbineStep() {
  const params = AREAS[activeArea];
  if (!params || activeIdx >= params.length) return;

  const fullLabel = params[activeIdx];
  const paramName = fullLabel.split(' (')[0];
  const unit = fullLabel.match(/\(([^)]+)\)/)?.[1] || '';

  // Update UI
  document.getElementById('stepInfo')?.setAttribute('data-step', `${activeIdx + 1}/${params.length}`);
  document.getElementById('labelInput')?.textContent = paramName;
  document.getElementById('unitDisplay')?.textContent = unit || '--';
  document.getElementById('lastTimeLabel')?.textContent = lastData._lastTime || '--:--';

  // Tampilkan nilai terakhir
  const prevVal = lastData[fullLabel] || '--';
  document.getElementById('prevValDisplay')?.textContent = prevVal;

  // Deteksi tipe input
  const inputType = detectInputType(fullLabel);
  currentInputType = inputType.type;

  const inputContainer = document.getElementById('inputFieldContainer');
  if (inputContainer) {
    if (inputType.type === 'select') {
      let currentVal = currentInput[activeArea]?.[fullLabel] || '';
      if (currentVal.includes('\n')) currentVal = currentVal.split('\n')[0];

      let options = '<option value="" disabled>Pilih...</option>';
      inputType.options.forEach(opt => {
        const selected = currentVal === opt ? 'selected' : '';
        options += `<option value="${opt}" ${selected}>${opt}</option>`;
      });

      inputContainer.innerHTML = `
        <select id="valInput" class="status-select">${options}</select>
      `;
    } else {
      const currentVal = currentInput[activeArea]?.[fullLabel] || '';
      inputContainer.innerHTML = `
        <input type="text" id="valInput" inputmode="decimal" 
               placeholder="0.00" value="${currentVal}" autocomplete="off">
      `;
    }
  }

  // Load status abnormal & foto
  loadAbnormalStatus(fullLabel);
  loadParamPhotoForCurrentStep();

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('valInput');
    if (input && inputType.type === 'text') {
      input.focus();
      input.select();
    }
  }, 100);
}

function detectInputType(label) {
  for (const [key, config] of Object.entries(INPUT_TYPES)) {
    if (config.patterns.some(p => label.includes(p))) {
      return {
        type: 'select',
        options: config.options[label.match(/\(([^)]+)\)/)?.[1]] || ['A','B']
      };
    }
  }
  return { type: 'text' };
}

// ============================================
// Simpan Step Saat Ini
// ============================================

export function saveCurrentTurbineStep() {
  const input = document.getElementById('valInput');
  if (!input) return;

  const fullLabel = AREAS[activeArea][activeIdx];
  if (!currentInput[activeArea]) currentInput[activeArea] = {};

  let value = input.value.trim();

  // Jika ada status abnormal (ERROR, MAINTENANCE, dll)
  const checked = document.querySelector('input[name="paramStatus"]:checked');
  const note = document.getElementById('statusNote')?.value?.trim() || '';

  if (checked) {
    value = checked.value;
    if (note) value += '\n' + note;
  }

  if (value) {
    currentInput[activeArea][fullLabel] = value;
  } else {
    delete currentInput[activeArea][fullLabel];
  }

  saveTurbineDraft(currentInput);
  renderProgressDots();
}

// ============================================
// Foto Validasi Parameter
// ============================================

function loadParamPhotoForCurrentStep() {
  const fullLabel = AREAS[activeArea]?.[activeIdx];
  if (!fullLabel) return;

  currentParamPhoto = paramPhotos[activeArea]?.[fullLabel] || null;

  const preview = document.getElementById('paramPhotoPreview');
  if (preview) {
    if (currentParamPhoto) {
      preview.src = currentParamPhoto;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }
}

export function handleParamPhoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      // Kompresi gambar (jika fungsi compressImage sudah ada di compression.js)
      // const compressed = await compressImage(ev.target.result, { quality: 0.7, maxWidth: 1280 });

      const base64 = ev.target.result; // atau compressed.dataUrl

      if (!paramPhotos[activeArea]) paramPhotos[activeArea] = {};
      paramPhotos[activeArea][AREAS[activeArea][activeIdx]] = base64;

      saveParamPhotos(paramPhotos);
      loadParamPhotoForCurrentStep();

      showCustomAlert('Foto berhasil ditambahkan untuk parameter ini', 'success');
    } catch (err) {
      console.error('[TURBINE] Gagal proses foto:', err);
      showCustomAlert('Gagal memproses foto', 'error');
    }
  };
  reader.readAsDataURL(file);
}

// ============================================
// Submit Logsheet Turbine
// ============================================

export async function submitTurbineLogsheet() {
  if (!requireAuth()) return;

  const progress = showUploadProgress('Mengirim Logsheet Turbine...');
  const controller = new AbortController();

  let allParams = {};
  Object.entries(currentInput).forEach(([area, params]) => {
    Object.assign(allParams, params);
  });

  const payload = {
    type: 'LOGSHEET_TURBINE',
    Operator: getCurrentUser()?.name || 'Unknown',
    OperatorId: getCurrentUser()?.id || 'Unknown',
    photoCount: countTotalPhotos(),
    Timestamp: new Date().toISOString(),
    ...allParams
  };

  // Kirim foto terpisah jika ada
  if (Object.keys(paramPhotos).length > 0) {
    progress.updateText(`Mengirim ${countTotalPhotos()} foto...`);

    for (const [area, areaPhotos] of Object.entries(paramPhotos)) {
      for (const [param, photoBase64] of Object.entries(areaPhotos)) {
        try {
          const photoPayload = {
            type: 'LOGSHEET_PHOTO',
            parentType: 'LOGSHEET_TURBINE',
            Operator: getCurrentUser()?.name || 'Unknown',
            photoKey: `${area}__${param}`,
            photo: photoBase64,
            timestamp: new Date().toISOString()
          };

          await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(photoPayload)
          });

          await new Promise(r => setTimeout(r, 200)); // delay antar foto
        } catch (err) {
          console.warn('[TURBINE] Gagal kirim foto:', err);
        }
      }
    }
  }

  progress.updateText('Mengirim data parameter...');

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });

    progress.complete();
    showCustomAlert('✓ Logsheet Turbine berhasil dikirim!', 'success');

    // Bersihkan draft
    currentInput = {};
    paramPhotos = {};
    saveTurbineDraft({});
    saveParamPhotos({});

    setTimeout(() => navigateTo('homeScreen'), 1500);
  } catch (err) {
    console.error('[TURBINE] Submit gagal:', err);
    progress.error();

    addToOfflineLogsheet(payload, 'turbine');
    showCustomAlert('Gagal mengirim. Data disimpan lokal (mode offline).', 'error');
  }
}

function countTotalPhotos() {
  let count = 0;
  Object.values(paramPhotos).forEach(area => {
    count += Object.keys(area).length;
  });
  return count;
}

// ============================================
// Helper Lain
// ============================================

function loadAbnormalStatus(fullLabel) {
  // Reset status
  document.querySelectorAll('input[name="paramStatus"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.status-chip')?.classList.remove('active');
  });

  const noteContainer = document.getElementById('statusNoteContainer');
  const noteInput = document.getElementById('statusNote');
  const valInput = document.getElementById('valInput');

  if (noteContainer) noteContainer.style.display = 'none';
  if (noteInput) noteInput.value = '';

  if (valInput) {
    valInput.disabled = false;
    valInput.style.opacity = '1';
  }

  const saved = currentInput[activeArea]?.[fullLabel];
  if (!saved) return;

  const lines = saved.split('\n');
  const first = lines[0];

  if (['ERROR','MAINTENANCE','NOT_INSTALLED'].includes(first)) {
    const cb = document.querySelector(`input[value="${first}"]`);
    if (cb) {
      cb.checked = true;
      cb.closest('.status-chip')?.classList.add('active');
      if (noteContainer) noteContainer.style.display = 'block';
      if (noteInput) noteInput.value = lines[1] || '';

      if (first === 'NOT_INSTALLED' && valInput) {
        valInput.value = '-';
        valInput.disabled = true;
        valInput.style.opacity = '0.5';
      }
    }
  } else if (valInput) {
    valInput.value = saved;
  }
}

// Export fungsi utama yang dipanggil dari HTML / main
export {
  initTurbineLogsheet,
  fetchLastData,
  renderAreaList,
  openTurbineArea,
  jumpToTurbineStep,
  saveCurrentTurbineStep,
  showTurbineStep,
  renderProgressDots,
  handleParamPhoto,
  submitTurbineLogsheet
};
