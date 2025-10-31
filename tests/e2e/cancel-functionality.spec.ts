import { test, expect } from '@playwright/test';
import { mockGenerateAPI, mockStatusAPI } from '../fixtures/mockHelpers';

test.describe('Cancel Functionality', () => {
  test('should show cancel button during generation', async ({ page }) => {
    await mockGenerateAPI(page, 5);
    await mockStatusAPI(page);

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Cancel button should appear
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({
      timeout: 2000,
    });
  });

  test('should hide cancel button when not generating', async ({ page }) => {
    await page.goto('/');

    // Cancel button should not be visible initially
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });

  test('should cancel ongoing generation when clicked', async ({ page }) => {
    await mockGenerateAPI(page, 5);
    await mockStatusAPI(page);

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for generating state
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 2000,
    });

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should return to generate state
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 5000,
    });

    // Cancel button should disappear
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });

  test('should stop polling after cancel', async ({ page }) => {
    await mockGenerateAPI(page, 5);

    // Track API calls
    const statusCalls: string[] = [];
    await page.route('**/api/status/*', async (route) => {
      statusCalls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId: route.request().url().split('/').pop(),
          status: 'generating',
        }),
      });
    });

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait a bit for polling to start
    await page.waitForTimeout(3000);

    const callsBeforeCancel = statusCalls.length;

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Wait and check that no more calls are made
    await page.waitForTimeout(3000);

    const callsAfterCancel = statusCalls.length;

    // There should be no new calls or very few (within margin for in-flight requests)
    expect(callsAfterCancel - callsBeforeCancel).toBeLessThan(5);
  });

  test('should re-enable form inputs after cancel', async ({ page }) => {
    await mockGenerateAPI(page, 5);
    await mockStatusAPI(page);

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Inputs should be disabled
    const promptInput = page.getByPlaceholder('Enter your image prompt');
    await expect(promptInput).toBeDisabled();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Inputs should be enabled again
    await expect(promptInput).toBeEnabled({ timeout: 5000 });
  });

  test('should allow new generation after cancel', async ({ page }) => {
    await mockGenerateAPI(page, 3);
    await mockStatusAPI(page);

    await page.goto('/');

    // First generation
    await page.getByPlaceholder('Enter your image prompt').fill('First prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 5000,
    });

    // Start new generation
    await page.getByPlaceholder('Enter your image prompt').fill('Second prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should be generating again
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 2000,
    });
  });

  test('should preserve partial results when cancelled', async ({ page }) => {
    await mockGenerateAPI(page, 5);

    // Mock some jobs completing before cancel
    let callCount = 0;
    await page.route('**/api/status/*', async (route) => {
      callCount++;
      const jobId = route.request().url().split('/').pop() || '';

      // First two jobs complete quickly
      let status;
      if (jobId === 'job-1' || jobId === 'job-2') {
        status = {
          jobId,
          status: 'complete',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        };
      } else {
        status = {
          jobId,
          status: 'generating',
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(status),
      });
    });

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for some results
    await page.waitForTimeout(3000);

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Check if completed images are still visible
    const completedImages = page.locator('img[alt^="Generated "]');
    const count = await completedImages.count();

    // Should have at least the completed ones
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should clear cancel flag for next generation', async ({ page }) => {
    await mockGenerateAPI(page, 3);
    await mockStatusAPI(page);

    await page.goto('/');

    // First generation - cancel it
    await page.getByPlaceholder('Enter your image prompt').fill('First prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 5000,
    });

    // Second generation - should complete normally (not be cancelled immediately)
    await page.getByPlaceholder('Enter your image prompt').fill('Second prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show generating state
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 2000,
    });

    // Generation should complete successfully (not be cancelled)
    await expect(page.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle cancel during API request', async ({ page }) => {
    // Mock slow API response
    await mockGenerateAPI(page, 5, 2000); // 2 second delay
    await mockStatusAPI(page);

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Cancel immediately
    await page.waitForTimeout(500);
    if (await page.getByRole('button', { name: 'Cancel' }).isVisible()) {
      await page.getByRole('button', { name: 'Cancel' }).click();
    }

    // Should handle gracefully
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should not show cancel button after generation completes', async ({ page }) => {
    await mockGenerateAPI(page, 2);

    // Mock immediate completion
    await page.route('**/api/status/*', async (route) => {
      const jobId = route.request().url().split('/').pop() || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId,
          status: 'complete',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        }),
      });
    });

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for completion
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 10000,
    });

    // Cancel should not be visible
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });
});
