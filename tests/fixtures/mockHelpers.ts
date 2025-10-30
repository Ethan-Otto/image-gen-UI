// Helper functions for mocking API responses in tests
import { Page, Route } from '@playwright/test';
import {
  mockGenerateResponse,
  mockCompleteStatus,
  mockGeneratingStatus,
  mockPendingStatus,
  mockErrorStatus,
  mockValidationErrors,
} from './mockResponses';

/**
 * Mock the /api/generate endpoint to return a successful response
 */
export async function mockGenerateAPI(
  page: Page,
  imageCount: number = 5,
  delay: number = 0
) {
  await page.route('**/api/generate', async (route: Route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockGenerateResponse(imageCount)),
    });
  });
}

/**
 * Mock the /api/generate endpoint to return a validation error
 */
export async function mockGenerateValidationError(
  page: Page,
  errorType: keyof typeof mockValidationErrors
) {
  await page.route('**/api/generate', async (route: Route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify(mockValidationErrors[errorType]),
    });
  });
}

/**
 * Mock the /api/generate endpoint to return a server error
 */
export async function mockGenerateServerError(page: Page) {
  await page.route('**/api/generate', async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });
}

/**
 * Mock the /api/status/[jobId] endpoint with progressive status updates
 * Simulates: pending -> generating -> complete
 */
export async function mockStatusAPI(page: Page, imageCount: number = 5) {
  const pollCount: Record<string, number> = {};

  await page.route('**/api/status/*', async (route: Route) => {
    const url = route.request().url();
    const jobId = url.split('/').pop() || '';

    // Track how many times this job has been polled
    pollCount[jobId] = (pollCount[jobId] || 0) + 1;
    const count = pollCount[jobId];

    let response;
    if (count === 1) {
      response = mockPendingStatus(jobId);
    } else if (count === 2) {
      response = mockGeneratingStatus(jobId);
    } else {
      response = mockCompleteStatus(jobId);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mock the /api/status/[jobId] endpoint to immediately return complete
 */
export async function mockStatusAPIImmediate(page: Page) {
  await page.route('**/api/status/*', async (route: Route) => {
    const url = route.request().url();
    const jobId = url.split('/').pop() || '';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCompleteStatus(jobId)),
    });
  });
}

/**
 * Mock the /api/status/[jobId] endpoint to return errors
 */
export async function mockStatusAPIError(page: Page, errorMessage?: string) {
  await page.route('**/api/status/*', async (route: Route) => {
    const url = route.request().url();
    const jobId = url.split('/').pop() || '';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockErrorStatus(jobId, errorMessage)),
    });
  });
}

/**
 * Mock the /api/status/[jobId] endpoint to return 404
 */
export async function mockStatusAPI404(page: Page) {
  await page.route('**/api/status/*', async (route: Route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Job not found' }),
    });
  });
}

/**
 * Mock the /api/status/[jobId] endpoint with mixed results
 * Some jobs complete, some error
 */
export async function mockStatusAPIMixed(page: Page) {
  await page.route('**/api/status/*', async (route: Route) => {
    const url = route.request().url();
    const jobId = url.split('/').pop() || '';

    // Make job-3 and job-4 fail, others succeed
    const response =
      jobId === 'job-3' || jobId === 'job-4'
        ? mockErrorStatus(jobId, 'Generation timeout')
        : mockCompleteStatus(jobId);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Setup complete mocking for a successful generation flow
 */
export async function mockSuccessfulGeneration(
  page: Page,
  imageCount: number = 5
) {
  await mockGenerateAPI(page, imageCount);
  await mockStatusAPI(page, imageCount);
}

/**
 * Setup mocking for immediate completion (faster tests)
 */
export async function mockImmediateCompletion(
  page: Page,
  imageCount: number = 5
) {
  await mockGenerateAPI(page, imageCount);
  await mockStatusAPIImmediate(page);
}

/**
 * Clear all route mocks
 */
export async function clearAllMocks(page: Page) {
  await page.unroute('**/api/**');
}
