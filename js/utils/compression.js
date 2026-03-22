// js/utils/compression.js
// ============================================
// IMAGE COMPRESSION UTILITY
// Mengurangi ukuran file foto sebelum disimpan ke draft atau dikirim ke server
// Menggunakan Canvas API - tanpa library tambahan
// ============================================

/**
 * Mengompresi gambar dari base64 string
 * @param {string} base64Image - Data URL base64 (data:image/jpeg;base64,...)
 * @param {Object} [options] - Opsi kompresi
 * @param {number} [options.maxWidth=1280] - Lebar maksimum setelah resize
 * @param {number} [options.maxHeight=1280] - Tinggi maksimum setelah resize
 * @param {number} [options.quality=0.75] - Kualitas JPEG (0.1 - 1.0)
 * @param {string} [options.type='image/jpeg'] - MIME type output
 * @returns {Promise<Object>} - { dataUrl, originalSizeKB, compressedSizeKB, reductionPercent, width, height }
 */
export async function compressImage(base64Image, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75,
    type = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Hitung ukuran baru dengan mempertahankan aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // Buat canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi ke base64 dengan kualitas tertentu
      const compressedBase64 = canvas.toDataURL(type, quality);

      // Hitung ukuran file (perkiraan)
      const originalSizeKB = Math.round((base64Image.length * 3) / 4 / 1024);
      const compressedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
      const reduction = originalSizeKB > 0 
        ? Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100)
        : 0;

      console.log(
        `[COMPRESSION] ${originalSizeKB} KB → ${compressedSizeKB} KB ` +
        `(-${reduction}%) | ${width}x${height}`
      );

      resolve({
        dataUrl: compressedBase64,
        originalSizeKB,
        compressedSizeKB,
        reductionPercent: reduction,
        width,
        height
      });
    };

    img.onerror = (err) => {
      console.error('[COMPRESSION] Gagal memuat gambar:', err);
      reject(new Error('Gagal memuat gambar untuk kompresi'));
    };

    img.src = base64Image;
  });
}

/**
 * Versi sederhana: hanya kompres tanpa resize (untuk gambar kecil)
 * @param {string} base64Image 
 * @param {number} [quality=0.7]
 * @returns {Promise<string>} compressed base64
 */
export async function quickCompress(base64Image, quality = 0.7) {
  const result = await compressImage(base64Image, {
    maxWidth: 9999,    // hampir tidak resize
    maxHeight: 9999,
    quality,
    type: 'image/jpeg'
  });
  return result.dataUrl;
}

/**
 * Contoh penggunaan di tempat lain:
 * 
 * const photoInput = document.getElementById('paramCamera');
 * photoInput.addEventListener('change', async (e) => {
 *   const file = e.target.files[0];
 *   if (!file) return;
 * 
 *   const reader = new FileReader();
 *   reader.onload = async (ev) => {
 *     try {
 *       const compressed = await compressImage(ev.target.result, {
 *         maxWidth: 1024,
 *         quality: 0.72
 *       });
 *       
 *       // Simpan ke draft
 *       paramPhotos[activeArea][currentParam] = compressed.dataUrl;
 *       saveParamPhotos(paramPhotos);
 *       
 *       showCustomAlert(`Foto dikompres: ${compressed.reductionPercent}% lebih kecil`, 'success');
 *     } catch (err) {
 *       showCustomAlert('Gagal mengompres foto', 'error');
 *     }
 *   };
 *   reader.readAsDataURL(file);
 * });
 */

// Export fungsi utama
export default {
  compressImage,
  quickCompress
};
