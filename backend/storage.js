const DATA_IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const FREEIMAGE_API_KEY = process.env.FREEIMAGE_API_KEY || '6d207e02198a847aa98d0a2a901485a5';

export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function uploadImageToStorage(dataUrl) {
  const match = typeof dataUrl === 'string' ? DATA_IMAGE_RE.exec(dataUrl.trim()) : null;
  if (!match) {
    throw new Error('Use a PNG, JPG, or WebP image.');
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const mime = `image/${match[1]}`;
  const base64Payload = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 3 MB or smaller.');
  }

  // Option 1: ImgBB if IMGBB_API_KEY is configured in .env
  if (process.env.IMGBB_API_KEY) {
    try {
      const form = new FormData();
      form.append('image', base64Payload);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(process.env.IMGBB_API_KEY)}`,
        { method: 'POST', body: form }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data?.url) {
        return json.data.url;
      }
    } catch {
      // fall through to next provider
    }
  }

  // Option 2: Freeimage.host / iili.io CDN (official image hosting API, works on Vercel/Render/local)
  try {
    const form = new FormData();
    form.append('key', FREEIMAGE_API_KEY);
    form.append('action', 'upload');
    form.append('source', base64Payload);
    form.append('format', 'json');
    const res = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && isHttpUrl(json?.image?.url)) {
      return json.image.url;
    }
  } catch {
    // fall through to next provider
  }

  // Option 3: Catbox.moe external file storage fallback
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', new Blob([buffer], { type: mime }), `bistro-${Date.now()}.${ext}`);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    headers: {
      'User-Agent': 'BistroEleven/1.0',
    },
  });

  const text = (await response.text()).trim();
  if (!response.ok || !isHttpUrl(text)) {
    throw new Error('Could not upload image to external storage service.');
  }
  return text;
}

export async function resolveImageUrl(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  if (isHttpUrl(trimmed)) {
    if (trimmed.length > 2048) {
      throw new Error('Image URL is too long.');
    }
    return trimmed;
  }
  return uploadImageToStorage(trimmed);
}
