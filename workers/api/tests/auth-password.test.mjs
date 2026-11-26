import test from "node:test";
import assert from "node:assert/strict";
import {
  PASSWORD_ITERATIONS,
  isNewPasswordHash,
  parsePasswordHash,
  verifyPassword
} from "../auth-password.mjs";

const salt = "1234567890abcdef1234567890abcdef";

async function makeHash(password, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations, hash: "SHA-256"
  }, key, 256);
  const digest = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${iterations}$${salt}$${digest}`;
}

test("encoded hashes include the iteration count and 16-byte salt", async () => {
  const encoded = await makeHash("preview-password");
  assert.equal(parsePasswordHash(encoded)?.iterations, PASSWORD_ITERATIONS);
  assert.equal(parsePasswordHash(encoded)?.salt, salt);
  assert.equal(isNewPasswordHash(encoded, salt), true);
});

test("Worker verifies a valid password with the 100000 iteration ceiling", async () => {
  const encoded = await makeHash("preview-password");
  assert.deepEqual(await verifyPassword("preview-password", encoded, salt), { ok: true, needsReset: false });
  assert.deepEqual(await verifyPassword("wrong-password", encoded, salt), { ok: false, needsReset: false });
});

test("Worker returns a reset state instead of deriving above 100000 iterations", async () => {
  const encoded = `pbkdf2$210000$${salt}$${"a".repeat(64)}`;
  const result = await verifyPassword("preview-password", encoded, salt);
  assert.equal(result.ok, false);
  assert.equal(result.needsReset, true);
  assert.equal(result.iterations, 210000);
});
