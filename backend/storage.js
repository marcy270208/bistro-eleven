const DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/;

export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function uploadImageToStorage(dataUrl) {
  const match = typeof dataUrl === 'string' ? dataUrl.trim().match(DATA_URL_REGEX) : null;
  if (!match) {
    const err = new Error('Choose a valid PNG, JPG, or WebP image.');
    err.status = 400;
    throw err;
  }

  const subtype = match[1] === 'jpg' ? 'jpeg' : match[1];
  const ext = subtype === 'jpeg' ? 'jpg' : subtype;
  const base64Data = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.byteLength > 3 * 1024 * 1024) {
    const err = new Error('Image must be under 3 MB.');
    err.status = 400;
    throw err;
  }

  // 1. Optional ImgBB cloud storage if IMGBB_API_KEY is configured
  if (process.env.IMGBB_API_KEY?.trim()) {
    const form = new FormData();
    form.append('image', base64Data);
    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(process.env.IMGBB_API_KEY.trim())}`,
      { method: 'POST', body: form }
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.data?.url) {
      return json.data.url;
    }
  }

  // 2. Default external file storage service (Catbox cloud object storage)
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', new Blob([buffer], { type: `image/${subtype}` }), `upload-${Date.now()}.${ext}`);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
  });

  const text = (await response.text()).trim();
  if (!response.ok || !isHttpUrl(text)) {
    const err = new Error('Could not upload image to external storage service.');
    err.status = 502;
    throw err;
  }

  return text;
}

export async function resolveImageUrl(input) {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input !== 'string') {
    const err = new Error('Invalid image format.');
    err.status = 400;
    throw err;
  }
  const trimmed = input.trim();
  if (isHttpUrl(trimmed)) {
    if (trimmed.length > 2048) {
      const err = new Error('Image URL is too long.');
      err.status = 400;
      throw err;
    }
    return trimmed;
  }
  if (trimmed.startsWith('data:image/')) {
    return uploadImageToStorage(trimmed);
  }
  const err = new Error('Choose a PNG, JPG, or WebP photo under 3 MB, or provide an https:// image URL.');
  err.status = 400;
  throw err;
}
