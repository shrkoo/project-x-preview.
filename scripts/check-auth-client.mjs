import assert from "node:assert/strict";
import { createPasswordSalt, derivePasswordHash, deriveAppLockHash } from "../app/lib/api.ts";

const salt = createPasswordSalt();
assert.match(salt, /^[a-f0-9]{32}$/);
const encoded = await derivePasswordHash("preview-password", salt);
assert.match(encoded, /^pbkdf2\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
assert.equal((await deriveAppLockHash("123456", "person@example.com")).length, 64);
await assert.rejects(derivePasswordHash("preview-password", "person@example.com"), /Invalid password salt/);
console.log("client auth hash checks: PASS");