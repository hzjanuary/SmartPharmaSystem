export const BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL)
    ? import.meta.env.VITE_BACKEND_URL
    : 'http://localhost:5000';

export const AI_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_AI_URL)
    ? import.meta.env.VITE_AI_URL
    : 'http://localhost:8000';

export const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message || payload.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
};
