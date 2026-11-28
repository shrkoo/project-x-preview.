import test from "node:test";
import assert from "node:assert/strict";
import { mergeFinanceTransactions, enqueueFinanceUpserts, enqueueFinanceDelete, readFinanceOutbox, acknowledgeFinanceOutbox } from "./finance-sync.ts";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

test("merge keeps the union and queues local-only transactions", () => {
  const local = [{ id: "local", amount: 10 }, { id: "same", amount: 20, updatedAt: "2026-11-28T10:00:00Z" }];
  const remote = [{ id: "remote", amount: 30 }, { id: "same", amount: 15, updatedAt: "2026-11-28T09:00:00Z" }];
  const result = mergeFinanceTransactions(local, remote);
  assert.deepEqual(result.items.map(item => item.id).sort(), ["local", "remote", "same"]);
  assert.equal(result.items.find(item => item.id === "same")?.amount, 20);
  assert.deepEqual(result.pendingUpserts.map(item => item.id).sort(), ["local", "same"]);
});

test("newer remote record wins an id conflict", () => {
  const result = mergeFinanceTransactions(
    [{ id: "same", amount: 10, updatedAt: "2026-11-28T08:00:00Z" }],
    [{ id: "same", amount: 99, updatedAt: "2026-11-28T09:00:00Z" }],
  );
  assert.equal(result.items[0].amount, 99);
  assert.equal(result.pendingUpserts.length, 0);
});

test("outbox coalesces changes by transaction id and keeps deletes", () => {
  const store = storage();
  enqueueFinanceUpserts(store, "outbox", [{ id: "one", amount: 1 }], "2026-11-28T10:00:00Z");
  enqueueFinanceUpserts(store, "outbox", [{ id: "one", amount: 2 }], "2026-11-28T10:01:00Z");
  enqueueFinanceDelete(store, "outbox", "two", "2026-11-28T10:02:00Z");
  const entries = readFinanceOutbox(store, "outbox");
  assert.equal(entries.length, 2);
  assert.equal(entries.find(entry => entry.transactionId === "one")?.item?.amount, 2);
  assert.equal(entries.find(entry => entry.transactionId === "two")?.operation, "delete");
});

test("acknowledgement removes only the exact sent version", () => {
  const store = storage();
  enqueueFinanceUpserts(store, "outbox", [{ id: "one", amount: 1 }], "2026-11-28T10:00:00Z");
  const sent = readFinanceOutbox(store, "outbox");
  enqueueFinanceUpserts(store, "outbox", [{ id: "one", amount: 2 }], "2026-11-28T10:01:00Z");
  const remaining = acknowledgeFinanceOutbox(store, "outbox", sent);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].item?.amount, 2);
});
