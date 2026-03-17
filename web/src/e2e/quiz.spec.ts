import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';

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

const mockCourses = [
  {
    id: 'course-1',
    title: 'Data Science Fundamentals',
    description: 'Learn data science basics.',
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
    total_sections: 3,
    total_videos: 10,
    total_quizzes: 2,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-08T00:00:00.000Z',
  },
  {
    id: 'course-2',
    title: 'Draft Course - Not Published',
    description: 'Draft content',
    thumbnail_url: 'https://example.com/course-2.jpg',
    category_name: 'Programming',
    category_color: '#10b981',
    is_published: false,
    instructor_name: 'Teacher Test',
    instructor_id: INSTRUCTOR_ID,
    student_count: 5,
    rating: 0,
    total_ratings: 0,
    duration_hours: 4,
    total_sections: 1,
    total_videos: 2,
    total_quizzes: 1,
    created_at: '2026-03-02T00:00:00.000Z',
    updated_at: '2026-03-08T00:00:00.000Z',
  },
];

const mockSectionsForCourse1 = [
  {
    id: 'module-1',
    title: 'Module 1: SQL Basics',
    order_index: 0,
    items: [
      {
        id: 'quiz-1',
        type: 'quiz',
        title: 'SQL Basics Quiz',
        description: 'Assess SQL basics',
        questions: [
          { id: 'q1', text: 'What is SELECT?' },
          { id: 'q2', text: 'What is WHERE?' },
        ],
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Module 2: Aggregations',
    order_index: 1,
    items: [
      {
        id: 'quiz-2',
        type: 'quiz',
        title: 'Aggregation Quiz',
        description: 'Practice GROUP BY',
        questions: [{ id: 'q3', text: 'What does SUM do?' }],
      },
    ],
  },
];

const mockPendingGradingByQuestion = [
  {
    questionId: 'q-short-1',
    questionText: 'Explain the purpose of the SQL WHERE clause.',
    questionImageUrl: null,
    questionExplanation: null,
    maxPoints: 100,
    sampleAnswer: 'Filters records based on specified conditions.',
    quizId: 'quiz-1',
    quizTitle: 'SQL Basics Quiz',
    courseId: 'course-1',
    courseTitle: 'Data Science Fundamentals',
    moduleId: 'module-1',
    moduleTitle: 'Module 1: SQL Basics',
    totalPendingCount: 4,
    variations: [
      {
        variationId: 'var-1',
        answerText: 'It filters rows that match a condition.',
        studentCount: 4,
        isGraded: false,
        gradedPoints: null,
        gradedFeedback: null,
        students: [
          {
            attemptId: 'attempt-1',
            attemptNumber: 1,
            studentId: 'student-1',
            studentName: 'Student One',
            studentEmail: 'student1@example.com',
            studentAnswer: 'It filters rows that match a condition.',
            submittedAt: '2026-03-08T09:00:00.000Z',
            totalScore: 40,
            isPassed: false,
          },
          {
            attemptId: 'attempt-2',
            attemptNumber: 1,
            studentId: 'student-2',
            studentName: 'Student Two',
            studentEmail: 'student2@example.com',
            studentAnswer: 'It filters rows that match a condition.',
            submittedAt: '2026-03-08T09:01:00.000Z',
            totalScore: 50,
            isPassed: false,
          },
          {
            attemptId: 'attempt-3',
            attemptNumber: 1,
            studentId: 'student-3',
            studentName: 'Student Three',
            studentEmail: 'student3@example.com',
            studentAnswer: 'It filters rows that match a condition.',
            submittedAt: '2026-03-08T09:02:00.000Z',
            totalScore: 45,
            isPassed: false,
          },
          {
            attemptId: 'attempt-4',
            attemptNumber: 1,
            studentId: 'student-4',
            studentName: 'Student Four',
            studentEmail: 'student4@example.com',
            studentAnswer: 'It filters rows that match a condition.',
            submittedAt: '2026-03-08T09:03:00.000Z',
            totalScore: 55,
            isPassed: false,
          },
        ],
      },
    ],
  },
];

async function setupQuizMocks(
  page: Page,
  options?: { pendingGradingByQuestion?: typeof mockPendingGradingByQuestion },
) {
  const pendingGradingByQuestion = structuredClone(
    options?.pendingGradingByQuestion ?? [],
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

  await page.route('**/functions/v1/getPendingGradingByQuestion/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: pendingGradingByQuestion,
      }),
    });
  });

  await page.route('**/functions/v1/gradeAnswerVariation*', async (route) => {
    const requestBody = route.request().postDataJSON() as {
      questionId: string;
      pointsAwarded: number;
      feedback?: string;
      attemptIds: string[];
    };

    const question = pendingGradingByQuestion.find(
      (item) => item.questionId === requestBody.questionId,
    );

    if (question) {
      question.variations = question.variations.map((variation) => ({
        ...variation,
        isGraded: true,
        gradedPoints: requestBody.pointsAwarded,
        gradedFeedback: requestBody.feedback ?? 'Good work',
      }));
      question.totalPendingCount = 0;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Quiz graded with score: 90/100',
      }),
    });
  });

  await page.route('**/functions/v1/getAllCourse*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: mockCourses,
      }),
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
            sections: mockSectionsForCourse1,
          },
        }),
      });
    },
  );
}

async function loginThenNavigateToQuiz(
  page: Page,
  options?: Parameters<typeof setupQuizMocks>[1],
) {
  await setupQuizMocks(page, options);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto('/quiz', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Quiz Center' }),
  ).toBeVisible();
}

test.describe('Quiz page', () => {
  test('shows course selection prompt before filters are applied', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    // Course-selection prompt is rendered in Quiz Library tab.
    await page.getByRole('tab', { name: 'Quiz Library' }).click();

    await expect(
      page.getByRole('heading', { name: 'Select a Course' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Browse Courses' }).first(),
    ).toBeVisible();
  });

  test('browse courses opens the course selector dialog', async ({ page }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('tab', { name: 'Quiz Library' }).click();

    await page.getByRole('button', { name: 'Browse Courses' }).first().click();

    await expect(page.getByRole('heading', { name: 'Select Course' })).toBeVisible();
    await expect(
      page.getByPlaceholder('Search courses by name...'),
    ).toBeVisible();
  });

  test('shows published and draft courses in selector, with draft disabled', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: /^Select Course$/ }).first().click();

    await expect(page.getByText('Data Science Fundamentals')).toBeVisible();
    await expect(page.getByText('Draft Course - Not Published')).toBeVisible();

    const draftCourseButton = page
      .locator('button')
      .filter({ hasText: 'Draft Course - Not Published' })
      .first();
    await expect(draftCourseButton).toBeDisabled();
  });

  test('selecting a published course loads quiz library cards', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: /^Select Course$/ }).first().click();
    await page
      .locator('button:not([disabled])')
      .filter({ hasText: 'Data Science Fundamentals' })
      .first()
      .click();

    await page.getByRole('tab', { name: 'Quiz Library' }).click();

    await expect(page.getByPlaceholder('Search quizzes...')).toBeVisible();
    await expect(
      page.getByText('Data Science Fundamentals').first(),
    ).toBeVisible();
    await expect(page.getByText('SQL Basics Quiz')).toBeVisible();
    await expect(page.getByText('Aggregation Quiz')).toBeVisible();
    await expect(page.getByText('2 questions')).toBeVisible();
    await expect(page.getByText('1 questions')).toBeVisible();
  });

  test('search filters quizzes inside selected course', async ({ page }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: /^Select Course$/ }).first().click();
    await page
      .locator('button:not([disabled])')
      .filter({ hasText: 'Data Science Fundamentals' })
      .first()
      .click();

    await page.getByRole('tab', { name: 'Quiz Library' }).click();

    await page.getByPlaceholder('Search quizzes...').fill('aggregation');

    await expect(page.getByText('Aggregation Quiz')).toBeVisible();
    await expect(page.getByText('SQL Basics Quiz')).not.toBeVisible();
  });

  test('shows empty state when no quizzes match search query', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: /^Select Course$/ }).first().click();
    await page
      .locator('button:not([disabled])')
      .filter({ hasText: 'Data Science Fundamentals' })
      .first()
      .click();

    await page.getByRole('tab', { name: 'Quiz Library' }).click();

    await page.getByPlaceholder('Search quizzes...').fill('does-not-exist');

    await expect(page.getByText('No Quizzes Found')).toBeVisible();
    await expect(
      page.getByText('No quizzes match "does-not-exist"'),
    ).toBeVisible();
  });

  test('clear all resets selected course and returns to selection prompt', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page);

    await page.getByRole('button', { name: /^Select Course$/ }).first().click();
    await page
      .locator('button:not([disabled])')
      .filter({ hasText: 'Data Science Fundamentals' })
      .first()
      .click();

    // Clear selected course via close action in selected-course chip.
    await page.locator('button.h-6.w-6.p-0').first().click();

    await expect(
      page.getByRole('button', { name: /^Select Course$/ }).first(),
    ).toBeVisible();
  });

  test('grading queue shows pending submissions and quick grade feedback', async ({
    page,
  }) => {
    await loginThenNavigateToQuiz(page, {
      pendingGradingByQuestion: mockPendingGradingByQuestion,
    });

    await page.getByRole('tab', { name: 'Grading Queue' }).click();

    await expect(page.getByText('4 Submissions Pending')).toBeVisible();
    await expect(page.getByText('SQL Basics Quiz').first()).toBeVisible();
    await expect(
      page.getByText('Explain the purpose of the SQL WHERE clause.'),
    ).toBeVisible();
  });
});
