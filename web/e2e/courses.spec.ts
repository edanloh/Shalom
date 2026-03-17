import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  category_name: string;
  category_color: string;
  is_published: boolean;
  instructor_name: string;
  instructor_id: string;
  student_count: number;
  rating: number;
  total_ratings: number;
  duration_hours: number;
  total_sections: number;
  total_videos: number;
  total_quizzes: number;
  created_at: string;
  updated_at: string;
}

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

function buildMockCourses(): Course[] {
  return [
    {
      id: 'course-1',
      title: 'Introduction to Data Science',
      description: 'Learn data science fundamentals and workflows',
      thumbnail_url: 'https://example.com/course-1.jpg',
      category_name: 'Data Science',
      category_color: '#3b82f6',
      is_published: true,
      instructor_name: 'Teacher Test',
      instructor_id: INSTRUCTOR_ID,
      student_count: 42,
      rating: 4.7,
      total_ratings: 23,
      duration_hours: 12,
      total_sections: 6,
      total_videos: 24,
      total_quizzes: 5,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-08T00:00:00.000Z',
    },
    {
      id: 'course-2',
      title: 'Python for Analytics',
      description: 'Use Python to inspect, clean, and model data',
      thumbnail_url: 'https://example.com/course-2.jpg',
      category_name: 'Programming',
      category_color: '#10b981',
      is_published: true,
      instructor_name: 'Teacher Test',
      instructor_id: INSTRUCTOR_ID,
      student_count: 31,
      rating: 4.5,
      total_ratings: 16,
      duration_hours: 10,
      total_sections: 5,
      total_videos: 20,
      total_quizzes: 4,
      created_at: '2026-03-02T00:00:00.000Z',
      updated_at: '2026-03-08T00:00:00.000Z',
    },
    {
      id: 'course-3',
      title: 'Machine Learning Project Lab',
      description: 'Build and ship your first ML project',
      thumbnail_url: 'https://example.com/course-3.jpg',
      category_name: 'Machine Learning',
      category_color: '#f59e0b',
      is_published: false,
      instructor_name: 'Teacher Test',
      instructor_id: INSTRUCTOR_ID,
      student_count: 8,
      rating: 0,
      total_ratings: 0,
      duration_hours: 8,
      total_sections: 4,
      total_videos: 12,
      total_quizzes: 2,
      created_at: '2026-03-03T00:00:00.000Z',
      updated_at: '2026-03-08T00:00:00.000Z',
    },
  ];
}

async function setupCoursesPageMocks(
  page: Page,
  options?: {
    courses?: Course[];
    enableDuplicateMock?: boolean;
    failGetAllCourseOnce?: boolean;
  },
) {
  let courses = options?.courses ?? buildMockCourses();
  const enableDuplicateMock = options?.enableDuplicateMock ?? false;
  let failGetAllCourseOnce = options?.failGetAllCourseOnce ?? false;

  let getAllCourseCallCount = 0;
  let duplicateCallCount = 0;

  await page.route('**/auth/v1/user*', async (route) => {
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

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
    });
  });

  await page.route('**/auth/v1/logout*', async (route) => {
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

  await page.route('**/functions/v1/getUserInfo*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: '11111111-1111-1111-1111-111111111111',
          uuid: INSTRUCTOR_ID,
          email: TEST_EMAIL,
          role: 'instructor',
          name: 'Teacher Test',
          avatar_url: 'teacher@example.com_avatar0.png',
        },
      }),
    });
  });

  await page.route('**/functions/v1/getNotifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/functions/v1/getAllCourse*', async (route) => {
    getAllCourseCallCount += 1;

    if (failGetAllCourseOnce) {
      failGetAllCourseOnce = false;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'temporary failure' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: courses,
      }),
    });
  });

  await page.route(
    '**/functions/v1/courseDuplicateHandler/*',
    async (route) => {
      duplicateCallCount += 1;

      if (!enableDuplicateMock) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Duplicate mock disabled' }),
        });
        return;
      }

      const duplicatedCourse: Course = {
        ...courses[0],
        id: 'course-4',
        title: `${courses[0]?.title ?? 'Course'} (Copy)`,
        is_published: false,
        updated_at: '2026-03-09T00:00:00.000Z',
      };

      courses = [duplicatedCourse, ...courses];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            duplicatedCourse,
          },
        }),
      });
    },
  );

  return {
    getAllCourseCallCount: () => getAllCourseCallCount,
    duplicateCallCount: () => duplicateCallCount,
  };
}

async function loginThenNavigateToCourses(
  page: Page,
  options?: Parameters<typeof setupCoursesPageMocks>[1],
) {
  const mockState = await setupCoursesPageMocks(page, options);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto('/courses', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Course Management' }),
  ).toBeVisible();

  return mockState;
}

function getCourseCard(page: Page, title: string) {
  return page
    .locator('[class*="group"][class*="cursor-pointer"]')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .first();
}

test.describe('Courses page', () => {
  test('shows page heading, controls, and course cards', async ({ page }) => {
    await loginThenNavigateToCourses(page);

    await expect(
      page.getByText('Manage and organize your courses'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Course' }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Search courses...')).toBeVisible();

    await expect(page.getByText('Introduction to Data Science')).toBeVisible();
    await expect(page.getByText('Python for Analytics')).toBeVisible();
    await expect(page.getByText('Machine Learning Project Lab')).toBeVisible();
    await expect(page.getByText('3 courses')).toBeVisible();
  });

  test('filters courses by search query', async ({ page }) => {
    await loginThenNavigateToCourses(page);

    await page.getByPlaceholder('Search courses...').fill('python');

    await expect(page.getByText('Python for Analytics')).toBeVisible();
    await expect(
      page.getByText('Introduction to Data Science'),
    ).not.toBeVisible();
    await expect(
      page.getByText('Machine Learning Project Lab'),
    ).not.toBeVisible();
    await expect(page.getByText('1 course')).toBeVisible();
  });

  test('filters courses by status', async ({ page }) => {
    await loginThenNavigateToCourses(page);

    await page.locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: 'Draft' }).click();

    await expect(
      page.getByRole('heading', { name: 'Draft Courses' }),
    ).toBeVisible();
    await expect(page.getByText('Machine Learning Project Lab')).toBeVisible();
    await expect(page.getByText('Python for Analytics')).not.toBeVisible();
    await expect(
      page.getByText('Introduction to Data Science'),
    ).not.toBeVisible();
  });

  test('shows published courses when Published filter is selected', async ({
    page,
  }) => {
    await loginThenNavigateToCourses(page);

    await page.locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: 'Published' }).click();

    await expect(
      page.getByRole('heading', { name: 'Published Courses' }),
    ).toBeVisible();
    await expect(page.getByText('Introduction to Data Science')).toBeVisible();
    await expect(page.getByText('Python for Analytics')).toBeVisible();
    await expect(
      page.getByText('Machine Learning Project Lab'),
    ).not.toBeVisible();
    await expect(page.getByText('2 courses')).toBeVisible();
  });

  test('navigates to course builder when Create Course is clicked', async ({
    page,
  }) => {
    await loginThenNavigateToCourses(page);

    await page.getByRole('button', { name: 'Create Course' }).click();

    await expect(page).toHaveURL(/\/course-builder\/new$/);
  });

  test('opens course detail when course card is clicked', async ({ page }) => {
    await loginThenNavigateToCourses(page);

    await getCourseCard(page, 'Introduction to Data Science').click();

    await expect(page).toHaveURL(/\/course\/course-1$/);
  });

  test('navigates to course builder from card Edit button', async ({
    page,
  }) => {
    await loginThenNavigateToCourses(page);

    await getCourseCard(page, 'Introduction to Data Science')
      .getByRole('button', { name: 'Edit' })
      .first()
      .click();

    await expect(page).toHaveURL(/\/course-builder\/course-1$/);
  });

  test('navigates to analytics from course card action', async ({ page }) => {
    await loginThenNavigateToCourses(page);

    await getCourseCard(page, 'Introduction to Data Science')
      .getByRole('button', { name: 'Analytics' })
      .click();

    await expect(page).toHaveURL(/\/analytics$/);
  });

  test('shows empty state when instructor has no courses', async ({ page }) => {
    await loginThenNavigateToCourses(page, { courses: [] });

    await expect(page.getByText('No courses available')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Your First Course' }),
    ).toBeVisible();
  });

  test('navigates to course builder from empty state CTA', async ({ page }) => {
    await loginThenNavigateToCourses(page, { courses: [] });

    await page
      .getByRole('button', { name: 'Create Your First Course' })
      .click();

    await expect(page).toHaveURL(/\/course-builder\/new$/);
  });

  test('can switch from Draft filter back to All Courses', async ({ page }) => {
    await loginThenNavigateToCourses(page);

    await page.locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: 'Draft' }).click();
    await expect(
      page.getByRole('heading', { name: 'Draft Courses' }),
    ).toBeVisible();

    await page.locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: 'All Courses' }).click();

    await expect(
      page.getByRole('heading', { name: 'All Courses' }),
    ).toBeVisible();
    await expect(page.getByText('3 courses')).toBeVisible();
  });

  test('falls back to empty state when instructor course fetch fails', async ({
    page,
  }) => {
    await loginThenNavigateToCourses(page);

    // Instructor-scoped getCourses errors are intentionally converted to [] in courseService,
    // so UI should show empty state instead of the Retry error panel.
    await page.unroute('**/functions/v1/getAllCourse*');
    let shouldFailOnce = true;
    await page.route('**/functions/v1/getAllCourse*', async (route) => {
      if (shouldFailOnce) {
        shouldFailOnce = false;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'temporary failure' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: buildMockCourses(),
        }),
      });
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('No courses available')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Your First Course' }),
    ).toBeVisible();

    // Next reload should recover because route now returns successful payload.
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();
  });

  test('duplicates a course and refreshes list', async ({ page }) => {
    const mockState = await loginThenNavigateToCourses(page, {
      enableDuplicateMock: true,
    });

    const firstCardMenuTrigger = getCourseCard(
      page,
      'Introduction to Data Science',
    ).locator('button[aria-haspopup="menu"]');

    await firstCardMenuTrigger.click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    await expect(
      page.getByRole('heading', {
        name: 'Introduction to Data Science (Copy)',
      }),
    ).toBeVisible();
    await expect.poll(() => mockState.duplicateCallCount()).toBe(1);
    await expect
      .poll(() => mockState.getAllCourseCallCount())
      .toBeGreaterThan(1);
  });

  test('shows error and does not refresh list when duplicate fails', async ({
    page,
  }) => {
    const mockState = await loginThenNavigateToCourses(page);
    const initialGetAllCourseCalls = mockState.getAllCourseCallCount();

    await getCourseCard(page, 'Introduction to Data Science')
      .locator('button[aria-haspopup="menu"]')
      .click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    await expect(page.locator('body')).toContainText(
      /Duplication Failed|Failed to duplicate course/i,
    );
    await expect(
      page.getByRole('heading', {
        name: 'Introduction to Data Science (Copy)',
      }),
    ).not.toBeVisible();
    await expect.poll(() => mockState.duplicateCallCount()).toBe(1);
    await expect
      .poll(() => mockState.getAllCourseCallCount())
      .toBe(initialGetAllCourseCalls);
  });
});
