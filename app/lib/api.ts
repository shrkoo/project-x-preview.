export const API_BASE = "https://project-x-api.projectx-novyratam.workers.dev";

export function setSession(token: string) {
  localStorage.setItem("projectx-token", token);
}

export function clearSession() {
  localStorage.removeItem("projectx-token");
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("projectx-token");
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "ارتباط با سرور برقرار نشد.");
  return data as T;
}
