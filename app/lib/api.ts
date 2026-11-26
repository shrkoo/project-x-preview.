// Preview Pages builds set NEXT_PUBLIC_API_BASE to the isolated preview Worker.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://project-x-api.projectx-novyratam.workers.dev";

export function setSession(token: string) {
  localStorage.setItem("projectx-token", token);
}

export function clearSession() {
  localStorage.removeItem("projectx-token");
}

export function createPasswordSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export const PASSWORD_ITERATIONS = 100000;

export async function derivePasswordHash(password: string, salt: string) {
  const normalizedSalt = String(salt).toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalizedSalt)) throw new Error("Invalid password salt");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(normalizedSalt), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256);
  const hash = Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2${PASSWORD_ITERATIONS}${normalizedSalt}${hash}`;
}


export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly requestId?: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("projectx-token");
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiRequestError(data?.message || data?.error || "ارتباط با سرور برقرار نشد.", response.status, data?.code, data?.requestId, Number(data?.retryAfterSeconds) || undefined);
  return data as T;
}


export async function apiUpload<T = any>(path: string, formData: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);
    const token = localStorage.getItem("projectx-token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
    };
    xhr.onload = () => {
      let data: any = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(data as T);
      } else reject(new Error(data?.error || "بارگذاری فایل ناموفق بود."));
    };
    xhr.onerror = () => reject(new Error("ارتباط با سرور هنگام بارگذاری قطع شد."));
    xhr.onabort = () => reject(new Error("بارگذاری لغو شد."));
    xhr.send(formData);
  });
}
