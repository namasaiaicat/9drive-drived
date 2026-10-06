import { test, expect } from '@playwright/test';

// Material Design 3 tokens defined in theme.css
const DARK_CANVAS_RGB = 'rgb(19, 19, 20)'; // #131314
const LIGHT_CANVAS_RGB = 'rgb(248, 250, 253)'; // #f8fafd

test.describe('Theme management & Zero-FOIT (Flash of Incorrect Theme) verification', () => {
  test('persisted light theme renders light canvas background at earliest parse stage without flash', async ({ page }) => {
    // Inject localStorage preference before navigation
    await page.addInitScript(() => {
      window.localStorage.setItem('9drive_theme', 'light');
    });

    // Monitor documentElement classes and body background as soon as DOM parses
    let parsedTheme = '';
    let parsedBg = '';
    await page.exposeFunction('onEarlyDomReady', (theme: string, bg: string) => {
      parsedTheme = theme;
      parsedBg = bg;
    });

    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const theme = document.documentElement.getAttribute('data-theme') || '';
        const bg = window.getComputedStyle(document.body).backgroundColor;
        // @ts-expect-error browser context exposed binding
        window.onEarlyDomReady(theme, bg);
      });
    });

    await page.goto('/en');

    // Confirm that upon earliest DOM load, light theme was already active
    expect(parsedTheme).toBe('light');
    expect(parsedBg).toBe(LIGHT_CANVAS_RGB);

    // Confirm after full page load, document.documentElement has .light and light background
    const htmlClasses = await page.evaluate(() => document.documentElement.className);
    expect(htmlClasses).toContain('light');
    expect(htmlClasses).not.toContain('dark');

    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe(LIGHT_CANVAS_RGB);
  });

  test('persisted dark theme renders dark canvas background at earliest parse stage without flash', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('9drive_theme', 'dark');
    });

    let parsedTheme = '';
    let parsedBg = '';
    await page.exposeFunction('onEarlyDarkDomReady', (theme: string, bg: string) => {
      parsedTheme = theme;
      parsedBg = bg;
    });

    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const theme = document.documentElement.getAttribute('data-theme') || '';
        const bg = window.getComputedStyle(document.body).backgroundColor;
        // @ts-expect-error browser context exposed binding
        window.onEarlyDarkDomReady(theme, bg);
      });
    });

    await page.goto('/en');

    expect(parsedTheme).toBe('dark');
    expect(parsedBg).toBe(DARK_CANVAS_RGB);

    const htmlClasses = await page.evaluate(() => document.documentElement.className);
    expect(htmlClasses).toContain('dark');
    expect(htmlClasses).not.toContain('light');

    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe(DARK_CANVAS_RGB);
  });

  test('respects system light preference when no stored theme exists', async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: 'light',
    });
    const page = await context.newPage();

    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    const dataTheme = await page.getAttribute('html', 'data-theme');
    expect(dataTheme).toBe('light');

    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe(LIGHT_CANVAS_RGB);

    await context.close();
  });

  test('respects system dark preference when no stored theme exists', async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    const dataTheme = await page.getAttribute('html', 'data-theme');
    expect(dataTheme).toBe('dark');

    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe(DARK_CANVAS_RGB);

    await context.close();
  });

  test('theme toggle flips theme instantaneously and updates localStorage', async ({ page }) => {
    // Start with light mode
    await page.addInitScript(() => {
      window.localStorage.setItem('9drive_theme', 'light');
    });

    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    const bodyBgBefore = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBgBefore).toBe(LIGHT_CANVAS_RGB);

    // Wait for hydration: ThemeToggle renders moon icon once mounted in light mode
    const moonIcon = page.locator('[data-testid="icon-moon"]');
    await moonIcon.first().waitFor({ state: 'attached' });

    // Locate theme toggle button in desktop navbar or mobile drawer
    const desktopToggle = page.locator('.navbar-actions .theme-toggle-btn');
    if (await desktopToggle.isVisible()) {
      await desktopToggle.click();
    } else {
      const hamburger = page.locator('#mobile-nav-hamburger');
      await hamburger.click();
      const drawerToggle = page.locator('#mobile-nav-drawer .theme-toggle-btn');
      await expect(drawerToggle).toBeVisible();
      await drawerToggle.click();
    }

    // Verify data-theme attribute updates to dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Verify background immediately switches to dark
    const bodyBgAfter = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBgAfter).toBe(DARK_CANVAS_RGB);

    const storedTheme = await page.evaluate(() => window.localStorage.getItem('9drive_theme'));
    expect(storedTheme).toBe('dark');
  });
});
