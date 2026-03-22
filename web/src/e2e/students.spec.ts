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

async function mockAuthAndStudentsPage(page: Page) {
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

  await page.route('**/functions/v1/getAllStudents**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        students: [
          {
            id: 'student-1',
            name: 'John Doe',
            email: 'john@example.com',
            enrolledDate: '2026-02-01',
            progress: 82,
            lastActivity: '2 hours ago',
            engagement: 91,
            coursesEnrolled: 3,
            completedCourses: 2,
            totalHours: 40,
            enabled: true,
            avatarUrl: '',
          },
          {
            id: 'student-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            enrolledDate: '2026-01-20',
            progress: 34,
            lastActivity: '6 days ago',
            engagement: 58,
            coursesEnrolled: 2,
            completedCourses: 0,
            totalHours: 12,
            enabled: false,
            avatarUrl: '',
          },
          {
            id: 'student-3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            enrolledDate: '2026-02-10',
            progress: 67,
            lastActivity: '1 day ago',
            engagement: 73,
            coursesEnrolled: 4,
            completedCourses: 1,
            totalHours: 28,
            enabled: true,
            avatarUrl: '',
          },
        ],
      }),
    });
  });

  await page.route('**/functions/v1/getStudentProfile/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'student-1',
        name: 'John Doe',
        email: 'john@example.com',
        enabled: true,
        enrolledDate: '2026-02-01',
        progress: 82,
        lastActivity: '2 hours ago',
        engagement: 91,
        coursesEnrolled: 3,
        completedCourses: 2,
        totalHours: 40,
        currentCourses: [
          { id: 'course-1', name: 'Data Basics', progress: 82, grade: 88 },
        ],
        completedCoursesData: [
          {
            id: 'course-2',
            name: 'Intro to Learning',
            completedDate: '2026-02-20',
            grade: 92,
            certificate: true,
          },
        ],
        quizResults: [{ quiz: 'Quiz 1', score: 89, date: '2026-03-01' }],
        streak: 9,
        badges: 4,
        averageScore: 88,
        strengths: ['Quiz Performance'],
        risks: [],
      }),
    });
  });
}

async function loginThenNavigateToStudents(page: Page) {
  await mockAuthAndStudentsPage(page);

  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, { timeout: 10000 });

  await page.goto('/students');
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Students page', () => {
  test('displays students page heading and controls', async ({ page }) => {
    await loginThenNavigateToStudents(page);

    await expect(
      page.getByRole('heading', { name: 'Student Management' }),
    ).toBeVisible();
    await expect(
      page.getByText('Monitor and support your students'),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Search students...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Notify All Students' }),
    ).toBeVisible();
  });

  test('renders students returned by API', async ({ page }) => {
    await loginThenNavigateToStudents(page);

    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john@example.com')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('jane@example.com')).toBeVisible();
    await expect(page.getByText('Bob Johnson')).toBeVisible();
    await expect(page.getByText('bob@example.com')).toBeVisible();

    await expect(page.getByText(/^Active$/).first()).toBeVisible();
    await expect(page.getByText(/^Inactive$/)).toBeVisible();
  });

test('filters students by search query', async ({ page }) => {
  await loginThenNavigateToStudents(page);
  
  const searchInput = page.getByPlaceholder('Search students...');
  await searchInput.click();
  await searchInput.pressSequentially('jane@example.com', { delay: 50 });

  await expect(page.getByText('Jane Smith')).toBeVisible();
  await expect(page.getByText('John Doe')).not.toBeVisible();
  await expect(page.getByText('Bob Johnson')).not.toBeVisible();
});

  test('shows empty state when search has no matches', async ({ page }) => {
    await loginThenNavigateToStudents(page);

    await page
      .getByPlaceholder('Search students...')
      .fill('missing@example.com');

    await expect(
      page.getByText('No students match your search and filters.'),
    ).toBeVisible();
  });

  test('opens student profile sheet from action menu button', async ({
    page,
  }) => {
    await loginThenNavigateToStudents(page);

    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('button').first().click();

    await expect(page.getByText(/Student\s*Profile/i).first()).toBeVisible();

    // The sheet opens on the Learning Journey tab by default.
    await expect(page.getByText('Current Courses').first()).toBeVisible();
    await expect(page.getByText('Learning Journey').first()).toBeVisible();
    await expect(page.getByText('Send Notification').first()).toBeVisible();
    await expect(page.getByText('Send Message').first()).toBeVisible();
  });
});
