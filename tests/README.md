# Playwright E2E Testing

This directory contains comprehensive end-to-end tests for the Gemini Image Generator application.

## Test Structure

```
tests/
├── e2e/                          # E2E test suites
│   ├── basic-generation.spec.ts  # Core generation flow tests
│   ├── form-validation.spec.ts   # Form validation tests
│   ├── image-upload.spec.ts      # Image upload functionality
│   ├── cancel-functionality.spec.ts  # Cancel operation tests
│   ├── error-handling.spec.ts    # Error scenarios
│   ├── download-features.spec.ts # Download functionality
│   ├── multi-tab-behavior.spec.ts # Multi-tab scenarios
│   └── visual-regression.spec.ts # Visual regression tests
├── fixtures/                     # Mock data and helpers
│   ├── mockResponses.ts          # Mock API responses
│   └── mockHelpers.ts            # Helper functions for mocking
└── README.md                     # This file
```

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

### Generate test code
```bash
npm run test:e2e:codegen
```

### Run specific test file
```bash
npx playwright test basic-generation.spec.ts
```

### Run specific test
```bash
npx playwright test -g "should generate images with mocked API"
```

### Run tests on specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=mobile-chrome
```

## Test Coverage

### 1. Basic Generation Flow
- Initial page load and UI elements
- Form state management
- Image generation with mocked API
- Progressive status updates
- Multiple generations in sequence
- Settings configuration

### 2. Form Validation
- Client-side validation
- Server-side validation
- Range validation for sliders
- Input state during generation
- Special characters in prompts
- Long prompts

### 3. Image Upload
- File upload functionality
- Image preview
- Mode selector (Edit/Reference)
- File type validation
- Upload during generation
- Remove uploaded image

### 4. Cancel Functionality
- Cancel button visibility
- Stop polling after cancel
- Re-enable form after cancel
- Multiple cancel scenarios
- Preserve partial results

### 5. Error Handling
- API errors
- Network failures
- Mixed success/error states
- Retry after error
- Error message display
- Malformed responses

### 6. Download Features
- Download button visibility
- Single image download
- Multiple image downloads
- Filename generation
- Download state management

### 7. Multi-Tab Behavior
- Independent state per tab
- Simultaneous generation
- No result sharing
- Form state preservation
- Cancel in one tab
- Tab refresh handling

### 8. Visual Regression
- Initial page layout
- Filled form state
- Generating state
- Completed grid layout
- Error states
- Mobile/tablet viewports
- Image upload preview

## Mocking Strategy

All tests use mocked API responses to ensure:
- **Fast execution** - No real API calls
- **Free testing** - No API costs
- **Reliability** - Consistent results
- **Offline capability** - Tests work without internet

### Mock Helpers

The `fixtures/mockHelpers.ts` provides functions to mock:
- Successful generation flow
- Immediate completion (faster tests)
- Validation errors
- Server errors
- Network failures
- Mixed results (success + error)

Example:
```typescript
import { mockImmediateCompletion } from '../fixtures/mockHelpers';

test('should generate images', async ({ page }) => {
  await mockImmediateCompletion(page, 5);
  // ... test code
});
```

## Visual Regression Tests

Visual tests capture screenshots and compare them across runs:

```bash
# Update baseline screenshots
npx playwright test --update-snapshots

# Run only visual tests
npx playwright test visual-regression.spec.ts
```

Screenshots are stored in:
- `tests/e2e/visual-regression.spec.ts-snapshots/`

## Configuration

Test configuration is in `playwright.config.ts`:
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Web Server**: Auto-starts Next.js dev server

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/playwright.yml`):
- Runs on push to main/master/develop
- Runs on pull requests
- Uploads test reports, screenshots, and videos as artifacts
- Retention: 30 days for reports, 7 days for media

## Debugging

### 1. UI Mode (Recommended)
```bash
npm run test:e2e:ui
```
- Time travel debugging
- Watch mode
- Pick locators
- See test execution

### 2. Debug Mode
```bash
npm run test:e2e:debug
```
- Opens Playwright Inspector
- Step through tests
- Set breakpoints

### 3. Headed Mode
```bash
npm run test:e2e:headed
```
- See browser during test execution

### 4. VSCode Extension
Install "Playwright Test for VSCode" extension for:
- Run tests from editor
- Debug tests with breakpoints
- Record new tests

## Best Practices

1. **Use mocked APIs** - Always mock external API calls
2. **Test user flows** - Test complete user journeys
3. **Avoid timing dependencies** - Use `waitFor` instead of `waitForTimeout`
4. **Use data-testid** - Add test IDs to critical elements
5. **Keep tests independent** - Each test should run in isolation
6. **Visual regression** - Update snapshots when UI intentionally changes

## Troubleshooting

### Tests fail locally but pass in CI
- Ensure you're using the same Node version
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Update Playwright browsers: `npx playwright install`

### Screenshots don't match
- Different OS/browser versions can cause pixel differences
- Update snapshots: `npx playwright test --update-snapshots`
- Use `maxDiffPixels` option for minor differences

### Web server doesn't start
- Ensure port 3000 is free
- Check if dev server runs: `npm run dev`
- Increase webServer timeout in config

### Flaky tests
- Avoid `waitForTimeout` - use `waitFor` conditions
- Use proper locators (role, text, test-id)
- Check for race conditions in the app

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
