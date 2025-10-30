import { test, expect } from '@playwright/test';
import {
  mockGenerateAPI,
  mockGenerateServerError,
  mockStatusAPIError,
  mockStatusAPIMixed,
  mockStatusAPI404,
} from '../fixtures/mockHelpers';

test.describe('Error Handling', () => {
  test('should display error when generation API fails', async ({ page }) => {
    await mockGenerateServerError(page);

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show error message
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });

    // Should show specific error
    await expect(page.getByText(/internal server error/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should display error when job status returns error', async ({ page }) => {
    await mockGenerateAPI(page, 3);
    await mockStatusAPIError(page, 'API quota exceeded');

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for error state
    await expect(page.getByText(/quota exceeded/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle mixed success and error results', async ({ page }) => {
    await mockGenerateAPI(page, 5);
    await mockStatusAPIMixed(page);

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show both successes and errors
    await page.waitForTimeout(5000);

    // Check for completed images
    const images = page.locator('img[alt="Generated image"]');
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThan(0);

    // Check for error messages
    await expect(page.getByText(/error|timeout/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should handle network errors during polling', async ({ page }) => {
    await mockGenerateAPI(page, 3);

    // Mock network failure
    await page.route('**/api/status/*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show error
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle 404 job not found error', async ({ page }) => {
    await mockGenerateAPI(page, 3);
    await mockStatusAPI404(page);

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show error about job not found
    await expect(page.getByText(/error|not found|failed/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should allow retry after error', async ({ page }) => {
    // First request fails
    let requestCount = 0;
    await page.route('**/api/generate', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchId: 'batch-1',
            jobIds: ['job-1', 'job-2'],
            status: 'pending',
          }),
        });
      }
    });

    // Mock successful status
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

    // First attempt - should fail
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show error
    await expect(page.getByText(/server error/i)).toBeVisible({ timeout: 5000 });

    // Should be able to retry
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeEnabled();

    // Second attempt - should succeed
    await page.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display specific error messages for each failed job', async ({ page }) => {
    await mockGenerateAPI(page, 3);

    await page.route('**/api/status/*', async (route) => {
      const jobId = route.request().url().split('/').pop() || '';

      let response;
      if (jobId === 'job-1') {
        response = {
          jobId,
          status: 'error',
          error: 'Timeout error',
        };
      } else if (jobId === 'job-2') {
        response = {
          jobId,
          status: 'error',
          error: 'Invalid API key',
        };
      } else {
        response = {
          jobId,
          status: 'complete',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show both error messages
    await expect(page.getByText(/timeout error/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/invalid api key/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle malformed JSON response', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'This is not valid JSON{]',
      });
    });

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show error
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle timeout errors gracefully', async ({ page }) => {
    await mockGenerateAPI(page, 2);
    await mockStatusAPIError(page, 'Request timeout');

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show timeout error
    await expect(page.getByText(/timeout/i)).toBeVisible({ timeout: 10000 });

    // Should still allow new generation
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeEnabled({
      timeout: 15000,
    });
  });

  test('should recover from error state when starting new generation', async ({ page }) => {
    // First request fails
    let requestCount = 0;
    await page.route('**/api/generate', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'First error' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchId: 'batch-1',
            jobIds: ['job-1'],
            status: 'pending',
          }),
        });
      }
    });

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

    // First attempt - fails
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page.getByText(/first error/i)).toBeVisible({ timeout: 5000 });

    // Second attempt - should clear error and succeed
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Error should be cleared
    await expect(page.getByText(/first error/i)).not.toBeVisible({ timeout: 5000 });

    // Should show success
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle empty response from API', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '',
      });
    });

    await page.goto('/');

    // Fill and submit
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should show error
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
  });
});
