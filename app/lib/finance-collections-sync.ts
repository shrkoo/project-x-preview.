
export type FinanceCollectionResource = "accounts" | "categories" | "recurring";
export type FinanceCollectionItem = { id: string; name?: string; currency?: string; kind?: "income" | "expense" | "both" | "transfer"; updatedAt?: string; deletedAt?: string; [key: string]: unknown };
export type FinanceCollectionApi = <T>(path: string, options?: { method?: string; body?: string }) => Promise<T>;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "length" | "key">;
const resources: FinanceCollectionResource[] = ["accounts", "categories", "recurring"];
const builtInCategories = new Set<string>(["عمومی", "خوراک", "حمل‌ونقل", "خانه", "سلامت", "آموزش", "حقوق", "سرمایه‌گذاری", "پس‌انداز", "فروش", "قبض", "سایر"]);
const sensitiveKey = /(?:auth|token|session|password|secret|otp|credential|app-lock|webauthn)/i;

export function financeCollectionMigrationKey(accountId: string, workspaceId: string) {
  return "nv-finance-collections-migrated-v1:" + accountId + ":" + workspaceId;
}
export function financeCollectionOutboxKey(accountId: string, workspaceId: string) {
  return "nv-finance-collections-outbox-v1:" + accountId + ":" + workspaceId;
}
export function financePreSyncBackupKey(accountId: string, workspaceId: string) {
  return "nv-backup-pre-sync-v1:" + accountId + ":" + workspaceId;
}
function stableId(prefix: string, value: string) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(value.normalize("NFKC").trim().toLocaleLowerCase())) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return prefix + "-" + hash.toString(16).padStart(8, "0");
}
function parseArray(value: string | null): any[] {
  try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function snapshotEntries(storage: StorageLike) {
  const entries: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const name = storage.key(i);
    if (!name || sensitiveKey.test(name)) continue;
    const value = storage.getItem(name);
    if (value !== null) entries[name] = value;
  }
  return entries;
}
export function ensurePreSyncFinanceBackup(storage: StorageLike, accountId: string, workspaceId: string) {
  const key = financePreSyncBackupKey(accountId, workspaceId);
  if (storage.getItem(key)) return key;
  const entries = snapshotEntries(storage);
  const readObject = (name: string) => { try { return JSON.parse(entries[name] || "{}"); } catch { return {}; } };
  const backup = {
    format: "novyra-pre-sync-backup-v1",
    createdAt: new Date().toISOString(),
    accountId,
    workspaceId,
    entries,
    data: {
      transactions: Object.entries(entries).filter(([name]) => name.startsWith("novyra-finance-transactions-v1")).flatMap(([, value]) => parseArray(value)),
      accounts: Object.entries(entries).filter(([name]) => name.startsWith("nv-personal-accounts:")).flatMap(([, value]) => parseArray(value)),
      categories: Array.isArray(readObject("novyra-preferences-v1").categories) ? readObject("novyra-preferences-v1").categories : [],
      recurring: Object.entries(entries).filter(([name]) => name.startsWith("novyra-recurring:")).flatMap(([, value]) => parseArray(value)),
      budgets: { preferences: readObject("novyra-preferences-v1"), workspacePreferences: Object.entries(entries).filter(([name]) => name.startsWith("novyra-workspace-prefs:")) },
      goals: { custom: parseArray(entries["novyra-custom-goals"] || "[]"), savingTarget: entries["novyra-saving-target"] || null, travelTarget: entries["novyra-travel-target"] || null },
    },
  };
  storage.setItem(key, JSON.stringify(backup));
  return key;
}
export function downloadLocalFinanceBackup() {
  const entries = snapshotEntries(localStorage);
  const blob = new Blob([JSON.stringify({ format: "novyra-local-backup-v1", createdAt: new Date().toISOString(), entries }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "novyra-local-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
export function legacyFinanceCollections(storage: StorageLike, currency: string, accountId: string, accountType: string, preferences: any, recurring: any[]): Record<FinanceCollectionResource, FinanceCollectionItem[]> {
  const rawAccounts = parseArray(storage.getItem("nv-personal-accounts:" + currency));
  const accounts = rawAccounts.map(value => {
    const name = typeof value === "string" ? value.trim() : String(value?.name || value?.title || "").trim();
    if (!name) return null;
    return { id: typeof value?.id === "string" ? value.id : stableId("legacy-account", name), name, currency };
  }).filter(Boolean) as FinanceCollectionItem[];
  const categories = (Array.isArray(preferences?.categories) ? preferences.categories : [])
    .filter((name: unknown) => typeof name === "string" && name.trim() && !builtInCategories.has(name.trim()))
    .map((name: string) => ({ id: stableId("legacy-category", name), name: name.trim(), kind: "both" as const }));
  const repeats = (Array.isArray(recurring) ? recurring : []).filter(item => item && typeof item === "object").map(item => ({
    ...item,
    id: typeof item.id === "string" && item.id ? item.id : stableId("legacy-recurring", JSON.stringify(item)),
  }));
  return { accounts, categories, recurring: repeats };
}
type OutboxEntry = { opId: string; resource: FinanceCollectionResource; operation: "upsert" | "delete"; item: FinanceCollectionItem; createdAt: string };
function readOutbox(storage: StorageLike, key: string): OutboxEntry[] { return parseArray(storage.getItem(key)) as OutboxEntry[]; }
export function queueFinanceCollectionUpserts(storage: StorageLike, key: string, resource: FinanceCollectionResource, items: FinanceCollectionItem[]) {
  const queue = readOutbox(storage, key);
  for (const item of items) {
    if (!item?.id) continue;
    const next = queue.filter(entry => !(entry.resource === resource && entry.item.id === item.id));
    next.push({ opId: resource + ":" + item.id + ":upsert", resource, operation: "upsert", item: { ...item, updatedAt: new Date().toISOString() }, createdAt: new Date().toISOString() });
    storage.setItem(key, JSON.stringify(next));
    queue.splice(0, queue.length, ...next);
  }
}
export function queueFinanceCollectionDelete(storage: StorageLike, key: string, resource: FinanceCollectionResource, item: FinanceCollectionItem) {
  const queue = readOutbox(storage, key).filter(entry => !(entry.resource === resource && entry.item.id === item.id));
  queue.push({ opId: resource + ":" + item.id + ":delete", resource, operation: "delete", item, createdAt: new Date().toISOString() });
  storage.setItem(key, JSON.stringify(queue));
}
async function flushOutbox(storage: StorageLike, key: string, workspaceId: string, api: FinanceCollectionApi) {
  const sent = readOutbox(storage, key);
  for (const resource of resources) {
    const entries = sent.filter(entry => entry.resource === resource);
    const upserts = entries.filter(entry => entry.operation === "upsert");
    if (upserts.length) {
      const result = await api<{ ok?: boolean; saved?: number }>("/finance/" + resource, { method: "PUT", body: JSON.stringify({ workspaceId, items: upserts.map(entry => entry.item) }) });
      if (result?.ok !== true || result.saved !== upserts.length) throw new Error("Collection upsert was not confirmed: " + resource);
    }
    for (const entry of entries.filter(entry => entry.operation === "delete")) {
      const result = await api<{ ok?: boolean }>("/finance/" + resource + "/" + encodeURIComponent(entry.item.id) + "?workspaceId=" + encodeURIComponent(workspaceId), { method: "DELETE" });
      if (result?.ok !== true) throw new Error("Collection delete was not confirmed: " + resource);
    }
  }
  const acknowledged = new Set(sent.map(entry => entry.opId + "|" + entry.createdAt));
  storage.setItem(key, JSON.stringify(readOutbox(storage, key).filter(entry => !acknowledged.has(entry.opId + "|" + entry.createdAt))));
}
export async function syncFinanceCollections(args: {
  storage: StorageLike; accountId: string; workspaceId: string; currency: string; accountType: string;
  preferences: any; recurring: any[]; api: FinanceCollectionApi;
}) {
  const { storage, accountId, workspaceId, currency, accountType, preferences, recurring, api } = args;
  const migrationKey = financeCollectionMigrationKey(accountId, workspaceId);
  const outboxKey = financeCollectionOutboxKey(accountId, workspaceId);
  ensurePreSyncFinanceBackup(storage, accountId, workspaceId);
  const readRemote = async () => {
    const remote = {} as Record<FinanceCollectionResource, FinanceCollectionItem[]>;
    for (const resource of resources) {
      const result = await api<{ items: FinanceCollectionItem[] }>("/finance/" + resource + "?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1");
      remote[resource] = Array.isArray(result.items) ? result.items : [];
    }
    return remote;
  };
  let remote = await readRemote();
  const blocked = new Set(resources.flatMap(resource => remote[resource].filter(item => !!item.deletedAt).map(item => resource + ":" + item.id)));
  storage.setItem(outboxKey, JSON.stringify(readOutbox(storage, outboxKey).filter(entry => !blocked.has(entry.resource + ":" + entry.item.id))));
  if (storage.getItem(migrationKey) !== "1") {
    const legacy = legacyFinanceCollections(storage, currency, accountId, accountType, preferences, recurring);
    for (const resource of resources) {
      const items = legacy[resource].filter(item => !remote[resource].some(row => row.id === item.id && !!row.deletedAt));
      if (!items.length) continue;
      const result = await api<{ ok?: boolean; saved?: number }>("/finance/" + resource, { method: "PUT", body: JSON.stringify({ workspaceId, items }) });
      if (result?.ok !== true || result.saved !== items.length) throw new Error("Initial collection migration was not confirmed: " + resource);
    }
    storage.setItem(migrationKey, "1");
  }
  await flushOutbox(storage, outboxKey, workspaceId, api);
  remote = await readRemote();
  const active = (resource: FinanceCollectionResource) => remote[resource].filter(item => !item.deletedAt);
  return {
    accounts: active("accounts"),
    categories: active("categories"),
    recurring: active("recurring"),
    tombstones: {
      accounts: remote.accounts.filter(item => !!item.deletedAt),
      categories: remote.categories.filter(item => !!item.deletedAt),
      recurring: remote.recurring.filter(item => !!item.deletedAt),
    },
  };
}
export function financeCollectionStableId(resource: FinanceCollectionResource, name: string) {
  return stableId(resource === "accounts" ? "legacy-account" : "legacy-category", name);
}
