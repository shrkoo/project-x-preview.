export type FinanceTransactionRecord = { id: string; updatedAt?: string };
export type FinanceOutboxEntry<T extends FinanceTransactionRecord = FinanceTransactionRecord> = {
  id: string;
  transactionId: string;
  operation: "upsert" | "delete";
  createdAt: string;
  item?: T;
};
type StorageLike = Pick<Storage, "getItem" | "setItem">;

function timestamp(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mergeFinanceTransactions<T extends FinanceTransactionRecord & { deletedAt?: string | null }>(
  localItems: T[],
  remoteItems: T[],
): { items: T[]; pendingUpserts: T[]; tombstoneIds: string[] } {
  const tombstones = new Set(remoteItems.filter(item => item?.id && !!item.deletedAt).map(item => item.id));
  const merged = new Map<string, T>();
  for (const remote of remoteItems) if (remote?.id && !remote.deletedAt) merged.set(remote.id, remote);
  const pendingUpserts: T[] = [];
  for (const local of localItems) {
    if (!local?.id || tombstones.has(local.id) || local.deletedAt) continue;
    const remote = merged.get(local.id);
    if (!remote) {
      merged.set(local.id, local);
      pendingUpserts.push(local);
    } else if (timestamp(local.updatedAt) > timestamp(remote.updatedAt)) {
      merged.set(local.id, local);
      pendingUpserts.push(local);
    }
  }
  return { items: [...merged.values()], pendingUpserts, tombstoneIds: [...tombstones] };
}

export function discardFinanceOutboxTombstones<T extends FinanceTransactionRecord>(
  storage: StorageLike,
  key: string,
  tombstoneIds: string[],
): FinanceOutboxEntry<T>[] {
  const blocked = new Set(tombstoneIds);
  const remaining = readFinanceOutbox<T>(storage, key).filter(entry => !blocked.has(entry.transactionId));
  writeOutbox(storage, key, remaining);
  return remaining;
}

export function financeOutboxStorageKey(accountId: string, accountType: string, workspaceId: string): string {
  return `novyra-finance-outbox-v1:${accountId}:${accountType}:${workspaceId}`;
}

export function readFinanceOutbox<T extends FinanceTransactionRecord = FinanceTransactionRecord>(
  storage: StorageLike,
  key: string,
): FinanceOutboxEntry<T>[] {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(entry => entry && typeof entry.id === "string" && typeof entry.transactionId === "string" && (entry.operation === "upsert" || entry.operation === "delete")) : [];
  } catch {
    return [];
  }
}

function writeOutbox<T extends FinanceTransactionRecord>(storage: StorageLike, key: string, entries: FinanceOutboxEntry<T>[]) {
  storage.setItem(key, JSON.stringify(entries));
}

export function enqueueFinanceUpserts<T extends FinanceTransactionRecord>(
  storage: StorageLike,
  key: string,
  items: T[],
  now = new Date().toISOString(),
): FinanceOutboxEntry<T>[] {
  const entries = readFinanceOutbox<T>(storage, key);
  for (const item of items) {
    if (!item?.id) continue;
    const next: FinanceOutboxEntry<T> = { id: `upsert:${item.id}`, transactionId: item.id, operation: "upsert", createdAt: now, item };
    const index = entries.findIndex(entry => entry.transactionId === item.id);
    if (index >= 0) entries[index] = next;
    else entries.push(next);
  }
  writeOutbox(storage, key, entries);
  return entries;
}

export function enqueueFinanceDelete(
  storage: StorageLike,
  key: string,
  transactionId: string,
  now = new Date().toISOString(),
): FinanceOutboxEntry[] {
  const entries = readFinanceOutbox(storage, key).filter(entry => entry.transactionId !== transactionId);
  entries.push({ id: `delete:${transactionId}`, transactionId, operation: "delete", createdAt: now });
  writeOutbox(storage, key, entries);
  return entries;
}

export function acknowledgeFinanceOutbox<T extends FinanceTransactionRecord>(
  storage: StorageLike,
  key: string,
  sent: FinanceOutboxEntry<T>[],
): FinanceOutboxEntry<T>[] {
  const current = readFinanceOutbox<T>(storage, key);
  const acknowledged = new Set(sent.map(entry => `${entry.id}|${entry.createdAt}`));
  const remaining = current.filter(entry => !acknowledged.has(`${entry.id}|${entry.createdAt}`));
  writeOutbox(storage, key, remaining);
  return remaining;
}
