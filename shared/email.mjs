const EMAIL_INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizeEmail(value) {
  const normalized = String(value ?? "").normalize("NFKC").replace(EMAIL_INVISIBLE, "").trim();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return normalized;
  return normalized.slice(0, at) + "@" + normalized.slice(at + 1).toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
