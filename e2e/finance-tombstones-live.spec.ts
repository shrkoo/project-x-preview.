import { test, expect } from "@playwright/test";

test("LIVE Preview Worker/D1 tombstones survive cross-device sync for 61 seconds", async ({ browser }) => {
  test.setTimeout(180_000);
  const apiBase = process.env.PREVIEW_API_URL;
  const token = process.env.LIVE_TEST_TOKEN;
  const userId = process.env.LIVE_TEST_USER_ID;
  const workspaceId = process.env.LIVE_TEST_WORKSPACE_ID;
  const runId = process.env.LIVE_TEST_RUN_ID;
  if (!apiBase || !token || !userId || !workspaceId || !runId) throw new Error("Live Preview test environment is incomplete.");

  const ids = {
    transaction: "live-tx-" + runId,
    category: "LiveCategory-" + runId,
    account: "LiveCash-" + runId,
  };
  const authHeaders = { Authorization: "Bearer " + token };
  const api = async (path: string) => {
    const response = await fetch(apiBase + path, { headers: authHeaders });
    if (!response.ok) throw new Error("Preview Worker GET " + path + " failed: " + response.status + " " + await response.text());
    return response.json() as Promise<{ items: Array<Record<string, any>> }>;
  };
  const contextFor = async (seed: boolean) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(({ seed, token, userId, runId, ids }) => {
      localStorage.setItem("projectx-token", token);
      localStorage.setItem("projectx-language", "fa");
      localStorage.setItem("novyra-text-direction", "rtl");
      localStorage.setItem("novyra-finance-currency", "IRT");
      if (seed) {
        localStorage.setItem("novyra-finance-transactions-v1:" + userId + ":personal", JSON.stringify([
          { id: ids.transaction, title: "Live deletion proof " + runId, amount: 17.25, kind: "expense", category: ids.category, date: "2026-11-28", account: ids.account, updatedAt: new Date().toISOString() },
        ]));
        localStorage.setItem("nv-personal-accounts:IRT", JSON.stringify([ids.account]));
        localStorage.setItem("novyra-preferences-v1", JSON.stringify({
          country: "IR", language: "fa", direction: "rtl", currency: "IRT", calendar: "persian",
          dateFormat: "YYYY/MM/DD", digits: "arabext", firstDay: "saturday", categories: ["General", ids.category],
        }));
      }
    }, { seed, token, userId, runId, ids });
    return context;
  };

  const firstContext = await contextFor(true);
  const first = await firstContext.newPage();
  const diagnostic: string[] = [];
  first.on("dialog", async dialog => { diagnostic.push("DIALOG " + dialog.type() + " " + dialog.message()); await dialog.accept(); diagnostic.push("DIALOG_ACCEPTED"); });
  first.on("request", request => {
    if (request.url().startsWith(apiBase)) diagnostic.push("REQ " + request.method() + " " + request.url() + " body=" + (request.postData() || ""));
  });
  first.on("response", async response => {
    if (response.url().startsWith(apiBase)) {
      let body = "";
      try { body = (await response.text()).slice(0, 2500); } catch {}
      diagnostic.push("RES " + response.status() + " " + response.url() + " body=" + body);
    }
  });
  first.on("console", message => { if (message.type() === "error") diagnostic.push("CONSOLE " + message.text()); });
  first.on("pageerror", error => diagnostic.push("PAGEERROR " + error.stack));
  first.on("requestfailed", request => diagnostic.push("REQFAILED " + request.url() + " " + request.failure()?.errorText));
  await first.goto("/");
  const localSnapshot = await first.evaluate(() => Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => /projectx-token|novyra-finance-transactions|nv-personal-accounts|novyra-preferences/.test(k)).map(k => [k, localStorage.getItem(k)])));
  console.log("LIVE E2E localStorage after injection/reload:", JSON.stringify(localSnapshot));
  const authProbe = await first.evaluate(async apiBase => { const r=await fetch(apiBase+"/auth/me",{headers:{Authorization:"Bearer "+localStorage.getItem("projectx-token")}});return {status:r.status,body:(await r.text()).slice(0,2500)}; }, apiBase);
  console.log("LIVE E2E auth probe:", JSON.stringify(authProbe));
  await expect(first.locator(".nv-p-home")).toBeVisible({ timeout: 45_000 });

  try {
    await expect.poll(async () => (await api("/finance/transactions?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.some(x => x.id === ids.transaction), { timeout: 45_000 }).toBe(true);
  } catch (error) {
    console.log("LIVE E2E network/auth diagnostics:", diagnostic.join("\\n"));
    throw error;
  }
  await expect.poll(async () => (await api("/finance/accounts?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.some(x => x.name === ids.account), { timeout: 45_000 }).toBe(true);
  await expect.poll(async () => (await api("/finance/categories?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.some(x => x.name === ids.category), { timeout: 45_000 }).toBe(true);

  const secondContext = await contextFor(false);
  const second = await secondContext.newPage();
  const secondDiagnostic: string[] = [];
  second.on("request", request => {
    if (request.url().startsWith(apiBase)) secondDiagnostic.push("REQ " + request.method() + " " + request.url() + " body=" + (request.postData() || ""));
  });
  second.on("response", async response => {
    if (response.url().startsWith(apiBase)) {
      let body = "";
      try { body = (await response.text()).slice(0, 2500); } catch {}
      secondDiagnostic.push("RES " + response.status() + " " + response.url() + " body=" + body);
    }
  });
  second.on("console", message => { if (message.type() === "error") secondDiagnostic.push("CONSOLE " + message.text()); });
  second.on("pageerror", error => secondDiagnostic.push("PAGEERROR " + error.stack));
  second.on("requestfailed", request => secondDiagnostic.push("REQFAILED " + request.url() + " " + request.failure()?.errorText));
  await second.goto("/");
  await expect(second.locator(".nv-p-home")).toBeVisible({ timeout: 45_000 });
  try {
    await expect.poll(() => second.evaluate(({ ids }) => JSON.parse(localStorage.getItem("nv-personal-accounts:" + (JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").currency || "USD")) || "[]").includes(ids.account), { ids }), { timeout: 45_000 }).toBe(true);
  } catch (error) {
    const state = await second.evaluate(() => ({ preferences: localStorage.getItem("novyra-preferences-v1"), accountKeys: Object.keys(localStorage).filter(k => k.startsWith("nv-personal-accounts:")).map(k => [k, localStorage.getItem(k)]) }));
    const remoteCategories = await api("/finance/categories?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1");
    console.log("LIVE E2E device B initial sync diagnostics:", JSON.stringify({ state, remoteCategories, requests: secondDiagnostic }));
    throw error;
  }
  await expect.poll(() => second.evaluate(({ ids }) => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes(ids.category), { ids }), { timeout: 45_000 }).toBe(true);

  // Delete the seeded transaction on device A through the real UI.
  await first.getByRole("button", { name: /مشاهده همه/ }).click();
  const txRow = first.locator(".nf-transaction").filter({ hasText: "Live deletion proof " + runId });
  await expect(txRow).toBeVisible();
  await txRow.getByRole("button", { name: /ویرایش تراکنش/ }).click();
  await first.locator(".nv-tx-delete").click();
  await first.locator(".nv-tx-confirm").getByRole("button", { name: /حذف/ }).click();

  // Delete the migrated account through the real transaction sheet.
  await first.locator("nav.nv-ref-dock button[aria-label='خانه']").click();
  await first.locator(".nv-p-quick button").first().click();
  await first.getByRole("button", { name: "حذف حساب " + ids.account }).click();
  await first.locator(".nv-tx-close").click();
  const discardDialog = first.locator(".nv-tx-confirm");
  if (await discardDialog.count()) await discardDialog.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(first.locator(".nv-tx-backdrop")).toHaveCount(0);

  // Delete the custom category through Settings.
  await first.locator("nav.nv-ref-dock button[aria-label='تنظیمات']").click();
  await first.getByRole("button", { name: /دسته‌بندی‌ها/ }).click();
  await first.locator(".nvsh-chips span").filter({ hasText: ids.category }).getByRole("button").click();
  await first.getByRole("button", { name: /^ذخیره$/ }).click();
  await first.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

  // The real Worker must return server tombstones for all three resource types.
  await expect.poll(async () => (await api("/finance/transactions?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.find(x => x.id === ids.transaction)?.deletedAt, { timeout: 45_000 }).toBeTruthy();
  try {
    await expect.poll(async () => (await api("/finance/accounts?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.find(x => x.name === ids.account)?.deletedAt, { timeout: 45_000 }).toBeTruthy();
  } catch (error) {
    const accountState = await first.evaluate(({ ids, userId, workspaceId }) => ({ currency: localStorage.getItem("novyra-finance-currency"), accounts: localStorage.getItem("nv-personal-accounts:" + (localStorage.getItem("novyra-finance-currency") || "USD")), idMap: localStorage.getItem("nv-personal-account-ids:" + (localStorage.getItem("novyra-finance-currency") || "USD")), outbox: Object.keys(localStorage).filter(key => key.includes("finance-collections-outbox")).map(key => [key, localStorage.getItem(key)]) }), { ids, userId, workspaceId });
    console.log("LIVE E2E account deletion diagnostics:", JSON.stringify({ accountState, requests: diagnostic }));
    throw error;
  }
  await expect.poll(async () => (await api("/finance/categories?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.find(x => x.name === ids.category)?.deletedAt, { timeout: 45_000 }).toBeTruthy();

  // Device B must remove the local copies and must not recreate them across two refresh cycles.
  await second.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => second.evaluate(({ ids }) => JSON.parse(localStorage.getItem("nv-personal-accounts:" + (JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").currency || "USD")) || "[]").includes(ids.account), { ids })).toBe(false);
  await expect.poll(() => second.evaluate(({ ids }) => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes(ids.category), { ids })).toBe(false);
  await second.waitForTimeout(61_000);
  await second.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(async () => (await api("/finance/transactions?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.find(x => x.id === ids.transaction)?.deletedAt).toBeTruthy();
  await expect.poll(async () => (await api("/finance/accounts?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.find(x => x.name === ids.account)?.deletedAt).toBeTruthy();
  await expect.poll(async () => (await api("/finance/categories?workspaceId=" + encodeURIComponent(workspaceId) + "&includeDeleted=1")).items.find(x => x.name === ids.category)?.deletedAt).toBeTruthy();
  await expect.poll(() => second.evaluate(({ ids }) => JSON.parse(localStorage.getItem("nv-personal-accounts:" + (JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").currency || "USD")) || "[]").includes(ids.account), { ids })).toBe(false);
  await expect.poll(() => second.evaluate(({ ids }) => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes(ids.category), { ids })).toBe(false);

  await firstContext.close();
  await secondContext.close();
});
