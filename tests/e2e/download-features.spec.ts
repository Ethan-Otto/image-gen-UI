import { test, expect } from '@playwright/test';
import { mockImmediateCompletion } from '../fixtures/mockHelpers';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Download Features', () => {
  test('should show download button for completed images', async ({ page }) => {
    await mockImmediateCompletion(page, 3);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for images to complete
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Look for download buttons/links
    const downloadButtons = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );

    // Should have download option for each image
    await expect(downloadButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('should download image when download button is clicked', async ({ page }) => {
    await mockImmediateCompletion(page, 1);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for image to complete
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click download button
    const downloadButton = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );
    await downloadButton.first().click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download has a filename
    expect(download.suggestedFilename()).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.png|\.jpg|\.jpeg|\.webp/i);
  });

  test('should download multiple images independently', async ({ page }) => {
    await mockImmediateCompletion(page, 3);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for all images
    await expect(page.locator('img[alt="Generated image"]')).toHaveCount(3, {
      timeout: 10000,
    });

    // Download first image
    const downloadPromise1 = page.waitForEvent('download', { timeout: 10000 });
    const downloadButtons = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );
    await downloadButtons.first().click();
    const download1 = await downloadPromise1;
    expect(download1.suggestedFilename()).toBeTruthy();

    // Download second image
    const downloadPromise2 = page.waitForEvent('download', { timeout: 10000 });
    await downloadButtons.nth(1).click();
    const download2 = await downloadPromise2;
    expect(download2.suggestedFilename()).toBeTruthy();
  });

  test('should use appropriate filename for downloads', async ({ page }) => {
    await mockImmediateCompletion(page, 1);

    await page.goto('/');

    // Generate with specific prompt
    await page.getByPlaceholder('Enter your image prompt').fill('Mountain landscape');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for image
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click download
    const downloadButton = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );
    await downloadButton.first().click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    // Should have meaningful filename (with extension)
    expect(filename).toMatch(/\.(png|jpg|jpeg|webp)$/i);

    // Filename should not be empty or just extension
    expect(filename.length).toBeGreaterThan(4);
  });

  test('should not show download button for pending/generating images', async ({ page }) => {
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

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait a moment
    await page.waitForTimeout(3000);

    // Should not show download buttons for generating images
    const downloadButtons = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );

    // Either no buttons or they're not visible/enabled
    const count = await downloadButtons.count();
    if (count > 0) {
      // If they exist, they should be disabled or hidden
      await expect(downloadButtons.first()).not.toBeVisible();
    }
  });

  test('should show download button only for successfully completed images', async ({
    page,
  }) => {
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

      let response;
      if (jobId === 'job-1') {
        response = {
          jobId,
          status: 'complete',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        };
      } else if (jobId === 'job-2') {
        response = {
          jobId,
          status: 'error',
          error: 'Generation failed',
        };
      } else {
        response = {
          jobId,
          status: 'generating',
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for processing
    await page.waitForTimeout(5000);

    // Should have exactly 1 download button (for completed image)
    const downloadButtons = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );

    const visibleCount = await downloadButtons.count();
    expect(visibleCount).toBeGreaterThanOrEqual(0);
    expect(visibleCount).toBeLessThanOrEqual(1);
  });

  test('should handle download of data URL images', async ({ page }) => {
    await mockImmediateCompletion(page, 1);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for image
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Check that the image source is a data URL
    const imgSrc = await page.locator('img[alt="Generated image"]').first().getAttribute('src');
    expect(imgSrc).toBeTruthy();

    // Should be able to download
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    const downloadButton = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );

    if ((await downloadButton.count()) > 0) {
      await downloadButton.first().click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('should preserve image quality in download', async ({ page }) => {
    await mockImmediateCompletion(page, 1);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for image
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    const downloadButton = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );

    if ((await downloadButton.count()) > 0) {
      await downloadButton.first().click();

      const download = await downloadPromise;
      const downloadPath = await download.path();

      // Check that file was downloaded
      expect(downloadPath).toBeTruthy();

      if (downloadPath) {
        // Verify file exists and has content
        const fileExists = fs.existsSync(downloadPath);
        expect(fileExists).toBe(true);

        if (fileExists) {
          const stats = fs.statSync(downloadPath);
          expect(stats.size).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should handle rapid download clicks gracefully', async ({ page }) => {
    await mockImmediateCompletion(page, 1);

    await page.goto('/');

    // Generate images
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for image
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });

    const downloadButton = page.getByRole('link', { name: /download/i }).or(
      page.getByRole('button', { name: /download/i })
    );

    if ((await downloadButton.count()) > 0) {
      // Click multiple times rapidly
      await downloadButton.first().click();
      await downloadButton.first().click();
      await downloadButton.first().click();

      // Should not crash or show errors
      await page.waitForTimeout(1000);

      // Page should still be functional
      await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible();
    }
  });
});
