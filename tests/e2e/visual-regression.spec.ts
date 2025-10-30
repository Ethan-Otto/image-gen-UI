import { test, expect } from '@playwright/test';
import { mockImmediateCompletion } from '../fixtures/mockHelpers';

test.describe('Visual Regression Tests', () => {
  test('should match initial page layout', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await expect(page).toHaveScreenshot('initial-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match form section with filled values', async ({ page }) => {
    await page.goto('/');

    // Fill form
    await page.getByPlaceholder('Enter your image prompt').fill('A beautiful sunset over mountains');
    await page.locator('input[type="range"]').first().fill('8');
    await page.locator('input[type="range"]').nth(1).fill('4');

    // Take screenshot of form
    const formSection = page.locator('.bg-white').first();
    await expect(formSection).toHaveScreenshot('filled-form.png', {
      animations: 'disabled',
    });
  });

  test('should match generating state appearance', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          batchId: 'batch-1',
          jobIds: ['job-1', 'job-2', 'job-3'],
          status: 'pending',
        }),
      });
    });

    await page.route('**/api/status/*', async (route) => {
      const jobId = route.request().url().split('/').pop() || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId,
          status: 'generating',
        }),
      });
    });

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for generating state
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 3000,
    });

    // Take screenshot
    await expect(page).toHaveScreenshot('generating-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match completed generation grid layout', async ({ page }) => {
    await mockImmediateCompletion(page, 6);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for all images
    await expect(page.locator('img[alt="Generated image"]')).toHaveCount(6, {
      timeout: 10000,
    });

    // Wait for layout to stabilize
    await page.waitForTimeout(1000);

    // Take screenshot of results grid
    await expect(page).toHaveScreenshot('completed-grid.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match error state appearance', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/');

    // Trigger error
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for error
    await expect(page.getByText(/internal server error/i)).toBeVisible({
      timeout: 5000,
    });

    // Take screenshot
    await expect(page).toHaveScreenshot('error-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match mobile viewport layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await expect(page).toHaveScreenshot('mobile-initial.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match tablet viewport layout', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await expect(page).toHaveScreenshot('tablet-initial.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match image upload section with preview', async ({ page }) => {
    await page.goto('/');

    // Upload image
    await page.evaluate(() => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([new Blob([u8arr], { type: mime })], 'test.png', {
        type: 'image/png',
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for preview
    await page.waitForTimeout(1000);

    // Take screenshot
    await expect(page).toHaveScreenshot('image-uploaded.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match mixed status results', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          batchId: 'batch-1',
          jobIds: ['job-1', 'job-2', 'job-3', 'job-4'],
          status: 'pending',
        }),
      });
    });

    await page.route('**/api/status/*', async (route) => {
      const jobId = route.request().url().split('/').pop() || '';

      let response;
      if (jobId === 'job-1' || jobId === 'job-2') {
        response = {
          jobId,
          status: 'complete',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        };
      } else if (jobId === 'job-3') {
        response = {
          jobId,
          status: 'generating',
        };
      } else {
        response = {
          jobId,
          status: 'error',
          error: 'Generation failed',
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    await page.goto('/');

    // Generate
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for mixed results
    await page.waitForTimeout(5000);

    // Take screenshot
    await expect(page).toHaveScreenshot('mixed-status.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match cancel button state', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          batchId: 'batch-1',
          jobIds: ['job-1', 'job-2'],
          status: 'pending',
        }),
      });
    });

    await page.route('**/api/status/*', async (route) => {
      const jobId = route.request().url().split('/').pop() || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId,
          status: 'generating',
        }),
      });
    });

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for cancel button
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({
      timeout: 3000,
    });

    // Take screenshot
    const buttonSection = page.locator('.bg-white').first();
    await expect(buttonSection).toHaveScreenshot('with-cancel-button.png', {
      animations: 'disabled',
    });
  });

  test('should match settings panel with different values', async ({ page }) => {
    await page.goto('/');

    // Set various slider values
    await page.locator('input[type="range"]').first().fill('10');
    await page.locator('input[type="range"]').nth(1).fill('5');
    await page.locator('input[type="range"]').nth(2).fill('2');

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Take screenshot of settings
    const settingsSection = page.locator('.bg-white').first();
    await expect(settingsSection).toHaveScreenshot('settings-max-values.png', {
      animations: 'disabled',
    });
  });

  test('should match dark mode appearance if available', async ({ page }) => {
    await page.goto('/');

    // Try to enable dark mode if toggle exists
    const darkModeToggle = page.getByRole('button', { name: /dark|theme/i });

    if ((await darkModeToggle.count()) > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      // Take screenshot
      await expect(page).toHaveScreenshot('dark-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    } else {
      // Just document that dark mode is not implemented
      test.skip();
    }
  });

  test('should match header and title styling', async ({ page }) => {
    await page.goto('/');

    // Take screenshot of just the header
    const header = page.locator('h1').first();
    await expect(header).toHaveScreenshot('header-title.png', {
      animations: 'disabled',
    });
  });

  test('should match empty state before generation', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Take screenshot of results area (should be empty)
    await expect(page).toHaveScreenshot('empty-results-area.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match single image result card', async ({ page }) => {
    await mockImmediateCompletion(page, 1);

    await page.goto('/');

    // Generate single image
    await page.getByPlaceholder('Enter your image prompt').fill('Single image test');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for image
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Wait for layout
    await page.waitForTimeout(1000);

    // Take screenshot of the image card
    const imageCard = page.locator('img[alt="Generated image"]').first().locator('..');
    await expect(imageCard).toHaveScreenshot('single-image-card.png', {
      animations: 'disabled',
    });
  });
});
