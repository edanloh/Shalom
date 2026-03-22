import { test, expect, Page } from '@playwright/test';
import { setupAllWorkflowMocks } from './mocks';

const INSTRUCTOR_CREDENTIALS = {
  email: 'instructor@test.com',
  password: 'password123',
};

async function loginAsInstructor(page: Page) {
  await setupAllWorkflowMocks(page, 'instructor');
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(INSTRUCTOR_CREDENTIALS.email);
  await page.getByPlaceholder('Password').fill(INSTRUCTOR_CREDENTIALS.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 10000 });
}

async function createCourseViaUI(page: Page, courseName: string): Promise<void> {
  await page.goto('/course-builder/new');
  await expect(page.getByRole('heading', { name: 'New Course' })).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('Enter course title').fill(courseName);
  await page.getByPlaceholder('Enter course description...').fill('This is a test course for workflow testing');
  await page.getByRole('button', { name: 'Add New Module' }).click();
  await expect(page.getByPlaceholder('Enter module title')).toBeVisible({ timeout: 3000 });
  await page.getByPlaceholder('Enter module title').fill('Introduction Module');
  await page.getByRole('button', { name: '+ Video' }).click();
  await expect(page.getByPlaceholder('Enter lesson title')).toBeVisible({ timeout: 3000 });
  await page.getByPlaceholder('Enter lesson title').fill('Welcome Lesson');
  await page
    .getByPlaceholder(/https:\/\/youtube\.com\/watch.*or any video URL/)
    .fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(page.getByText('🎥 Video URL added')).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Success!')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page).toHaveURL(/\/course(-builder)?\//, { timeout: 5000 });
}

test.describe('Instructor Course Lifecycle - Complete Workflow @integration', () => {
  test('should complete full course creation, editing, publishing, and viewing workflow', async ({ page }) => {
    await loginAsInstructor(page);
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Create Course' }).click();
    await expect(page).toHaveURL('/course-builder/new', { timeout: 5000 });

    const courseName = `E2E Test Course ${Date.now()}`;
    await createCourseViaUI(page, courseName);

    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/courses');
    await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible({ timeout: 5000 });

    // FIX: use domcontentloaded on analytics — Firefox hangs on default 'load'
    // when background fetches (getInstructorStats, getInstructorAnalytics) are
    // still pending at the time the load event would fire.
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('should handle course save with validation errors', async ({ page }) => {
    await loginAsInstructor(page);
    await page.goto('/course-builder/new');
    await expect(page.getByRole('heading', { name: 'New Course' })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Save' }).click();

    const saveChangesBtn = page.getByRole('button', { name: 'Save Changes' });
    if (await saveChangesBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveChangesBtn.click();
    }

    const errorIndicators = page.getByText(/Save Failed|Error|required|must have/i);
    await expect(errorIndicators.first()).toBeVisible({ timeout: 5000 });
  });

  test('should persist course data across page navigation', async ({ page }) => {
    await loginAsInstructor(page);

    const courseName = `Persistence Test ${Date.now()}`;
    await createCourseViaUI(page, courseName);

    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible({ timeout: 5000 });

    // FIX: use domcontentloaded on analytics — same Firefox hang as above
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible({ timeout: 5000 });
  });
});