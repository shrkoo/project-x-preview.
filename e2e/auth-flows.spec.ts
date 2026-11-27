import { test, expect } from "@playwright/test";

const scenarios = [
  { width: 360, height: 640, language: "fa" as const, login: "ورود", create: "ساخت حساب", forgot: "رمز عبور را فراموش کرده‌اید؟", send: "ارسال لینک بازیابی", sent: "درخواست ثبت شد", google: "ادامه با Google", first: "نام", last: "نام خانوادگی", email: "ایمیل", password: "رمز عبور", country: "کشور", countrySearch: "کشور را جست‌وجو کن", currency: "واحد پول", continue: "ادامه", success: "به نوویرا خوش آمدی" },
  { width: 360, height: 640, language: "en" as const, login: "Log in", create: "Create account", forgot: "Forgot password?", send: "Send reset link", sent: "Request received", google: "Continue with Google", first: "First name", last: "Last name", email: "Email", password: "Password", country: "Country", countrySearch: "Search countries", currency: "Currency", continue: "Continue", success: "Welcome to Novyra" },
  { width: 390, height: 844, language: "fa" as const, login: "ورود", create: "ساخت حساب", forgot: "رمز عبور را فراموش کرده‌اید؟", send: "ارسال لینک بازیابی", sent: "درخواست ثبت شد", google: "ادامه با Google", first: "نام", last: "نام خانوادگی", email: "ایمیل", password: "رمز عبور", country: "کشور", countrySearch: "کشور را جست‌وجو کن", currency: "واحد پول", continue: "ادامه", success: "به نوویرا خوش آمدی" },
  { width: 390, height: 844, language: "en" as const, login: "Log in", create: "Create account", forgot: "Forgot password?", send: "Send reset link", sent: "Request received", google: "Continue with Google", first: "First name", last: "Last name", email: "Email", password: "Password", country: "Country", countrySearch: "Search countries", currency: "Currency", continue: "Continue", success: "Welcome to Novyra" },
];

for (const scenario of scenarios) {
  test.describe(`${scenario.width}x${scenario.height} / ${scenario.language} auth flows`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      await page.addInitScript(({ language }) => {
        localStorage.setItem("projectx-language", language);
        localStorage.removeItem("projectx-token");
      }, { language: scenario.language });
    });

    test("forgot password normalizes RTL controls, sends and shows cooldown success", async ({ page }) => {
      let submittedEmail = "";
      await page.route("**/auth/forgot-password", async route => {
        submittedEmail = route.request().postDataJSON()?.email || "";
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      });
      await page.goto("/");
      await page.getByRole("button", { name: scenario.login }).click();
      await page.getByRole("button", { name: scenario.forgot }).click();
      await page.locator('input[type="email"]').fill("\u200Fshahramalidazeh6203@gmail.com\u2066 ");
      await page.getByRole("button", { name: scenario.send }).click();
      await expect(page.getByText(scenario.sent)).toBeVisible();
      await expect.poll(() => submittedEmail).toBe("shahramalidazeh6203@gmail.com");
      await expect(page.locator(".nv-success .nv-button")).toBeDisabled();
    });

    test("email provider errors stay inline, include request id and can be retried", async ({ page }) => {
      let requests = 0;
      await page.route("**/auth/forgot-password", async route => {
        requests++;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({
          code: "EMAIL_SEND_FAILED", message: "Email provider is not configured.", requestId: "req-preview-503"
        }) });
      });
      await page.goto("/");
      await page.getByRole("button", { name: scenario.login }).click();
      await page.getByRole("button", { name: scenario.forgot }).click();
      await page.locator('input[type="email"]').fill("auth-preview@example.com");
      await page.getByRole("button", { name: scenario.send }).click();
      await expect(page.locator(".nv-inline-error")).toContainText("req-preview-503");
      const retry = scenario.language === "fa" ? "تلاش دوباره" : "Try again";
      await page.getByRole("button", { name: retry }).click();
      await expect.poll(() => requests).toBe(2);
    });

    test("Google button starts OAuth redirect", async ({ page }) => {
      await page.route("**/auth/google/start", async route => {
        await route.fulfill({ status: 302, headers: { location: "https://accounts.google.com/o/oauth2/v2/auth?client_id=mock-preview-client&redirect_uri=https%3A%2F%2Fnovyra-preview-api.projectx-novyratam.workers.dev%2Fauth%2Fgoogle%2Fcallback&state=mock-state" } });
      });
      await page.route("https://accounts.google.com/**", async route => {
        await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Mock Google OAuth</title>" });
      });
      await page.goto("/");
      await page.getByRole("button", { name: scenario.google }).click();
      await expect(page).toHaveURL(/accounts\.google\.com\/o\/oauth2/);
    });

    test("sign-up completes every onboarding step", async ({ page }) => {
      await page.route("**/auth/email-check", async route => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ exists: false, provider: null }) });
      });
      await page.route("**/auth/register", async route => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          token: "preview-signup-session-token",
          user: { id: "preview-user", email: "auth-preview@example.com", displayName: "Preview User", xp: 0, gamesPlayed: 0, role: "user", profile: { accountType: "personal", appLockType: "none", currency: "USD" } }
        }) });
      });
      await page.goto("/");
      await page.getByRole("button", { name: scenario.create }).click();
      await page.getByLabel(scenario.first).fill("Preview");
      await page.getByLabel(scenario.last).fill("User");
      await page.getByLabel(scenario.email).fill("auth-preview@example.com");
      await page.getByRole("combobox", { name: scenario.country }).click();
      await page.getByRole("searchbox", { name: scenario.countrySearch }).fill("United States");
      await page.getByRole("button", { name: /United States/ }).click();
      await page.getByLabel(scenario.password).fill("PreviewPass123!");
      await page.getByLabel(scenario.language === "fa" ? "تکرار رمز عبور" : "Confirm password").fill("PreviewPass123!");
      await page.getByRole("button", { name: scenario.continue }).click();
      await page.getByRole("button", { name: scenario.continue }).click();
      await page.getByLabel(scenario.currency).selectOption("USD");
      await page.getByRole("button", { name: scenario.create }).click();
      await expect(page.getByRole("heading", { name: scenario.success })).toBeVisible();
      await expect.poll(() => page.evaluate(() => localStorage.getItem("projectx-token"))).toBe("preview-signup-session-token");
    });

    test("login posts credentials and stores the returned session", async ({ page }) => {
      await page.route("**/auth/password-salt**", async route => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ salt: "0123456789abcdef0123456789abcdef" }) });
      });
      await page.route("**/auth/login", async route => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          token: "preview-login-session-token",
          user: { id: "preview-user", email: "auth-preview@example.com", displayName: "Preview User", xp: 0, gamesPlayed: 0, role: "user", profile: { accountType: "personal", appLockType: "none", currency: "USD" } }
        }) });
      });
      await page.goto("/");
      await page.getByRole("button", { name: scenario.login }).click();
      await page.locator('input[type="email"]').fill("auth-preview@example.com");
      await page.getByLabel(scenario.password).fill("PreviewPass123!");
      await page.getByRole("button", { name: scenario.login }).last().click();
      await expect.poll(() => page.evaluate(() => localStorage.getItem("projectx-token"))).toBe("preview-login-session-token");
    });
  });
}
