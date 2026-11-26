import test from "node:test";
import assert from "node:assert/strict";
import { handlePasswordLogin } from "../auth-login.mjs";

const requestFor = (body) => new Request("https://api.example.test/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.10" },
  body: JSON.stringify(body)
});
const validUser = {
  id: "user-1", email: "person@example.com", display_name: "Person",
  password_salt: "salt", password_hash: "hash-ok", verified_at: "2026-01-01",
  xp: 10, games_played: 2, role: "user"
};
function harness({ user = validUser, rateAllowed = true, dbFailure = false, verificationRequired = false } = {}) {
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (dbFailure) throw new Error("D1 unavailable");
              if (sql.includes("FROM users")) return user;
              if (sql.includes("FROM auth_rate_limits")) return { window_started_at: Date.now() - 1000 };
              return null;
            }
          };
        }
      };
    }
  };
  return {
    db,
    env: { REQUIRE_EMAIL_VERIFICATION: verificationRequired ? "true" : "false" },
    helpers: {
      cleanEmail: value => String(value || "").trim().toLowerCase(),
      hitAuthLimit: async () => rateAllowed,
      passwordHash: async password => password === "correct-password" ? "hash-ok" : "hash-bad",
      createSession: async () => ({ token: "session-token", expiresAt: 123456789 }),
      publicProfile: () => ({ accountType: "personal" })
    }
  };
}
async function invoke(options, body = { email: "person@example.com", password: "correct-password" }) {
  const config = harness(options);
  const response = await handlePasswordLogin({
    request: requestFor(body), env: config.env, db: config.db,
    requestId: "req-test-123", helpers: config.helpers
  });
  return { response, data: await response.json() };
}

test("login succeeds and returns a session", async () => {
  const { response, data } = await invoke();
  assert.equal(response.status, 200);
  assert.equal(data.token, "session-token");
  assert.equal(data.user.id, "user-1");
});

test("wrong password returns 401", async () => {
  const { response, data } = await invoke({}, { email: "person@example.com", password: "wrong-password" });
  assert.equal(response.status, 401);
  assert.equal(data.code, "INVALID_CREDENTIALS");
});

test("unknown email has the same generic response as a wrong password", async () => {
  const unknown = await invoke({ user: null });
  const wrong = await invoke({}, { email: "person@example.com", password: "wrong-password" });
  assert.equal(unknown.response.status, wrong.response.status);
  assert.equal(unknown.data.code, wrong.data.code);
  assert.equal(unknown.data.message, wrong.data.message);
});

test("unverified email returns 403 when verification is required", async () => {
  const { response, data } = await invoke({ verificationRequired: true, user: { ...validUser, verified_at: null } });
  assert.equal(response.status, 403);
  assert.equal(data.code, "EMAIL_NOT_VERIFIED");
});

test("rate limit returns 429 and a retry countdown", async () => {
  const { response, data } = await invoke({ rateAllowed: false });
  assert.equal(response.status, 429);
  assert.equal(data.code, "RATE_LIMITED");
  assert.ok(data.retryAfterSeconds > 0);
});

test("D1 failure returns 500 with a request id", async () => {
  const { response, data } = await invoke({ dbFailure: true });
  assert.equal(response.status, 500);
  assert.equal(data.code, "INTERNAL_ERROR");
  assert.equal(data.requestId, "req-test-123");
});
