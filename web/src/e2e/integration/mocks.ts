import { Page } from '@playwright/test';

/**
 * Shared Mock Setup for Journey/Workflow Tests
 * 
 * This file provides API mocking for end-to-end workflow tests.
 * It uses Playwright's route interception to mock Supabase function calls.
 */

// Test user IDs
export const INSTRUCTOR_ID = 'test-instructor-uuid';
export const INSTRUCTOR_AUTH_ID = '11111111-1111-1111-1111-111111111111';
export const STUDENT_ID = 'test-student-uuid';
export const STUDENT_AUTH_ID = '22222222-2222-2222-2222-222222222222';

// Mock data generators
export function buildAuthSessionResponse(email: string, role: 'instructor' | 'student' = 'instructor') {
  const isInstructor = role === 'instructor';
  return {
    access_token: `test-${role}-token`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 2147483647,
    refresh_token: `test-${role}-refresh`,
    user: {
      id: isInstructor ? INSTRUCTOR_AUTH_ID : STUDENT_AUTH_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: '2026-03-08T00:00:00.000Z',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: isInstructor ? 'Test Instructor' : 'Test Student' },
      created_at: '2026-03-08T00:00:00.000Z',
      updated_at: '2026-03-08T00:00:00.000Z',
    },
  };
}

export function createMockCourse(overrides: any = {}) {
  return {
    id: overrides.id || 'test-course-1',
    title: overrides.title || 'Test Course',
    description: overrides.description || 'Test course description',
    thumbnail_url: overrides.thumbnail_url || null,
    category_name: overrides.category_name || 'Programming',
    category_color: overrides.category_color || '#10b981',
    is_published: overrides.is_published ?? false,
    instructor_name: overrides.instructor_name || 'Test Instructor',
    instructor_id: overrides.instructor_id || INSTRUCTOR_ID,
    student_count: overrides.student_count || '0',
    rating: overrides.rating || '4.5',
    totalRatings: overrides.totalRatings || '10',
    duration_hours: overrides.duration_hours || 5,
    created_at: overrides.created_at || '2026-03-01T00:00:00.000Z',
    updated_at: overrides.updated_at || '2026-03-08T00:00:00.000Z',
    outcomes: overrides.outcomes || [],
  };
}

export function createMockModule(overrides: any = {}) {
  return {
    id: overrides.id || 'test-module-1',
    title: overrides.title || 'Test Module',
    description: overrides.description || '',
    order_index: overrides.order_index ?? 0,
    items: overrides.items || [],
  };
}

export function createMockLesson(overrides: any = {}) {
  return {
    id: overrides.id || 'test-lesson-1',
    type: overrides.type || 'video',
    title: overrides.title || 'Test Lesson',
    video_url: overrides.video_url || 'https://www.youtube.com/watch?v=test123',
    duration_seconds: overrides.duration_seconds || 600,
    is_preview: overrides.is_preview ?? false,
    order_index: overrides.order_index ?? 0,
  };
}

export function createMockQuiz(overrides: any = {}) {
  return {
    id: overrides.id || 'test-quiz-1',
    type: 'quiz',
    title: overrides.title || 'Test Quiz',
    order_index: overrides.order_index ?? 0,
    passing_score: overrides.passing_score ?? 70,
    time_limit_minutes: overrides.time_limit_minutes || null,
    questions: overrides.questions || [],
  };
}

/**
 * Setup base authentication mocks for a user session
 */
export async function setupAuthMocks(
  page: Page,
  email: string,
  role: 'instructor' | 'student' = 'instructor'
) {
  const authSession = buildAuthSessionResponse(email, role);
  const userId = role === 'instructor' ? INSTRUCTOR_ID : STUDENT_ID;
  
  await page.route('**/auth/v1/user*', async (route) => {
    const authHeader = route.request().headers()['authorization'] || '';
    if (authHeader.includes('test-')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: authSession.user }),
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
      body: JSON.stringify(authSession),
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
        user: { role, email },
      }),
    });
  });

  await page.route('**/functions/v1/getUserInfo*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: authSession.user.id,
          uuid: userId,
          email,
          role,
          name: authSession.user.user_metadata.full_name,
          avatar_url: `${email}_avatar0.png`,
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
}

/**
 * Setup instructor-specific course management mocks
 */
export async function setupInstructorCourseMocks(page: Page, courses: any[] = []) {
  const mockCategories = [
    { id: 'cat-1', name: 'Programming', color: '#10b981' },
    { id: 'cat-2', name: 'Data Science', color: '#3b82f6' },
    { id: 'cat-3', name: 'Design', color: '#f59e0b' },
  ];

  // In-memory storage for created courses
  const createdCourses = new Map<string, any>();
  let nextCourseId = 1;

  await page.route('**/functions/v1/getAllCourse*', async (route) => {
    const allCourses = [...courses, ...Array.from(createdCourses.values())];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: allCourses }),
    });
  });

  await page.route('**/functions/v1/getAllPublishedCourse*', async (route) => {
    const allCourses = [...courses, ...Array.from(createdCourses.values())];
    const publishedCourses = allCourses.filter(c => c.is_published);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: publishedCourses }),
    });
  });

  await page.route('**/functions/v1/categoryHandler*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockCategories }),
    });
  });

  await page.route('**/functions/v1/createCourse*', async (route) => {
    const newCourseId = `course-${nextCourseId++}`;
    const newCourse = createMockCourse({ id: newCourseId });
    createdCourses.set(newCourseId, newCourse);
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: newCourseId } }),
    });
  });

  await page.route('**/functions/v1/updateCourse/**', async (route) => {
    const url = route.request().url();
    const courseId = url.split('/').pop()?.split('?')[0];
    
    if (courseId && createdCourses.has(courseId)) {
      const course = createdCourses.get(courseId);
      // Update course data from request body if needed
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, courseId }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, courseId: courseId || 'unknown' }),
      });
    }
  });

  await page.route('**/functions/v1/getModuleDetailInstructor/**', async (route) => {
    const url = route.request().url();
    const courseId = url.match(/getModuleDetailInstructor\/([^?]+)/)?.[1];
    
    // Return empty course structure that can be built
    const course = createdCourses.get(courseId || '') || createMockCourse({ id: courseId });
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          course,
          sections: [],
          totalSections: 0,
          totalVideos: 0,
          totalQuizzes: 0,
        },
      }),
    });
  });

  await page.route('**/functions/v1/getCourseStudents/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { students: [] } }),
    });
  });

  await page.route('**/functions/v1/getInstructorStats*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalCourses: createdCourses.size + courses.length,
          totalStudents: 0,
          totalRevenue: 0,
          publishedCourses: 0,
        },
      }),
    });
  });

  await page.route('**/functions/v1/getInstructorAnalytics*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          enrollmentTrends: [],
          topCourses: [],
          studentEngagement: { total: 0, active: 0, completed: 0 },
        },
      }),
    });
  });
}

/**
 * Setup student-specific enrollment and progress mocks
 */
export async function setupStudentCourseMocks(page: Page, enrolledCourses: any[] = []) {
  const enrollments = new Map<string, any>();
  const progress = new Map<string, any>();

  // Mock the published courses list - this is critical for the student dashboard
  await page.route('**/functions/v1/getAllPublishedCourse*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: enrolledCourses.length > 0 ? enrolledCourses : [] }),
    });
  });

  // Mock all courses (for admin/management views)
  await page.route('**/functions/v1/getAllCourse*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: enrolledCourses }),
    });
  });

  await page.route('**/functions/v1/getUserEnrollment*', async (route) => {
    const userEnrollments = Array.from(enrollments.values());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: userEnrollments }),
    });
  });

  await page.route('**/functions/v1/postUserEnrollment*', async (route) => {
    const body = await route.request().postDataJSON();
    const enrollment = {
      course_id: body.course_id,
      user_id: STUDENT_ID,
      enrolled_at: new Date().toISOString(),
      progress: 0,
      last_accessed: new Date().toISOString(),
    };
    enrollments.set(body.course_id, enrollment);
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: enrollment }),
    });
  });

  await page.route('**/functions/v1/getLessonDetail/**', async (route) => {
    const url = route.request().url();
    const lessonId = url.match(/getLessonDetail\/([^?]+)/)?.[1];
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          lesson: createMockLesson({ id: lessonId }),
          courseId: 'test-course-1',
          moduleId: 'test-module-1',
        },
      }),
    });
  });

  await page.route('**/functions/v1/updateVideoProgress*', async (route) => {
    const body = await route.request().postDataJSON();
    progress.set(body.video_id, { ...body, updated_at: new Date().toISOString() });
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/functions/v1/getQuizDetail/**', async (route) => {
    const url = route.request().url();
    const quizId = url.match(/getQuizDetail\/([^?]+)/)?.[1];
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          quiz: createMockQuiz({ id: quizId }),
          previousScore: null,
          attemptsLeft: 3,
        },
      }),
    });
  });

  await page.route('**/functions/v1/submitQuiz*', async (route) => {
    const body = await route.request().postDataJSON();
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          score: 85,
          passed: true,
          totalQuestions: body.answers?.length || 5,
          correctAnswers: Math.floor((body.answers?.length || 5) * 0.85),
        },
      }),
    });
  });

  await page.route('**/functions/v1/getCertificates*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/functions/v1/completeCourse*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        certificate: {
          id: 'cert-1',
          course_id: 'test-course-1',
          issued_at: new Date().toISOString(),
        },
      }),
    });
  });
}

/**
 * Comprehensive setup for all workflow tests
 */
export async function setupAllWorkflowMocks(
  page: Page,
  role: 'instructor' | 'student' = 'instructor',
  options: {
    courses?: any[];
  } = {}
) {
  const email = role === 'instructor' ? 'instructor@test.com' : 'student@test.com';
  
  await setupAuthMocks(page, email, role);
  
  if (role === 'instructor') {
    await setupInstructorCourseMocks(page, options.courses);
  } else {
    await setupStudentCourseMocks(page, options.courses);
  }
  
  // Common mocks for instructor analytics
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

  // Additional student-specific endpoints
  if (role === 'student') {
    await page.route('**/functions/v1/getGoals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/functions/v1/getAchievements*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/functions/v1/getCredits*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { balance: 1000 } }),
      });
    });

    await page.route('**/functions/v1/getCreditHistory*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
  }
}
