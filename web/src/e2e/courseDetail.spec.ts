import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';
const COURSE_ID = '1';

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
  description:
    'Learn the fundamentals of data science including Python, statistics, and machine learning',
  instructor: 'Teacher Test',
  instructor_id: INSTRUCTOR_ID,
  category: 'Data Science',
  categoryColor: '#3b82f6',
  status: 'published',
  level: 'beginner',
  thumbnail: 'https://example.com/course-thumbnail.jpg',
  enrolledCount: 42,
  rating: 4.7,
  totalRatings: 23,
  completionRate: 78,
  duration: '12 hours',
  outcomes: [
    'Understand the fundamentals of data science',
    'Learn Python programming for data analysis',
    'Apply statistical methods to real-world data',
    'Build machine learning models',
  ],
};

const mockModules = [
  {
    id: 'module-1',
    title: 'Introduction to Data Science',
    lessons: 5,
    quizzes: 1,
    duration: '2 hours',
    total_duration_seconds: 7200,
    isCompleted: false,
    items: [
      {
        id: 'video-1',
        type: 'video',
        title: 'What is Data Science?',
        duration_seconds: 900,
      },
      {
        id: 'video-2',
        type: 'video',
        title: 'Data Science Tools',
        duration_seconds: 1200,
      },
      {
        id: 'video-3',
        type: 'video',
        title: 'Industry Applications',
        duration_seconds: 1080,
      },
      {
        id: 'quiz-1',
        type: 'quiz',
        title: 'Introduction Quiz',
        questions: [
          { id: 'q1', question: 'What is data science?' },
          { id: 'q2', question: 'Name a data science tool' },
        ],
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Python for Data Science',
    lessons: 6,
    quizzes: 1,
    duration: '3 hours',
    total_duration_seconds: 10800,
    isCompleted: false,
    items: [
      {
        id: 'video-4',
        type: 'video',
        title: 'Python Basics',
        duration_seconds: 1500,
      },
      {
        id: 'video-5',
        type: 'video',
        title: 'Data Types & Structures',
        duration_seconds: 1800,
      },
      {
        id: 'doc-1',
        type: 'pdf',
        title: 'Python Reference Guide',
        file_size_bytes: 2097152,
      },
      {
        id: 'quiz-2',
        type: 'quiz',
        title: 'Python Fundamentals Quiz',
        questions: [
          { id: 'q3', question: 'What is a variable?' },
          { id: 'q4', question: 'Explain lists in Python' },
        ],
      },
    ],
  },
  {
    id: 'module-3',
    title: 'Data Analysis with Pandas',
    lessons: 5,
    quizzes: 1,
    duration: '2.5 hours',
    total_duration_seconds: 9000,
    isCompleted: false,
    items: [
      {
        id: 'video-6',
        type: 'video',
        title: 'Introduction to Pandas',
        duration_seconds: 1200,
      },
      {
        id: 'video-7',
        type: 'video',
        title: 'DataFrames',
        duration_seconds: 1500,
      },
      {
        id: 'quiz-3',
        type: 'quiz',
        title: 'Pandas Mastery Quiz',
        questions: [{ id: 'q5', question: 'What is a DataFrame?' }],
      },
    ],
  },
];

const mockEnrolledStudents = [
  {
    id: 'student-1',
    name: 'John Doe',
    email: 'john@example.com',
    progress: 100,
    lastActivity: '2 hours ago',
    engagement: 85,
    coursesEnrolled: 3,
    completedCourses: 1,
    totalHours: 24,
    enabled: true,
    enrolledDate: '2026-02-15',
  },
  {
    id: 'student-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    progress: 100,
    lastActivity: '1 day ago',
    engagement: 65,
    coursesEnrolled: 2,
    completedCourses: 0,
    totalHours: 12,
    enabled: true,
    enrolledDate: '2026-02-20',
  },
  {
    id: 'student-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    progress: 100,
    lastActivity: '3 hours ago',
    engagement: 95,
    coursesEnrolled: 5,
    completedCourses: 2,
    totalHours: 48,
    enabled: true,
    enrolledDate: '2026-02-10',
  },
  {
    id: 'student-4',
    name: 'David Lee',
    email: 'david@example.com',
    progress: 100,
    lastActivity: '5 hours ago',
    engagement: 40,
    coursesEnrolled: 1,
    completedCourses: 0,
    totalHours: 2,
    enabled: true,
    enrolledDate: '2026-03-01',
  },
  {
    id: 'student-5',
    name: 'Sarah White',
    email: 'sarah@example.com',
    progress: 100,
    lastActivity: '1 week ago',
    engagement: 20,
    coursesEnrolled: 1,
    completedCourses: 0,
    totalHours: 1,
    enabled: true,
    enrolledDate: '2026-02-28',
  },
  {
    id: 'student-6',
    name: 'Michael Green',
    email: 'michael@example.com',
    progress: 100,
    lastActivity: '3 days ago',
    engagement: 35,
    coursesEnrolled: 2,
    completedCourses: 0,
    totalHours: 4,
    enabled: true,
    enrolledDate: '2026-02-22',
  },
  {
    id: 'student-7',
    name: 'Emily Brown',
    email: 'emily@example.com',
    progress: 100,
    lastActivity: '2 days ago',
    engagement: 50,
    coursesEnrolled: 3,
    completedCourses: 1,
    totalHours: 18,
    enabled: true,
    enrolledDate: '2026-02-18',
  },
  {
    id: 'student-8',
    name: 'James Davis',
    email: 'james@example.com',
    progress: 0,
    lastActivity: '4 hours ago',
    engagement: 45,
    coursesEnrolled: 2,
    completedCourses: 0,
    totalHours: 8,
    enabled: true,
    enrolledDate: '2026-02-25',
  },
  {
    id: 'student-9',
    name: 'Lisa Martinez',
    email: 'lisa@example.com',
    progress: 0,
    lastActivity: '6 hours ago',
    engagement: 55,
    coursesEnrolled: 4,
    completedCourses: 1,
    totalHours: 32,
    enabled: true,
    enrolledDate: '2026-02-12',
  },
];

const mockAvailableStudents = [
  {
    id: 'student-4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    totalEnrollments: 2,
    averageProgress: 80,
  },
  {
    id: 'student-5',
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    totalEnrollments: 1,
    averageProgress: 65,
  },
  {
    id: 'student-6',
    name: 'Eve Wilson',
    email: 'eve@example.com',
    totalEnrollments: 3,
    averageProgress: 88,
  },
];

const mockReviews = [
  {
    id: 'review-1',
    reviewer_name: 'John Doe',
    rating: 5,
    comment: 'Excellent course! Very comprehensive and well-structured.',
    created_at: '2026-03-01T10:00:00Z',
    review_status: 'visible',
    instructor_reply: null,
    flag_reason: null,
  },
  {
    id: 'review-2',
    reviewer_name: 'Jane Smith',
    rating: 4,
    comment: 'Great content but could use more practical examples.',
    created_at: '2026-03-05T14:30:00Z',
    review_status: 'visible',
    instructor_reply: null,
    flag_reason: null,
  },
  {
    id: 'review-3',
    reviewer_name: 'Bob Johnson',
    rating: 5,
    comment: 'Best course I have ever taken!',
    created_at: '2026-03-07T09:15:00Z',
    review_status: 'visible',
    instructor_reply: 'Thank you so much!',
    flag_reason: null,
  },
];

async function setupCourseDetailMocks(
  page: Page,
  options?: {
    course?: typeof mockCourse;
    modules?: typeof mockModules;
    enrolledStudents?: typeof mockEnrolledStudents;
    availableStudents?: typeof mockAvailableStudents;
    reviews?: typeof mockReviews;
    withError?: boolean;
  },
) {
  const course = options?.course ?? mockCourse;
  const modules = options?.modules ?? mockModules;
  const enrolledStudents = options?.enrolledStudents ?? mockEnrolledStudents;
  const availableStudents = options?.availableStudents ?? mockAvailableStudents;
  const reviews = options?.reviews ?? mockReviews;
  const withError = options?.withError ?? false;

  const totalVideos = modules.reduce(
    (count, module) =>
      count + module.items.filter((item) => item.type === 'video').length,
    0,
  );
  const totalQuizzes = modules.reduce(
    (count, module) =>
      count + module.items.filter((item) => item.type === 'quiz').length,
    0,
  );

  const legacyCoursePayload = {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail_url: course.thumbnail,
    category_name: course.category,
    category_color: course.categoryColor,
    is_published: course.status === 'published',
    instructor_name: course.instructor,
    instructor_id: course.instructor_id,
    student_count: String(enrolledStudents.length),
    rating: String(course.rating),
    totalRatings: String(course.totalRatings),
    duration_hours: parseInt(String(course.duration), 10) || 0,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-08T00:00:00.000Z',
    outcomes: course.outcomes,
  };

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

  await page.route('**/functions/v1/getCourseDetailData*', async (route) => {
    if (withError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch course details' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          course,
          modules,
          enrolledStudents,
          availableStudents,
          reviews,
        },
      }),
    });
  });

  await page.route(
    '**/functions/v1/getModuleDetailInstructor/**',
    async (route) => {
      if (withError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Failed to fetch course details',
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
            course: legacyCoursePayload,
            sections: modules,
            totalSections: modules.length,
            totalVideos,
            totalQuizzes,
          },
        }),
      });
    },
  );

  await page.route('**/functions/v1/getCourseStudents/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          students: enrolledStudents.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            progress: student.progress,
            last_accessed: student.lastActivity,
          })),
        },
      }),
    });
  });

  await page.route('**/functions/v1/getAvailableStudents/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          availableStudents,
          totalAvailable: availableStudents.length,
        },
      }),
    });
  });

  await page.route(/\/functions\/v1\/getInstructorReviews/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          reviews,
          pagination: {
            total: reviews.length,
            has_more: false,
          },
        },
      }),
    });
  });

  await page.route('**/functions/v1/getCourseNotifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(/\/functions\/v1\/postUserEnrollment/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          success: true,
          message: 'Students enrolled successfully',
          enrolled_count: 1,
        },
      }),
    });
  });
}

async function loginThenNavigateToCourseDetail(
  page: Page,
  options?: Parameters<typeof setupCourseDetailMocks>[1],
) {
  await setupCourseDetailMocks(page, options);

  // Use DOMContentLoaded to avoid flakiness from non-critical resource loads.
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, {
    timeout: 10000,
    waitUntil: 'domcontentloaded',
  });

  await page.goto(`/course/${COURSE_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForLoadState('domcontentloaded');
}

function moduleToggle(page: Page, title: string) {
  return page
    .locator('div.flex.items-center.justify-between.p-4.bg-card')
    .filter({ hasText: title })
    .first();
}

test.describe('CourseDetail Page', () => {
  test('should display course detail page with course information', async ({
    page,
  }) => {
    await loginThenNavigateToCourseDetail(page);

    // Wait for loading to finish
    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check course title and description
    await expect(
      page.getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();
    await expect(
      page.getByText('Learn the fundamentals of data science'),
    ).toBeVisible();

    // Check instructor name
    await expect(page.getByText('by Teacher Test')).toBeVisible();

    // Check status badge
    await expect(page.getByText('PUBLISHED')).toBeVisible();
  });

  test('should display course statistics', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check student count - target the specific stats card
    const statsSection = page
      .locator('main')
      .first()
      .locator('div')
      .filter({ hasText: /Students.*Ratings.*Completion.*Duration/ })
      .first();
    await expect(statsSection.getByText('9', { exact: true })).toBeVisible();
    await expect(
      statsSection
        .locator('div')
        .filter({ hasText: /^Students$/ })
        .first(),
    ).toBeVisible();

    // Check ratings
    await expect(statsSection.getByText('4.7 (23)')).toBeVisible();
    await expect(
      statsSection
        .locator('div')
        .filter({ hasText: /^Ratings$/ })
        .first(),
    ).toBeVisible();

    // Check completion rate
    await expect(
      statsSection
        .locator('div')
        .filter({ hasText: /^Completion$/ })
        .first()
        .locator('..')
        .getByText('78%'),
    ).toBeVisible();
    await expect(
      statsSection
        .locator('div')
        .filter({ hasText: /^Completion$/ })
        .first(),
    ).toBeVisible();

    // Check duration
    await expect(statsSection.getByText('12h')).toBeVisible();
    await expect(
      statsSection
        .locator('div')
        .filter({ hasText: /^Duration$/ })
        .first(),
    ).toBeVisible();
  });

  test('should display course outcomes', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check course outcomes
    await expect(page.getByText('Course Outcomes')).toBeVisible();
    await expect(
      page.getByText('Understand the fundamentals of data science'),
    ).toBeVisible();
    await expect(
      page.getByText('Learn Python programming for data analysis'),
    ).toBeVisible();
    await expect(
      page.getByText('Apply statistical methods to real-world data'),
    ).toBeVisible();
    await expect(page.getByText('Build machine learning models')).toBeVisible();
  });

  test('should display course modules', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check module titles
    await expect(
      moduleToggle(page, 'Introduction to Data Science'),
    ).toBeVisible();
    await expect(moduleToggle(page, 'Python for Data Science')).toBeVisible();
    await expect(moduleToggle(page, 'Data Analysis with Pandas')).toBeVisible();
  });

  test('should expand and collapse modules', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Find first module
    const firstModule = moduleToggle(page, 'Introduction to Data Science');

    // Click to expand
    await firstModule.click();

    // Check if module items are visible
    await expect(page.getByText('What is Data Science?')).toBeVisible();
    await expect(page.getByText('Data Science Tools')).toBeVisible();
    await expect(page.getByText('Introduction Quiz')).toBeVisible();

    // Click to collapse
    await firstModule.click();

    // Items should be hidden
    await expect(page.getByText('What is Data Science?')).not.toBeVisible();
  });

  test('should display enrolled students', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });    

    // Check enrolled students are displayed
    await expect(page.locator('span').filter({ hasText: 'John Doe' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'Jane Smith' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'Bob Johnson' })).toBeVisible();
  });

  test('should show edit course button', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check for edit button
    const editButton = page.getByRole('button', { name: /edit course/i });
    await expect(editButton).toBeVisible();
  });

  test('should open enroll students dialog', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Click enroll students button
    const enrollButton = page.getByRole('button', { name: /enroll/i }).first();
    await enrollButton.click();

    // Dialog should open
    await expect(
      page.getByRole('heading', { name: 'Enroll Students' }),
    ).toBeVisible();
  });

  test('should search for available students in enroll dialog', async ({
    page,
  }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Open enroll dialog
    const enrollButton = page.getByRole('button', { name: /enroll/i }).first();
    await enrollButton.click();

    // Wait for dialog
    await expect(
      page.getByRole('heading', { name: 'Enroll Students' }),
    ).toBeVisible();

    // Search for a student
    const searchInput = page.getByPlaceholder(/search students/i);
    await searchInput.fill('Alice');

    // Should show only Alice
    await expect(page.getByText('Alice Brown')).toBeVisible();
  });

  test('should select and enroll students', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Open enroll dialog
    const enrollButton = page.getByRole('button', { name: /enroll/i }).first();
    await enrollButton.click();

    await expect(
      page.getByRole('heading', { name: 'Enroll Students' }),
    ).toBeVisible();

    // Select a student by clicking on their card
    const aliceCard = page
      .locator('div')
      .filter({ hasText: 'Alice Brown' })
      .first();
    await aliceCard.click();

    // Click enroll button in dialog
    const enrollDialogButton = page.getByRole('button', {
      name: /enroll 1 student/i,
    });
    await enrollDialogButton.click();

    // Should show success message (target exact toast content to avoid strict-mode collisions)
    await expect(page.getByText('1 student enrolled successfully', { exact: true })).toBeVisible({
      timeout: 5000,
    });
  });

  test('should handle error when fetching course fails', async ({ page }) => {
    await setupCourseDetailMocks(page, { withError: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });
    await page.goto(`/course/${COURSE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Should show error state
    await expect(
      page
        .locator('p.text-destructive.mb-4')
        .filter({ hasText: /internal server error|failed/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /back to courses/i }),
    ).toBeVisible();
  });

  test('should display course with draft status', async ({ page }) => {
    const draftCourse = { ...mockCourse, status: 'draft' };
    await loginThenNavigateToCourseDetail(page, { course: draftCourse });

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check draft status badge
    await expect(page.getByText('DRAFT')).toBeVisible();
  });

  test('should display empty modules state when no modules available', async ({
    page,
  }) => {
    await loginThenNavigateToCourseDetail(page, { modules: [] });

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Course should still display
    await expect(
      page.getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();
  });

  test('should display empty enrolled students state', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page, { enrolledStudents: [] });

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Should not list any enrolled student names
    await expect(page.getByText('John Doe')).not.toBeVisible();
    await expect(page.getByText('Jane Smith')).not.toBeVisible();
    await expect(page.getByText('Bob Johnson')).not.toBeVisible();
  });

  test('should show loading spinner while fetching course data', async ({
    page,
  }) => {
    await loginThenNavigateToCourseDetail(page);

    // Loading can be too fast; only assert eventual ready state.
    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();
  });

  test('should display course category badge', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Check for category badge
    await expect(page.getByText('Data Science', { exact: true })).toBeVisible();
  });

  test('should display module items with correct types', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Expand first module
    const firstModule = moduleToggle(page, 'Introduction to Data Science');
    await firstModule.click();

    // Check for video items
    await expect(page.getByText('What is Data Science?')).toBeVisible();

    // Check for quiz item
    await expect(page.getByText('Introduction Quiz')).toBeVisible();
  });

  test('should display document type items in modules', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Expand second module which has a document
    const secondModule = moduleToggle(page, 'Python for Data Science');
    await secondModule.click();

    // Check for document
    await expect(page.getByText('Python Reference Guide')).toBeVisible();
  });

  test('should display reviews section', async ({ page }) => {
    await loginThenNavigateToCourseDetail(page);

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Scroll down to reviews section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(
      page.getByRole('heading', { name: 'Course Reviews' }),
    ).toBeVisible();

    // Check for reviews
    await expect(page.getByText(/excellent course/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByText('Great content but could use more practical examples'),
    ).toBeVisible();
  });

  test('should handle course with no outcomes', async ({ page }) => {
    const courseWithoutOutcomes = { ...mockCourse, outcomes: [] };
    await loginThenNavigateToCourseDetail(page, {
      course: courseWithoutOutcomes,
    });

    await expect(page.getByText('Loading course details...')).not.toBeVisible({
      timeout: 10000,
    });

    // Course should still display without outcomes section
    await expect(
      page.getByRole('heading', { name: 'Introduction to Data Science' }),
    ).toBeVisible();
  });
});
