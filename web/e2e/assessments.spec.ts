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
    courseid: 'course-1',
    id: 'course-1',
    title: 'Data Science Fundamentals',
    description: 'Learn data science basics.',
    thumbnail_url: 'https://example.com/course-1.jpg',
    category_name: 'Data Science',
    category_color: '#3b82f6',
    is_published: true,
    status: 'published',
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
    courseid: 'course-2',
    id: 'course-2',
    title: 'Draft Course - Not Published',
    description: 'Draft content',
    thumbnail_url: 'https://example.com/course-2.jpg',
    category_name: 'Programming',
    category_color: '#10b981',
    is_published: false,
    status: 'draft',
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
    quizzes: [
      {
        id: 'quiz-1',
        title: 'SQL Basics Quiz',
        questions: [{ id: 'q1', text: 'What is SELECT?' }],
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Module 2: Aggregations',
    order_index: 1,
    quizzes: [
      {
        id: 'quiz-2',
        title: 'Aggregation Quiz',
        questions: [{ id: 'q2', text: 'What does SUM do?' }],
      },
    ],
  },
];

const mockPendingGrading = [
  {
    questionId: 'q1',
    questionText: 'What is SELECT?',
    questionImageUrl: null,
    questionExplanation: 'Explain SELECT usage.',
    maxPoints: 5,
    sampleAnswer: 'SELECT retrieves data from tables.',
    quizId: 'quiz-1',
    quizTitle: 'SQL Basics Quiz',
    courseId: 'course-1',
    courseTitle: 'Data Science Fundamentals',
    moduleId: 'module-1',
    moduleTitle: 'Module 1: SQL Basics',
    totalPendingCount: 2,
    variations: [
      {
        variationId: 'v1',
        answerText: 'Select statement',
        studentCount: 1,
        isGraded: false,
        gradedPoints: null,
        gradedFeedback: null,
        students: [
          {
            attemptId: 'a1',
            attemptNumber: 1,
            studentId: 'student-1',
            studentName: 'Alice',
            studentEmail: 'alice@example.com',
            studentAnswer: 'SELECT * FROM table;',
            submittedAt: '2026-03-10T12:00:00.000Z',
            totalScore: 0,
            isPassed: false,
          },
        ],
      },
      {
        variationId: 'v2',
        answerText: 'Select data from table',
        studentCount: 1,
        isGraded: false,
        gradedPoints: null,
        gradedFeedback: null,
        students: [
          {
            attemptId: 'a2',
            attemptNumber: 1,
            studentId: 'student-2',
            studentName: 'Bob',
            studentEmail: 'bob@example.com',
            studentAnswer: 'SELECT id FROM users;',
            submittedAt: '2026-03-10T12:30:00.000Z',
            totalScore: 0,
            isPassed: false,
          },
        ],
      },
    ],
  },
];

async function setupAssessmentsMocks(page: Page) {
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

  await page.route('**/functions/v1/getAllCourse*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockCourses }),
    });
  });

  await page.route(
    '**/functions/v1/getModuleDetailInstructor/**',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { sections: mockSectionsForCourse1 } }),
      });
    },
  );

  await page.route(
    '**/functions/v1/getPendingGradingByQuestion/**',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockPendingGrading }),
      });
    },
  );
}

async function loginThenNavigateToAssessments(page: Page) {
  await setupAssessmentsMocks(page);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });
  await page.goto('/assessments', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('tab', { name: 'Quiz Library' }).click();

  await expect(
    page.getByRole('heading', { name: 'Assessment Center' }),
  ).toBeVisible();
}

test.describe('Assessments page', () => {
  test('shows course selection placeholder and browse button', async ({
    page,
  }) => {
    await loginThenNavigateToAssessments(page);

    await expect(
      page.getByRole('heading', { name: 'Select a Course' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Browse Courses' }).first(),
    ).toBeVisible();
  });

  test('opens course selector dialog', async ({ page }) => {
    await loginThenNavigateToAssessments(page);

    await page.getByRole('button', { name: 'Browse Courses' }).click();

    await expect(
      page.getByRole('heading', { name: 'Select Course' }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder('Search courses by name...'),
    ).toBeVisible();
  });

  test('shows published and draft courses in dialog and draft is disabled', async ({
    page,
  }) => {
    await loginThenNavigateToAssessments(page);

    await page.getByRole('button', { name: 'Browse Courses' }).click();

    await expect(page.getByText('Data Science Fundamentals')).toBeVisible();
    await expect(page.getByText('Draft Course - Not Published')).toBeVisible();

    const draftCard = page
      .locator('button', { hasText: 'Draft Course - Not Published' })
      .first();
    await expect(draftCard).toBeDisabled();
  });

  test('shows no quizzes found empty state', async ({ page }) => {
    await loginThenNavigateToAssessments(page);

    await page.getByRole('button', { name: 'Browse Courses' }).click();
    await page
      .getByRole('button', { name: 'Data Science Fundamentals' })
      .click();

    await page.getByPlaceholder('Search quizzes...').fill('does-not-exist');

    await expect(page.getByText('No Quizzes Found')).toBeVisible();
    await expect(
      page.getByText(/No quizzes match.*does-not-exist/i),
    ).toBeVisible();
  });

  test('grading queue displays pending submissions from mocked data', async ({
    page,
  }) => {
    await loginThenNavigateToAssessments(page);

    await page.getByRole('tab', { name: 'Grading Queue' }).click();

    await expect(page.getByText('2 Submissions Pending')).toBeVisible();
    await expect(page.getByLabel('Grading Queue')).toContainText('SQL Basics Quiz');
    await expect(page.locator('text=2 variations').first()).toBeVisible();

    await expect(page.getByText('Q1')).toBeVisible();
    await expect(page.getByText('What is SELECT?')).toBeVisible();
  });
});
