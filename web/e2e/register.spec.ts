import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const TEST_NAME = 'Teacher Test';
const TEST_EMAIL = 'teacher.register@example.com';
const VALID_PASSWORD = 'ValidPass1!';
const INVALID_PASSWORD = 'short';

function buildAuthUser(email: string) {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: '2026-03-08T00:00:00.000Z',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: TEST_NAME, name: TEST_NAME },
    created_at: '2026-03-08T00:00:00.000Z',
    updated_at: '2026-03-08T00:00:00.000Z',
  };
}

async function mockRegisterSubmission(
  page: Page,
  options?: { registerCheckSuccess?: boolean; registerCheckError?: string },
) {
  const registerCheckSuccess = options?.registerCheckSuccess ?? true;
  const registerCheckError = options?.registerCheckError ?? '';

  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Auth session missing!' }),
    });
  });

  await page.route('**/auth/v1/signup**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: buildAuthUser(TEST_EMAIL),
        session: null,
      }),
    });
  });

  // Do not register a logout route here; let the test handle it if needed.

  await page.route('**/functions/v1/registerCheck', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: registerCheckSuccess,
        error: registerCheckError,
        user: { role: 'instructor', email: TEST_EMAIL },
      }),
    });
  });
}

async function fillRegisterForm(page: Page, password: string) {
  await page.getByPlaceholder('Name').fill(TEST_NAME);
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(password);
}

async function gotoRegister(page: Page) {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
}

test.describe('Register page', () => {
  test('renders register form fields and actions', async ({ page }) => {
    await gotoRegister(page);

    await expect(
      page.getByRole('heading', { name: 'Shalom Instructor Registration' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Enter a name, email, and password to create your account.',
      ),
    ).toBeVisible();

    await expect(page.getByPlaceholder('Name')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login here' })).toBeVisible();
  });

  test('navigates to login page from register page', async ({ page }) => {
    await gotoRegister(page);

    await page.getByRole('link', { name: 'Login here' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('uses required name, email, and password fields', async ({ page }) => {
    await gotoRegister(page);

    const nameInput = page.getByPlaceholder('Name');
    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password');

    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');

    await expect(nameInput).toHaveAttribute('type', 'text');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('toggles password visibility and clears input', async ({ page }) => {
    await gotoRegister(page);

    const passwordInput = page.getByPlaceholder('Password');
    const passwordContainer = passwordInput.locator(
      'xpath=ancestor::div[contains(@class,"relative")][1]',
    );
    const clearButton = passwordContainer.locator('button').first();
    const visibilityToggleButton = passwordContainer.locator('button').nth(1);

    await passwordInput.fill(VALID_PASSWORD);
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await visibilityToggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await clearButton.click();
    await expect(passwordInput).toHaveValue('');
  });

  test('does not submit when password validation fails on client', async ({
    page,
  }) => {
    let signUpRequestCount = 0;
    await page.route('**/auth/v1/signup**', async (route) => {
      signUpRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: buildAuthUser(TEST_EMAIL),
          session: null,
        }),
      });
    });

    await gotoRegister(page);
    await fillRegisterForm(page, INVALID_PASSWORD);
    await page.getByRole('button', { name: 'Register' }).click();

    await page.waitForTimeout(250);
    expect(signUpRequestCount).toBe(0);
    await expect(page).toHaveURL(/\/register$/);
  });

  test('shows register-check backend error after registration attempt', async ({
    page,
  }) => {
    await mockRegisterSubmission(page, {
      registerCheckSuccess: false,
      registerCheckError:
        'Registration failed: account requires admin invitation.',
    });

    await gotoRegister(page);
    await fillRegisterForm(page, VALID_PASSWORD);
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(
      page.getByText('Registration failed: account requires admin invitation.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('submits registration successfully and remains unauthenticated', async ({
    page,
  }) => {
    let signOutRequestCount = 0;
    await mockRegisterSubmission(page, {
      registerCheckSuccess: true,
    });

    // Register logout route handler for this test only
    await page.route('**/auth/v1/logout**', async (route) => {
      signOutRequestCount += 1;
      await route.fulfill({ status: 204, body: '' });
    });

    await gotoRegister(page);
    await fillRegisterForm(page, VALID_PASSWORD);
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByText('Registration failed', { exact: false }),
    ).toHaveCount(0);
  });
});
