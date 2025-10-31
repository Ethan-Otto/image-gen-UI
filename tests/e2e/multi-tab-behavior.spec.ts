import { test, expect } from '@playwright/test';
import { mockImmediateCompletion } from '../fixtures/mockHelpers';

test.describe('Multi-Tab Behavior', () => {
  test('should maintain independent state across tabs', async ({ browser }) => {
    const context = await browser.newContext();

    // Open two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await mockImmediateCompletion(page1, 3);
    await mockImmediateCompletion(page2, 3);

    await page1.goto('/');
    await page2.goto('/');

    // Set different prompts in each tab
    await page1.getByPlaceholder('Enter your image prompt').fill('First tab prompt');
    await page2.getByPlaceholder('Enter your image prompt').fill('Second tab prompt');

    // Verify each tab has its own prompt
    await expect(page1.getByPlaceholder('Enter your image prompt')).toHaveValue(
      'First tab prompt'
    );
    await expect(page2.getByPlaceholder('Enter your image prompt')).toHaveValue(
      'Second tab prompt'
    );

    await context.close();
  });

  test('should allow simultaneous generation in different tabs', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await mockImmediateCompletion(page1, 2);
    await mockImmediateCompletion(page2, 2);

    await page1.goto('/');
    await page2.goto('/');

    // Start generation in first tab
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1 generation');
    await page1.getByRole('button', { name: 'Generate Images' }).click();

    // Start generation in second tab
    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2 generation');
    await page2.getByRole('button', { name: 'Generate Images' }).click();

    // Both should show generating state
    await expect(page1.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page2.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 5000,
    });

    // Both should complete
    await expect(page1.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page2.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });

    await context.close();
  });

  test('should not share results between tabs', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await mockImmediateCompletion(page1, 3);
    await mockImmediateCompletion(page2, 2);

    await page1.goto('/');
    await page2.goto('/');

    // Generate in first tab
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1 prompt');
    await page1.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page1.locator('img[alt^="Generated "]')).toHaveCount(3, {
      timeout: 10000,
    });

    // Second tab should not have results
    const page2Images = await page2.locator('img[alt^="Generated "]').count();
    expect(page2Images).toBe(0);

    // Generate in second tab
    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2 prompt');
    await page2.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page2.locator('img[alt^="Generated "]')).toHaveCount(2, {
      timeout: 10000,
    });

    // First tab should still have 3 images
    await expect(page1.locator('img[alt^="Generated "]')).toHaveCount(3);

    await context.close();
  });

  test('should maintain form state when switching tabs', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/');
    await page2.goto('/');

    // Set values in first tab
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1 prompt');
    await page1.locator('input[type="range"]').first().fill('7');

    // Set different values in second tab
    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2 prompt');
    await page2.locator('input[type="range"]').first().fill('3');

    // Switch back to first tab and verify values preserved
    await page1.bringToFront();
    await expect(page1.getByPlaceholder('Enter your image prompt')).toHaveValue(
      'Tab 1 prompt'
    );
    expect(await page1.locator('input[type="range"]').first().inputValue()).toBe('7');

    // Verify second tab still has its values
    await page2.bringToFront();
    await expect(page2.getByPlaceholder('Enter your image prompt')).toHaveValue(
      'Tab 2 prompt'
    );
    expect(await page2.locator('input[type="range"]').first().inputValue()).toBe('3');

    await context.close();
  });

  test('should handle cancel in one tab without affecting other', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Mock slower generation for tab 1
    await page1.route('**/api/generate', async (route) => {
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

    await page1.route('**/api/status/*', async (route) => {
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

    await mockImmediateCompletion(page2, 2);

    await page1.goto('/');
    await page2.goto('/');

    // Start generation in both tabs
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1');
    await page1.getByRole('button', { name: 'Generate Images' }).click();

    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2');
    await page2.getByRole('button', { name: 'Generate Images' }).click();

    // Cancel in first tab
    await page1.getByRole('button', { name: 'Cancel' }).click();
    await expect(page1.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 5000,
    });

    // Second tab should still complete
    await expect(page2.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });

    await context.close();
  });

  test('should not share error states between tabs', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Mock error for page1
    await page1.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error in tab 1' }),
      });
    });

    await mockImmediateCompletion(page2, 2);

    await page1.goto('/');
    await page2.goto('/');

    // Generate in first tab - should error
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1');
    await page1.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page1.getByText(/server error/i)).toBeVisible({ timeout: 5000 });

    // Generate in second tab - should succeed
    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2');
    await page2.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page2.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });

    // Second tab should not show error
    const errorInPage2 = await page2.getByText(/server error/i).count();
    expect(errorInPage2).toBe(0);

    await context.close();
  });

  test('should handle tab close during generation gracefully', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.route('**/api/generate', async (route) => {
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

    await page1.route('**/api/status/*', async (route) => {
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

    await mockImmediateCompletion(page2, 2);

    await page1.goto('/');
    await page2.goto('/');

    // Start generation in first tab
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1');
    await page1.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page1.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 2000,
    });

    // Close first tab while generating
    await page1.close();

    // Second tab should still work fine
    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2');
    await page2.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page2.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });

    await context.close();
  });

  test('should maintain uploaded image state per tab', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/');
    await page2.goto('/');

    // Upload image in first tab
    await page1.evaluate(() => {
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

    await page1.waitForTimeout(500);

    // First tab should show mode selector
    await expect(page1.getByText(/edit|reference/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Second tab should not show mode selector (no upload)
    const modeSelectorCount = await page2.getByText(/edit.*reference|reference.*edit/i).count();
    expect(modeSelectorCount).toBe(0);

    await context.close();
  });

  test('should handle refresh in one tab', async ({ browser }) => {
    const context = await browser.newContext();

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await mockImmediateCompletion(page1, 3);
    await mockImmediateCompletion(page2, 2);

    await page1.goto('/');
    await page2.goto('/');

    // Generate in first tab
    await page1.getByPlaceholder('Enter your image prompt').fill('Tab 1');
    await page1.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page1.locator('img[alt^="Generated "]')).toHaveCount(3, {
      timeout: 10000,
    });

    // Generate in second tab
    await page2.getByPlaceholder('Enter your image prompt').fill('Tab 2');
    await page2.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page2.locator('img[alt^="Generated "]')).toHaveCount(2, {
      timeout: 10000,
    });

    // Reload first tab
    await page1.reload();

    // First tab should reset
    const page1Images = await page1.locator('img[alt^="Generated "]').count();
    expect(page1Images).toBe(0);

    // Second tab should still have results
    await expect(page2.locator('img[alt^="Generated "]')).toHaveCount(2);

    await context.close();
  });
});
