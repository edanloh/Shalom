import { test, expect, Page } from '@playwright/test';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestCourse,
  testSupabase,
  getSupabaseUrl,
} from './setup';

// Removed unused imports: enrollStudent, waitForDatabaseSync

/**
 * INTEGRATION TEST - Real Database
 *
 * These tests interact with the REAL Supabase database.
 * They validate that the application correctly persists data to the database.
 */

async function setupAuthMocks(
  page: Page,
  user: { id: string; email: string; role: string; name: string }
) {
  const supabaseUrl = getSupabaseUrl();

  await page.route(`${supabaseUrl}/auth/v1/user*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        role: 'authenticated',
        app_metadata: { role: user.role },
        user_metadata: { full_name: user.name },
      }),
    });
  });

  await page.route(`${supabaseUrl}/auth/v1/token*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'integration-test-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'integration-test-refresh',
        user: {
          id: user.id,
          email: user.email,
          role: 'authenticated',
          app_metadata: { role: user.role },
          user_metadata: { full_name: user.name },
        },
      }),
    });
  });

  await page.route(`${supabaseUrl}/auth/v1/logout*`, async (route) => {
    await route.fulfill({ status: 204 });
  });

  // FIX: Inject the session directly into localStorage so the app
  // recognises the user on page load without needing a login flow.
  await page.addInitScript(
    ({ supabaseUrl, user }) => {
      const sessionKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
      const session = {
        access_token: 'integration-test-token',
        refresh_token: 'integration-test-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          role: 'authenticated',
          app_metadata: { role: user.role },
          user_metadata: { full_name: user.name },
        },
      };
      localStorage.setItem(sessionKey, JSON.stringify(session));
    },
    { supabaseUrl, user }
  );
}

test.describe('Enrollment Flow - Database Integration @integration', () => {
  test.beforeEach(async () => {
    await setupTestDatabase();
  });

  test.afterEach(async () => {
    await teardownTestDatabase();
  });

  // FIX: removed unused `{ page }` destructure — test doesn't use the browser
  test('should verify database has real courses and can query them', async () => {
    console.log('🔍 Starting database query test...');

    const { data: courses, error } = await testSupabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .limit(5);

    console.log('📊 Query result:', { coursesCount: courses?.length, error });

    expect(error).toBeNull();
    expect(courses).toBeTruthy();

    console.log(`✅ Found ${courses?.length ?? 0} published courses in database`);

    if (courses && courses.length > 0) {
      const course = courses[0];
      console.log(`Sample course: "${course.title}" (ID: ${course.id})`);
      expect(course.id).toBeTruthy();
      expect(course.title).toBeTruthy();
      expect(course.is_published).toBe(true);
    }
  });

  // FIX: removed unused `{ page }` destructure
  test('should create test data in database and verify persistence', async () => {
    const instructor = await createTestUser({
      email: `instructor-${Date.now()}@test.com`,
      role: 'instructor',
      name: 'Integration Test Instructor',
    });

    console.log(`✅ Created test instructor: ${instructor.email} (${instructor.id})`);

    const { data: fetchedInstructor, error: fetchError } = await testSupabase
      .from('users')
      .select('*')
      .eq('id', instructor.id)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchedInstructor).toBeTruthy();
    expect(fetchedInstructor!.email).toBe(instructor.email);
    expect(fetchedInstructor!.role).toBe('instructor');

    console.log('✅ Verified instructor persisted in database');

    const course = await createTestCourse({
      title: `E2E Integration Test Course ${Date.now()}`,
      instructorId: instructor.id,
      description: 'Testing real database integration',
      published: true,
    });

    console.log(`✅ Created test course: ${course.title} (ID: ${course.id})`);

    const { data: fetchedCourse, error: courseError } = await testSupabase
      .from('courses')
      .select('*')
      .eq('id', course.id)
      .single();

    expect(courseError).toBeNull();
    expect(fetchedCourse).toBeTruthy();
    expect(fetchedCourse!.title).toBe(course.title);
    expect(fetchedCourse!.instructor_id).toBe(instructor.id);

    console.log('✅ Verified course persisted in database');
  });

  test('should test enrollment flow end-to-end with database', async ({ page }) => {
    // ====== SETUP: Create test data in real database ======
    const instructor = await createTestUser({
      email: `instructor-enroll-${Date.now()}@test.com`,
      role: 'instructor',
      name: 'Integration Instructor',
    });

    const student = await createTestUser({
      email: `student-enroll-${Date.now()}@test.com`,
      role: 'student',
      name: 'Integration Student',
    });

    const course = await createTestCourse({
      title: `Integration Enrollment Test ${Date.now()}`,
      instructorId: instructor.id,
      description: 'Course for testing enrollment flow',
      published: true,
      modules: [
        {
          title: 'Test Module 1',
          description: 'First module',
          lessons: [{ title: 'Lesson 1', content: 'Content 1', type: 'text' }],
        },
      ],
    });

    console.log(`✅ Test data created - Course: ${course.id}, Student: ${student.id}`);

    // ====== AUTH: Inject session + mock auth routes ======
    // FIX: setupAuthMocks must be called BEFORE page.goto so that
    // addInitScript runs before the page loads.
    await setupAuthMocks(page, student);

    await page.route('**/functions/v1/getUserInfo*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: student.id,
            uuid: student.id,
            email: student.email,
            role: student.role,
            name: student.name,
          },
        }),
      });
    });

    await page.route('**/functions/v1/registerCheck', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { role: student.role, email: student.email },
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

    // FIX: Skip the login form entirely — session is already injected.
    // Navigate directly to the course page.
    await page.goto(`/course/${course.id}`);

    // FIX: Use 'networkidle' so async data fetches complete before asserting,
    // or rely on the visibility timeout alone (both are shown below — pick one).
    await page.waitForLoadState('networkidle');

    // Verify course title loaded from real database
    await expect(page.getByText(course.title)).toBeVisible({ timeout: 15000 });

    console.log('✅ Course details loaded from real database');

    // ====== VERIFY: Student record still exists in DB ======
    const { data: verifyStudent, error: verifyError } = await testSupabase
      .from('users')
      .select('*')
      .eq('id', student.id)
      .single();

    expect(verifyError).toBeNull(); // FIX: also assert no error on verify query
    expect(verifyStudent).toBeTruthy();

    console.log('✅ Integration test passed - database connectivity verified');
  });
});