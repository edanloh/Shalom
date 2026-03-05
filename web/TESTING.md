# Testing Guide

## Component Testing with Vitest

### Running Tests

```bash
npm test              # Run in watch mode
npm run test:ui       # Open Vitest UI
npm run test:run      # Run once (CI mode)
```

### Writing Component Tests

Place test files next to components with `.test.tsx` extension:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Best Practices

- Test user behavior, not implementation
- Use semantic queries: `getByRole`, `getByLabelText`, `getByText`
- Mock external dependencies (API calls, Supabase)
- Keep tests focused and isolated

## E2E Testing with Playwright

### Running E2E Tests

```bash
npm run test:e2e        # Run all E2E tests
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:debug  # Debug mode
```

### Writing E2E Tests

Create tests in `e2e/` directory with `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Test Organization

- `e2e/` - All E2E test files
- Group related tests using `test.describe()`
- Use page objects for complex flows
- Test critical user journeys

## Installation Commands

If you haven't installed dependencies yet:

```bash
# Vitest dependencies
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Playwright
npm install -D @playwright/test
npx playwright install  # Install browser binaries
```

## CI/CD Integration

Both test frameworks are CI-ready:

- Vitest runs in headless mode with `npm run test:run`
- Playwright automatically detects CI environment
- Configure in your CI pipeline:

```yaml
- name: Run Tests
  run: |
    npm run test:run
    npm run test:e2e
```
