// js/ct/logsheet.js
// ============================================
// COOLING TOWER (CT) LOGSHEET - CORE LOGIC
// Area list, parameter input, progress, photo validation, draft, submit
// ============================================

import { 
  AREAS_CT, 
  DRAFT_KEYS_CT, 
  PHOTO_DRAFT_KEYS,
  GAS_URL 
} from '../config/constants.js';

import { 
  saveCTDraft, 
  loadCTDraft, 
  saveCTParamPhotos, 
  loadCTParamPhotos, 
  addToOfflineLogsheet 
} from '../utils/storage.js';

import { 
  showCustomAlert, 
  showUploadProgress, 
  navigateTo 
} from '../utils/ui.js';

import { getCurrentUser, requireAuth } from '../utils/auth.js';

// ============================================
// State Khusus CT
// ============================================

let lastDataCT = {};
let currentInputCT = {};              // { "BASIN SA": { "param1": "value", ... } }
let activeAreaCT = "";
let activeIdxCT = 0;
let totalParamsCT = 0;
let currentInputTypeCT = 'text';
let currentCTParamPhoto = null;       // foto sementara untuk parameter CT saat ini
let ctParamPhotos = {};               // { "areaName": { "paramName": base64string, ... } }

// ============================================
// Inisialisasi & Load Draft CT
// ============================================

export function initCTLogsheet() {
  try {
    currentInputCT = loadCTDraft();
    ctParamPhotos = loadCTParamPhotos();

    totalParamsCT = Object.values(AREAS_CT).reduce((acc, arr) => acc + arr.length, 0);

    console.log('[CT] Logsheet diinisialisasi. Draft terload:', 
      Object.keys(currentInputCT).length, 'areas');
  } catch (err) {
    console.error('[CT] Gagal inisialisasi draft CT:', err);
    currentInputCT = {};
    ctParamPhotos = {};
  }
}

// ============================================
// Fetch & Tampilkan Data Terakhir CT
// ============================================

export function fetchLastDataCT() {
  const timeout = setTimeout(() => renderCTAreaList(), 8000);
  const callbackName = 'jsonp_ct_' + Date.now();

  window[callbackName] = (data) => {
    clearTimeout(timeout);
    lastDataCT = data || {};
    cleanupJSONP(callbackName);
    renderCTAreaList();
  };

  const script = document.createElement('script');
  script.src = `${GAS_URL}?action=getLastCT&callback=${callbackName}`;
  script.onerror = () => {
    clearTimeout(timeout);
    cleanupJSONP(callbackName);
    renderCTAreaList();
  };
  document.body.appendChild(script);
}

function cleanupJSONP(name) {
  if (window[name]) delete window[name];
}

// ============================================
// Render Daftar Area CT + Progress
// ============================================

export function renderCTAreaList() {
  const container = document.getElementById('ctAreaList');
  if (!container) return;

  let completedAreas = 0;
  let html = '';

  Object.entries(AREAS_CT).forEach(([areaName, params]) => {
    const areaData = currentInputCT[areaName] || {};
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
           onclick="openCTArea('${areaName}')">
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

  // Tampilkan tombol submit jika ada input
  const submitBtn = document.getElementById('ctSubmitBtn');
  if (submitBtn) {
    submitBtn.style.display = Object.keys(currentInputCT).length > 0 ? 'flex' : 'none';
  }

  updateCTOverallProgress(completedAreas, Object.keys(AREAS_CT).length);
}

function updateCTOverallProgress(completed, total) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const elText = document.getElementById('ctProgressText');
  const elPercent = document.getElementById('ctOverallPercent');
  const elBar = document.getElementById('ctOverallProgressBar');

  if (elText) elText.textContent = `${percent}% Complete`;
  if (elPercent) elPercent.textContent = `${percent}%`;
  if (elBar) elBar.style.width = `${percent}%`;
}

// ============================================
// Buka Area CT & Mulai Input Step-by-Step
// ============================================

export function openCTArea(areaName) {
  if (!requireAuth()) return;

  activeAreaCT = areaName;
  activeIdxCT = 0;

  navigateTo('ctParamScreen');
  const titleEl = document.getElementById('ctCurrentAreaName');
  if (titleEl) titleEl.textContent = areaName;

  renderCTProgressDots();
  showCTStep();
}

// ============================================
// Progress Dots untuk CT
// ============================================

function renderCTProgressDots() {
  const container = document.getElementById('ctProgressDots');
  if (!container) return;

  const params = AREAS_CT[activeAreaCT] || [];
  let html = '';

  params.forEach((label, idx) => {
    const value = currentInputCT[activeAreaCT]?.[label] || '';
    const isFilled = value.trim() !== '';
    const isActive = idx === activeIdxCT;
    const firstLine = value.split('\n')[0];
    const hasIssue = ['ERROR','MAINTENANCE','NOT_INSTALLED'].includes(firstLine);

    let className = '';
    if (isActive) className = 'active';
    else if (hasIssue) className = 'has-issue';
    else if (isFilled) className = 'filled';

    html += `<div class="progress-dot ${className}" 
                  onclick="jumpToCTStep(${idx})" 
                  title="${hasIssue ? firstLine : ''}"></div>`;
  });

  container.innerHTML = html;
}

export function jumpToCTStep(index) {
  saveCurrentCTStep(); // simpan step saat ini dulu
  activeIdxCT = index;
  showCTStep();
  renderCTProgressDots();
}

// ============================================
// Tampilkan Step CT Saat Ini
// ============================================

function showCTStep() {
  const params = AREAS_CT[activeAreaCT];
  if (!params || activeIdxCT >= params.length) return;

  const fullLabel = params[activeIdxCT];
  const paramName = fullLabel.split(' (')[0];
  const unit = fullLabel.match(/\(([^)]+)\)/)?.[1] || '';

  // Update UI
  document.getElementById('ctStepInfo')?.textContent = `Step ${activeIdxCT + 1}/${params.length}`;
  document.getElementById('ctLabelInput')?.textContent = paramName;
  document.getElementById('ctUnitDisplay')?.textContent = unit || '--';
  document.getElementById('ctLastTimeLabel')?.textContent = lastDataCT._lastTime || '--:--';

  // Nilai terakhir
  let prevVal = lastDataCT[fullLabel] || '--';
  if (prevVal !== '--') {
    const lines = prevVal.toString().split('\n');
    if (['ERROR','MAINTENANCE','NOT_INSTALLED'].includes(lines[0])) {
      prevVal = lines[0] + (lines[1] ? ' - ' + lines[1] : '');
    }
  }
  document.getElementById('ctPrevValDisplay')?.textContent = prevVal;

  // Deteksi tipe input
  const inputType = detectCTInputType(fullLabel);
  currentInputTypeCT = inputType.type;

  const inputContainer = document.getElementById('ctInputFieldContainer');
  if (inputContainer) {
    if (inputType.type === 'select') {
      let currentVal = currentInputCT[activeAreaCT]?.[fullLabel] || '';
      if (currentVal.includes('\n')) currentVal = currentVal.split('\n')[0];

      let options = '<option value="" disabled>Pilih Status...</option>';
      inputType.options.forEach(opt => {
        const selected = currentVal === opt ? 'selected' : '';
        options += `<option value="${opt}" ${selected}>${opt}</option>`;
      });

      inputContainer.innerHTML = `
        <div class="select-wrapper">
          <select id="ctValInput" class="status-select">${options}</select>
          <div class="select-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      `;
    } else {
      const currentVal = currentInputCT[activeAreaCT]?.[fullLabel] || '';
      inputContainer.innerHTML = `
        <input type="text" id="ctValInput" inputmode="decimal" 
               placeholder="0.00" value="${currentVal}" autocomplete="off">
      `;
    }
  }

  // Load status abnormal & foto
  loadCTAbnormalStatus(fullLabel);
  loadCTParamPhotoForCurrentStep();

  // Focus
  setTimeout(() => {
    const input = document.getElementById('ctValInput');
    if (input && currentInputTypeCT === 'text' && !input.disabled) {
      input.focus();
      input.select();
    }
  }, 100);
}

function detectCTInputType(label) {
  if (label.includes('(A/M)') || label.includes('(A/B)')) {
    return {
      type: 'select',
      options: label.includes('(A/M)') 
        ? ['Auto', 'Manual'] 
        : ['A', 'B', 'AB']
    };
  }
  if (label.includes('STATUS') || label.includes('Running') || label.includes('ON/OFF')) {
    return {
      type: 'select',
      options: ['Running', 'Stop', 'Standby']
    };
  }
  return { type: 'text' };
}

// ============================================
// Simpan Step CT Saat Ini
// ============================================

export function saveCurrentCTStep() {
  const input = document.getElementById('ctValInput');
  if (!input) return;

  const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
  if (!currentInputCT[activeAreaCT]) currentInputCT[activeAreaCT] = {};

  let value = input.value.trim();

  const checked = document.querySelector('input[name="ctParamStatus"]:checked');
  const note = document.getElementById('ctStatusNote')?.value?.trim() || '';

  if (checked) {
    value = checked.value;
    if (note) value += '\n' + note;
  }

  if (value) {
    currentInputCT[activeAreaCT][fullLabel] = value;
  } else {
    delete currentInputCT[activeAreaCT][fullLabel];
  }

  saveCTDraft(currentInputCT);
  renderCTProgressDots();
}

// ============================================
// Foto Validasi Parameter CT
// ============================================

function loadCTParamPhotoForCurrentStep() {
  const fullLabel = AREAS_CT[activeAreaCT]?.[activeIdxCT];
  if (!fullLabel) return;

  currentCTParamPhoto = ctParamPhotos[activeAreaCT]?.[fullLabel] || null;

  const preview = document.getElementById('ctParamPhotoPreview');
  if (preview) {
    if (currentCTParamPhoto) {
      preview.src = currentCTParamPhoto;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }
}

export function handleCTParamPhoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const base64 = ev.target.result; // bisa dikompres jika ada fungsi compressImage

      if (!ctParamPhotos[activeAreaCT]) ctParamPhotos[activeAreaCT] = {};
      ctParamPhotos[activeAreaCT][AREAS_CT[activeAreaCT][activeIdxCT]] = base64;

      saveCTParamPhotos(ctParamPhotos);
      loadCTParamPhotoForCurrentStep();

      showCustomAlert('Foto berhasil ditambahkan untuk parameter CT ini', 'success');
    } catch (err) {
      console.error('[CT] Gagal proses foto:', err);
      showCustomAlert('Gagal memproses foto', 'error');
    }
  };
  reader.readAsDataURL(file);
}

// ============================================
// Submit Logsheet CT
// ============================================

export async function sendCTToSheet() {
  if (!requireAuth()) return;

  const progress = showUploadProgress('Mengirim Logsheet CT & Foto...');
  const controller = new AbortController();

  let allParameters = {};
  Object.entries(currentInputCT).forEach(([area, params]) => {
    Object.assign(allParameters, params);
  });

  const payload = {
    type: 'LOGSHEET_CT',
    Operator: getCurrentUser()?.name || 'Unknown',
    OperatorId: getCurrentUser()?.id || 'Unknown',
    photoCount: countCTPhotos(),
    Timestamp: new Date().toISOString(),
    ...allParameters
  };

  // Kirim foto satu per satu (hindari payload terlalu besar)
  if (Object.keys(ctParamPhotos).length > 0) {
    progress.updateText(`Mengirim ${countCTPhotos()} foto...`);

    for (const [area, areaPhotos] of Object.entries(ctParamPhotos)) {
      for (const [param, photoBase64] of Object.entries(areaPhotos)) {
        try {
          const photoPayload = {
            type: 'LOGSHEET_PHOTO',
            parentType: 'LOGSHEET_CT',
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

          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.warn('[CT] Gagal kirim foto:', err);
        }
      }
    }
  }

  progress.updateText('Mengirim data parameter CT...');

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });

    progress.complete();
    showCustomAlert('✓ Logsheet CT berhasil dikirim ke sistem!', 'success');

    // Bersihkan draft
    currentInputCT = {};
    ctParamPhotos = {};
    saveCTDraft({});
    saveCTParamPhotos({});

    setTimeout(() => navigateTo('homeScreen'), 1500);
  } catch (err) {
    console.error('[CT] Submit gagal:', err);
    progress.error();

    addToOfflineLogsheet(payload, 'ct');
    showCustomAlert('Gagal mengirim. Data dan foto disimpan lokal.', 'error');
  }
}

function countCTPhotos() {
  let count = 0;
  Object.values(ctParamPhotos).forEach(area => {
    count += Object.keys(area).length;
  });
  return count;
}

// ============================================
// Load Status Abnormal CT
// ============================================

function loadCTAbnormalStatus(fullLabel) {
  document.querySelectorAll('input[name="ctParamStatus"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.status-chip')?.classList.remove('active');
  });

  const noteContainer = document.getElementById('ctStatusNoteContainer');
  const noteInput = document.getElementById('ctStatusNote');
  const valInput = document.getElementById('ctValInput');

  if (noteContainer) noteContainer.style.display = 'none';
  if (noteInput) noteInput.value = '';

  if (valInput) {
    valInput.disabled = false;
    valInput.style.opacity = '1';
  }

  const saved = currentInputCT[activeAreaCT]?.[fullLabel];
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

// Export fungsi utama
export {
  initCTLogsheet,
  fetchLastDataCT,
  renderCTAreaList,
  openCTArea,
  jumpToCTStep,
  saveCurrentCTStep,
  showCTStep,
  renderCTProgressDots,
  handleCTParamPhoto,
  sendCTToSheet
};
