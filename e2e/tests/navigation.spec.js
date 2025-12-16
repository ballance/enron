import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Enron Email Visualization/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should navigate between pages using menu', async ({ page }) => {
    await page.goto('/');

    // Click Network
    await page.getByRole('link', { name: 'Network' }).click();
    await expect(page).toHaveURL('/network');
    await expect(page.getByRole('heading', { name: 'Network Graph' })).toBeVisible();

    // Click Timeline
    await page.getByRole('link', { name: 'Timeline' }).click();
    await expect(page).toHaveURL('/timeline');
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();

    // Click Threads
    await page.getByRole('link', { name: 'Threads' }).click();
    await expect(page).toHaveURL('/threads');
    await expect(page.getByRole('heading', { name: 'Thread Explorer' })).toBeVisible();

    // Click Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should show active navigation state', async ({ page }) => {
    await page.goto('/');

    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/bg-gray-900/);

    await page.getByRole('link', { name: 'Network' }).click();
    const networkLink = page.getByRole('link', { name: 'Network' });
    await expect(networkLink).toHaveClass(/bg-gray-900/);
  });

  test('should display header and footer on all pages', async ({ page }) => {
    const pages = ['/', '/network', '/timeline', '/threads'];

    for (const url of pages) {
      await page.goto(url);
      await expect(page.getByText('Enron Email Visualization')).toBeVisible();
      await expect(page.getByText(/517K messages/)).toBeVisible();
    }
  });
});
