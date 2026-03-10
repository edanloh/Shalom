import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';
const COURSE_ID = 'course-1';
const MODULE_ID = 'module-1';
const QUIZ_ID = 'quiz-1';

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

const mockSections = [
  {
    id: MODULE_ID,
    title: 'Module 1',
    order_index: 0,
    items: [
      {
        id: QUIZ_ID,
        type: 'quiz',
        title: 'SQL Fundamentals Quiz',
        description: 'Core SQL quiz',
        passing_score: 70,
        time_limit: 20,
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            text: 'What does SQL stand for?',
            options: [
              'Structured Query Language',
              'Simple Query Language',
              'System Query Logic',
            ],
            correct_answer: 0,
            explanation: 'SQL stands for Structured Query Language.',
          },
          {
            id: 'q2',
            type: 'true-false',
            text: 'WHERE filters rows in a query.',
            options: ['True', 'False'],
            correct_answer: 'True',
          },
        ],
      },
      {
        id: 'lesson-2',
        type: 'video',
        title: 'Joins Deep Dive',
        order_index: 1,
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Module 2',
    order_index: 1,
    items: [
      {
        id: 'quiz-2',
        type: 'quiz',
        title: 'Advanced SQL Quiz',
        order_index: 0,
        questions: [],
      },
    ],
  },
];

async function setupQuizTakingMocks(
  page: Page,
  options?: {
    sections?: any[];
  },
) {
  const sections = options?.sections ?? mockSections;

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
          sub: INSTRUCTOR_ID,
          email: TEST_EMAIL,
          role: 'instructor',
          name: 'Teacher Test',
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

  await page.route(
    '**/functions/v1/getModuleDetailInstructor/**',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sections,
          },
        }),
      });
    },
  );
}

async function loginThenNavigateToQuiz(
  page: Page,
  options?: Parameters<typeof setupQuizTakingMocks>[1],
) {
  await setupQuizTakingMocks(page, options);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto(`/course/${COURSE_ID}/module/${MODULE_ID}/quiz/${QUIZ_ID}`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByText('Loading quiz...')).not.toBeVisible({
    timeout: 10000,
  });
}

test.describe('Quiz taking page', () => {
  test('loads quiz header and first question details', async ({ page }) => {
    await loginThenNavigateToQuiz(page);

    await expect(
      page.getByRole('heading', { name: 'SQL Fundamentals Quiz' }),
    ).toBeVisible();
    await expect(
      page.getByText('Question 1 of 2', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('What does SQL stand for?')).toBeVisible();
    await expect(page.getByText(/^Structured Query Language\b/)).toBeVisible();
  });

  test('shows correct answer and explanation for multiple-choice question', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await expect(page.getByText('(Correct Answer)')).toBeVisible();
    await expect(page.getByText('Explanation:')).toBeVisible();
    await expect(
      page.getByText('SQL stands for Structured Query Language.'),
    ).toBeVisible();
  });

  test('navigates between quiz questions with next and previous buttons', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: 'Next Question' }).click();
    await expect(
      page.getByText('Question 2 of 2', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('WHERE filters rows in a query.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Previous Question' }).click();
    await expect(
      page.getByText('Question 1 of 2', { exact: true }),
    ).toBeVisible();
  });

  test('navigates to next lesson item after last question', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: 'Next Question' }).click();
    await page.getByRole('button', { name: 'Next Item' }).click();

    await expect(page).toHaveURL(
      /\/course\/course-1\/module\/module-1\/lesson\/lesson-2$/,
    );
  });

  test('exit quiz button returns to course detail', async ({ page }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: 'Exit Quiz' }).click();

    await expect(page).toHaveURL(/\/course\/course-1$/);
  });
});
