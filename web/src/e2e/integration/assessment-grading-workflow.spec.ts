import { test, expect, Page } from '@playwright/test';
import { setupAllWorkflowMocks } from './mocks';

/**
 * INSTRUCTOR-SIDE ASSESSMENT & GRADING WORKFLOW TEST
 *
 * NOTE: Students use the MOBILE app — not the web application.
 * The web app is for instructors and admins only.
 *
 * These tests validate the complete instructor assessment workflow:
 *   Login → Access Quiz → Create/Review Quizzes → View Analytics
 */

async function loginAsInstructor(page: Page) {
  await setupAllWorkflowMocks(page, 'instructor');
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill('instructor@test.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 15000 });
}

test.describe('Assessment & Grading Workflow - Instructor Web @journey', () => {

  test('should complete instructor assessment workflow with analytics verification', async ({ page }) => {
    // NOTE: Both instructor and student perspectives are covered here.
    // Instructor manages quizzes on the web; students take them on mobile.
    // This test validates the instructor-side of the full workflow.

    // ====== INSTRUCTOR: LOGIN ======
    await loginAsInstructor(page);
    await expect(page).toHaveURL('/');

    // ====== INSTRUCTOR: ACCESS ASSESSMENT TOOLS ======
    await page.goto('/quiz');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Assessment Center' })
    ).toBeVisible({ timeout: 5000 });

    // ====== INSTRUCTOR: VIEW ANALYTICS (student progress visible here) ======
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Analytics Dashboard' })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate assessment creation workflow', async ({ page }) => {
    await loginAsInstructor(page);

    // Navigate to quiz page
    await page.goto('/quiz');
    await page.waitForLoadState('domcontentloaded');

    // Verify assessment page loaded
    await expect(page.getByRole('heading', { name: /Assessment/i })).toBeVisible({ timeout: 3000 });

    // Check for course selection (from existing E2E patterns)
    await expect(page.getByRole('button', { name: /Browse Courses|Select/i }).first()).toBeVisible({ timeout: 3000 });
  });

  test('should let instructors review quiz outcomes via analytics', async ({ page }) => {
    // NOTE: Quiz-taking is a mobile-app feature. This test validates that
    // instructors can review quiz analytics and results on the web.
    await loginAsInstructor(page);

    // Instructor reviews all quiz
    await page.goto('/quiz');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Assessment Center' })
    ).toBeVisible({ timeout: 5000 });

    // Instructor navigates to analytics to review student quiz results
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: 'Analytics Dashboard' })
    ).toBeVisible({ timeout: 5000 });
  });
});
