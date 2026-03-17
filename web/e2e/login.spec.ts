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

async function mockAuthAndProfileForLogin(
  page: Page,
  options?: {
    registerCheckSuccess?: boolean;
    registerRole?: string;
    registerError?: string;
  },
) {
  const registerCheckSuccess = options?.registerCheckSuccess ?? true;
  const registerRole = options?.registerRole ?? 'instructor';
  const registerError = options?.registerError ?? '';

  await page.route('**/auth/v1/user**', async (route) => {
    const authHeader = route.request().headers()['authorization'] || '';
    if (authHeader.includes('test-access-token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: buildAuthSessionResponse(TEST_EMAIL).user,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Auth session missing!' }),
    });
  });

  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
    });
  });

  await page.route('**/auth/v1/logout**', async (route) => {
    await route.fulfill({
      status: 204,
      body: '',
    });
  });

  await page.route('**/functions/v1/registerCheck', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: registerCheckSuccess,
        error: registerError,
        user: {
          role: registerRole,
          email: TEST_EMAIL,
        },
      }),
    });
  });

  await page.route('**/functions/v1/getUserInfo**', async (route) => {
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

async function fillAndSubmitLoginForm(page: Page) {
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test.describe('Login page', () => {
  test('renders login form fields and primary actions', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: 'Sign in to Shalom' }),
    ).toBeVisible();
    await expect(page.getByText('Enter your email and password')).toBeVisible();

    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Register here' }),
    ).toBeVisible();
  });

  test('navigates to register page from login page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Register here' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole('heading', { name: 'Shalom Instructor Registration' }),
    ).toBeVisible();
  });

  test('redirects unauthenticated users to login from protected root route', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in to Shalom' }),
    ).toBeVisible();
  });

  test('uses required email and password fields', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('lets user clear email input', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByPlaceholder('Email');
    const emailContainer = emailInput.locator(
      'xpath=ancestor::div[contains(@class,"relative")][1]',
    );
    const clearButton = emailContainer.locator('button').first();

    await emailInput.fill('teacher@example.com');
    await expect(emailInput).toHaveValue('teacher@example.com');

    await clearButton.click();
    await expect(emailInput).toHaveValue('');
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByPlaceholder('Password');
    const passwordContainer = passwordInput.locator(
      'xpath=ancestor::div[contains(@class,"relative")][1]',
    );
    const visibilityToggleButton = passwordContainer.locator('button').nth(1);

    await passwordInput.fill('supersecret');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await visibilityToggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await visibilityToggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('shows friendly error for invalid credentials', async ({ page }) => {
    await page.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'invalid_credentials',
          msg: 'Invalid login credentials',
        }),
      });
    });

    await page.goto('/login');
    await fillAndSubmitLoginForm(page);

    await expect(page.getByText('Incorrect email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows access denied message when role is unauthorized', async ({
    page,
  }) => {
    let logoutCallCount = 0;
    await mockAuthAndProfileForLogin(page, {
      registerCheckSuccess: true,
      registerRole: 'student',
    });

    await page.route('**/auth/v1/logout**', async (route) => {
      logoutCallCount += 1;
      await route.fulfill({
        status: 204,
        body: '',
      });
    });

    await page.goto('/login');
    await fillAndSubmitLoginForm(page);

    await expect(
      page.getByText('Unauthorized role. Access denied.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(logoutCallCount).toBeGreaterThan(0);
  });

  test('keeps student role out of protected routes after failed login', async ({
    page,
  }) => {
    await mockAuthAndProfileForLogin(page, {
      registerCheckSuccess: true,
      registerRole: 'student',
    });

    await page.goto('/login');
    await fillAndSubmitLoginForm(page);

    await expect(
      page.getByText('Unauthorized role. Access denied.'),
    ).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in to Shalom' }),
    ).toBeVisible();
  });

  test('shows backend register-check error when login policy check fails', async ({
    page,
  }) => {
    await mockAuthAndProfileForLogin(page, {
      registerCheckSuccess: false,
      registerError: 'Account pending approval.',
      registerRole: 'instructor',
    });

    await page.goto('/login');
    await fillAndSubmitLoginForm(page);

    await expect(page.getByText('Account pending approval.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in and redirects to the protected root route', async ({
    page,
  }) => {
    await mockAuthAndProfileForLogin(page, {
      registerCheckSuccess: true,
      registerRole: 'instructor',
    });

    await page.goto('/login');
    await fillAndSubmitLoginForm(page);

    await expect(page).toHaveURL(/\/$/);
  });

  test('keeps authenticated user logged in after refresh and bypasses login page', async ({
    page,
  }) => {
    await mockAuthAndProfileForLogin(page, {
      registerCheckSuccess: true,
      registerRole: 'instructor',
    });

    await page.goto('/login');
    await fillAndSubmitLoginForm(page);
    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
  });
});
