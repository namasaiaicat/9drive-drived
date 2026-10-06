import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated WCAG 2.1 AA Accessibility Audit & Touch Target Verification', () => {
  test('Axe-core scan reports zero critical or serious WCAG 2.1 AA violations on /en', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalOrSerious = scanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSerious, JSON.stringify(criticalOrSerious, null, 2)).toEqual([]);
  });

  test('Axe-core scan reports zero critical or serious WCAG 2.1 AA violations on /id', async ({ page }) => {
    await page.goto('/id');
    await page.waitForLoadState('networkidle');

    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalOrSerious = scanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSerious, JSON.stringify(criticalOrSerious, null, 2)).toEqual([]);
  });

  test('Axe-core scan reports zero critical or serious violations in mobile navigation drawer', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const hamburger = page.locator('#mobile-nav-hamburger');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      const drawer = page.locator('#mobile-nav-drawer');
      await expect(drawer).toBeVisible();

      const scanResults = await new AxeBuilder({ page })
        .include('#mobile-nav-drawer')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = scanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalOrSerious, JSON.stringify(criticalOrSerious, null, 2)).toEqual([]);
    }
  });

  test('Interactive elements meet touch target minimums (44x44px) on mobile viewports', async ({ page, isMobile }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    if (isMobile) {
      // 1. Mobile hamburger button
      const hamburger = page.locator('#mobile-nav-hamburger');
      await expect(hamburger).toBeVisible();
      const hamburgerBox = await hamburger.boundingBox();
      expect(hamburgerBox).not.toBeNull();
      if (hamburgerBox) {
        expect(hamburgerBox.width).toBeGreaterThanOrEqual(44);
        expect(hamburgerBox.height).toBeGreaterThanOrEqual(44);
      }

      // 2. Open drawer and check drawer close button, links, and action toggles
      await hamburger.click();
      const drawer = page.locator('#mobile-nav-drawer');
      await expect(drawer).toBeVisible();

      const closeBtn = page.locator('#mobile-nav-drawer .drawer-close-btn');
      const closeBox = await closeBtn.boundingBox();
      expect(closeBox).not.toBeNull();
      if (closeBox) {
        expect(closeBox.width).toBeGreaterThanOrEqual(44);
        expect(closeBox.height).toBeGreaterThanOrEqual(44);
      }

      // Check drawer nav links
      const navLinks = page.locator('#mobile-nav-drawer .drawer-nav-link');
      const navLinkCount = await navLinks.count();
      for (let i = 0; i < navLinkCount; i++) {
        const link = navLinks.nth(i);
        const box = await link.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }

      // Check drawer theme toggle button
      const drawerThemeToggle = page.locator('#mobile-nav-drawer .theme-toggle-btn');
      const themeBox = await drawerThemeToggle.boundingBox();
      if (themeBox) {
        expect(themeBox.width).toBeGreaterThanOrEqual(44);
        expect(themeBox.height).toBeGreaterThanOrEqual(44);
      }

      // Check drawer language selector buttons
      const langBtns = page.locator('#mobile-nav-drawer .lang-selector-btn');
      const langCount = await langBtns.count();
      for (let i = 0; i < langCount; i++) {
        const btn = langBtns.nth(i);
        const box = await btn.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
        }
      }

      // Close drawer before checking rest of page
      await closeBtn.click();
      await expect(drawer).not.toBeVisible();
    } else {
      // Desktop checks
      const themeToggle = page.locator('.navbar-actions .theme-toggle-btn');
      await expect(themeToggle).toBeVisible();
      const themeBox = await themeToggle.boundingBox();
      if (themeBox) {
        expect(themeBox.width).toBeGreaterThanOrEqual(40);
        expect(themeBox.height).toBeGreaterThanOrEqual(40);
      }
    }

    // Common interactive elements across views:
    // Hero CTAs
    const heroCtas = page.locator('.hero-cta-btn');
    const heroCtaCount = await heroCtas.count();
    for (let i = 0; i < heroCtaCount; i++) {
      const cta = heroCtas.nth(i);
      const box = await cta.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    // FAQ Accordion headers
    const faqButtons = page.locator('.faq-accordion-header');
    const faqCount = await faqButtons.count();
    for (let i = 0; i < faqCount; i++) {
      const faqBtn = faqButtons.nth(i);
      const box = await faqBtn.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
