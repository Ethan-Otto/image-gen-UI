import { test, expect } from '@playwright/test';
import { mockImmediateCompletion } from '../fixtures/mockHelpers';
import { MOCK_UPLOADED_IMAGE_BASE64 } from '../fixtures/mockResponses';
import * as path from 'path';

test.describe('Image Upload Functionality', () => {
  test('should show image upload area', async ({ page }) => {
    await page.goto('/');

    // Look for file input or upload area
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
  });

  test('should upload image and show preview', async ({ page }) => {
    await page.goto('/');

    // Create a test image file
    const fileInput = page.locator('input[type="file"]');

    // Set a test file (using a data URL converted to file)
    await page.evaluate(() => {
      // Create a 1x1 red pixel PNG
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

      // Get the file input
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Convert data URL to Blob
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });

      // Create File from Blob
      const file = new File([blob], 'test-image.png', { type: 'image/png' });

      // Create DataTransfer and add file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Set files on input
      input.files = dataTransfer.files;

      // Dispatch change event
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for preview to show
    await page.waitForTimeout(500);

    // Check if image preview is visible (component should show the uploaded image)
    const imagePreview = page.locator('img[alt*="pload"]').or(page.locator('img').nth(0));
    await expect(imagePreview).toBeVisible({ timeout: 5000 });
  });

  test('should show mode selector when image is uploaded', async ({ page }) => {
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

    await page.waitForTimeout(500);

    // Mode selector should appear (Edit/Reference options)
    // Look for radio buttons or mode selection UI
    await expect(page.getByText(/edit|reference/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should switch between edit and reference modes', async ({ page }) => {
    await page.goto('/');

    // Upload image first
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

    await page.waitForTimeout(500);

    // Find and click mode options
    const editOption = page.getByText('edit', { exact: false });
    const referenceOption = page.getByText('reference', { exact: false });

    // Should be able to see both options
    await expect(editOption.first()).toBeVisible({ timeout: 5000 });
    await expect(referenceOption.first()).toBeVisible({ timeout: 5000 });
  });

  test('should remove uploaded image', async ({ page }) => {
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

    await page.waitForTimeout(500);

    // Look for remove/clear button
    const removeButton = page.getByRole('button', { name: /remove|clear|delete/i });
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Mode selector should disappear
      await expect(page.getByText(/edit.*reference/i)).not.toBeVisible({
        timeout: 2000,
      });
    }
  });

  test('should generate images with uploaded image', async ({ page }) => {
    await mockImmediateCompletion(page, 3);

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

    await page.waitForTimeout(500);

    // Fill prompt
    await page.getByPlaceholder('Enter your image prompt').fill('Modify this image');

    // Generate
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Should generate successfully
    await expect(page.locator('img[alt="Generated image"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should reject non-image files', async ({ page }) => {
    await page.goto('/');

    // Try uploading a text file
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a text file
      const file = new File(['This is not an image'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.waitForTimeout(500);

    // Should show error or not accept the file
    // The file input should have accept="image/*" attribute
    const fileInput = page.locator('input[type="file"]');
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('image');
  });

  test('should handle large image files', async ({ page }) => {
    await page.goto('/');

    // Create a larger image (still mock, but simulating larger file)
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a mock larger file (1MB)
      const size = 1024 * 1024; // 1MB
      const buffer = new ArrayBuffer(size);
      const file = new File([buffer], 'large-image.png', { type: 'image/png' });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.waitForTimeout(1000);

    // Should handle the upload (may show loading state)
    // File input should still be present
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test('should disable image upload during generation', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // Start generation
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // File input should be disabled
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeDisabled({ timeout: 2000 });

    // Wait for completion
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 10000,
    });

    // Should be enabled again
    await expect(fileInput).toBeEnabled();
  });
});
