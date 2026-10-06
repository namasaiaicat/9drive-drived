import { test, expect, type Page } from '@playwright/test';

/**
 * Helper to click language switcher across both desktop navbar and mobile drawer
 */
async function switchLanguage(page: Page, targetLang: 'EN' | 'ID') {
  await page.waitForLoadState('networkidle');

  const directBtn = page.locator('.navbar-actions .lang-selector-btn', { hasText: targetLang });
  if (await directBtn.isVisible()) {
    await directBtn.click();
    return;
  }

  const hamburger = page.locator('#mobile-nav-hamburger');
  if (await hamburger.isVisible()) {
    await hamburger.click();
    const drawer = page.locator('#mobile-nav-drawer');
    await expect(drawer).toBeVisible();
    const drawerBtn = page.locator('#mobile-nav-drawer .lang-selector-btn', { hasText: targetLang });
    await expect(drawerBtn).toBeVisible();
    await drawerBtn.click();
    return;
  }

  const fallbackBtn = page.locator('.lang-selector-btn:visible', { hasText: targetLang }).first();
  await fallbackBtn.click();
}

test.describe('Root bootstrap routing, deep-link precedence & anchor preservation', () => {
  test('root / redirects to /en when no stored locale and browser language is default (English)', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/en(\/)?$/);
    expect(page.url()).toContain('/en');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('en');
  });

  test('root / redirects to /id when browser language is set to Indonesian', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'id-ID',
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForURL(/\/id(\/)?$/);
    expect(page.url()).toContain('/id');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('id');
    await context.close();
  });

  test('root / redirects to stored locale in localStorage over browser language', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('9drive_locale', 'id');
    });

    await page.goto('/');
    await page.waitForURL(/\/id(\/)?$/);
    expect(page.url()).toContain('/id');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('id');
  });

  test('root / redirects to /en when localStorage has "en" even if browser language is id', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'id-ID',
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem('9drive_locale', 'en');
    });

    await page.goto('/');
    await page.waitForURL(/\/en(\/)?$/);
    expect(page.url()).toContain('/en');
    await context.close();
  });

  test('root / preserves query strings and anchor hashes during redirect', async ({ page }) => {
    await page.goto('/?ref=producthunt&source=banner#install');
    await page.waitForURL(/\/en\?ref=producthunt&source=banner#install/);
    expect(page.url()).toContain('/en?ref=producthunt&source=banner#install');
  });

  test('deep link /id#install loads Indonesian content, updates localStorage, and preserves hash without page bounce', async ({ page }) => {
    await page.goto('/id#install');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/id#install');

    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('id');

    const section = page.locator('#install');
    await expect(section).toBeVisible();

    const storedLocale = await page.evaluate(() => window.localStorage.getItem('9drive_locale'));
    expect(storedLocale).toBe('id');
  });

  test('deep link /en#faq loads English content and preserves hash', async ({ page }) => {
    await page.goto('/en#faq');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/en#faq');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('en');

    const faqSection = page.locator('#faq');
    await expect(faqSection).toBeVisible();

    const storedLocale = await page.evaluate(() => window.localStorage.getItem('9drive_locale'));
    expect(storedLocale).toBe('en');
  });

  test('language switcher transitions from /en#faq to /id#faq preserving anchor hash without page bounce', async ({ page }) => {
    await page.goto('/en#faq');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/en#faq');

    await switchLanguage(page, 'ID');
    await page.waitForURL(/\/id#faq/);

    expect(page.url()).toContain('/id#faq');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('id');

    const storedLocale = await page.evaluate(() => window.localStorage.getItem('9drive_locale'));
    expect(storedLocale).toBe('id');

    const faqSection = page.locator('#faq');
    await expect(faqSection).toBeVisible();
  });

  test('language switcher transitions from /id#install to /en#install preserving anchor hash', async ({ page }) => {
    await page.goto('/id#install');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/id#install');

    await switchLanguage(page, 'EN');
    await page.waitForURL(/\/en#install/);

    expect(page.url()).toContain('/en#install');
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('en');

    const storedLocale = await page.evaluate(() => window.localStorage.getItem('9drive_locale'));
    expect(storedLocale).toBe('en');

    const installSection = page.locator('#install');
    await expect(installSection).toBeVisible();
  });
});
