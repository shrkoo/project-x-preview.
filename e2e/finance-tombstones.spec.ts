import { test, expect } from "@playwright/test";

test("pre-sync migration, cross-context tombstones and 60-second no-resurrection", async ({ browser }) => {
  test.setTimeout(150_000);
  const workspace = { id: "tombstone-workspace", type: "personal", name: "Personal", currency: "IRT" };
  const server = {
    transactions: [] as Array<Record<string, any>>,
    accounts: [] as Array<Record<string, any>>,
    categories: [] as Array<Record<string, any>>,
    recurring: [] as Array<Record<string, any>>,
  };
  const makeContext = async (seed = false) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(({ seed }) => {
      localStorage.setItem("projectx-token", "finance-tombstone-e2e-token");
      localStorage.setItem("projectx-language", "fa");
      localStorage.setItem("novyra-text-direction", "rtl");
      localStorage.setItem("novyra-finance-currency", "IRT");
      if (seed) {
        localStorage.setItem("novyra-finance-transactions-v1:tombstone-user:personal", JSON.stringify([
          { id: "tx-delete-1", title: "Old local transaction", amount: 250000, kind: "expense", category: "Freelance", date: "2026-11-27", account: "Cash", updatedAt: "2026-11-27T10:00:00.000Z" },
        ]));
        localStorage.setItem("nv-personal-accounts:IRT", JSON.stringify(["Cash", "Savings"]));
        localStorage.setItem("novyra-preferences-v1", JSON.stringify({
          country: "IR", language: "fa", direction: "rtl", currency: "IRT", calendar: "persian",
          dateFormat: "YYYY/MM/DD", numberSystem: "arabext", digits: "arabext", firstDay: "saturday",
          monthlyBudget: "9000000", categoryBudgets: { "خوراک": "2000000" },
          categories: ["عمومی", "خوراک", "حمل‌ونقل", "خانه", "سلامت", "آموزش", "حقوق", "سرمایه‌گذاری", "پس‌انداز", "فروش", "قبض", "سایر", "Freelance"],
        }));
        localStorage.setItem("novyra-recurring:tombstone-user:personal", JSON.stringify([
          { id: "repeat-seed-1", title: "Rent", amount: 1000000, kind: "expense", category: "خانه", frequency: "monthly", createdAt: "2026-11-01", lastGenerated: "2026-11-01" },
        ]));
        localStorage.setItem("novyra-custom-goals", JSON.stringify([{ id: "goal-1", title: "Emergency", target: 5000000 }]));
        localStorage.setItem("novyra-saving-target", "5000000");
        localStorage.setItem("novyra-travel-target", "12000000");
      }
    }, { seed });
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.hostname.includes("projectx-novyratam.workers.dev")) return route.continue();
      const path = url.pathname;
      if (path === "/auth/me") return route.fulfill({ json: { user: { id: "tombstone-user", email: "tombstone@example.test", displayName: "Tombstone User", profile: { accountType: "personal", appLockType: "none" } } } });
      if (path === "/workspaces" && request.method() === "GET") return route.fulfill({ json: { workspaces: [workspace] } });
      if (path === "/workspaces" && request.method() === "POST") return route.fulfill({ json: { workspace } });
      const segments = path.split("/");
      const collectionMatch = segments[1] === "finance" && ["accounts", "categories", "recurring"].includes(segments[2]) ? [path, segments[2], segments[3]] : null;
      if (collectionMatch) {
        const resource = collectionMatch[1] as "accounts" | "categories" | "recurring";
        const rows = server[resource];
        if (request.method() === "GET") return route.fulfill({ json: { items: rows.map(row => ({ ...row })) } });
        if (request.method() === "PUT") {
          const payload = request.postDataJSON();
          for (const item of payload.items || []) {
            const row = rows.find(existing => existing.id === item.id);
            if (row?.deletedAt) continue;
            if (row) Object.assign(row, item);
            else rows.push({ ...item });
          }
          return route.fulfill({ json: { ok: true, saved: (payload.items || []).length } });
        }
        if (request.method() === "DELETE") {
          const id = decodeURIComponent(collectionMatch[2] || "");
          const row = rows.find(existing => existing.id === id);
          if (row) row.deletedAt = new Date().toISOString();
          return route.fulfill({ json: { ok: true } });
        }
      }
      if (path === "/finance/transactions" && request.method() === "GET") return route.fulfill({ json: { items: server.transactions.map(row => ({ ...row })) } });
      if (path === "/finance/transactions" && request.method() === "PUT") {
        const payload = request.postDataJSON();
        for (const item of payload.items || []) {
          const row = server.transactions.find(existing => existing.id === item.id);
          if (row?.deletedAt) continue;
          if (row) Object.assign(row, item);
          else server.transactions.push({ ...item });
        }
        return route.fulfill({ json: { ok: true, saved: (payload.items || []).length } });
      }
      if (path.startsWith("/finance/transactions/") && request.method() === "DELETE") {
        const id = decodeURIComponent(path.split("/").pop() || "");
        const row = server.transactions.find(existing => existing.id === id);
        if (row) row.deletedAt = new Date().toISOString();
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { ok: true } });
    });
    return context;
  };

  const firstContext = await makeContext(true);
  const first = await firstContext.newPage();
  first.on("dialog", dialog => dialog.accept());
  await first.goto("/");
  await expect(first.locator(".nv-p-home")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => server.accounts.length).toBe(2);
  await expect.poll(() => server.categories.some(item => item.name === "Freelance")).toBe(true);
  await expect.poll(() => server.recurring.some(item => item.id === "repeat-seed-1")).toBe(true);
  await expect.poll(() => server.transactions.some(item => item.id === "tx-delete-1")).toBe(true);

  const backup = await first.evaluate(() => {
    const key = Object.keys(localStorage).find(name => name.startsWith("nv-backup-pre-sync-v2:"));
    return key ? JSON.parse(localStorage.getItem(key) || "null") : null;
  });
  expect(backup?.format).toBe("novyra-pre-sync-backup-v2");
  expect(backup?.data?.transactions?.[0]?.id).toBe("tx-delete-1");
  expect(backup?.data?.goals?.custom?.[0]?.id).toBe("goal-1");
  expect(backup?.data?.budgets?.preferences?.monthlyBudget).toBe("9000000");

  const secondContext = await makeContext(false);
  const second = await secondContext.newPage();
  second.on("dialog", dialog => dialog.accept());
  await second.goto("/");
  await expect(second.locator(".nv-p-home")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("nv-personal-accounts:IRT") || "[]").includes("Cash"))).toBe(true);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("novyra-recurring:tombstone-user:personal") || "[]").some((item: any) => item.id === "repeat-seed-1"))).toBe(true);

  // Add a new account and custom category after the one-time migration.
  await first.locator(".nv-p-quick button").first().click();
  await first.getByRole("button", { name: /افزودن حساب/ }).click();
  await first.locator(".nv-tx-add-account input").fill("Travel");
  await first.locator(".nv-tx-add-account button").click();
  await first.locator(".nv-tx-close").click();
  await first.getByRole("button", { name: "خروج" }).click();
  await first.locator("nav.nv-ref-dock button[aria-label='تنظیمات']").click();
  await first.getByRole("button", { name: /دسته‌بندی‌ها/ }).click();
  await first.locator(".nvsh-add input").fill("Side hustle");
  await first.locator(".nvsh-add button").click();
  await first.getByRole("button", { name: /^ذخیره$/ }).click();
  await first.locator(".nvsh-back").click();
  await first.getByRole("button", { name: /داده و پشتیبان/ }).click();
  const [backupDownload] = await Promise.all([first.waitForEvent("download"), first.getByRole("button", { name: /دریافت پشتیبان JSON/ }).click()]);
  expect(backupDownload.suggestedFilename()).toBe("novyra-local-backup.json");
  await first.locator('nav.nv-ref-dock button[aria-label="خانه"]').click();
  await first.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => server.accounts.some(item => item.name === "Travel"), { timeout: 35_000 }).toBe(true);
  await expect.poll(() => server.categories.some(item => item.name === "Side hustle"), { timeout: 35_000 }).toBe(true);
  await second.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("nv-personal-accounts:IRT") || "[]").includes("Travel"))).toBe(true);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes("Side hustle"))).toBe(true);

  // Delete the transaction, account and custom category on context A.
  await first.locator("nav.nv-ref-dock button[aria-label='خانه']").click();
  // The home dashboard renders compact .nv-p-tx cards; open the full transaction list before using the edit control.
  await first.getByRole("button", { name: /مشاهده همه/ }).click();
  const txRow = first.locator(".nf-transaction").filter({ hasText: "Old local transaction" });
  await txRow.getByRole("button", { name: "ویرایش تراکنش" }).click();
  await first.locator(".nv-tx-delete").click();
  await first.locator(".nv-tx-confirm").getByRole("button", { name: "حذف" }).click();

  await first.locator(".nv-p-quick button").first().click();
  await first.getByRole("button", { name: "حذف حساب Cash" }).click();
  await first.locator(".nv-tx-close").click();

  await first.locator("nav.nv-ref-dock button[aria-label='تنظیمات']").click();
  await first.getByRole("button", { name: /دسته‌بندی‌ها/ }).click();
  await first.locator(".nvsh-chips span").filter({ hasText: "Freelance" }).getByRole("button").click();
  await first.getByRole("button", { name: /^ذخیره$/ }).click();
  await first.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => server.transactions.find(item => item.id === "tx-delete-1")?.deletedAt).toBeTruthy();
  await expect.poll(() => server.accounts.find(item => item.name === "Cash")?.deletedAt).toBeTruthy();
  await expect.poll(() => server.categories.find(item => item.name === "Freelance")?.deletedAt).toBeTruthy();

  await second.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("nv-personal-accounts:IRT") || "[]").includes("Cash"))).toBe(false);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes("Freelance"))).toBe(false);
  await expect(second.locator(".nf-transaction").filter({ hasText: "Old local transaction" })).toHaveCount(0);

  // Keep both tabs alive beyond two 30-second refresh cycles; tombstones must remain authoritative.
  await second.waitForTimeout(61_000);
  await second.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(second.locator(".nf-transaction").filter({ hasText: "Old local transaction" })).toHaveCount(0);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("nv-personal-accounts:IRT") || "[]").includes("Cash"))).toBe(false);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes("Freelance"))).toBe(false);

  await firstContext.close();
  await secondContext.close();
});
