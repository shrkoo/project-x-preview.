import { test, expect } from "@playwright/test";

for (const hasSavedSession of [true, false]) {
  test(`password reset URL takes priority (saved session: ${hasSavedSession})`, async ({ page }) => {
    let authMeRequests = 0;
    await page.addInitScript((saved) => {
      localStorage.setItem("projectx-language", "fa");
      if (saved) {
        localStorage.setItem("projectx-token", "valid-existing-session-token");
        localStorage.setItem("projectx-account", JSON.stringify({ name: "Existing User", email: "existing@example.com" }));
      } else {
        localStorage.removeItem("projectx-token");
        localStorage.removeItem("projectx-account");
      }
    }, hasSavedSession);
    await page.route("**/auth/me", async route => {
      authMeRequests++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { id: "existing-user", email: "existing@example.com", displayName: "Existing User" } })
      });
    });

    await page.goto("/?reset=playwright-reset-token");

    await expect(page.locator('input[autocomplete="new-password"]')).toHaveCount(2);
    await expect(page.locator(".nv-p-home")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("projectx-token"))).toBeNull();
    expect(authMeRequests).toBe(0);
  });
}
