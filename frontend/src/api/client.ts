/**
 * Central HTTP client with base URL and error handling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // Ignore fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
