import { test, expect, Page } from '@playwright/test';
import { setupAllWorkflowMocks, createMockCourse } from './mocks';

/**
 * INSTRUCTOR-SIDE STUDENT MONITORING WORKFLOW TEST
 *
 * NOTE: Students use the MOBILE app — not the web application.
 * The web app is for instructors and admins only.
 *
 * These tests validate the instructor's ability to monitor and manage
 * student activity via the web interface:
 *   Login → View Students → View Analytics → Access Course Builder
 */

const MOCK_COURSES = [
  createMockCourse({
    id: 'course-1',
    title: 'Introduction to Programming',
    is_published: true,
    student_count: '15',
  }),
  createMockCourse({
    id: 'course-2',
    title: 'Advanced JavaScript',
    is_published: true,
    student_count: '8',
  }),
];

async function loginAsInstructor(page: Page) {
  await setupAllWorkflowMocks(page, 'instructor', { courses: MOCK_COURSES });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill('instructor@test.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 15000 });
}

test.describe('Instructor Student Monitoring Journey - Complete Workflow @integration', () => {
  test('should complete instructor monitoring flow across students, courses, and analytics', async ({ page }) => {
    await loginAsInstructor(page);
    await expect(page).toHaveURL('/');

    await page.goto('/students');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Student Management' })
    ).toBeVisible({ timeout: 5000 });

    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: /Course Management/i })
    ).toBeVisible({ timeout: 5000 });

    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Analytics Dashboard' })
    ).toBeVisible({ timeout: 5000 });

    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('should open course builder and review module structure', async ({ page }) => {
    await loginAsInstructor(page);

    await page.goto('/course-builder/course-1');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Module|Lesson|Course/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should access Quiz center for quiz management', async ({ page }) => {
    await loginAsInstructor(page);

    await page.goto('/quiz');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Quiz Center' })
    ).toBeVisible({ timeout: 5000 });
  });
});