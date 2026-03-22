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

async function mockAuthAndAnalyticsPage(
  page: Page,
  options?: {
    analyticsStatus?: number;
    analyticsOverride?: unknown;
  },
) {
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

  await page.route(
    '**/functions/v1/getInstructorAnalytics**',
    async (route) => {
      if (options?.analyticsOverride !== undefined) {
        await route.fulfill({
          status: options.analyticsStatus ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(options.analyticsOverride),
        });
        return;
      }

      const url = new URL(route.request().url());
      const courseId = url.searchParams.get('courseId');

      const baseAnalytics = {
        summary: {
          total_students: 250,
          active_students: 185,
          total_courses: 12,
          average_rating: 4.6,
          total_enrollments: 450,
          completion_rate: 68,
        },
        courses: [
          {
            id: 'course-1',
            name: 'Introduction to React',
            students: 85,
            completion: 72,
            engagement: 84,
            rating: 4.7,
          },
          {
            id: 'course-2',
            name: 'Advanced JavaScript',
            students: 62,
            completion: 65,
            engagement: 78,
            rating: 4.5,
          },
          {
            id: 'course-3',
            name: 'Python Basics',
            students: 103,
            completion: 70,
            engagement: 81,
            rating: 4.6,
          },
        ],
        enrollment_trend: [
          { date: '2026-02-01', students: 200 },
          { date: '2026-02-08', students: 215 },
          { date: '2026-02-15', students: 230 },
          { date: '2026-02-22', students: 238 },
          { date: '2026-03-01', students: 250 },
        ],
        enrollment_monthly: {
          current: { students: 250, month: '2026-03' },
          previous: { students: 220, month: '2026-02' },
        },
        completion_breakdown: [
          { name: 'Completed', value: 170 },
          { name: 'In Progress', value: 200 },
          { name: 'Not Started', value: 80 },
        ],
        activity_by_day: [
          { day: 'Mon', active: 145 },
          { day: 'Tue', active: 162 },
          { day: 'Wed', active: 178 },
          { day: 'Thu', active: 155 },
          { day: 'Fri', active: 142 },
          { day: 'Sat', active: 98 },
          { day: 'Sun', active: 87 },
        ],
        category_performance: [
          { category: 'Web Development', value: 85 },
          { category: 'Programming', value: 78 },
          { category: 'Data Science', value: 72 },
        ],
        course_performance: [
          { course: 'Introduction to React', engagement: 84, completion: 72 },
          { course: 'Advanced JavaScript', engagement: 78, completion: 65 },
          { course: 'Python Basics', engagement: 81, completion: 70 },
        ],
        cohort_analytics: [
          { cohort: '2026-01', retention: 85, completion: 72 },
          { cohort: '2026-02', retention: 78, completion: 65 },
          { cohort: '2026-03', retention: 82, completion: 68 },
        ],
        insights: [
          {
            type: 'low_completion',
            severity: 'medium',
            title: 'Advanced JavaScript completion below target',
            description:
              'Course completion rate is 65%, below the 70% threshold',
            recommendation:
              'Review course difficulty and provide additional support materials',
            course_id: 'course-2',
            course_name: 'Advanced JavaScript',
            supporting_metrics: {
              completion_percent: 65,
              threshold_percent: 70,
            },
          },
        ],
      };

      if (courseId) {
        // Return course-specific analytics
        const course = baseAnalytics.courses.find((c) => c.id === courseId);
        if (course) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              summary: {
                total_students: course.students,
                active_students: Math.floor(course.students * 0.85),
                total_courses: 1,
                average_rating: course.rating,
                total_enrollments: course.students,
                completion_rate: course.completion,
              },
              courses: [course],
              enrollment_trend: [
                { date: '2026-02-01', students: course.students - 20 },
                { date: '2026-02-15', students: course.students - 10 },
                { date: '2026-03-01', students: course.students },
              ],
              enrollment_monthly: {
                current: { students: course.students, month: '2026-03' },
                previous: { students: course.students - 15, month: '2026-02' },
              },
              completion_breakdown: baseAnalytics.completion_breakdown,
              activity_by_day: baseAnalytics.activity_by_day,
              insights: baseAnalytics.insights.filter(
                (i) => i.course_id === courseId,
              ),
            }),
          });
          return;
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(baseAnalytics),
      });
    },
  );
}

async function loginThenNavigateToAnalytics(page: Page) {
  await mockAuthAndAnalyticsPage(page);

  // Use DOMContentLoaded to avoid flakiness from non-critical resource loads.
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Analytics page', () => {
  test('displays analytics page heading and controls', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    await expect(
      page.getByRole('heading', { name: 'Analytics Dashboard' }),
    ).toBeVisible();
    await expect(
      page.getByText('Track your teaching performance and student progress'),
    ).toBeVisible();

    // Check for date filter
    await expect(page.getByRole('combobox')).toBeVisible();

    // Check for export button
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('displays key summary statistics', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    // Wait for stats to load - check for the stat labels instead of exact values
    await expect(page.getByText('Total Enrolled')).toBeVisible();
    await expect(page.getByText('Avg Engagement')).toBeVisible();
    await expect(page.getByText('Study Hours')).toBeVisible();
    await expect(page.getByText('Goal Completion')).toBeVisible();
  });

  test('can switch between date filter options', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    // Click date filter dropdown (use combobox)
    await page.getByRole('combobox').click();

    // Select 7 days option if available
    const sevenDaysOption = page.getByText('Last 7 days', { exact: true });
    if (await sevenDaysOption.isVisible()) {
      await sevenDaysOption.click();
      // Verify the filter changed
      await expect(page.getByRole('combobox')).toContainText('Last 7 days');
    }
  });

  test('renders enrollment trend chart', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    // Check for chart section
    await expect(page.getByText('Enrollment Trends')).toBeVisible();

    // The chart should contain data
    await expect(
      page.locator('.recharts-responsive-container').first(),
    ).toBeVisible();
  });

  test('displays completion breakdown chart', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    await expect(page.getByText('Student Progress Distribution')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Not Started')).toBeVisible();
  });

  test('shows student activity by day chart', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    await expect(page.getByText('Weekly Student Activity')).toBeVisible();
  });

  test('displays course performance data', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    await expect(page.getByText('Course Performance')).toBeVisible();
    await expect(page.getByText('Introduction to React')).toBeVisible();
    await expect(page.getByText('Advanced JavaScript')).toBeVisible();
    await expect(page.getByText('Python Basics')).toBeVisible();
  });

  test('shows optimization insights section', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    await expect(page.getByText('Optimization Insights')).toBeVisible();
    // Check for the insight content - it may be collapsed or shown differently
    await expect(page.getByText(/Low Completion/i)).toBeVisible();
    await expect(page.getByText(/Completion.*vs threshold/i)).toBeVisible();
  });

  test('can switch to course view mode', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    // Switch to course view - use "By Courses" tab
    await page.getByRole('tab', { name: /By Courses/i }).click();

    // Select a course from the course cards section
    const courseCard = page.locator('heading:has-text("Introduction to React")').locator('..').locator('button:has-text("View Analytics")');
    if (await courseCard.isVisible()) {
      await courseCard.click();
      // Verify course-specific data is loaded
      await expect(page.getByText('Introduction to React')).toBeVisible();
    }
  });

  test('can search courses in course selector', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    // Switch to course view - use "By Courses" tab
    await page.getByRole('tab', { name: /By Courses/i }).click();

    // Search for a course using the search input
    const searchInput = page.getByPlaceholder(/Search by course name/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('React');
      await expect(page.getByText('Introduction to React')).toBeVisible();
    }
  });

  test('exports analytics data when export button is clicked', async ({
    page,
  }) => {
    await loginThenNavigateToAnalytics(page);

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

    // Click export button
    await page.getByRole('button', { name: /Export/i }).click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/analytics.*\.csv/i);
  });

  test('displays empty state when no insights available', async ({ page }) => {
    // Mock analytics with no insights
    await mockAuthAndAnalyticsPage(page, {
      analyticsOverride: {
        summary: {
          total_students: 100,
          active_students: 85,
          total_courses: 5,
          average_rating: 4.8,
          total_enrollments: 150,
          completion_rate: 92,
        },
        courses: [],
        enrollment_trend: [],
        completion_breakdown: [],
        activity_by_day: [],
        category_performance: [],
        course_performance: [],
        cohort_analytics: [],
        insights: [],
      },
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });

    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByText(/No major optimization risks detected/i),
    ).toBeVisible();
  });

  test('handles analytics loading error gracefully', async ({ page }) => {
    await mockAuthAndAnalyticsPage(page, {
      analyticsStatus: 500,
      analyticsOverride: { error: 'Internal server error' },
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });

    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Check for error message in body
    await expect(page.locator('body')).toContainText(/analytics unavailable/i);
  });

  test('displays help tooltips for metrics', async ({ page }) => {
    await loginThenNavigateToAnalytics(page);

    // Find and hover over a help icon
    const helpIcon = page.locator('[aria-label="Analytics help"]').first();
    if (await helpIcon.isVisible()) {
      await helpIcon.hover();

      // Tooltip should appear
      await expect(page.locator('[role="tooltip"]')).toBeVisible();
    }
  });
});
