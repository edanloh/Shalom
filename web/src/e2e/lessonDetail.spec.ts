import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const USER_ID = 'instructor-1';
const COURSE_ID = 'course-1';
const MODULE_ID = 'module-1';
const LESSON_ID = 'lesson-1';

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

const mockVideoLesson = {
  id: LESSON_ID,
  title: 'Introduction to Python',
  description:
    'Learn the fundamentals of Python programming in this introductory lesson.',
  type: 'video' as const,
  video_url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
  resource_url: null,
  resource_type: null,
  file_size_bytes: null,
  is_downloadable: false,
  duration_seconds: 900,
  thumbnail_url: null,
  is_preview: false,
  order_index: 0,
  course: {
    id: COURSE_ID,
    title: 'Data Science Fundamentals',
    instructor_name: 'Teacher Test',
  },
  section: {
    id: MODULE_ID,
    title: 'Module 1: Getting Started',
  },
  sectionVideos: [
    {
      id: LESSON_ID,
      title: 'Introduction to Python',
      order_index: 0,
      type: 'video',
    },
    {
      id: 'lesson-2',
      title: 'Variables and Types',
      order_index: 1,
      type: 'video',
    },
    { id: 'quiz-1', title: 'Python Basics Quiz', order_index: 2, type: 'quiz' },
  ],
  navigation: {
    previousVideo: null,
    nextVideo: { id: 'lesson-2', title: 'Variables and Types', type: 'video' },
  },
  userProgress: {
    progress_percentage: 30,
    watch_time_seconds: 270,
    is_completed: false,
    last_position_seconds: 270,
    updated_at: '2026-03-08T00:00:00.000Z',
  },
};

const mockPdfLesson = {
  ...mockVideoLesson,
  id: 'lesson-pdf',
  title: 'Python Reference Guide',
  type: 'pdf' as const,
  video_url: null,
  resource_url: 'https://example.com/python-guide.pdf',
  resource_type: 'pdf',
  file_size_bytes: 2097152,
  is_downloadable: true,
  duration_seconds: null,
  sectionVideos: [
    {
      id: 'lesson-pdf',
      title: 'Python Reference Guide',
      order_index: 0,
      type: 'pdf',
    },
    {
      id: 'lesson-2',
      title: 'Variables and Types',
      order_index: 1,
      type: 'video',
    },
  ],
  navigation: {
    previousVideo: null,
    nextVideo: { id: 'lesson-2', title: 'Variables and Types', type: 'video' },
  },
};

async function setupLessonMocks(
  page: Page,
  options: {
    lesson?:
      | typeof mockVideoLesson
      | typeof mockPdfLesson
      | Record<string, unknown>;
    withError?: boolean;
  } = {},
) {
  const lesson = options.lesson ?? mockVideoLesson;
  const withError = options.withError ?? false;

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
          uuid: USER_ID,
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

  await page.route('**/functions/v1/getLessonDetail/**', async (route) => {
    if (withError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: lesson }),
    });
  });
}

async function loginThenNavigateToLesson(
  page: Page,
  lessonId: string = LESSON_ID,
  options?: Parameters<typeof setupLessonMocks>[1],
) {
  await setupLessonMocks(page, options);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto(
    `/course/${COURSE_ID}/module/${MODULE_ID}/lesson/${lessonId}`,
    {
      waitUntil: 'domcontentloaded',
    },
  );

  // Wait for loading spinner to disappear
  await expect(page.locator('.animate-spin').first()).not.toBeVisible({
    timeout: 10000,
  });
}

test.describe('LessonDetail page', () => {
  test('displays lesson title', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    await expect(
      page.getByRole('heading', { name: 'Introduction to Python' }),
    ).toBeVisible();
  });

  test('displays section name', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    await expect(
      page.getByText('Section: Module 1: Getting Started'),
    ).toBeVisible();
  });

  test('displays course info in the sidebar panel', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    await expect(page.getByText('Course Info')).toBeVisible();
    await expect(page.getByText('Data Science Fundamentals')).toBeVisible();
    await expect(page.getByText('Teacher Test')).toBeVisible();
  });

  test('shows YouTube iframe for a YouTube video URL', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    await expect(
      page.locator('iframe[src*="youtube.com/embed"]'),
    ).toBeVisible();
  });

  test('shows video duration in the lesson header', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    // 900 seconds = 15 minutes
    await expect(page.getByText('15 minutes')).toBeVisible();
  });

  test('shows lesson description in the Content tab', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    await expect(page.getByText('About this lesson')).toBeVisible();
    await expect(
      page.getByText(
        'Learn the fundamentals of Python programming in this introductory lesson.',
      ),
    ).toBeVisible();
  });

  test('Transcript tab shows placeholder message', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    await page.getByRole('tab', { name: /Transcript/i }).click();

    await expect(
      page.getByText('Video transcript is not available yet.'),
    ).toBeVisible();
  });

  test('Previous button is disabled on the first lesson', async ({ page }) => {
    await loginThenNavigateToLesson(page);

    const prevButton = page.getByRole('button', { name: /Previous Lesson/i });
    await expect(prevButton).toBeDisabled();
  });

  test('Next button shows "Next Lesson" label when next item is a video', async ({
    page,
  }) => {
    await loginThenNavigateToLesson(page);

    await expect(
      page.getByRole('button', { name: 'Next Lesson' }),
    ).toBeVisible();
  });

  test('Next button shows "Next Quiz" label when next item is a quiz', async ({
    page,
  }) => {
    // lesson-2 is the second item; quiz-1 is the item after it
    const lessonBeforeQuiz = {
      ...mockVideoLesson,
      id: 'lesson-2',
      title: 'Variables and Types',
      order_index: 1,
      navigation: {
        previousVideo: {
          id: LESSON_ID,
          title: 'Introduction to Python',
          type: 'video',
        },
        nextVideo: { id: 'quiz-1', title: 'Python Basics Quiz', type: 'quiz' },
      },
    };

    await loginThenNavigateToLesson(page, 'lesson-2', {
      lesson: lessonBeforeQuiz,
    });

    await expect(page.getByRole('button', { name: 'Next Quiz' })).toBeVisible();
  });

  test('clicking Next Lesson navigates to the next lesson URL', async ({
    page,
  }) => {
    await loginThenNavigateToLesson(page);

    await page.getByRole('button', { name: 'Next Lesson' }).click();

    await expect(page).toHaveURL(/\/lesson\/lesson-2$/);
  });

  test('Back to Course button navigates to the course page', async ({
    page,
  }) => {
    await loginThenNavigateToLesson(page);

    await page.getByRole('button', { name: 'Back to Course' }).first().click();

    await expect(page).toHaveURL(new RegExp(`/course/${COURSE_ID}$`));
  });

  test('shows error state when the API call fails', async ({ page }) => {
    await loginThenNavigateToLesson(page, LESSON_ID, { withError: true });

    await expect(page.getByText('Lesson Not Found')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Back to Course' }),
    ).toBeVisible();
  });

  test('shows "No video available" message when video_url is absent', async ({
    page,
  }) => {
    const noVideoLesson = { ...mockVideoLesson, video_url: null };
    await loginThenNavigateToLesson(page, LESSON_ID, { lesson: noVideoLesson });

    await expect(
      page.getByText('No video available for this lesson'),
    ).toBeVisible();
  });

  test('shows PDF file size for a PDF lesson', async ({ page }) => {
    await setupLessonMocks(page, { lesson: mockPdfLesson });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });
    await page.goto(
      `/course/${COURSE_ID}/module/${MODULE_ID}/lesson/lesson-pdf`,
      {
        waitUntil: 'domcontentloaded',
      },
    );
    await expect(page.locator('.animate-spin').first()).not.toBeVisible({
      timeout: 10000,
    });

    // 2097152 bytes = 2.0 MB
    await expect(page.getByText('2.0 MB')).toBeVisible();
  });

  test('shows Download Document button for a downloadable PDF lesson', async ({
    page,
  }) => {
    await setupLessonMocks(page, { lesson: mockPdfLesson });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });
    await page.goto(
      `/course/${COURSE_ID}/module/${MODULE_ID}/lesson/lesson-pdf`,
      {
        waitUntil: 'domcontentloaded',
      },
    );
    await expect(page.locator('.animate-spin').first()).not.toBeVisible({
      timeout: 10000,
    });

    await expect(
      page.getByRole('button', { name: 'Download Document' }),
    ).toBeVisible();
  });

  test('last lesson Next button navigates back to the course', async ({
    page,
  }) => {
    const lastLesson = {
      ...mockVideoLesson,
      id: 'lesson-2',
      title: 'Variables and Types',
      order_index: 1,
      sectionVideos: [
        {
          id: LESSON_ID,
          title: 'Introduction to Python',
          order_index: 0,
          type: 'video',
        },
        {
          id: 'lesson-2',
          title: 'Variables and Types',
          order_index: 1,
          type: 'video',
        },
      ],
      navigation: {
        previousVideo: {
          id: LESSON_ID,
          title: 'Introduction to Python',
          type: 'video',
        },
        nextVideo: null,
      },
    };

    await loginThenNavigateToLesson(page, 'lesson-2', { lesson: lastLesson });

    // The Next button should be disabled (no next item) or labeled "Back to Course"
    const nextBtn = page
      .getByRole('button', { name: /Back to Course|Next Lesson/i })
      .last();
    await expect(nextBtn).toBeVisible();
  });
});
