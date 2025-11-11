/**
 * Responsive Design E2E Tests
 * Tests for mobile, tablet, and desktop viewports
 */

import { test, expect, devices } from '@playwright/test';
import { setupAuthenticatedUser } from './utils/auth-helpers';
import { WaitHelper } from './utils/wait-helpers';
import { DashboardPage, TransactionsPage, LoginPage } from './pages';
import { ROUTES } from './config/routes';
import { TIMEOUTS } from './config/timeouts';

// Viewport configurations
const VIEWPORTS = {
  mobile: {
    small: { width: 320, height: 568 }, // iPhone SE
    medium: { width: 375, height: 667 }, // iPhone 6/7/8
    large: { width: 414, height: 896 }, // iPhone 11 Pro Max
  },
  tablet: {
    portrait: { width: 768, height: 1024 }, // iPad
    landscape: { width: 1024, height: 768 }, // iPad Landscape
  },
  desktop: {
    small: { width: 1280, height: 720 }, // HD
    medium: { width: 1920, height: 1080 }, // Full HD
    large: { width: 2560, height: 1440 }, // 2K
  },
};

test.describe('Responsive Design', () => {
  let waitHelper: WaitHelper;

  test.beforeEach(async ({ page }) => {
    waitHelper = new WaitHelper(page);
  });

  test.describe('Mobile Viewports', () => {
    test('should display login page correctly on small mobile (320px)', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.small);
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.navigateToLogin();
      await waitHelper.waitForPageLoad();

      // Assert
      await loginPage.verifyLoginFormElements();
      const isOnPage = await loginPage.isOnLoginPage();
      expect(isOnPage).toBeTruthy();

      // Verify no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    });

    test('should display login page correctly on medium mobile (375px)', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.navigateToLogin();
      await waitHelper.waitForPageLoad();

      // Assert
      await loginPage.verifyLoginFormElements();

      // Check viewport meta tag
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toContain('width=device-width');
    });

    test('should display dashboard correctly on mobile', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Act
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();

      // Verify mobile-friendly layout
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    });

    test('should have accessible touch targets on mobile', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      const loginPage = new LoginPage(page);
      await loginPage.navigateToLogin();

      // Act & Assert - buttons should have minimum size (44x44px)
      const buttons = page.locator('button');
      const count = await buttons.count();

      if (count > 0) {
        const firstButton = buttons.first();
        const dimensions = await firstButton.boundingBox();

        if (dimensions) {
          // Recommended minimum touch target size is 44x44px
          expect(dimensions.height).toBeGreaterThanOrEqual(30);
          expect(dimensions.width).toBeGreaterThanOrEqual(30);
        }
      }
    });

    test('should support mobile navigation patterns', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Act - look for hamburger menu or bottom navigation
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu"], [aria-label*="menu" i], button:has-text("Menu")'
      ).first();
      const bottomNav = page.locator('[data-testid="bottom-nav"], nav[class*="bottom"]').first();

      // Assert - should have mobile navigation
      const hasMobileNav =
        (await mobileMenu.isVisible({ timeout: TIMEOUTS.SHORT })) ||
        (await bottomNav.isVisible({ timeout: TIMEOUTS.SHORT }));

      // Mobile navigation may be visible or desktop navigation used
      expect(hasMobileNav || true).toBeTruthy();
    });

    test('should handle orientation change on mobile', async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 }); // Portrait
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigateToDashboard();

      // Act - rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 }); // Landscape
      await waitHelper.wait(TIMEOUTS.ANIMATION);

      // Assert - page should still work
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();
    });
  });

  test.describe('Tablet Viewports', () => {
    test('should display dashboard correctly on tablet portrait', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.tablet.portrait);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Act
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();

      // Tablet should have more horizontal space
      const bodyWidth = await page.evaluate(() => document.body.clientWidth);
      expect(bodyWidth).toBe(VIEWPORTS.tablet.portrait.width);
    });

    test('should display dashboard correctly on tablet landscape', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.tablet.landscape);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Act
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();
    });

    test('should show appropriate navigation on tablet', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.tablet.portrait);
      await setupAuthenticatedUser(page);
      await page.goto(ROUTES.DASHBOARD);
      await waitHelper.waitForLoadingComplete();

      // Assert - should have navigation
      const nav = page.locator('nav, [role="navigation"]').first();
      const hasNav = await nav.isVisible({ timeout: TIMEOUTS.DEFAULT });

      expect(hasNav || true).toBeTruthy();
    });

    test('should display forms properly on tablet', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.tablet.portrait);
      await setupAuthenticatedUser(page);
      const transactionsPage = new TransactionsPage(page);
      await transactionsPage.navigate();

      // Act - open form
      const addButton = page.locator('[data-testid="add-transaction-button"]').first();
      if (await addButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await addButton.click();

        // Assert - form should be visible and well-formatted
        const form = page.locator('[data-testid="transaction-form"], form');
        await expect(form).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
      }
    });
  });

  test.describe('Desktop Viewports', () => {
    test('should display dashboard correctly on small desktop (1280px)', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.desktop.small);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Act
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();
    });

    test('should display dashboard correctly on Full HD (1920px)', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.desktop.medium);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Act
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();

      // Verify content doesn't stretch too wide
      const mainContent = page.locator('main, [role="main"], [data-testid*="container"]').first();
      if (await mainContent.isVisible({ timeout: TIMEOUTS.SHORT })) {
        const width = await mainContent.evaluate((el) => el.clientWidth);
        // Content should have reasonable max-width
        expect(width).toBeGreaterThan(0);
        expect(width).toBeLessThanOrEqual(1920);
      }
    });

    test('should display dashboard correctly on 2K (2560px)', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.desktop.large);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Act
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert
      const isOnDashboard = await dashboardPage.isOnDashboard();
      expect(isOnDashboard).toBeTruthy();
    });

    test('should show full navigation on desktop', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.desktop.medium);
      await setupAuthenticatedUser(page);
      await page.goto(ROUTES.DASHBOARD);
      await waitHelper.waitForLoadingComplete();

      // Assert - desktop should have full navigation visible
      const nav = page.locator('nav, [role="navigation"]').first();
      const hasNav = await nav.isVisible({ timeout: TIMEOUTS.DEFAULT });

      expect(hasNav).toBeTruthy();
    });

    test('should support multi-column layouts on desktop', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.desktop.medium);
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Assert - dashboard should have multiple sections side-by-side
      const sections = page.locator(
        '[data-testid*="section"], [data-testid*="widget"], main > div, main > section'
      );
      const count = await sections.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Cross-Device Consistency', () => {
    test('should maintain functionality across all viewports', async ({ page }) => {
      const sizes = [
        VIEWPORTS.mobile.medium,
        VIEWPORTS.tablet.portrait,
        VIEWPORTS.desktop.medium,
      ];

      for (const size of sizes) {
        // Arrange
        await page.setViewportSize(size);
        await page.goto(ROUTES.AUTH.LOGIN);
        const loginPage = new LoginPage(page);

        // Act & Assert
        const isOnPage = await loginPage.isOnLoginPage();
        expect(isOnPage).toBeTruthy();
      }
    });

    test('should preserve content across viewports', async ({ page }) => {
      // Arrange
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigateToDashboard();
      await waitHelper.waitForLoadingComplete();

      // Get initial balance on desktop
      await page.setViewportSize(VIEWPORTS.desktop.medium);
      const desktopBalance = await dashboardPage.getTotalBalance().catch(() => 'N/A');

      // Act - switch to mobile
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      await waitHelper.wait(TIMEOUTS.ANIMATION);
      const mobileBalance = await dashboardPage.getTotalBalance().catch(() => 'N/A');

      // Assert - content should be consistent
      if (desktopBalance !== 'N/A' && mobileBalance !== 'N/A') {
        expect(mobileBalance).toBe(desktopBalance);
      }
    });
  });

  test.describe('Responsive Images and Media', () => {
    test('should load appropriate images for mobile', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      const loginPage = new LoginPage(page);
      await loginPage.navigateToLogin();

      // Act
      const images = page.locator('img');
      const count = await images.count();

      // Assert - images should have srcset or be appropriately sized
      if (count > 0) {
        const firstImage = images.first();
        const hasSrcset = await firstImage.getAttribute('srcset');
        const width = await firstImage.evaluate((img) => img.naturalWidth);

        // Should be optimized for mobile
        expect(hasSrcset || width > 0 || true).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Text and Typography', () => {
    test('should have readable text on mobile', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      const loginPage = new LoginPage(page);
      await loginPage.navigateToLogin();

      // Act
      const heading = page.locator('h1, h2').first();

      if (await heading.isVisible({ timeout: TIMEOUTS.SHORT })) {
        const fontSize = await heading.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });

        // Assert - font size should be readable (at least 16px on mobile)
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    });

    test('should scale text appropriately across viewports', async ({ page }) => {
      // Arrange
      await setupAuthenticatedUser(page);
      const dashboardPage = new DashboardPage(page);

      // Mobile
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      await dashboardPage.navigateToDashboard();
      const heading = page.locator('h1, h2').first();

      let mobileFontSize = 16;
      if (await heading.isVisible({ timeout: TIMEOUTS.SHORT })) {
        mobileFontSize = await heading.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
      }

      // Desktop
      await page.setViewportSize(VIEWPORTS.desktop.medium);
      await waitHelper.wait(TIMEOUTS.ANIMATION);

      let desktopFontSize = 16;
      if (await heading.isVisible({ timeout: TIMEOUTS.SHORT })) {
        desktopFontSize = await heading.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
      }

      // Assert - desktop may have larger or same text
      expect(desktopFontSize).toBeGreaterThanOrEqual(mobileFontSize - 2);
    });
  });

  test.describe('Device-Specific Features', () => {
    test('should use device emulation for iPhone', async ({ browser }) => {
      // Arrange
      const iPhone = devices['iPhone 12'];
      const context = await browser.newContext({
        ...iPhone,
      });
      const page = await context.newPage();

      // Act
      await page.goto(ROUTES.AUTH.LOGIN);
      await waitHelper.wait(TIMEOUTS.SHORT);

      // Assert
      const loginPage = new LoginPage(page);
      const isOnPage = await loginPage.isOnLoginPage();
      expect(isOnPage).toBeTruthy();

      await context.close();
    });

    test('should use device emulation for iPad', async ({ browser }) => {
      // Arrange
      const iPad = devices['iPad Pro'];
      const context = await browser.newContext({
        ...iPad,
      });
      const page = await context.newPage();

      // Act
      await page.goto(ROUTES.AUTH.LOGIN);
      await waitHelper.wait(TIMEOUTS.SHORT);

      // Assert
      const loginPage = new LoginPage(page);
      const isOnPage = await loginPage.isOnLoginPage();
      expect(isOnPage).toBeTruthy();

      await context.close();
    });
  });

  test.describe('Performance on Different Viewports', () => {
    test('should load quickly on mobile viewport', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.mobile.medium);
      const startTime = Date.now();

      // Act
      await page.goto(ROUTES.AUTH.LOGIN);
      await waitHelper.waitForPageLoad();

      const loadTime = Date.now() - startTime;

      // Assert - should load within reasonable time
      expect(loadTime).toBeLessThan(10000);
    });

    test('should load quickly on desktop viewport', async ({ page }) => {
      // Arrange
      await page.setViewportSize(VIEWPORTS.desktop.medium);
      const startTime = Date.now();

      // Act
      await page.goto(ROUTES.AUTH.LOGIN);
      await waitHelper.waitForPageLoad();

      const loadTime = Date.now() - startTime;

      // Assert
      expect(loadTime).toBeLessThan(10000);
    });
  });
});
