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

        if (accountType === "business") {
          const home = page.locator(".nvbd-root");
          await expect(home).toBeVisible();
          const homeText = await home.innerText();
          expect(homeText).not.toContain("\\n");
          expect(homeText).not.toContain("n\\");
          expect(homeText).not.toContain('n\\"');
          if (language === "fa") expect(homeText).not.toContain("$");
          await expect(page.locator(".nvbd-action-secondary")).toHaveCount(3);
          for (const tile of await page.locator(".nvbd-action-secondary").all()) {
            await expect(tile.locator("svg")).toBeVisible();
            await tile.click();
            await expect(page.locator(".nvbd-sheet")).toBeVisible();
            await page.locator(".nvbd-close").click();
          }
          for (const metric of await page.locator(".nvbd-metric").all()) {
            await metric.click();
            await expect(page.locator(".nvbd-sheet")).toBeVisible();
            await page.locator(".nvbd-close").click();
          }
          await expect(page.locator(".nvbd-chart-empty")).toBeVisible();
          await expect(page.locator("body")).not.toContainText("permission to view reminders");
          const toastStyles = await page.evaluate(() => Array.from(document.querySelectorAll(".nf-toast,.nvbd-toast,.nbo-toast,.nvsh-toast,.toast")).map(el => getComputedStyle(el).backgroundColor));
          expect(toastStyles.every(color => !/rgb\(1[0-9], ?[0-9], ?[0-9]/.test(color))).toBeTruthy();
        }

        const nav = page.locator(".nf-mobile-dock button");
        const navCount = await nav.count();
        expect(navCount).toBe(5);
        for (let i = 0; i < navCount; i++) {
          if (i === 2) continue; // the center orb is tested separately below
          await nav.nth(i).click();
          await expect(page.locator(".nf-mobile-dock")).toBeVisible();
        }

        if (accountType === "business") {
          await nav.nth(1).click();
          await expect(page.locator(".nvbd-sales-tabs")).toBeVisible();
          const invoicesText = await page.locator(".nvbd-root").innerText();
          expect(invoicesText).not.toContain("\\n");
          expect(invoicesText).not.toContain("n\\");
          await page.getByRole("button", { name: language === "fa" ? "پیش‌فاکتورها" : "Quotes" }).click();
          await expect(page.locator(".nvbd-sales-tabs")).toBeVisible();
          await page.getByRole("button", { name: language === "fa" ? "مشتریان" : "Customers" }).click();
          await expect(page.locator(".nvbd-sales-tabs")).toBeVisible();
          await nav.nth(3).click();
          await expect(page.locator(".nvr-root")).toBeVisible();
          const reportsText = await page.locator("body").innerText();
          expect(reportsText).not.toContain("\\n");
          expect(reportsText).not.toContain("n\\");
          await page.locator(".nvr-export").click();
          await nav.nth(4).click();
          await expect(page.locator(".nbo-more-menu")).toBeVisible();
        } else {
          const home = page.locator(".nv-p-home");
          await nav.nth(0).click();
          await expect(home).toBeVisible();
          const homeText = await home.innerText();
          if (language === "fa") expect(homeText).not.toContain("$");
          expect(homeText).not.toContain("\\n");
          expect(homeText).not.toContain('n\\"');
          await home.locator(".nv-p-eye").click();
          await home.locator(".nv-p-eye").click();
          for (const action of await home.locator(".nv-p-quick button").all()) {
            await action.click();
            await expect(page.locator(".nv-tx-sheet")).toBeVisible();
            await page.locator(".nv-tx-close").click();
          }
          const emptyAction = home.locator(".nv-p-empty button");
          if (await emptyAction.count()) {
            await emptyAction.click();
            await expect(page.locator(".nv-tx-sheet")).toBeVisible();
            await page.locator(".nv-tx-close").click();
          }
          await home.locator(".nv-p-insight").click();
          await expect(page.locator(".nf-report-actions")).toBeVisible();
          await nav.nth(0).click();
          await home.locator(".nv-p-section-head button").first().click();
          await expect(page.locator(".nv-p-transactions")).toBeVisible();
          await nav.nth(0).click();
          await home.locator(".nv-p-category-strip button").first().click();
          await expect(page.locator(".nv-p-transactions")).toBeVisible();
          await nav.nth(1).click();
          await expect(page.locator(".nv-p-coming")).toBeVisible();
          await nav.nth(3).click();
          await expect(page.locator(".nf-report-actions")).toBeVisible();
          await nav.nth(4).click();
          await expect(page.locator(".nv-p-coming")).toBeVisible();
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
          smallTargets: Array.from(document.querySelectorAll("main.nv-finance button")).filter(el => { const r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&(r.width<48||r.height<48); }).map(el => { const r=el.getBoundingClientRect(); return {label:el.getAttribute("aria-label")||el.textContent?.trim(),width:Math.round(r.width),height:Math.round(r.height)}; }),
          textOverflows: Array.from(document.querySelectorAll("main.nv-finance button")).filter(el => { const r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&el.scrollWidth>el.clientWidth+2; }).map(el => ({label:el.getAttribute("aria-label")||el.textContent?.trim(),scroll:el.scrollWidth,client:el.clientWidth})),
        }));
        expect(layout.page).toBeLessThanOrEqual(layout.viewport + 1);
        expect(layout.direction).toBe(language === "fa" ? "rtl" : "ltr");
        expect(layout.smallTargets).toEqual([]);
        expect(layout.textOverflows).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}
