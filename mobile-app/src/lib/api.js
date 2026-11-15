const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function api(path, { token, ...options } = {}) {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured in mobile-app/.env');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (response.status === 401 && token && typeof unauthorizedHandler === 'function') {
    await unauthorizedHandler();
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Could not connect to Bistro Eleven.');
  }

  return data;
}
