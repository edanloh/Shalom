import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';

interface DashboardMockOptions {
  courses?: any[];
  stats?: any;
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

function buildMockCourses() {
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
      title: 'Machine Learning Project Lab',
      description: 'Build and ship your first ML project',
      thumbnail_url: 'https://example.com/course-2.jpg',
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

function buildMockStats() {
  return {
    statistics: {
      total_students: 50,
      active_students: 21,
      average_completion_rate: 73,
      completed_courses: 9,
      average_rating: '4.6',
      published_enrollments_last_30_days: 19,
      total_enrollments_last_30_days: 28,
    },
    recent_activity: [
      {
        student_name: 'Alice Tan',
        course_title: 'Introduction to Data Science',
        formatted_date: 'Today',
      },
    ],
    pending_tasks: [
      {
        id: 'custom-task-1',
        title: 'Review draft module outline',
        formatted_due: 'Tomorrow',
      },
      {
        id: 'assignment_grading',
        title: 'Assignments to grade',
        count: 3,
      },
    ],
    completed_tasks: [
      {
        id: 'completed-1',
        title: 'Publish onboarding announcement',
      },
    ],
  };
}

async function setupIndexPageMocks(page: Page, options?: DashboardMockOptions) {
  const courses = options?.courses ?? buildMockCourses();
  const stats = options?.stats ?? buildMockStats();

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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: courses }),
    });
  });

  await page.route('**/functions/v1/getInstructorStats/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: stats }),
    });
  });
}

async function loginAndNavigateToIndex(
  page: Page,
  options?: DashboardMockOptions,
) {
  await setupIndexPageMocks(page, options);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await expect(
    page.getByRole('heading', { name: /Welcome Back,/i }),
  ).toBeVisible();
}

test.describe('Index page', () => {
  test('renders dashboard sections and mocked course data', async ({
    page,
  }) => {
    await loginAndNavigateToIndex(page);

    await expect(
      page.getByText("Here's what's happening with your courses today"),
    ).toBeVisible();

    const main = page.getByRole('main');
    const quickActionsHeading = main.getByRole('heading', {
      name: 'Quick Actions',
    });
    await expect(quickActionsHeading).toBeVisible();

    // All Quick Actions buttons are in a card containing the heading
    const quickActionsCard = quickActionsHeading.locator('..');
    await expect(
      quickActionsCard.getByRole('button', { name: 'Create Course' }),
    ).toBeVisible();
    await expect(
      quickActionsCard.getByRole('button', { name: 'Students' }),
    ).toBeVisible();
    await expect(
      quickActionsCard.getByRole('button', { name: 'Grade' }),
    ).toBeVisible();
    await expect(
      quickActionsCard.getByRole('button', { name: 'Badges' }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Active Courses' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Draft Courses' }),
    ).toBeVisible();

    // Scope course names to their respective sections
    const activeCoursesHeading = page.getByRole('heading', {
      name: 'Active Courses',
    });
    const activeCoursesSectionStart = activeCoursesHeading.locator('..');
    // Find the section by going up to the parent and then searching within
    await expect(
      activeCoursesSectionStart
        .locator('xpath=ancestor::section[1]')
        .getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();

    const draftCoursesHeading = page.getByRole('heading', {
      name: 'Draft Courses',
    });
    const draftCoursesSectionStart = draftCoursesHeading.locator('..');
    await expect(
      draftCoursesSectionStart
        .locator('xpath=ancestor::section[1]')
        .getByRole('heading', { name: 'Machine Learning Project Lab' }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Recent Activity' }),
    ).toBeVisible();
    await expect(page.locator('text=/Alice Tan enrolled in/')).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Pending Tasks' }),
    ).toBeVisible();
    await expect(
      page.locator('text=/Review draft module outline/'),
    ).toBeVisible();
    await expect(page.locator('text=/Assignments to grade/')).toBeVisible();
  });

  test('navigates to courses page from View All button', async ({ page }) => {
    await loginAndNavigateToIndex(page);

    // There's only one "View All" button on the page (in Active Courses section)
    await page.getByRole('button', { name: /View All/ }).click();

    await expect(page).toHaveURL(/\/courses$/);
    await expect(
      page.getByRole('heading', { name: 'Course Management' }),
    ).toBeVisible();
  });

  test('shows empty states when there are no courses, activity, or tasks', async ({
    page,
  }) => {
    await loginAndNavigateToIndex(page, {
      courses: [],
      stats: {
        statistics: {
          total_students: 0,
          active_students: 0,
          average_completion_rate: 0,
          completed_courses: 0,
          average_rating: '0',
          published_enrollments_last_30_days: 0,
          total_enrollments_last_30_days: 0,
        },
        recent_activity: [],
        pending_tasks: [],
        completed_tasks: [],
      },
    });

    await expect(page.getByText('No published courses yet')).toBeVisible();
    await expect(page.getByText('No draft courses')).toBeVisible();
    await expect(page.getByText('No recent activity yet')).toBeVisible();
    await expect(page.getByText('No pending tasks')).toBeVisible();
  });

  test('displays correct stats card values', async ({ page }) => {
    await loginAndNavigateToIndex(page);

    // Check individual stat cards
    await expect(
      page.locator('text=Total Students').locator('..').getByText('50'),
    ).toBeVisible();
    await expect(
      page.locator('text=Avg Completion').locator('..').getByText('73%'),
    ).toBeVisible();
    await expect(
      page.locator('text=Course Rating').locator('..').getByText('4.6'),
    ).toBeVisible();
    await expect(
      page
        .locator('text=Enrollments (Published)')
        .locator('..')
        .getByText('19'),
    ).toBeVisible();
  });

  test('Quick Actions buttons navigate to correct pages', async ({ page }) => {
    await loginAndNavigateToIndex(page);

    const main = page.getByRole('main');
    const quickActionsCard = main
      .getByRole('heading', { name: 'Quick Actions' })
      .locator('..');

    // Test Create Course button
    await quickActionsCard
      .getByRole('button', { name: 'Create Course' })
      .click();
    await expect(page).toHaveURL(/\/course-builder\/new/);

    // Go back to index
    await page.goto('/', { waitUntil: 'networkidle' });
    await setupIndexPageMocks(page);
    await page.waitForLoadState('networkidle');

    // Test Students button
    const quickActionsCard2 = main
      .getByRole('heading', { name: 'Quick Actions' })
      .locator('..');
    await quickActionsCard2.getByRole('button', { name: 'Students' }).click();
    await expect(page).toHaveURL(/\/students/);
  });

  test('displays completed tasks section when available', async ({ page }) => {
    await loginAndNavigateToIndex(page);

    // Click the Show button to expand completed tasks
    await page.getByRole('button', { name: 'Show' }).click();

    // Check for completed tasks section
    await expect(
      page.locator('text=/Publish onboarding announcement/'),
    ).toBeVisible();
  });

  test('shows system task count badges', async ({ page }) => {
    await loginAndNavigateToIndex(page);

    // Check for the assignment grading count
    await expect(page.locator('text=/Assignments to grade/')).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: /Assignments to grade 3/ })
        .getByText('3'),
    ).toBeVisible(); // count badge
  });

  test('displays only draft courses when no active courses exist', async ({
    page,
  }) => {
    await loginAndNavigateToIndex(page, {
      courses: [
        {
          id: 'course-2',
          title: 'Machine Learning Project Lab',
          description: 'Build and ship your first ML project',
          thumbnail_url: 'https://example.com/course-2.jpg',
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
      ],
    });

    await expect(page.getByText('No published courses yet')).toBeVisible();
    const draftCoursesHeading = page.getByRole('heading', {
      name: 'Draft Courses',
    });
    const draftCoursesSectionStart = draftCoursesHeading.locator('..');
    await expect(
      draftCoursesSectionStart
        .locator('xpath=ancestor::section[1]')
        .getByRole('heading', { name: 'Machine Learning Project Lab' }),
    ).toBeVisible();
  });

  test('displays only active courses when no draft courses exist', async ({
    page,
  }) => {
    await loginAndNavigateToIndex(page, {
      courses: [
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
      ],
    });

    const activeCoursesHeading = page.getByRole('heading', {
      name: 'Active Courses',
    });
    const activeCoursesSectionStart = activeCoursesHeading.locator('..');
    await expect(
      activeCoursesSectionStart
        .locator('xpath=ancestor::section[1]')
        .getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();
    await expect(page.getByText('No draft courses')).toBeVisible();
  });

  test('displays multiple recent activities', async ({ page }) => {
    await loginAndNavigateToIndex(page, {
      stats: {
        statistics: {
          total_students: 50,
          active_students: 21,
          average_completion_rate: 73,
          completed_courses: 9,
          average_rating: '4.6',
          published_enrollments_last_30_days: 19,
          total_enrollments_last_30_days: 28,
        },
        recent_activity: [
          {
            student_name: 'Alice Tan',
            course_title: 'Introduction to Data Science',
            formatted_date: 'Today',
          },
          {
            student_name: 'Bob Smith',
            course_title: 'Machine Learning Project Lab',
            formatted_date: 'Yesterday',
          },
          {
            student_name: 'Carol Williams',
            course_title: 'Introduction to Data Science',
            formatted_date: '2 days ago',
          },
        ],
        pending_tasks: [],
        completed_tasks: [],
      },
    });

    await expect(page.locator('text=/Alice Tan enrolled in/')).toBeVisible();
    await expect(page.locator('text=/Bob Smith enrolled in/')).toBeVisible();
    await expect(
      page.locator('text=/Carol Williams enrolled in/'),
    ).toBeVisible();
  });

  test('stats display zero values when instructor has no activity', async ({
    page,
  }) => {
    await loginAndNavigateToIndex(page, {
      stats: {
        statistics: {
          total_students: 0,
          active_students: 0,
          average_completion_rate: 0,
          completed_courses: 0,
          average_rating: '0',
          published_enrollments_last_30_days: 0,
          total_enrollments_last_30_days: 0,
        },
        recent_activity: [],
        pending_tasks: [
          {
            id: 'assignment_grading',
            title: 'Assignments to grade',
            count: 0,
          },
        ],
        completed_tasks: [],
      },
    });

    await expect(
      page.locator('text=Total Students').locator('..').getByText('0').first(),
    ).toBeVisible();
    await expect(
      page.locator('text=Avg Completion').locator('..').getByText('0%'),
    ).toBeVisible();
  });

  test('displays task due dates when available', async ({ page }) => {
    await loginAndNavigateToIndex(page);

    // Check for formatted due date text
    await expect(page.locator('text=/Due Tomorrow/')).toBeVisible();
  });
});
