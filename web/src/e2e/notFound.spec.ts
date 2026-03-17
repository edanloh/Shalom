import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';

function buildAuthSessionResponse(email: string) {
  return {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 2147483647,
    refresh_token: 'test-refresh-token',
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: '2026-03-08T00:00:00.000Z',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Teacher Test' },
      created_at: '2026-03-08T00:00:00.000Z',
      updated_at: '2026-03-08T00:00:00.000Z',
    },
  };
}

async function mockAuthenticatedInstructor(page: Page) {
  await page.route('**/auth/v1/session*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
    });
  });

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: buildAuthSessionResponse(TEST_EMAIL).user,
      }),
    });
  });

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
    });
  });

  await page.route('**/functions/v1/registerCheck', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        error: '',
        user: { role: 'instructor', email: TEST_EMAIL },
      }),
    });
  });

  await page.route('**/functions/v1/getUserInfo*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'db-user-1',
          email: TEST_EMAIL,
          role: 'instructor',
          name: 'Teacher Test',
        },
      }),
    });
  });
}

test.describe('NotFound page', () => {
  test('shows themed 404 content and auto-redirects authenticated user home', async ({
    page,
  }) => {
    const attemptedPath = '/this-route-does-not-exist';
    const expectedConsoleText =
      '404 Error: User attempted to access non-existent route:';
    const seenConsoleLogs: string[] = [];

    page.on('console', (message) => {
      seenConsoleLogs.push(`[${message.type()}] ${message.text()}`);
    });

    await mockAuthenticatedInstructor(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });

    await page.goto(attemptedPath, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(new RegExp(`${attemptedPath}$`));
    await expect(page.getByText('Error 404')).toBeVisible();
    await expect(
      page.getByText('Taking you back automatically...'),
    ).toBeVisible();

    await expect(page.getByText('Oops! Page not found')).toBeVisible();

    const homeLink = page.getByRole('link', { name: 'Return to Home' });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/');

    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });

    await expect
      .poll(() =>
        seenConsoleLogs.some(
          (text) =>
            text.includes(expectedConsoleText) && text.includes(attemptedPath),
        ),
      )
      .toBeTruthy();
  });

  test('redirects unauthenticated unknown route requests to login', async ({
    page,
  }) => {
    await page.goto('/not-a-real-route', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in to Shalom' }),
    ).toBeVisible();
  });
});
