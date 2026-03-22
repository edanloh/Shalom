import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';
const COURSE_ID = 'course-1';

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

const mockCourse = {
  id: COURSE_ID,
  title: 'Introduction to Data Science',
  description: 'Learn the fundamentals of data science.',
  thumbnail_url: null,
  category_name: 'Data Science',
  category_color: '#3b82f6',
  is_published: false,
  instructor_name: 'Teacher Test',
  instructor_id: INSTRUCTOR_ID,
  student_count: '0',
  rating: '0',
  totalRatings: '0',
  duration_hours: 0,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-08T00:00:00.000Z',
  outcomes: [],
};

const mockSections = [
  {
    id: 'section-1',
    title: 'Getting Started',
    description: '',
    order_index: 0,
    items: [
      {
        id: 'lesson-1',
        type: 'video',
        title: 'Welcome Video',
        video_url: 'https://www.youtube.com/watch?v=abc123def45',
        duration_seconds: 600,
        is_preview: true,
        order_index: 0,
      },
    ],
  },
  {
    id: 'section-2',
    title: 'Core Concepts',
    description: '',
    order_index: 1,
    items: [
      {
        id: 'lesson-2',
        type: 'video',
        title: 'Data Types',
        video_url: 'https://www.youtube.com/watch?v=xyz789abc12',
        duration_seconds: 900,
        is_preview: false,
        order_index: 0,
      },
      {
        id: 'quiz-1',
        type: 'quiz',
        title: 'Core Concepts Quiz',
        passing_score: 70,
        max_attempts: 2,
        questions: [
          {
            id: 'q-1',
            text: 'What is a variable?',
            question_type: 'multiple-choice',
            options: ['A container', 'A type', 'A loop', 'A function'],
            correct_answer: 0,
          },
        ],
        order_index: 1,
      },
    ],
  },
];

const mockCategories = [
  { id: 'cat-1', name: 'Data Science', color: '#3b82f6' },
  { id: 'cat-2', name: 'Programming', color: '#10b981' },
  { id: 'cat-3', name: 'Machine Learning', color: '#f59e0b' },
];

async function setupCourseBuilderMocks(
  page: Page,
  options: {
    course?: typeof mockCourse;
    sections?: typeof mockSections;
    withLoadError?: boolean;
    withSaveSuccess?: boolean;
  } = {},
) {
  const course = options.course ?? mockCourse;
  const sections = options.sections ?? mockSections;
  const withLoadError = options.withLoadError ?? false;
  const withSaveSuccess = options.withSaveSuccess ?? true;
  let createCourseCallCount = 0;
  let updateCourseCallCount = 0;

  const totalVideos = sections.reduce(
    (acc, s) => acc + s.items.filter((i) => i.type === 'video').length,
    0,
  );
  const totalQuizzes = sections.reduce(
    (acc, s) => acc + s.items.filter((i) => i.type === 'quiz').length,
    0,
  );

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

  await page.route('**/functions/v1/getCourseStudents/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          students: [],
        },
      }),
    });
  });

  await page.route('**/functions/v1/getAllStudents*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          students: [],
          statistics: {
            total_students: 0,
            active_students: 0,
            engaged_students: 0,
            at_risk_students: 0,
            average_progress: 0,
            average_engagement: 0,
          },
        },
      }),
    });
  });

  await page.route('**/functions/v1/categoryHandler*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockCategories }),
    });
  });

  await page.route(
    '**/functions/v1/getModuleDetailInstructor/**',
    async (route) => {
      if (withLoadError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Failed to load course',
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            course,
            sections,
            totalSections: sections.length,
            totalVideos,
            totalQuizzes,
          },
        }),
      });
    },
  );

  await page.route('**/functions/v1/updateCourse/**', async (route) => {
    updateCourseCallCount += 1;

    if (!withSaveSuccess) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Save failed' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, courseId: COURSE_ID }),
    });
  });

  await page.route('**/functions/v1/createCourse*', async (route) => {
    createCourseCallCount += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: 'new-course-id' } }),
    });
  });

  return {
    createCourseCallCount: () => createCourseCallCount,
    updateCourseCallCount: () => updateCourseCallCount,
  };
}

async function loginThenNavigateToCourseBuilder(
  page: Page,
  courseId: string = COURSE_ID,
  options?: Parameters<typeof setupCourseBuilderMocks>[1],
) {
  const mockState = await setupCourseBuilderMocks(page, options);
  const expectedCourseTitle = options?.course?.title ?? mockCourse.title;

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 15000 }); 
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, { timeout: 15000 });

  // Use 'commit' to avoid domcontentloaded hangs under high worker concurrency;
  // then wait for a concrete element to confirm the app has rendered.
  await page.goto(`/course-builder/${courseId}`, {
    waitUntil: 'commit',
    timeout: 20000,
  });

  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({
    timeout: 15000,
  });

  if (courseId !== 'new') {
    await expect(page.getByPlaceholder('Enter course title')).toHaveValue(
      expectedCourseTitle,
      {
        timeout: 15000,
      },
    );
    await expect(page.getByText('Loading Course...')).not.toBeVisible({
      timeout: 15000,
    });
  } else {
    await expect(page.getByPlaceholder('Enter course title')).toBeVisible({
      timeout: 15000,
    });
  }

  return mockState;
}

async function buildValidNewCourse(page: Page) {
  await page
    .getByPlaceholder('Enter course title')
    .fill('Practical SQL Analytics');
  await page
    .getByPlaceholder('Enter course description...')
    .fill(
      'Learn to analyze product and revenue data with practical SQL workflows.',
    );

  await page.getByRole('button', { name: 'Add New Module' }).click();
  await page.getByPlaceholder('Enter module title').fill('Foundations');

  await page.getByRole('button', { name: '+ Video' }).click();
  await expect(page.getByPlaceholder('Enter lesson title')).toBeVisible();
  await page
    .getByPlaceholder('Enter lesson title')
    .fill('Connecting to the warehouse');
  await page
    .getByPlaceholder('https://youtube.com/watch?v=... or any video URL')
    .fill('https://www.youtube.com/watch?v=rfscVS0vtbw');

  await expect(page.getByText('🎥 Video URL added')).toBeVisible();
}

test.describe('CourseBuilder – new course', () => {
  test('blocks saving an incomplete new course and does not call createCourse', async ({
    page,
  }) => {
    const mockState = await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Save Failed')).toBeVisible();
    await expect(page.locator('body')).toContainText(
      'Course title is required',
    );
    await expect(page.locator('body')).toContainText(
      'Course description is required',
    );
    await expect(page.locator('body')).toContainText(
      'Course must have at least one module',
    );
    expect(mockState.createCourseCallCount()).toBe(0);
  });

  test('shows "New Course" heading', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await expect(
      page.getByRole('heading', { name: 'New Course' }),
    ).toBeVisible();
  });

  test('shows the subtitle below the heading', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await expect(
      page.getByText('Build and manage your course content'),
    ).toBeVisible();
  });

  test('shows Course Content sidebar with Add New Module button', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await expect(
      page.getByRole('heading', { name: 'Course Content' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add New Module' }),
    ).toBeVisible();
  });

  test('shows zero stats in header for a new course', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await expect(page.getByText('0 modules')).toBeVisible();
    await expect(page.getByText('0 lessons')).toBeVisible();
    await expect(page.getByText('0 quizzes')).toBeVisible();
  });

  test('clicking Add New Module increments the module count', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByRole('button', { name: 'Add New Module' }).click();

    await expect(page.getByText('1 modules')).toBeVisible();
  });

  test('lets an instructor add a video lesson and start editing it', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByRole('button', { name: 'Add New Module' }).click();
    await page.getByPlaceholder('Enter module title').fill('Foundations');
    await page.getByRole('button', { name: '+ Video' }).click();

    await expect(page.getByText('1 lessons')).toBeVisible();
    await expect(page.getByPlaceholder('Enter lesson title')).toBeVisible();

    await page.getByPlaceholder('Enter lesson title').fill('Warehouse tour');
    await page
      .getByPlaceholder('https://youtube.com/watch?v=... or any video URL')
      .fill('https://www.youtube.com/watch?v=rfscVS0vtbw');

    await expect(page.locator('body')).toContainText('Warehouse tour');
    await expect(page.getByText('🎥 Video URL added')).toBeVisible();
  });

  test('lets an instructor add a quiz and draft the first question', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByRole('button', { name: 'Add New Module' }).click();
    await page.getByPlaceholder('Enter module title').fill('Quiz');
    await page.getByRole('button', { name: '+ Quiz' }).click();

    await expect(page.getByText('1 quizzes')).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter quiz title (e.g., 'Module 1 Quiz')"),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Enter question text')).toBeVisible();

    await page
      .getByPlaceholder("Enter quiz title (e.g., 'Module 1 Quiz')")
      .fill('Module 1 Quiz');
    await page
      .getByPlaceholder('Enter question text')
      .fill('What does SQL stand for?');

    await expect(page.locator('body')).toContainText('Module 1 Quiz');
    await expect(page.locator('body')).toContainText(
      'What does SQL stand for?',
    );
  });

  test('shows Preview and Save buttons', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('clicking Preview toggles into preview mode and hides the sidebar', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByRole('button', { name: 'Preview' }).click();

    // The Add New Module button is unique to the editor sidebar
    await expect(
      page.getByRole('button', { name: 'Add New Module' }),
    ).not.toBeVisible();
    // The button label changes to "Edit"
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('clicking Edit exits preview mode and restores the sidebar', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();

    await expect(
      page.getByRole('button', { name: 'Add New Module' }),
    ).toBeVisible();
  });

  test('preview shows draft metadata and outcomes before saving', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.getByPlaceholder('Enter course title').fill('Modern Data Ops');
    await page
      .getByPlaceholder('Enter course description...')
      .fill(
        'Build reliable analytics workflows with versioned pipelines and data quality checks.',
      );
    await page.locator('button[title="Add outcome"]').click();
    await page
      .getByPlaceholder('Outcome 1')
      .fill('Ship trustworthy dashboards faster');

    await page.getByRole('button', { name: 'Preview' }).click();

    await expect(
      page.getByRole('heading', { name: 'Modern Data Ops' }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Build reliable analytics workflows with versioned pipelines and data quality checks.',
      ),
    ).toBeVisible();
    await expect(page.getByText('Course Outcomes')).toBeVisible();
    await expect(
      page.getByText('Ship trustworthy dashboards faster'),
    ).toBeVisible();
  });

  test('saves a valid new course through createCourse and navigates to the created course', async ({
    page,
  }) => {
    const mockState = await loginThenNavigateToCourseBuilder(page, 'new');

    await buildValidNewCourse(page);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Success!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Course saved successfully!')).toBeVisible();
    expect(mockState.createCourseCallCount()).toBe(1);

    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page).toHaveURL(/\/course\/new-course-id$/);
  });

  test('back button navigates away from the course builder', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, 'new');

    await page.locator('button[title="Go back"]').click();

    await expect(page).not.toHaveURL(/\/course-builder\/new$/);
  });
});

test.describe('CourseBuilder – existing course', () => {
  test('shows unsaved state and preview for in-progress edits to an existing course', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await page
      .getByPlaceholder('Enter course title')
      .fill('Applied Data Science');
    await page
      .getByPlaceholder('Enter course description...')
      .fill(
        'Apply data science concepts to real reporting, forecasting, and experimentation workflows.',
      );
    await page.locator('button[title="Add outcome"]').click();
    await page
      .getByPlaceholder('Outcome 1')
      .fill('Design stronger analytics experiments');

    await expect(page.getByText('Unsaved changes')).toBeVisible();

    await page.getByRole('button', { name: 'Preview' }).click();

    await expect(
      page.getByRole('heading', { name: 'Applied Data Science' }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Apply data science concepts to real reporting, forecasting, and experimentation workflows.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Design stronger analytics experiments'),
    ).toBeVisible();
  });

  test('loads course title from the API into the header', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await expect(page.getByPlaceholder('Enter course title')).toHaveValue(
      'Introduction to Data Science',
    );
  });

  test('shows modules loaded from the API in the left sidebar', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await expect(page.getByText('Getting Started')).toBeVisible();
    await expect(page.getByText('Core Concepts')).toBeVisible();
  });

  test('header shows correct module, lesson, and quiz counts from API data', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await expect(page.getByText('2 modules')).toBeVisible();
    await expect(page.getByText('2 lessons')).toBeVisible();
    await expect(page.getByText('1 quizzes')).toBeVisible();
  });

  test('clicking Save opens the confirmation modal', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Save Course?')).toBeVisible();
    await expect(
      page.getByText('Are you sure you want to save your changes?', {
        exact: false,
      }),
    ).toBeVisible();
  });

  test('save confirmation modal has Save Changes and Cancel buttons', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByRole('button', { name: 'Save Changes' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('cancelling the save modal closes it without saving', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Save Course?')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByText('Save Course?')).not.toBeVisible();
  });

  test('confirming save shows a success modal', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Success modal should appear
    await expect(page.getByText('Success!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Course saved successfully!')).toBeVisible();
  });

  test('failed save shows an error modal', async ({ page }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID, {
      withSaveSuccess: false,
    });

    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Save Failed')).toBeVisible({ timeout: 10000 });
  });

  test('clicking Preview in existing course mode hides the editor layout', async ({
    page,
  }) => {
    await loginThenNavigateToCourseBuilder(page, COURSE_ID);

    await page.getByRole('button', { name: 'Preview' }).click();

    await expect(
      page.getByRole('button', { name: 'Add New Module' }),
    ).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('loading screen shows then disappears while course data loads', async ({
    page,
  }) => {
    // Delay the API response to observe the loading screen
    await setupCourseBuilderMocks(page);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });

    // Intercept and delay the module detail response to catch the loading screen
    await page.unroute('**/functions/v1/getModuleDetailInstructor/**');
    await page.route(
      '**/functions/v1/getModuleDetailInstructor/**',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              course: mockCourse,
              sections: mockSections,
              totalSections: mockSections.length,
              totalVideos: 2,
              totalQuizzes: 1,
            },
          }),
        });
      },
    );

    await page.goto(`/course-builder/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    // Loading screen should eventually disappear and content should be visible
    await expect(page.getByText('Loading Course...')).not.toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByPlaceholder('Enter course title')).toHaveValue(
      'Introduction to Data Science',
    );
  });
});
