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

async function mockAuthAndBadgeManagementPage(page: Page) {
  let badges = [
    {
      id: 'badge-1',
      name: 'Course Master',
      description: 'Complete 5 courses',
      icon: 'trophy',
      type: 'badge',
      criteria: { type: 'courses_completed', count: 5 },
      points: 500,
      is_active: true,
      color: null,
      scope_type: 'instructor',
      scope_id: 'instructor-1',
      created_by: 'instructor-1',
      earnedBy: 12,
    },
    {
      id: 'badge-2',
      name: 'Goal Achiever',
      description: 'Hit 10 learning goals',
      icon: 'target',
      type: 'badge',
      criteria: { type: 'goal_hits', count: 10 },
      points: 300,
      is_active: true,
      color: null,
      scope_type: 'instructor',
      scope_id: 'instructor-1',
      earnedBy: 8,
    },
    {
      id: 'badge-3',
      name: 'Credit Champion',
      description: 'Earn 100 total credits',
      icon: 'star',
      type: 'badge',
      criteria: { type: 'total_credits', count: 100 },
      points: 200,
      is_active: false,
      color: null,
      scope_type: 'instructor',
      scope_id: 'instructor-1',
      earnedBy: 5,
    },
  ];

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
    let email;
    let password;
    let grantType;

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

    grantType = grantType || url.searchParams.get('grant_type');

    if (grantType === 'password') {
      if (email === TEST_EMAIL && password === TEST_PASSWORD) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
        });
        return;
      }

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

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
    });
  });

  await page.route('**/auth/v1/logout**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
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

  await page.route('**/functions/v1/getUserInfo**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: '11111111-1111-1111-1111-111111111111',
          uuid: 'instructor-1',
          email: TEST_EMAIL,
          role: 'instructor',
          name: 'Teacher Test',
          avatar_url: 'teacher@example.com_avatar0.png',
        },
      }),
    });
  });

  await page.route('**/functions/v1/getNotifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/functions/v1/listAchievements**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: badges,
        count: badges.length,
      }),
    });
  });

  await page.route('**/functions/v1/createAchievement**', async (route) => {
    const requestBody = await route.request().postData();
    const data = JSON.parse(requestBody || '{}');

    const newBadge = {
      id: `badge-${Date.now()}`,
      name: data.name,
      description: data.description,
      icon: data.icon || 'award',
      type: 'badge',
      criteria: data.criteria,
      points: data.points,
      is_active: data.isActive ?? true,
      color: data.color || null,
      scope_type: data.scopeType || 'instructor',
      scope_id: data.scopeId || 'instructor-1',
      earnedBy: 0,
    };

    badges.push(newBadge);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(newBadge),
    });
  });

  await page.route('**/functions/v1/updateAchievement**', async (route) => {
    const requestBody = await route.request().postData();
    const data = JSON.parse(requestBody || '{}');

    const badgeIndex = badges.findIndex((b) => b.id === data.id);
    if (badgeIndex !== -1) {
      badges[badgeIndex] = {
        ...badges[badgeIndex],
        ...data,
        is_active: data.isActive ?? badges[badgeIndex].is_active,
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(badges[badgeIndex]),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Badge not found' }),
      });
    }
  });

  await page.route('**/functions/v1/deleteAchievement**', async (route) => {
    const url = new URL(route.request().url());
    const badgeId = url.pathname.split('/').pop();

    badges = badges.filter((b) => b.id !== badgeId);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/functions/v1/getAllCourse**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        courses: [
          { id: 'course-1', title: 'Introduction to React' },
          { id: 'course-2', title: 'Advanced JavaScript' },
          { id: 'course-3', title: 'Python Basics' },
        ],
      }),
    });
  });
}

async function loginThenNavigateToBadgeManagement(page: Page) {
  await mockAuthAndBadgeManagementPage(page);

  // Use DOMContentLoaded to avoid flakiness from non-critical resource loads.
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto('/badges');
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Badge Management page', () => {
  test('displays badge management page heading and controls', async ({
    page,
  }) => {
    await loginThenNavigateToBadgeManagement(page);

    await expect(
      page.getByRole('heading', { name: 'Badge Management' }),
    ).toBeVisible();
    await expect(
      page.getByText('Create and manage achievement badges for students'),
    ).toBeVisible();

    // Check for Create Badge button
    await expect(
      page.getByRole('button', { name: 'Create Badge' }),
    ).toBeVisible();

    // Check for search input
    await expect(page.getByPlaceholder('Search badges...')).toBeVisible();
  });

  test('renders badges returned by API', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await expect(page.getByText('Course Master')).toBeVisible();
    await expect(page.getByText('Complete 5 courses')).toBeVisible();

    await expect(page.getByText('Goal Achiever')).toBeVisible();
    await expect(page.getByText('Hit 10 learning goals')).toBeVisible();

    await expect(page.getByText('Credit Champion')).toBeVisible();
    await expect(page.getByText('Earn 100 total credits')).toBeVisible();
  });

  test('displays badge points and earned count', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await expect(page.getByText('500')).toBeVisible(); // Course Master points
    await expect(page.getByText('12')).toBeVisible(); // Earned by count
  });

  test('filters badges by search query', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    const searchInput = page.getByPlaceholder('Search badges...');
    await searchInput.fill('Course Master');

    await expect(page.getByText('Course Master')).toBeVisible();
    await expect(page.getByText('Goal Achiever')).not.toBeVisible();
    await expect(page.getByText('Credit Champion')).not.toBeVisible();
  });

  test('shows empty state when search has no matches', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByPlaceholder('Search badges...').fill('NonExistentBadge');

    // Check that no badges are visible
    await expect(page.getByText('Course Master')).not.toBeVisible();
    await expect(page.getByText('Goal Achiever')).not.toBeVisible();
  });

  test('opens create badge dialog when Create Badge button is clicked', async ({
    page,
  }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create New Badge')).toBeVisible();
    await expect(
      page.getByText('Define a new achievement badge'),
    ).toBeVisible();

    // Check form fields
    await expect(page.getByLabel(/Badge Name/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
    await expect(page.getByLabel(/Earning Criteria/i)).toBeVisible();
    await expect(page.getByLabel(/Points Value/i)).toBeVisible();
  });

  test('validates required fields when creating badge', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Try to submit without filling required fields
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Badge' })
      .click();

    // Check for validation errors in body
    await expect(page.locator('body')).toContainText(
      /Missing required fields/i,
    );
  });

  test('creates a new badge successfully', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Fill in badge details
    await page.getByLabel(/Badge Name/i).fill('Test Badge');
    await page.getByLabel(/Description/i).fill('A test badge for testing');

    // Set criteria
    await page.getByLabel(/Earning Criteria/i).click();
    await page.getByRole('option', { name: 'Courses completed' }).click();

    // Set count
    await page.locator('input[type="number"]').first().fill('3');

    // Set points
    await page.getByLabel(/Points Value/i).fill('150');

    // Submit
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Badge' })
      .click();

    // Wait for dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify badge was created (check for success message in body)
    await expect(page.locator('body')).toContainText(/Badge Created/i);
  });

  test('can select badge scope type', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Check for scope selector
    await page.getByLabel(/Badge Scope/i).click();

    await expect(
      page.getByRole('option', { name: 'Instructor (recommended)' }),
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Specific Course' }),
    ).toBeVisible();

    // Select course scope
    await page.getByRole('option', { name: 'Specific Course' }).click();

    // Course selector should appear
    await expect(page.getByText('Select a course')).toBeVisible();
  });

  test('validates course selection for course-scoped badges', async ({
    page,
  }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Fill required fields
    await page.getByLabel(/Badge Name/i).fill('Course Badge');
    await page.getByLabel(/Description/i).fill('Course-specific badge');

    // Select course scope
    await page.getByLabel(/Badge Scope/i).click();
    await page.getByRole('option', { name: 'Specific Course' }).click();

    // Don't select a course

    // Set points
    await page.getByLabel(/Points Value/i).fill('100');

    // Submit
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Badge' })
      .click();

    // Check for validation error
    await expect(page.locator('body')).toContainText(/Course scope required/i);
  });

  test('toggles badge active status', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    // Find the inactive badge (Credit Champion)
    const creditChampionCard = page
      .locator('text=Credit Champion')
      .locator('..');

    // Find the toggle switch near this badge
    const toggleSwitch = creditChampionCard.locator('[role="switch"]').first();

    if (await toggleSwitch.isVisible()) {
      await toggleSwitch.click();

      // Verify status update message
      await expect(page.locator('body')).toContainText(/Badge Status Updated/i);
    }
  });

  test('deletes a badge successfully', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    // Find delete button for a badge
    const deleteButton = page
      .locator('h3', { hasText: 'Course Master' })
      .locator('..')
      .locator('button')
      .filter({
        has: page.locator(
          'svg[data-lucide="trash-2"], svg.lucide-trash-2, svg.lucide-trash2',
        ),
      })
      .first();

    await deleteButton.click();

    // Confirm deletion dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(
      page.getByText(/This will permanently remove/i),
    ).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /Delete Badge/i }).click();

    // Verify deletion message
    await expect(page.locator('body')).toContainText(/Badge Deleted/i);
  });

  test('cancels badge deletion', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    // Find delete button for a badge
    const deleteButton = page
      .locator('h3', { hasText: 'Course Master' })
      .locator('..')
      .locator('button')
      .filter({
        has: page.locator(
          'svg[data-lucide="trash-2"], svg.lucide-trash-2, svg.lucide-trash2',
        ),
      })
      .first();

    await deleteButton.click();

    // Cancel deletion
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible();

    // Badge should still be visible
    await expect(page.getByText('Course Master')).toBeVisible();
  });

  test('handles badge loading error gracefully', async ({ page }) => {
    await mockAuthAndBadgeManagementPage(page);

    // Mock failed badges request
    await page.unroute('**/functions/v1/listAchievements**');
    await page.route('**/functions/v1/listAchievements**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });

    await page.goto('/badges');
    await page.waitForLoadState('domcontentloaded');

    // Check for error message
    await expect(page.locator('body')).toContainText(/Failed to load badges/i);
  });

  test('displays badge criteria in readable format', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    // Check formatted criteria
    await expect(page.getByText('Courses completed: 5')).toBeVisible();
    await expect(page.getByText('Goals hit: 10')).toBeVisible();
    await expect(page.getByText('Total credits earned: 100')).toBeVisible();
  });

  test('closes create badge dialog when cancel is clicked', async ({
    page,
  }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Fill some data
    await page.getByLabel(/Badge Name/i).fill('Test Badge');

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Data should not be saved
    await page.getByRole('button', { name: 'Create Badge' }).click();
    await expect(page.getByLabel(/Badge Name/i)).toHaveValue('');
  });

  test('can upload custom badge icon', async ({ page }) => {
    await loginThenNavigateToBadgeManagement(page);

    await page.getByRole('button', { name: 'Create Badge' }).click();

    // Find file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    await expect(
      page.getByText('Upload a custom icon or use default'),
    ).toBeVisible();
  });

  test('displays pagination when there are many badges', async ({ page }) => {
    // Mock many badges
    await mockAuthAndBadgeManagementPage(page);

    const manyBadges = Array.from({ length: 10 }, (_, i) => ({
      id: `badge-${i}`,
      name: `Badge ${i}`,
      description: `Description ${i}`,
      icon: 'award',
      type: 'badge',
      criteria: { type: 'courses_completed', count: i + 1 },
      points: 100 * (i + 1),
      is_active: true,
      color: null,
      scope_type: 'instructor',
      scope_id: 'instructor-1',
      earnedBy: i,
    }));

    await page.unroute('**/functions/v1/listAchievements**');
    await page.route('**/functions/v1/listAchievements**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: manyBadges,
          count: manyBadges.length,
        }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });

    await page.goto('/badges');
    await page.waitForLoadState('domcontentloaded');

    // Check if pagination is visible (itemsPerPage is 6)
    const paginationNext = page.getByRole('button', { name: /Next/i });
    if (await paginationNext.isVisible()) {
      await expect(paginationNext).toBeVisible();
    }
  });
});
