export async function api(path: string, options: any = {}) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // default to local dev API
  const headers = options.headers || {};
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined, credentials: 'include' });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, body: text }; }
}

export function setToken(token: string | null) {
  // Using httpOnly cookie for tokens; this function is a no-op to keep API stable.
}
