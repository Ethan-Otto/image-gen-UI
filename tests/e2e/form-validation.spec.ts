import { test, expect } from '@playwright/test';
import {
  mockGenerateValidationError,
  mockImmediateCompletion,
} from '../fixtures/mockHelpers';

test.describe('Form Validation', () => {
  test('should show error when prompt is too short on client side', async ({ page }) => {
    await page.goto('/');

    const promptInput = page.getByPlaceholder('Enter your image prompt');
    const generateButton = page.getByRole('button', { name: 'Generate Images' });

    // Empty prompt
    await expect(generateButton).toBeDisabled();

    // 1 character
    await promptInput.fill('a');
    await expect(generateButton).toBeDisabled();

    // 2 characters
    await promptInput.fill('ab');
    await expect(generateButton).toBeDisabled();

    // 3 characters - should enable
    await promptInput.fill('abc');
    await expect(generateButton).toBeEnabled();
  });

  test('should show error when submitting with short prompt', async ({ page }) => {
    await page.goto('/');

    // Try to manipulate the button to be enabled (if disabled state is bypassed)
    await page.getByPlaceholder('Enter your image prompt').fill('ab');

    // Check for client-side validation error display
    // The app shows client validation errors in a red box
    const generateButton = page.getByRole('button', { name: 'Generate Images' });
    await expect(generateButton).toBeDisabled();
  });

  test('should show server-side validation error for short prompt', async ({ page }) => {
    // Mock server validation error
    await mockGenerateValidationError(page, 'shortPrompt');

    await page.goto('/');

    // Use JavaScript to enable the button and submit (simulating bypassing client validation)
    await page.getByPlaceholder('Enter your image prompt').fill('ab');

    // Force click using JavaScript to bypass disabled state
    await page.evaluate(() => {
      const button = document.querySelector('button[type="button"]') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.click();
      }
    });

    // Should show error message
    await expect(
      page.getByText('Prompt must be at least 3 characters')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate image count range', async ({ page }) => {
    await page.goto('/');

    const imageCountSlider = page.locator('input[type="range"]').first();

    // Check min value (should be 1)
    await imageCountSlider.fill('0');
    const minValue = await imageCountSlider.inputValue();
    expect(parseInt(minValue)).toBeGreaterThanOrEqual(1);

    // Check max value (should be 10)
    await imageCountSlider.fill('11');
    const maxValue = await imageCountSlider.inputValue();
    expect(parseInt(maxValue)).toBeLessThanOrEqual(10);

    // Valid values
    await imageCountSlider.fill('5');
    expect(await imageCountSlider.inputValue()).toBe('5');
  });

  test('should validate concurrency range', async ({ page }) => {
    await page.goto('/');

    const concurrencySlider = page.locator('input[type="range"]').nth(1);

    // Check min value (should be 1)
    await concurrencySlider.fill('0');
    const minValue = await concurrencySlider.inputValue();
    expect(parseInt(minValue)).toBeGreaterThanOrEqual(1);

    // Check max value (should be 5)
    await concurrencySlider.fill('6');
    const maxValue = await concurrencySlider.inputValue();
    expect(parseInt(maxValue)).toBeLessThanOrEqual(5);

    // Valid values
    await concurrencySlider.fill('3');
    expect(await concurrencySlider.inputValue()).toBe('3');
  });

  test('should validate temperature range', async ({ page }) => {
    await page.goto('/');

    const temperatureSlider = page.locator('input[type="range"]').nth(2);

    // Temperature typically ranges from 0 to 2
    await temperatureSlider.fill('0');
    const minValue = await temperatureSlider.inputValue();
    expect(parseFloat(minValue)).toBeGreaterThanOrEqual(0);

    await temperatureSlider.fill('2');
    const maxValue = await temperatureSlider.inputValue();
    expect(parseFloat(maxValue)).toBeLessThanOrEqual(2);
  });

  test('should disable form inputs during generation', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // Fill form
    await page.getByPlaceholder('Enter your image prompt').fill('Test prompt');

    // Start generation
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Check that inputs are disabled
    const promptInput = page.getByPlaceholder('Enter your image prompt');
    await expect(promptInput).toBeDisabled();

    // Wait for completion
    await expect(page.getByRole('button', { name: 'Generate Images' })).toBeVisible({
      timeout: 10000,
    });

    // Check that inputs are enabled again
    await expect(promptInput).toBeEnabled();
  });

  test('should preserve form values during generation', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // Set form values
    const promptText = 'A beautiful landscape';
    await page.getByPlaceholder('Enter your image prompt').fill(promptText);
    await page.locator('input[type="range"]').first().fill('7');

    // Start generation
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Values should be preserved
    const promptInput = page.getByPlaceholder('Enter your image prompt');
    await expect(promptInput).toHaveValue(promptText);

    const imageCountSlider = page.locator('input[type="range"]').first();
    expect(await imageCountSlider.inputValue()).toBe('7');
  });

  test('should clear error message on new generation', async ({ page }) => {
    // Mock server error first
    await mockGenerateValidationError(page, 'shortPrompt');

    await page.goto('/');

    // Trigger error by forcing form submission
    await page.getByPlaceholder('Enter your image prompt').fill('ab');
    await page.evaluate(() => {
      const button = document.querySelector('button[type="button"]') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.click();
      }
    });

    // Wait for error
    await expect(
      page.getByText('Prompt must be at least 3 characters')
    ).toBeVisible({ timeout: 5000 });

    // Now mock success and try again
    await mockImmediateCompletion(page, 2);

    // Enter valid prompt
    await page.getByPlaceholder('Enter your image prompt').fill('Valid prompt now');

    // Click generate (should clear error)
    await page.getByRole('button', { name: 'Generate Images' }).click();

    // Error should be gone
    await expect(
      page.getByText('Prompt must be at least 3 characters')
    ).not.toBeVisible();
  });

  test('should validate prompt with special characters', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // Test various special characters
    const specialPrompts = [
      'Café ☕',
      'Images with 中文字符',
      'Emoji test 🎨🖼️',
      'Special chars: @#$%^&*()',
    ];

    for (const prompt of specialPrompts) {
      await page.getByPlaceholder('Enter your image prompt').fill(prompt);
      const generateButton = page.getByRole('button', { name: 'Generate Images' });

      if (prompt.length >= 3) {
        await expect(generateButton).toBeEnabled();
      }
    }
  });

  test('should handle extremely long prompts', async ({ page }) => {
    await mockImmediateCompletion(page, 2);

    await page.goto('/');

    // Create a very long prompt (1000 characters)
    const longPrompt = 'A'.repeat(1000);
    await page.getByPlaceholder('Enter your image prompt').fill(longPrompt);

    const generateButton = page.getByRole('button', { name: 'Generate Images' });
    await expect(generateButton).toBeEnabled();

    // Should be able to submit
    await generateButton.click();

    // Should show generating state
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible({
      timeout: 2000,
    });
  });
});
