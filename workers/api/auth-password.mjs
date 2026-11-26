export const PASSWORD_ITERATIONS = 100000;
export const LEGACY_PASSWORD_ITERATIONS = 210000;

const HASH_RE = /^pbkdf2\$(\d{1,7})\$([a-f0-9]{32})\$([a-f0-9]{64})$/i;
const HEX_RE = /^[a-f0-9]{64}$/i;

export function parsePasswordHash(value) {
  const match = HASH_RE.exec(String(value || ""));
  if (!match) return null;
  const iterations = Number(match[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 1) return null;
  return { iterations, salt: match[2].toLowerCase(), hash: match[3].toLowerCase() };
}

export function isNewPasswordHash(value, salt) {
  const parsed = parsePasswordHash(value);
  return Boolean(parsed && parsed.iterations === PASSWORD_ITERATIONS &&
    parsed.salt === String(salt || "").toLowerCase());
}

export function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left ?? ""));
  const b = new TextEncoder().encode(String(right ?? ""));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    difference |= (a[index] || 0) ^ (b[index] || 0);
  }
  return difference === 0;
}

export function verifyLoginHash(candidate, stored, legacySalt = "") {
  const storedValue = String(stored || "");
  // All hashes created before this format used 210,000 PBKDF2 iterations.
  if (HEX_RE.test(storedValue)) {
    return { ok: false, needsReset: true, iterations: LEGACY_PASSWORD_ITERATIONS };
  }
  const saved = parsePasswordHash(storedValue);
  if (!saved) return { ok: false, needsReset: false };
  if (saved.iterations > PASSWORD_ITERATIONS) {
    return { ok: false, needsReset: true, iterations: saved.iterations };
  }
  if (saved.iterations !== PASSWORD_ITERATIONS) return { ok: false, needsReset: false };
  const supplied = parsePasswordHash(candidate);
  if (!supplied || supplied.iterations !== saved.iterations ||
      supplied.salt !== saved.salt ||
      (legacySalt && String(legacySalt).toLowerCase() !== saved.salt)) {
    return { ok: false, needsReset: false };
  }
  return { ok: constantTimeEqual(candidate, stored), needsReset: false };
}

export async function verifyPassword(password, stored, legacySalt = "") {
  const storedValue = String(stored || "");
  if (HEX_RE.test(storedValue)) {
    return { ok: false, needsReset: true, iterations: LEGACY_PASSWORD_ITERATIONS };
  }
  const parsed = parsePasswordHash(storedValue);
  if (!parsed) return { ok: false, needsReset: false };
  if (parsed.iterations > PASSWORD_ITERATIONS) {
    return { ok: false, needsReset: true, iterations: parsed.iterations };
  }
  if (parsed.iterations !== PASSWORD_ITERATIONS ||
      (legacySalt && String(legacySalt).toLowerCase() !== parsed.salt)) {
    return { ok: false, needsReset: false };
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: new TextEncoder().encode(parsed.salt),
    iterations: parsed.iterations,
    hash: "SHA-256"
  }, key, 256);
  const actual = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
  return { ok: constantTimeEqual(actual, parsed.hash), needsReset: false };
}
