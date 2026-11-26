import { test, expect } from "@playwright/test";

const cases = [
  { width: 360, height: 640, language: "fa", direction: "rtl" },
  { width: 360, height: 640, language: "en", direction: "ltr" },
  { width: 390, height: 844, language: "fa", direction: "rtl" },
  { width: 390, height: 844, language: "en", direction: "ltr" },
] as const;

for (const scenario of cases) {
  test(`${scenario.width}x${scenario.height} ${scenario.language} responsive smoke`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.addInitScript(({ language }) => {
      localStorage.setItem("projectx-language", language);
      localStorage.removeItem("novyra-text-direction");
      localStorage.removeItem("projectx-token");
    }, { language: scenario.language });

    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect.poll(() => page.locator("html").getAttribute("lang")).toBe(scenario.language);
    await expect.poll(() => page.locator("html").getAttribute("dir")).toBe(scenario.direction);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document, "document must not overflow horizontally").toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body, "body must not overflow horizontally").toBeLessThanOrEqual(dimensions.viewport);

    await page.screenshot({ path: testInfo.outputPath(`${scenario.width}x${scenario.height}-${scenario.language}.png`), fullPage: true });
  });
}
