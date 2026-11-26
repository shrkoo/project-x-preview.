import { test, expect, type Page } from "@playwright/test";

const apiPattern = /workers\.dev/;

async function prepare(page: Page, language: "fa" | "en", accountType: "personal" | "business") {
  await page.addInitScript(({ language, accountType }) => {
    localStorage.setItem("projectx-token", "playwright-preview-token");
    localStorage.setItem("projectx-language", language);
    localStorage.setItem("projectx-account-type", accountType);
    localStorage.setItem("novyra-finance-currency", language === "fa" ? "IRR" : "USD");
    localStorage.removeItem("novyra-text-direction");
    localStorage.removeItem("projectx-app-lock-type");
    localStorage.removeItem("projectx-app-lock-configured");
  }, { language, accountType });

  await page.route(apiPattern, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    let body: unknown = {};
    if (path.endsWith("/auth/me")) {
      body = { user: { id: "pw-user", email: "preview@example.test", displayName: "Preview User", profile: { accountType, appLockType: "none" } } };
    } else if (path.endsWith("/workspaces") && method === "GET") {
      body = { workspaces: [{ id: "pw-workspace", type: accountType, name: "Preview", currency: language === "fa" ? "IRR" : "USD" }] };
    } else if (path.endsWith("/workspaces") && method === "POST") {
      body = { workspace: { id: "pw-workspace", type: accountType, name: "Preview", currency: language === "fa" ? "IRR" : "USD" } };
    } else if (path.endsWith("/finance/transactions")) {
      body = method === "GET" ? { items: [] } : { ok: true };
    } else if (path.endsWith("/business/records")) {
      body = method === "GET" ? { records: { invoices: [], payables: [], customers: [], products: [], transactions: [], cheques: [], loans: [], team: [], activity: [], trash: [], settings: {}, bankImports: [] }, revision: 1, role: "owner" } : { ok: true, revision: 1 };
    } else if (path.endsWith("/business/team")) body = { team: [] };
    else if (path.endsWith("/business/audit")) body = { events: [] };
    else if (path.endsWith("/business/journal")) body = { entries: [], accounts: [] };
    else if (path.endsWith("/business/reminders")) body = { reminders: [] };
    else body = { ok: true };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

for (const language of ["fa", "en"] as const) {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
    for (const accountType of ["personal", "business"] as const) {
      test(`${accountType} workspace / ${language} / ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        await prepare(page, language, accountType);
        await page.goto("/");
        await expect(page.locator(".nv-finance[data-account-type]")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator(".nf-mobile-dock")).toBeVisible();

        const nav = page.locator(".nf-mobile-dock button");
        const navCount = await nav.count();
        expect(navCount).toBe(5);
        for (let i = 0; i < navCount; i++) {
          await nav.nth(i).click();
          await expect(page.locator(".nf-mobile-dock")).toBeVisible();
        }

        const quick = page.locator(".nv-ref-dock-center");
        await quick.click();
        if (accountType === "business") {
          await expect(page.getByText(language === "fa" ? "افزودن سریع" : "Quick add")).toBeVisible();
          const expenseChoice = page.getByRole("button", { name: language === "fa" ? "هزینه" : "Expense" });
          await expenseChoice.click();
          await expect(page.locator(".nbo-root")).toBeVisible();
          await expect(page.locator(".nbo-card")).toBeVisible();
        } else {
          await expect(page.locator(".nf-modal")).toBeVisible();
          await page.locator(".nf-modal-head button").click();
        }

        await page.locator("#profileBtn").click();
        await expect(page.locator(".nvsh-root")).toBeVisible();

        const layout = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
          direction: document.querySelector("main.nv-finance")?.getAttribute("dir"),
          smallTargets: Array.from(document.querySelectorAll("button")).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.width < 48 || r.height < 48);
          }).length,
          textOverflows: Array.from(document.querySelectorAll("button")).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && el.scrollWidth > el.clientWidth + 2; }).length,
        }));
        expect(layout.page).toBeLessThanOrEqual(layout.viewport + 1);
        expect(layout.direction).toBe(language === "fa" ? "rtl" : "ltr");
        expect(layout.smallTargets).toBe(0);
        expect(layout.textOverflows).toBe(0);
        expect(errors).toEqual([]);
      });
    }
  }
}
