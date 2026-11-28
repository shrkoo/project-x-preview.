import test from "node:test";
import assert from "node:assert/strict";
import {
  ensurePreSyncFinanceBackup,
  financePreSyncBackupKey,
  financeCollectionMigrationKey,
  financeCollectionOutboxKey,
  financeCollectionStableId,
  syncFinanceCollections,
  queueFinanceCollectionDelete,
  queueFinanceCollectionUpserts,
} from "./finance-collections-sync.ts";

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; },
    values,
  };
}
function mockApi() {
  const db = { accounts: [], categories: [], recurring: [] };
  const calls = [];
  const api = async (path, options = {}) => {
    calls.push({ path, method: options.method || "GET" });
    const match = path.match(/^\/finance\/(accounts|categories|recurring)(?:\/([^?]+))?/);
    if (!match) return { ok: true };
    const resource = match[1];
    if (!options.method || options.method === "GET") return { items: db[resource].map(item => ({ ...item })) };
    if (options.method === "PUT") {
      const items = JSON.parse(options.body).items;
      for (const item of items) {
        const old = db[resource].find(row => row.id === item.id);
        if (old?.deletedAt) continue;
        if (old) Object.assign(old, item);
        else db[resource].push({ ...item });
      }
      return { ok: true, saved: items.length };
    }
    if (options.method === "DELETE") {
      const id = decodeURIComponent(match[2]);
      const row = db[resource].find(item => item.id === id);
      if (row) row.deletedAt = "2026-11-28T12:00:00.000Z";
      return { ok: true };
    }
    return { ok: true };
  };
  return { api, db, calls };
}

test("pre-sync backup captures transactions, accounts, categories, recurring, budgets and goals once", () => {
  const store = storage({
    "novyra-finance-transactions-v1:user:personal": JSON.stringify([{ id: "tx-1", title: "Rent" }]),
    "nv-personal-accounts:IRT": JSON.stringify(["Cash"]),
    "novyra-preferences-v1": JSON.stringify({ categories: ["عمومی", "Freelance"], monthlyBudget: "9000000", categoryBudgets: { Food: "2000000" } }),
    "novyra-recurring:user:personal": JSON.stringify([{ id: "repeat-1", title: "Rent" }]),
    "novyra-custom-goals": JSON.stringify([{ id: "goal-1", target: 5000000 }]),
    "novyra-saving-target": "5000000",
    "novyra-travel-target": "12000000",
    "projectx-token": "must-not-be-backed-up",
  });
  const key = ensurePreSyncFinanceBackup(store, "user", "workspace");
  const backup = JSON.parse(store.getItem(key));
  assert.equal(key, financePreSyncBackupKey("user", "workspace"));
  assert.equal(backup.data.transactions[0].id, "tx-1");
  assert.deepEqual(backup.data.accounts, ["Cash"]);
  assert.deepEqual(backup.data.categories, ["عمومی", "Freelance"]);
  assert.equal(backup.data.recurring[0].id, "repeat-1");
  assert.equal(backup.data.budgets.preferences.monthlyBudget, "9000000");
  assert.equal(backup.data.goals.custom[0].id, "goal-1");
  assert.equal(backup.entries["projectx-token"], undefined);
  store.setItem("novyra-finance-transactions-v1:user:personal", "[]");
  ensurePreSyncFinanceBackup(store, "user", "workspace");
  assert.equal(JSON.parse(store.getItem(key)).data.transactions[0].id, "tx-1");
});

test("one-time migration preserves IDs, is idempotent, and marks complete only after confirmation", async () => {
  const store = storage({
    "nv-personal-accounts:IRT": JSON.stringify(["Cash", { id: "account-fixed", name: "Savings" }]),
    "nv-personal-accounts:USD": JSON.stringify(["Travel"]),
    "novyra-preferences-v1": JSON.stringify({ categories: ["عمومی", "Freelance"] }),
    "novyra-recurring:user:personal": JSON.stringify([{ id: "repeat-fixed", title: "Rent", frequency: "monthly" }]),
  });
  const { api, db, calls } = mockApi();
  const args = { storage: store, accountId: "user", workspaceId: "workspace", currency: "IRT", accountType: "personal", preferences: JSON.parse(store.getItem("novyra-preferences-v1")), recurring: JSON.parse(store.getItem("novyra-recurring:user:personal")), api };
  await syncFinanceCollections(args);
  assert.equal(store.getItem(financeCollectionMigrationKey("user", "workspace")), "1");
  assert.equal(db.accounts.length, 3);
  assert.equal(db.accounts.find(item => item.id === "account-fixed").name, "Savings");
  assert.equal(db.accounts.find(item => item.name === "Travel").currency, "USD");
  assert.equal(db.categories.some(item => item.id === financeCollectionStableId("categories", "Freelance")), true);
  assert.equal(db.recurring.some(item => item.id === "repeat-fixed"), true);
  const putsBefore = calls.filter(call => call.method === "PUT").length;
  await syncFinanceCollections(args);
  assert.equal(calls.filter(call => call.method === "PUT").length, putsBefore);
  assert.equal(db.accounts.length, 3);
});

test("migration marker is not written when server confirmation fails", async () => {
  const store = storage({ "nv-personal-accounts:IRT": JSON.stringify(["Cash"]) });
  const api = async (path, options = {}) => {
    if (path.startsWith("/finance/accounts") && options.method === "PUT") throw new Error("network down");
    return { items: [] };
  };
  await assert.rejects(() => syncFinanceCollections({
    storage: store, accountId: "user", workspaceId: "workspace", currency: "IRT", accountType: "personal",
    preferences: {}, recurring: [], api,
  }));
  assert.ok(store.getItem(financePreSyncBackupKey("user", "workspace")));
  assert.equal(store.getItem(financeCollectionMigrationKey("user", "workspace")), null);
});

test("collection tombstones block matching local IDs and delete outbox entries", async () => {
  const store = storage({ "nv-personal-accounts:IRT": JSON.stringify(["Cash"]) });
  const { api, db } = mockApi();
  const id = financeCollectionStableId("accounts", "Cash");
  db.accounts.push({ id, name: "Cash", currency: "IRT", deletedAt: "2026-11-28T12:00:00.000Z" });
  const result = await syncFinanceCollections({
    storage: store, accountId: "user", workspaceId: "workspace", currency: "IRT", accountType: "personal",
    preferences: {}, recurring: [], api,
  });
  assert.equal(db.accounts.length, 1);
  assert.deepEqual(result.accounts, []);
  assert.equal(result.tombstones.accounts[0].id, id);
});

test("collection delete outbox is acknowledged only after server confirmation", async () => {
  const store = storage();
  const key = financeCollectionOutboxKey("user", "workspace");
  const item = { id: "account-1", name: "Cash", currency: "IRT" };
  queueFinanceCollectionDelete(store, key, "accounts", item);
  const { api, db } = mockApi();
  db.accounts.push({ ...item });
  await syncFinanceCollections({ storage: store, accountId: "user", workspaceId: "workspace", currency: "IRT", accountType: "personal", preferences: {}, recurring: [], api });
  assert.ok(db.accounts[0].deletedAt);
  assert.deepEqual(JSON.parse(store.getItem(key) || "[]"), []);
});
