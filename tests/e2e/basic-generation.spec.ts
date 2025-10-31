import { test, expect } from '@playwright/test';
import {
  mockSuccessfulGeneration,
  mockImmediateCompletion,
} from '../fixtures/mockHelpers';

test.describe('Basic Image Generation Flow', () => {
  test('should display the main page with all UI elements', async ({ page }) => {
    await page.goto('/');

    // Check header
    await expect(page.getByRole('heading', { name: 'Gemini Image Generator' })).toBeVisible();
    await expect(
      page.getByText('Generate images in parallel using Google Gemini API')
    ).toBeVisible();

    // Check form elements
    await expect(page.getByPlaceholder('Enter your image prompt')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible();
  });

  test('should generate button be disabled when prompt is empty', async ({ page }) => {
    await page.goto('/');

    const generateButton = page.getByRole('button', { name: 'Generate Images' });
    await expect(generateButton).toBeDisabled();
  });

  test('should enable generate button when prompt has 3+ characters', async ({ page }) => {
    await page.goto('/');

    const promptInput = page.getByPlaceholder('Enter your image prompt');
    const generateButton = page.getByRole('button', { name: 'Generate Images' });

    // Type short prompt
    await promptInput.fill('ab');
    await expect(generateButton).toBeDisabled();

    // Type valid prompt
    await promptInput.fill('abc');
    await expect(generateButton).toBeEnabled();
  });

  test('should successfully generate images with mocked API', async ({ page }) => {
    // Mock API responses
    await mockImmediateCompletion(page, 5);

    await page.goto('/');

    // Fill in prompt
    await page.getByPlaceholder('Enter your image prompt').fill('A beautiful sunset');

    // Click generate
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Check that button changes to "Generating..."
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible();

    // Wait for images to appear
    await expect(page.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });

    // Verify 5 images are displayed
    const images = page.locator('img[alt^="Generated "]');
    await expect(images).toHaveCount(5);
  });

  test('should show progressive status updates during generation', async ({ page }) => {
    // Mock API with progressive updates
    await mockSuccessfulGeneration(page, 3);

    await page.goto('/');

    // Fill in prompt
    await page.getByPlaceholder('Enter your image prompt').fill('A mountain landscape');

    // Click generate
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait for status updates to appear
    await page.waitForTimeout(500);

    // Check that generating status is shown
    await expect(page.getByText(/generating/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Eventually all should complete
    await expect(page.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('should allow multiple generations in sequence', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // First generation
    await page.getByPlaceholder('Enter your image prompt').fill('First prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });

    // Wait for generation to complete
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 10000,
    });

    // Second generation
    await page.getByPlaceholder('Enter your image prompt').fill('Second prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page.locator('img[alt^="Generated "]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should clear previous results when starting new generation', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // First generation
    await page.getByPlaceholder('Enter your image prompt').fill('First prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();
    await expect(page.locator('img[alt^="Generated "]')).toHaveCount(2, {
      timeout: 10000,
    });

    // Wait for completion
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 10000,
    });

    // Second generation should clear old results
    await page.getByPlaceholder('Enter your image prompt').fill('Second prompt');
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Wait a moment for the UI to update
    await page.waitForTimeout(500);

    // Should still have results (new ones)
    await expect(page.locator('img[alt^="Generated "]')).toHaveCount(2, {
      timeout: 10000,
    });
  });

  test('should update settings values correctly', async ({ page }) => {
    await page.goto('/');

    // Verify default values are displayed
    await expect(page.getByText('Number of Images: 5')).toBeVisible();
    await expect(page.getByText('Concurrency: 3')).toBeVisible();
    await expect(page.getByText(/Temperature: 1\.0/)).toBeVisible();

    // Verify sliders have correct attributes
    const imageCountSlider = page.locator('input[type="range"]').first();
    await expect(imageCountSlider).toHaveAttribute('min', '1');
    await expect(imageCountSlider).toHaveAttribute('max', '10');
    await expect(imageCountSlider).toHaveValue('5');

    const concurrencySlider = page.locator('input[type="range"]').nth(1);
    await expect(concurrencySlider).toHaveAttribute('min', '1');
    await expect(concurrencySlider).toHaveAttribute('max', '5');
    await expect(concurrencySlider).toHaveValue('3');

    const temperatureSlider = page.locator('input[type="range"]').nth(2);
    await expect(temperatureSlider).toHaveAttribute('min', '0');
    await expect(temperatureSlider).toHaveAttribute('max', '2');
  });
});
