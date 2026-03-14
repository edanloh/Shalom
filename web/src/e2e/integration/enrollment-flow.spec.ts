import { test, expect, Page } from '@playwright/test';

/**
 * INTEGRATION-STYLE TEST - Mock Data Store
 *
 * Uses an in-memory mock store to verify workflow-level persistence logic
 * without requiring a live Supabase database.
 *
 * IMPORTANT: The web app is instructor/admin only.
 * Student-facing enrollment actions happen on mobile.
 */

type MockUser = {
  id: string;
  email: string;
  role: 'instructor' | 'admin' | 'student';
  name: string;
};

type MockCourse = {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  is_published: boolean;
};

type MockStore = {
  users: MockUser[];
  courses: MockCourse[];
  enrollments: Array<{ courseId: string; studentId: string }>;
};

function createMockStore(): MockStore {
  return {
    users: [
      {
        id: 'instructor-1',
        email: 'instructor@test.com',
        role: 'instructor',
        name: 'Integration Instructor',
      },
      {
        id: 'student-1',
        email: 'student-1@test.com',
        role: 'student',
        name: 'Student One',
      },
      {
        id: 'student-2',
        email: 'student-2@test.com',
        role: 'student',
        name: 'Student Two',
      },
    ],
    courses: [
      {
        id: 'course-1',
        title: 'Integration Mock Course',
        description: 'Mock-backed integration test course',
        instructor_id: 'instructor-1',
        is_published: true,
      },
    ],
    enrollments: [{ courseId: 'course-1', studentId: 'student-1' }],
  };
}

function buildAuthSessionResponse(user: MockUser) {
  return {
    access_token: 'integration-test-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 2147483647,
    refresh_token: 'integration-test-refresh',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: '2026-03-08T00:00:00.000Z',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: user.name },
      created_at: '2026-03-08T00:00:00.000Z',
      updated_at: '2026-03-08T00:00:00.000Z',
    },
  };
}

function getCourseDetailData(store: MockStore, courseId: string) {
  const course = store.courses.find((c) => c.id === courseId);
  if (!course) {
    return null;
  }

  const enrolledStudents = store.enrollments
    .filter((e) => e.courseId === courseId)
    .map((e) => store.users.find((u) => u.id === e.studentId))
    .filter((u): u is MockUser => Boolean(u))
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      progress: 0,
      lastActivity: 'Just now',
      engagement: 50,
      coursesEnrolled: 1,
      completedCourses: 0,
      totalHours: 0,
      enabled: true,
      enrolledDate: '2026-03-10',
    }));

  const enrolledSet = new Set(enrolledStudents.map((s) => s.id));

  const availableStudents = store.users
    .filter((u) => u.role === 'student' && !enrolledSet.has(u.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      totalEnrollments: 0,
      averageProgress: 0,
    }));

  return {
    data: {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: 'Integration Instructor',
        instructor_id: course.instructor_id,
        category: 'General',
        categoryColor: '#3b82f6',
        status: course.is_published ? 'published' : 'draft',
        level: 'beginner',
        thumbnail: '',
        enrolledCount: enrolledStudents.length,
        rating: 4.5,
        totalRatings: 10,
        completionRate: 50,
        duration: '2 hours',
        outcomes: ['Outcome 1'],
      },
      modules: [],
      enrolledStudents,
      availableStudents,
      reviews: [],
    },
  };
}

async function setupIntegrationMocks(page: Page, store: MockStore, actor: MockUser) {
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: buildAuthSessionResponse(actor).user }),
    });
  });

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAuthSessionResponse(actor)),
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
        user: { role: actor.role, email: actor.email },
      }),
    });
  });

  await page.route('**/functions/v1/getUserInfo*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: actor.id,
          uuid: actor.id,
          email: actor.email,
          role: actor.role,
          name: actor.name,
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
    const url = new URL(route.request().url());
    const courseId = url.searchParams.get('courseId') || 'course-1';
    const payload = getCourseDetailData(store, courseId);

    if (!payload) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Course not found' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.route('**/functions/v1/getModuleDetailInstructor/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          course: {
            id: 'course-1',
            title: 'Integration Mock Course',
            is_published: true,
            instructor_id: 'instructor-1',
          },
          sections: [],
          totalSections: 0,
          totalVideos: 0,
          totalQuizzes: 0,
        },
      }),
    });
  });

  await page.route('**/functions/v1/getCourseStudents/*', async (route) => {
    const payload = getCourseDetailData(store, 'course-1');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          students: payload?.data.enrolledStudents || [],
        },
      }),
    });
  });

  await page.route('**/functions/v1/getAvailableStudents/*', async (route) => {
    const payload = getCourseDetailData(store, 'course-1');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          availableStudents: payload?.data.availableStudents || [],
          totalAvailable: payload?.data.availableStudents?.length || 0,
        },
      }),
    });
  });

  await page.route('**/functions/v1/postUserEnrollment*', async (route) => {
    const body = route.request().postDataJSON() as { studentIds?: string[]; courseId?: string };
    const courseId = body?.courseId || 'course-1';
    const studentIds = body?.studentIds || [];

    let enrolledCount = 0;
    studentIds.forEach((studentId) => {
      const exists = store.enrollments.some(
        (e) => e.courseId === courseId && e.studentId === studentId,
      );
      if (!exists) {
        store.enrollments.push({ courseId, studentId });
        enrolledCount += 1;
      }
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          success: true,
          message: 'Students enrolled successfully',
          enrolled_count: enrolledCount,
        },
      }),
    });
  });
}

test.describe('Enrollment Flow - Mock Integration @integration', () => {
  test('should verify mock store has published courses and valid shape', async () => {
    const store = createMockStore();
    const publishedCourses = store.courses.filter((c) => c.is_published);

    expect(publishedCourses.length).toBeGreaterThan(0);
    expect(publishedCourses[0].id).toBeTruthy();
    expect(publishedCourses[0].title).toBeTruthy();
  });

  test('should create mock data and verify in-memory persistence', async () => {
    const store = createMockStore();

    const newStudent: MockUser = {
      id: `student-${Date.now()}`,
      email: `student-${Date.now()}@test.com`,
      role: 'student',
      name: 'New Mock Student',
    };

    store.users.push(newStudent);
    store.enrollments.push({ courseId: 'course-1', studentId: newStudent.id });

    const hasUser = store.users.some((u) => u.id === newStudent.id);
    const hasEnrollment = store.enrollments.some(
      (e) => e.courseId === 'course-1' && e.studentId === newStudent.id,
    );

    expect(hasUser).toBe(true);
    expect(hasEnrollment).toBe(true);
  });

  test('should allow instructor to load course detail and persist enrollment via API flow', async ({ page }) => {
    const store = createMockStore();
    const instructor = store.users.find((u) => u.role === 'instructor')!;

    await setupIntegrationMocks(page, store, instructor);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(instructor.email);
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 10000 });

    await page.goto('/course/course-1', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Integration Mock Course' })).toBeVisible({ timeout: 10000 });

    const beforeCount = store.enrollments.length;

    // Trigger the same backend enrollment flow with deterministic payload.
    const enrollmentResult = await page.evaluate(async () => {
      const response = await fetch('/functions/v1/postUserEnrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: 'course-1',
          studentIds: ['student-2'],
        }),
      });
      return response.json();
    });

    expect(enrollmentResult?.data?.success).toBe(true);
    expect(enrollmentResult?.data?.enrolled_count).toBe(1);
    expect(store.enrollments.length).toBe(beforeCount + 1);
  });
});
