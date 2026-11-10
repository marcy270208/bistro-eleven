import { api } from './api';

export function compressImageFile(file, maxDimension = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Pilih file gambar terlebih dahulu.'));
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('Pilih foto berformat PNG, JPG, atau WebP.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Ukuran foto terlalu besar (maksimal 8 MB).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const originalDataUrl = reader.result;
      const img = new Image();
      img.onerror = () => resolve(originalDataUrl);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < originalDataUrl.length ? compressed : originalDataUrl);
        } catch {
          resolve(originalDataUrl);
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(file, token) {
  const dataUrl = await compressImageFile(file);
  const result = await api('/api/upload', {
    method: 'POST',
    token,
    body: JSON.stringify({ image: dataUrl }),
  });
  return result.url;
}
