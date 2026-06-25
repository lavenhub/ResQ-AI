const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export const apiUrl = (path: string) => `${BASE}${path}`;

export const wsUrl = (path: string) => {
  if (BASE) {
    return BASE.replace(/^http/, "ws") + path;
  }
  if (typeof window === "undefined") return path;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}${path}`;
};

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}
