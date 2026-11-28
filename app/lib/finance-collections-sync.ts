import { PERSONAL_CATEGORIES } from "../data/personal-categories";

export type FinanceCollectionResource = "accounts" | "categories" | "recurring";
export type FinanceCollectionItem = { id: string; name?: string; currency?: string; kind?: "income" | "expense" | "both"; updatedAt?: string; deletedAt?: string; [key: string]: unknown };
export type FinanceCollectionApi = <T>(path: string, options?: { method?: string; body?: string }) => Promise<T>;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "length" | "key">;

const resources: FinanceCollectionResource[] = ["accounts", "categories", "recurring"];
const builtInCategories = new Set(PERSONAL_CATEGORIES.map(item => item.label));

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
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value.normalize("NFKC").trim().toLocaleLowerCase())) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return prefix + "-" + hash.toString(16);
}
function parseArray(value: string | null): any[] {
  try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
export function ensurePreSyncFinanceBackup(storage: StorageLike, accountId: string, workspaceId: string) {
  const key = financePreSyncBackupKey(accountId, workspaceId);
  if (storage.getItem(key)) return key;
  const entries: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const name = storage.key(i);
    if (!name || /^(projectx-token|projectx-session|projectx-app-lock-credential|projectx-app-lock-user|projectx-app-lock-configured)/.test(name)) continue;
    if (/^(novyra-finance-transactions-v1|nv-personal-accounts:|novyra-preferences-v1$|novyra-recurring:|novyra-custom-goals$|novyra-saving-target$|novyra-travel-target$|novyra-workspace-prefs:|nv-tx-draft:)/.test(name)) {
      const value = storage.getItem(name);
      if (value !== null) entries[name] = value;
    }
  }
  const backup = {
    format: "novyra-pre-sync-backup-v1",
    createdAt: new Date().toISOString(),
    accountId,
    workspaceId,
    entries,
    data: {
      transactions: Object.entries(entries).filter(([name]) => name.startsWith("novyra-finance-transactions-v1")).flatMap(([, value]) => parseArray(value)),
      accounts: Object.entries(entries).filter(([name]) => name.startsWith("nv-personal-accounts:")).flatMap(([, value]) => parseArray(value)),
      preferences: (() => { try { return JSON.parse(entries["novyra-preferences-v1"] || "{}"); } catch { return {}; } })(),
      recurring: Object.entries(entries).filter(([name]) => name.startsWith("novyra-recurring:")).flatMap(([, value]) => parseArray(value)),
      goals: parseArray(entries["novyra-custom-goals"] || "[]"),
      savingTarget: entries["novyra-saving-target"] || null,
      travelTarget: entries["novyra-travel-target"] || null,
    },
  };
  storage.setItem(key, JSON.stringify(backup));
  return key;
}
export function downloadLocalFinanceBackup() {
  const entries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i);
    if (!name || /^(projectx-token|projectx-session|projectx-app-lock-credential|projectx-app-lock-user|projectx-app-lock-configured)/.test(name)) continue;
    const value = localStorage.getItem(name);
    if (value !== null) entries[name] = value;
  }
  const blob = new Blob([JSON.stringify({ format: "novyra-local-finance-backup-v1", createdAt: new Date().toISOString(), entries }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "novyra-local-backup.json";
  a.click();
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
  const repeat = (Array.isArray(recurring) ? recurring : []).filter(item => item && typeof item === "object").map(item => ({
    ...item,
    id: typeof item.id === "string" && item.id ? item.id : stableId("legacy-recurring", JSON.stringify(item)),
  }));
  return { accounts, categories, recurring: repeat };
}
type OutboxEntry = { opId: string; resource: FinanceCollectionResource; operation: "upsert" | "delete"; item: FinanceCollectionItem; createdAt: string };
function readOutbox(storage: StorageLike, key: string): OutboxEntry[] { return parseArray(storage.getItem(key)) as OutboxEntry[]; }
export function queueFinanceCollectionUpserts(storage: StorageLike, key: string, resource: FinanceCollectionResource, items: FinanceCollectionItem[]) {
  if (!items.length) return;
  const queue = readOutbox(storage, key);
  for (const item of items) {
    const opId = resource + ":" + item.id + ":upsert";
    const next = queue.filter(entry => !(entry.resource === resource && entry.item.id === item.id));
    next.push({ opId, resource, operation: "upsert", item: { ...item, updatedAt: new Date().toISOString() }, createdAt: new Date().toISOString() });
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
  const queue = readOutbox(storage, key);
  for (const resource of resources) {
    const entries = queue.filter(entry => entry.resource === resource);
    const upserts = entries.filter(entry => entry.operation === "upsert");
    if (upserts.length) await api("/finance/" + resource, { method: "PUT", body: JSON.stringify({ workspaceId, items: upserts.map(entry => entry.item) }) });
    for (const entry of entries.filter(entry => entry.operation === "delete")) {
      await api("/finance/" + resource + "/" + encodeURIComponent(entry.item.id) + "?workspaceId=" + encodeURIComponent(workspaceId), { method: "DELETE" });
    }
  }
  const sent = new Set(queue.map(entry => entry.opId));
  const remaining = readOutbox(storage, key).filter(entry => !sent.has(entry.opId));
  storage.setItem(key, JSON.stringify(remaining));
}
export async function syncFinanceCollections(args: {
  storage: StorageLike; accountId: string; workspaceId: string; currency: string; accountType: string;
  preferences: any; recurring: any[]; api: FinanceCollectionApi;
}) {
  const { storage, accountId, workspaceId, currency, accountType, preferences, recurring, api } = args;
  const migrationKey = financeCollectionMigrationKey(accountId, workspaceId);
  const outboxKey = financeCollectionOutboxKey(accountId, workspaceId);
  const migrated = storage.getItem(migrationKey) === "1";
  if (!migrated) {
    ensurePreSyncFinanceBackup(storage, accountId, workspaceId);
    const legacy = legacyFinanceCollections(storage, currency, accountId, accountType, preferences, recurring);
    for (const resource of resources) {
      const items = legacy[resource];
      if (items.length) await api("/finance/" + resource, { method: "PUT", body: JSON.stringify({ workspaceId, items }) });
    }
    storage.setItem(migrationKey, "1");
  }
  await flushOutbox(storage, outboxKey, workspaceId, api);
  const remote = {} as Record<FinanceCollectionResource, FinanceCollectionItem[]>;
  for (const resource of resources) {
    const result = await api<{ items: FinanceCollectionItem[] }>("/finance/" + resource + "?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1");
    remote[resource] = Array.isArray(result.items) ? result.items : [];
  }
  return {
    accounts: remote.accounts.filter(item => !item.deletedAt),
    categories: remote.categories.filter(item => !item.deletedAt),
    recurring: remote.recurring.filter(item => !item.deletedAt),
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
