const API_URL = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`).replace(/\/$/, '');

export async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Could not connect to Bistro Eleven.');
  return data;
}
