import { fallbackApi } from './fallbackApi';

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const isStaticGithubPages = !configuredApiUrl && window.location.hostname.endsWith('.github.io');
const API_URL = configuredApiUrl || `${window.location.protocol}//${window.location.hostname}:3001`;

export async function api(path, { token, ...options } = {}) {
  if (isStaticGithubPages) {
    return fallbackApi(path, { token, ...options });
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // Backend server is offline or unreachable — fall back to browser storage seamlessly
    return fallbackApi(path, { token, ...options });
  }

  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Could not connect to Bistro Eleven.');
  return data;
}
