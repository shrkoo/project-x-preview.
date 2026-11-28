import { test, expect } from "@playwright/test";

test("two independent browser contexts see the same account transactions from the shared API", async ({ browser }) => {
  test.setTimeout(60_000);
  const server = {
    items: [] as Array<Record<string, any>>,
    workspace: { id: "finance-sync-workspace", type: "personal", name: "Personal", currency: "IRT" },
    collections: { accounts: [] as Array<Record<string, any>>, categories: [] as Array<Record<string, any>>, recurring: [] as Array<Record<string, any>> },
  };
  const makeContext = async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      localStorage.setItem("projectx-token", "finance-sync-e2e-token");
      localStorage.setItem("projectx-language", "fa");
      localStorage.setItem("novyra-text-direction", "rtl");
      localStorage.setItem("novyra-finance-currency", "IRT");
      for (const currency of ["IRR", "IRT", "USD"]) localStorage.setItem("nv-personal-accounts:" + currency, JSON.stringify(["Checking", "Savings"]));
      localStorage.setItem("novyra-preferences-v1", JSON.stringify({ country: "IR", language: "fa", direction: "rtl", currency: "IRT", calendar: "persian", dateFormat: "YYYY/MM/DD", numberSystem: "arabext", digits: "arabext", firstDay: "saturday", monthlyBudget: "9000000", categoryBudgets: { "خوراک": "2000000" }, categories: ["عمومی", "خوراک", "حمل‌ونقل", "خانه", "سلامت", "آموزش", "حقوق", "سرمایه‌گذاری", "پس‌انداز", "فروش", "قبض", "سایر", "فریلنس"] }));
      localStorage.setItem("novyra-recurring:finance-sync-user:personal", JSON.stringify([{ id: "repeat-seed-1", title: "Rent", amount: 1000000, kind: "expense", category: "خانه", frequency: "monthly", createdAt: "2026-11-01", lastGenerated: "2026-11-01" }]));
      localStorage.setItem("novyra-custom-goals", JSON.stringify([{ id: "goal-1", title: "Emergency", target: 5000000 }]));
      localStorage.setItem("novyra-saving-target", "5000000");
      localStorage.setItem("novyra-travel-target", "12000000");
    });
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.hostname.includes("projectx-novyratam.workers.dev")) return route.continue();
      const path = url.pathname;
      const segments = path.split("/");
      const collectionMatch = segments[1] === "finance" && ["accounts", "categories", "recurring"].includes(segments[2]) ? [path, segments[2], segments[3]] : null;
      if (collectionMatch) {
        const resource = collectionMatch[1] as "accounts" | "categories" | "recurring";
        if (request.method() === "GET") return route.fulfill({ json: { items: server.collections[resource].map(item => ({ ...item })) } });
        if (request.method() === "PUT") {
          const payload = request.postDataJSON();
          for (const item of payload.items || []) {
            const index = server.collections[resource].findIndex(row => row.id === item.id);
            if (index >= 0) server.collections[resource][index] = { ...item, deletedAt: undefined };
            else server.collections[resource].push({ ...item });
          }
          return route.fulfill({ json: { ok: true, saved: (payload.items || []).length } });
        }
        if (request.method() === "DELETE") {
          const id = decodeURIComponent(collectionMatch[2] || "");
          const row = server.collections[resource].find(item => item.id === id);
          if (row) row.deletedAt = new Date().toISOString();
          return route.fulfill({ json: { ok: true } });
        }
      }
      if (path === "/auth/me") return route.fulfill({ json: { user: { id: "finance-sync-user", email: "sync@example.test", displayName: "Sync User", profile: { accountType: "personal", appLockType: "none" } } } });
      if (path === "/workspaces") return route.fulfill({ json: { workspaces: [server.workspace] } });
      if (path === "/finance/transactions" && request.method() === "GET") return route.fulfill({ json: { items: server.items.map(item => ({ ...item })) } });
      if (path === "/finance/transactions" && request.method() === "PUT") {
        const payload = request.postDataJSON();
        for (const item of payload.items || []) {
          const index = server.items.findIndex(row => row.id === item.id);
          if (index >= 0) server.items[index] = { ...item };
          else server.items.push({ ...item });
        }
        return route.fulfill({ json: { ok: true, saved: (payload.items || []).length } });
      }
      if (path.startsWith("/finance/transactions/") && request.method() === "DELETE") {
        const id = decodeURIComponent(path.split("/").pop() || "");
        server.items = server.items.filter(item => item.id !== id);
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { ok: true } });
    });
    return context;
  };

  const firstContext = await makeContext();
  const first = await firstContext.newPage();
  await first.goto("/");
  await expect(first.locator(".nv-p-home")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => server.collections.accounts.length).toBe(2);
  await expect.poll(() => server.collections.categories.some(item => item.name === "فریلنس")).toBe(true);
  await expect.poll(() => server.collections.recurring.some(item => item.id === "repeat-seed-1")).toBe(true);
  const migrationKey = "nv-finance-collections-migrated-v1:finance-sync-user:finance-sync-workspace";
  const backupKey = "nv-backup-pre-sync-v1:finance-sync-user:finance-sync-workspace";
  await expect.poll(() => first.evaluate(key => localStorage.getItem(key), migrationKey)).toBe("1");
  const backup = await first.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), backupKey);
  expect(backup?.format).toBe("novyra-pre-sync-backup-v1");
  expect(backup?.data?.transactions).toBeDefined();
  expect(backup?.data?.preferences?.monthlyBudget).toBe("9000000");
  expect(backup?.data?.goals?.[0]?.id).toBe("goal-1");
  expect(backup?.data?.savingTarget).toBe("5000000");
  expect(backup?.data?.travelTarget).toBe("12000000");


  await first.locator(".nv-p-quick button").first().click();
  let sheet = first.locator(".nv-tx-sheet");
  await expect(sheet).toBeVisible();
  await sheet.locator("#nv-tx-amount").fill("1250000");
  await sheet.locator(".nv-tx-field input").first().fill("Sync expense");
  await sheet.locator(".nv-tx-save").click();
  await expect(first.getByText("Sync expense")).toBeVisible();
  await expect.poll(() => server.items.some(item => item.title === "Sync expense")).toBe(true);

  await first.locator(".nv-p-quick button").nth(1).click();
  sheet = first.locator(".nv-tx-sheet");
  await sheet.locator("#nv-tx-amount").fill("5000000");
  await sheet.locator(".nv-tx-field input").first().fill("Sync income");
  await sheet.locator(".nv-tx-save").click();
  await expect.poll(() => server.items.some(item => item.title === "Sync income")).toBe(true);

  await first.locator("nav.nv-ref-dock button").nth(2).click();
  await first.getByRole("button", { name: /^هزینه$/ }).click();
  sheet = first.locator(".nv-tx-sheet");
  await sheet.locator(".nv-tx-seg").nth(2).click();
  await sheet.locator("#nv-tx-amount").fill("250000");
  await expect(sheet.locator(".nv-tx-no-transfer-accounts")).toHaveCount(0);
  await expect(sheet.locator(".nv-tx-transfer select")).toHaveCount(2);
  await sheet.locator(".nv-tx-transfer select").nth(0).selectOption("Checking");
  await sheet.locator(".nv-tx-transfer select").nth(1).selectOption("Savings");
  await sheet.locator(".nv-tx-save").click();
  await expect.poll(() => server.items.some(item => item.kind === "transfer" && item.fromAccount === "Checking" && item.toAccount === "Savings")).toBe(true);

  const secondContext = await makeContext();
  const second = await secondContext.newPage();
  await second.goto("/");
  await expect(second.locator(".nv-p-home")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => second.evaluate(key => JSON.parse(localStorage.getItem(key) || "[]"), "nv-personal-accounts:IRT")).toEqual(["Checking", "Savings"]);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("novyra-recurring:finance-sync-user:personal") || "[]").some((item:any) => item.id === "repeat-seed-1"))).toBe(true);
  await expect.poll(() => second.evaluate(() => JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}").categories?.includes("فریلنس"))).toBe(true);

  await expect(second.getByText("Sync expense")).toBeVisible();
  await expect(second.getByText("Sync income")).toBeVisible();
  await expect(second.getByText(/انتقال از Checking به Savings/)).toBeVisible();
  await second.locator(".nv-p-section-head button").first().click();
  await expect(second.locator(".nf-transaction").filter({ hasText: "Sync expense" })).toContainText("۱٬۲۵۰٬۰۰۰");
  await expect(second.locator(".nf-transaction").filter({ hasText: "Sync income" })).toContainText("۵٬۰۰۰٬۰۰۰");
  expect(server.items.some(item => item.kind === "transfer" && item.fromAccount === "Checking" && item.toAccount === "Savings")).toBe(true);

  const expenseRow = second.locator(".nf-transaction").filter({ hasText: "Sync expense" });
  await expenseRow.getByRole("button", { name: "ویرایش تراکنش" }).click();
  const editSheet = second.locator(".nv-tx-sheet");
  await editSheet.locator("#nv-tx-amount").fill("1400000");
  await editSheet.locator(".nv-tx-save").click();
  await expect.poll(() => server.items.find(item => item.title === "Sync expense")?.amount).toBe(1400000);
  await first.reload();
  await expect(first.locator(".nv-p-home")).toBeVisible({ timeout: 30_000 });
  await first.locator(".nv-p-section-head button").first().click();
  await expect(first.locator(".nf-transaction").filter({ hasText: "Sync expense" })).toContainText("۱٬۴۰۰٬۰۰۰");

  await firstContext.close();
  await secondContext.close();
});
