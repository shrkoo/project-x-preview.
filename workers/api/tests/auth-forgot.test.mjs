import test from "node:test";
import assert from "node:assert/strict";
import { handleForgotPassword } from "../auth-forgot.mjs";
import { normalizeEmail, isValidEmail } from "../auth-email.mjs";

const validEmail = "shahramalidazeh6203@gmail.com";

function harness({ user = null, mailAvailable = true, rateAllowed = true, sendFails = false } = {}) {
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              calls.push({ kind: "first", sql, args });
              return sql.includes("SELECT id,email FROM users") ? user : null;
            },
            async run() { calls.push({ kind: "run", sql, args }); return { success: true }; }
          };
        }
      };
    }
  };
  const request = new Request("https://api.example.test/auth/forgot-password", {
    method: "POST", headers: { "CF-Connecting-IP": "203.0.113.5" }
  });
  const errors = [];
  const helpers = {
    cleanEmail: value => normalizeEmail(value).toLowerCase(),
    isValidEmail,
    json: (data, status = 200) => new Response(JSON.stringify(data), { status }),
    hasMailProvider: () => mailAvailable,
    hitAuthLimit: async (_db, key) => { calls.push({ kind: "limit", key }); return rateAllowed; },
    digest: async value => "hash:" + value,
    issueEmailToken: async (_db, userId) => { calls.push({ kind: "token", userId }); return "mock-reset-token"; },
    sendMail: async (_env, to, subject, html) => { calls.push({ kind: "mail", to, subject, html }); if (sendFails) throw new Error("mock provider failure"); },
    renderNovyraEmail: value => JSON.stringify(value),
    logError: value => errors.push(value)
  };
  return { request, db, helpers, calls, errors, env: { APP_URL: "https://feature-homa-auth-part1.novyra.pages.dev" } };
}

async function invoke(options = {}, email = validEmail) {
  const h = harness(options);
  const response = await handleForgotPassword({
    body: { email }, request: h.request, db: h.db, env: h.env,
    requestId: "forgot-req-1", helpers: h.helpers
  });
  return { ...h, response, data: await response.json() };
}

test("valid email is normalized and reset email is sent with a mocked provider", async () => {
  const result = await invoke({ user: { id: "user-1", email: validEmail } }, "\u200F  " + validEmail.toUpperCase() + " \u2066");
  assert.equal(result.response.status, 200);
  assert.equal(result.calls.find(x => x.kind === "mail")?.to, validEmail);
  assert.equal(result.calls.filter(x => x.kind === "limit").length, 3);
});

test("invalid email is rejected before rate limits or database access", async () => {
  const result = await invoke({}, "not-an-email");
  assert.equal(result.response.status, 400);
  assert.equal(result.data.code, "INVALID_EMAIL");
  assert.equal(result.calls.length, 0);
});

test("missing email provider returns a specific error and logs the request id", async () => {
  const result = await invoke({ mailAvailable: false });
  assert.equal(result.response.status, 503);
  assert.equal(result.data.code, "EMAIL_SEND_FAILED");
  assert.equal(result.data.requestId, "forgot-req-1");
  assert.equal(result.errors[0].requestId, "forgot-req-1");
});

test("rate limiting returns a typed 429", async () => {
  const result = await invoke({ rateAllowed: false });
  assert.equal(result.response.status, 429);
  assert.equal(result.data.code, "RATE_LIMITED");
  assert.ok(result.data.retryAfterSeconds > 0);
});

test("existing and unknown accounts receive identical public responses", async () => {
  const known = await invoke({ user: { id: "user-1", email: validEmail } });
  const unknown = await invoke({ user: null });
  assert.equal(known.response.status, unknown.response.status);
  assert.equal(known.data.ok, unknown.data.ok);
  assert.equal(known.data.message, unknown.data.message);
});

test("provider failure is logged but does not reveal whether an account exists", async () => {
  const known = await invoke({ user: { id: "user-1", email: validEmail }, sendFails: true });
  const unknown = await invoke({ user: null });
  assert.equal(known.response.status, unknown.response.status);
  assert.equal(known.data.message, unknown.data.message);
  assert.equal(known.errors[0].code, "EMAIL_SEND_FAILED");
});
