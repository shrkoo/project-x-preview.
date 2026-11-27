import test from "node:test";
import assert from "node:assert/strict";
import { handlePasswordReset } from "../auth-reset.mjs";

const salt = "0123456789abcdef0123456789abcdef";
const hash = "pbkdf2$100000$" + salt + "$" + "a".repeat(64);

function harness(record) {
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              calls.push({ sql, args, kind: "first" });
              return sql.includes("SELECT id,user_id FROM email_tokens") ? record : null;
            },
            async run() { calls.push({ sql, args, kind: "run" }); return { success: true }; }
          };
        }
      };
    },
    async batch(statements) { calls.push({ kind: "batch", count: statements.length }); return []; }
  };
  const helpers = {
    json: (data, status = 200) => new Response(JSON.stringify(data), { status }),
    digest: async token => "digest:" + token,
    isNewPasswordHash: (value, suppliedSalt) => value.startsWith("pbkdf2$100000$" + suppliedSalt + "$")
  };
  return { db, helpers, calls };
}

async function invoke(record, body = { token: "reset-token", salt, passwordHash: hash }) {
  const h = harness(record);
  const response = await handlePasswordReset({ body, db: h.db, requestId: "reset-req-1", helpers: h.helpers });
  return { ...h, response, data: await response.json() };
}

test("valid reset token updates password, consumes token and revokes sessions", async () => {
  const result = await invoke({ id: "token-1", user_id: "user-1" });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.ok, true);
  assert.equal(result.data.requestId, "reset-req-1");
  assert.equal(result.calls.find(x => x.kind === "batch")?.count, 3);
});

test("expired reset token is rejected", async () => {
  const result = await invoke(null);
  assert.equal(result.response.status, 410);
  assert.equal(result.data.code, "TOKEN_EXPIRED");
});

test("already-used reset token is rejected", async () => {
  const result = await invoke(null);
  assert.equal(result.response.status, 410);
  assert.equal(result.data.code, "TOKEN_EXPIRED");
});

test("invalid new password hash is rejected before token lookup", async () => {
  const result = await invoke({ id: "token-1", user_id: "user-1" }, { token: "reset-token", salt, passwordHash: "bad" });
  assert.equal(result.response.status, 400);
  assert.equal(result.data.code, "INVALID_INPUT");
  assert.equal(result.calls.filter(x => x.kind === "first").length, 0);
});
