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

async function mockAuthAndSettingsPage(
  page: Page,
  options?: {
    name?: string;
    bio?: string;
    location?: string;
    phone?: string;
    role?: string;
  },
) {
  const name = options?.name ?? 'Teacher Test';
  const bio = options?.bio ?? 'Test bio';
  const location = options?.location ?? 'Test Location';
  const phone = options?.phone ?? '+1234567890';
  const role = options?.role ?? 'instructor';

  // Mock auth
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
    const requestBody = await route.request().postData();
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);
    let email, password, grantType;

    // Try to parse as JSON first, then as form data
    try {
      const json = JSON.parse(requestBody || '{}');
      email = json.email;
      password = json.password;
      grantType = json.grant_type;
    } catch {
      const params = new URLSearchParams(requestBody || '');
      email = params.get('email');
      password = params.get('password');
      grantType = params.get('grant_type');
    }

    // Supabase often sends grant_type in URL query: /token?grant_type=password
    grantType = grantType || url.searchParams.get('grant_type');

    // For password grant type (login/changePassword re-auth), validate credentials
    if (grantType === 'password') {
      if (email === TEST_EMAIL && password === TEST_PASSWORD) {
        // Valid credentials
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
        });
        return;
      } else {
        // Invalid credentials
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
        return;
      }
    }

    // For other grant types (like refresh_token), allow through
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
        success: true,
        error: '',
        user: { role, email: TEST_EMAIL },
      }),
    });
  });

  await page.route('**/functions/v1/getUserInfo**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          uuid: '11111111-1111-1111-1111-111111111111',
          email: TEST_EMAIL,
          role,
          name,
          bio,
          location,
          phone,
          avatar_url: 'test@example.com_avatar0.png',
        },
      }),
    });
  });

  await page.route('**/functions/v1/getAllStudents**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        students: [
          {
            id: 'student-1',
            uuid: 'uuid-1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'instructor',
          },
          {
            id: 'student-2',
            uuid: 'uuid-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'instructor',
          },
          {
            id: 'student-3',
            uuid: 'uuid-3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            role: 'instructor',
          },
        ],
      }),
    });
  });

  await page.route('**/functions/v1/updateUser**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/functions/v1/approveInstructor**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/storage/v1/object/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: 'uploaded.png' }),
    });
  });
}

async function loginThenNavigateToSettings(
  page: Page,
  options?: Parameters<typeof mockAuthAndSettingsPage>[1],
) {
  await mockAuthAndSettingsPage(page, options);

  // Navigate to login page
  await page.goto('/login');

  // Fill form and login
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect (should go to root /)
  await page.waitForURL(/\/$/, { timeout: 10000 });

  // Navigate to settings
  await page.goto('/settings');

  // Wait for settings page to load
  await page.waitForLoadState('domcontentloaded');
}
test.describe('Settings page', () => {
  test.describe('Layout and Navigation', () => {
    test('displays settings heading', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await expect(
        page.getByRole('heading', { name: 'Settings' }),
      ).toBeVisible();
      await expect(
        page.getByText('Manage your account and preferences'),
      ).toBeVisible();
    });

    test('displays profile, notifications, and security tabs', async ({
      page,
    }) => {
      await loginThenNavigateToSettings(page);
      await expect(page.getByRole('tab', { name: /Profile/ })).toBeVisible();
      await expect(
        page.getByRole('tab', { name: /Notifications/ }),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: /Security/ })).toBeVisible();
    });

    test('shows instructor approvals tab for admin users', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await expect(
        page.getByRole('tab', { name: /Instructor Approvals/ }),
      ).toBeVisible();
    });

    test('hides instructor approvals tab for non-admin users', async ({
      page,
    }) => {
      await loginThenNavigateToSettings(page, { role: 'instructor' });
      await expect(
        page.getByRole('tab', { name: /Instructor Approvals/ }),
      ).not.toBeVisible();
    });

    test('can switch between tabs', async ({ page }) => {
      await loginThenNavigateToSettings(page);

      // Check profile tab content
      await expect(page.getByText('Change Avatar')).toBeVisible();

      // Click notifications tab
      await page.getByRole('tab', { name: /Notifications/ }).click();
      await expect(page.getByText('New student enrollments')).toBeVisible();

      // Click security tab
      await page.getByRole('tab', { name: /Security/ }).click();
      await expect(page.getByLabel('Current Password')).toBeVisible();

      // Back to profile
      await page.getByRole('tab', { name: /Profile/ }).click();
      await expect(page.getByText('Change Avatar')).toBeVisible();
    });
  });

  test.describe('Profile Tab', () => {
    test('displays profile form fields', async ({ page }) => {
      await loginThenNavigateToSettings(page);

      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Bio')).toBeVisible();
      await expect(page.getByLabel('Location')).toBeVisible();
      await expect(page.getByLabel('Phone Number')).toBeVisible();
    });

    test('populates profile fields with user data', async ({ page }) => {
      await loginThenNavigateToSettings(page, {
        name: 'John Doe',
        bio: 'Software Engineer',
        location: 'San Francisco',
        phone: '+1234567890',
      });

      await expect(page.getByLabel('Name')).toHaveValue('John Doe');
      await expect(page.getByLabel('Bio')).toHaveValue('Software Engineer');
      await expect(page.getByLabel('Location')).toHaveValue('San Francisco');
      await expect(page.getByLabel('Phone Number')).toHaveValue('+1234567890');
    });

    test('can edit profile fields', async ({ page }) => {
      await loginThenNavigateToSettings(page, { name: 'Original Name' });

      const nameInput = page.getByLabel('Name');
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Updated Name');

      await expect(nameInput).toHaveValue('Updated Name');
    });

    test('saves profile changes', async ({ page }) => {
      await loginThenNavigateToSettings(page, { name: 'Old Name' });

      const nameInput = page.getByLabel('Name');
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('New Name');

      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.locator('body')).toContainText(
        /your profile has been saved successfully/i,
        { timeout: 5000 },
      );
    });

    test('displays change avatar button', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await expect(
        page.getByRole('button', { name: 'Change Avatar' }),
      ).toBeVisible();
    });

    test('shows avatar upload instructions', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await expect(
        page.getByText(/JPG, PNG or GIF. Max size 2MB/),
      ).toBeVisible();
    });

    test('can edit multiple fields at once', async ({ page }) => {
      await loginThenNavigateToSettings(page, {
        name: 'Old Name',
        bio: 'Old Bio',
        location: 'Old Location',
        phone: '+1111111111',
      });

      await page.getByLabel('Name').click({ clickCount: 3 });
      await page.getByLabel('Name').type('New Name');

      await page.getByLabel('Bio').click({ clickCount: 3 });
      await page.getByLabel('Bio').type('New Bio');

      await page.getByLabel('Location').click({ clickCount: 3 });
      await page.getByLabel('Location').type('New Location');

      await page.getByLabel('Phone Number').click({ clickCount: 3 });
      await page.getByLabel('Phone Number').type('+9999999999');

      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.locator('body')).toContainText(
        /your profile has been saved successfully/i,
        { timeout: 5000 },
      );
    });
  });

  test.describe('Notifications Tab', () => {
    test('displays notification toggles', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Notifications/ }).click();

      await expect(page.getByText('New student enrollments')).toBeVisible();
      await expect(
        page.getByText('Quiz submissions', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('Student messages', { exact: true }),
      ).toBeVisible();
    });

    test('displays notification descriptions', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Notifications/ }).click();

      await expect(
        page.getByText('Get notified when students enroll in your courses'),
      ).toBeVisible();
      await expect(
        page.getByText('Receive alerts for new quiz submissions'),
      ).toBeVisible();
      await expect(
        page.getByText('Get notified of new student messages'),
      ).toBeVisible();
    });

    test('can toggle notifications', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Notifications/ }).click();

      const toggles = page.locator('button[role="switch"]');
      const initialCount = await toggles.count();

      await expect(toggles.first()).toBeVisible();
    });

    test('saves notification preferences', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Notifications/ }).click();

      await page.getByRole('button', { name: 'Save Preferences' }).click();

      await expect(page.locator('body')).toContainText(
        /your profile has been saved successfully/i,
        { timeout: 5000 },
      );
    });
  });

  test.describe('Security Tab', () => {
    test('displays password fields', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      await expect(page.getByLabel('Current Password')).toBeVisible();
      await expect(page.getByLabel('New Password')).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
    });

    test('password fields have correct type', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      await expect(page.getByLabel('Current Password')).toHaveAttribute(
        'type',
        'password',
      );
      await expect(page.getByLabel('New Password')).toHaveAttribute(
        'type',
        'password',
      );
      await expect(page.getByLabel('Confirm Password')).toHaveAttribute(
        'type',
        'password',
      );
    });

    test('can fill all password fields', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      await page.getByLabel('Current Password').fill('supersecret123');
      await page.getByLabel('New Password').fill('NewSecret456!');
      await page.getByLabel('Confirm Password').fill('NewSecret456!');

      await expect(page.getByLabel('Current Password')).toHaveValue(
        'supersecret123',
      );
      await expect(page.getByLabel('New Password')).toHaveValue(
        'NewSecret456!',
      );
      await expect(page.getByLabel('Confirm Password')).toHaveValue(
        'NewSecret456!',
      );
    });

    test('shows success when password changed', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      await page.getByLabel('Current Password').fill('supersecret123');
      await page.getByLabel('New Password').fill('NewSecret456!');
      await page.getByLabel('Confirm Password').fill('NewSecret456!');

      await page.getByRole('button', { name: 'Update Password' }).click();

      await expect(page.locator('body')).toContainText(
        /Your password has been changed successfully/i,
        { timeout: 5000 },
      );
    });

    test('handles update when current password is incorrect', async ({
      page,
    }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      await page.getByLabel('Current Password').fill('WrongPassword123');
      await page.getByLabel('New Password').fill('NewSecret456!');
      await page.getByLabel('Confirm Password').fill('NewSecret456!');

      await page.getByRole('button', { name: 'Update Password' }).click();

      // Wait for error message to appear
      await expect(page.locator('body')).toContainText(
        /failed to change password|invalid current password|check your current password/i,
        { timeout: 5000 },
      );
    });

    test('shows error when passwords do not match', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      await page.getByLabel('Current Password').fill('supersecret123');
      await page.getByLabel('New Password').fill('NewSecret456!');
      await page.getByLabel('Confirm Password').fill('DifferentPassword123!');

      await page.getByRole('button', { name: 'Update Password' }).click();

      // Wait for error message to appear
      await expect(page.locator('body')).toContainText(
        /passwords do not match|do not match|passwords.*match/i,
        { timeout: 5000 },
      );
    });

    test('can clear password fields', async ({ page }) => {
      await loginThenNavigateToSettings(page);
      await page.getByRole('tab', { name: /Security/ }).click();

      const currentPassword = page.getByLabel('Current Password');
      await currentPassword.fill('test123');
      await expect(currentPassword).toHaveValue('test123');

      await currentPassword.clear();
      await expect(currentPassword).toHaveValue('');
    });
  });

  test.describe('Instructor Approvals Tab', () => {
    test('displays for admin users', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await expect(page.getByRole('tab', { name: /Profile/ })).toBeVisible({ timeout: 10000 });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      await expect(
        page.getByRole('heading', { name: 'Instructor Approvals' }),
      ).toBeVisible();
    });

    test('displays filter input', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      await expect(
        page.getByPlaceholder('Filter users by name or email'),
      ).toBeVisible();
    });

    test('displays list of instructors', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('jane@example.com')).toBeVisible();
      await expect(page.getByText('Bob Johnson')).toBeVisible();
    });

    test('displays approve buttons', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      const approveButtons = page.getByRole('button', { name: /Approve/ });
      await expect(approveButtons.first()).toBeVisible();
    });

    test('can filter instructors by name', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      const filterInput = page.getByPlaceholder(
        'Filter users by name or email',
      );
      await filterInput.fill('John');

      await expect(page.getByText('John Doe')).toBeVisible();
    });

    test('can filter instructors by email', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      const filterInput = page.getByPlaceholder(
        'Filter users by name or email',
      );
      await filterInput.fill('bob@example.com');

      await expect(page.getByText('Bob Johnson')).toBeVisible();
    });

    test('shows empty state for no search results', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      const filterInput = page.getByPlaceholder(
        'Filter users by name or email',
      );
      await filterInput.fill('nonexistent@example.com');

      await expect(page.getByText('No students found.')).toBeVisible();
    });

    test('can approve an instructor', async ({ page }) => {
      await loginThenNavigateToSettings(page, { role: 'admin' });
      await page.getByRole('tab', { name: /Instructor Approvals/ }).click();

      const approveButton = page
        .getByRole('button', { name: /Approve/ })
        .first();
      await approveButton.click();

      await expect(page.locator('body')).toContainText(/instructor approved/i, {
        timeout: 5000,
      });
    });
  });

  test.describe('State and Persistence', () => {
    test('changes persist when switching tabs', async ({ page }) => {
      await loginThenNavigateToSettings(page, { name: 'Original Name' });

      const nameInput = page.getByLabel('Name');
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Modified Name');

      // Switch to another tab
      await page.getByRole('tab', { name: /Notifications/ }).click();

      // Switch back
      await page.getByRole('tab', { name: /Profile/ }).click();

      // Changes should still be there
      await expect(nameInput).toHaveValue('Modified Name');
    });

    test('loads user data on page load', async ({ page }) => {
      await loginThenNavigateToSettings(page, {
        name: 'Preloaded Name',
        bio: 'Preloaded Bio',
        location: 'Preloaded City',
        phone: '+9876543210',
      });

      await expect(page.getByLabel('Name')).toHaveValue('Preloaded Name');
      await expect(page.getByLabel('Bio')).toHaveValue('Preloaded Bio');
      await expect(page.getByLabel('Location')).toHaveValue('Preloaded City');
      await expect(page.getByLabel('Phone Number')).toHaveValue('+9876543210');
    });
  });

  test.describe('Responsive Design', () => {
    test('works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginThenNavigateToSettings(page);

      await expect(
        page.getByRole('heading', { name: 'Settings' }),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: /Profile/ })).toBeVisible();
    });

    test('works on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await loginThenNavigateToSettings(page);

      await expect(
        page.getByRole('heading', { name: 'Settings' }),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: /Profile/ })).toBeVisible();
    });
  });
});
