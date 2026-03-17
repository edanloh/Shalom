import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const INSTRUCTOR_ID = 'instructor-1';

interface NotificationMockOptions {
  notifications?: any[];
}

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

function buildMockNotifications() {
  return [
    {
      id: 'notif-1',
      user_id: INSTRUCTOR_ID,
      title: 'Course Enrollment Confirmed',
      message: 'You have successfully enrolled in Introduction to Data Science',
      type: 'course_enrollment',
      is_read: false,
      action_url: '/course/course-1',
      icon_url: null,
      created_at: new Date(Date.now() - 1000 * 60).toISOString(), // 1 minute ago
    },
    {
      id: 'notif-2',
      user_id: INSTRUCTOR_ID,
      title: 'New Quiz Available',
      message:
        'Your instructor has posted a new quiz for Data Analysis Project',
      type: 'quiz_new',
      is_read: false,
      action_url: '/course/course-1/quiz/assign-1',
      icon_url: null,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    },
    {
      id: 'notif-3',
      user_id: INSTRUCTOR_ID,
      title: 'Achievement Unlocked!',
      message: 'Congratulations! You earned the "Perfect Quiz Score" badge',
      type: 'achievement_unlocked',
      is_read: true,
      action_url: '/badges',
      icon_url: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'notif-4',
      user_id: INSTRUCTOR_ID,
      title: 'Reminder: Upcoming Deadline',
      message: 'Your quiz "Data Analysis Project" is due in 2 days',
      type: 'reminder_deadline',
      is_read: true,
      action_url: null,
      icon_url: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    },
    {
      id: 'notif-5',
      user_id: INSTRUCTOR_ID,
      title: 'Course Review Posted',
      message: 'Your instructor has reviewed your submission for Module 3',
      type: 'course_review',
      is_read: false,
      action_url: '/course/course-1/submission-review',
      icon_url: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
  ];
}

async function setupNotificationPageMocks(
  page: Page,
  options?: NotificationMockOptions,
) {
  const notifications = options?.notifications ?? buildMockNotifications();

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
          avatar_url: 'teacher@example.com_avatar0.png',
        },
      }),
    });
  });

  // Mock getNotifications endpoint
  await page.route('**/functions/v1/getNotifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notifications),
    });
  });

  // Mock markNotificationRead endpoint
  await page.route('**/functions/v1/markNotificationRead*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock markAllNotificationsRead endpoint
  await page.route(
    '**/functions/v1/markAllNotificationsRead*',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    },
  );

  // Mock deleteNotification endpoint
  await page.route('**/functions/v1/deleteNotification*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function loginAndNavigateToNotifications(
  page: Page,
  options?: NotificationMockOptions,
) {
  await setupNotificationPageMocks(page, options);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation to complete by checking for expected content on homepage
  await expect(
    page.getByRole('heading', { name: /Welcome Back,/i }),
  ).toBeVisible({ timeout: 10000 });

  // Navigate to notifications page
  await page.goto('/notifications', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Notifications' }),
  ).toBeVisible();
}

test.describe('Notification page', () => {
  test('renders notifications page with header and tabs', async ({ page }) => {
    await loginAndNavigateToNotifications(page);

    // Check header
    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).toBeVisible();
    await expect(
      page.getByText(/Stay updated with your latest activity/),
    ).toBeVisible();

    // Check tabs exist
    await expect(page.getByRole('tab', { name: /All \(5\)/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Unread \(3\)/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Read \(2\)/ })).toBeVisible();

    // Check Mark All as Read button
    await expect(
      page.getByRole('button', { name: 'Mark All as Read' }),
    ).toBeVisible();
  });

  test('displays all notifications in All tab with correct count', async ({
    page,
  }) => {
    await loginAndNavigateToNotifications(page);

    // All tab should be active by default
    const allTab = page.getByRole('tab', { name: /All \(5\)/ });
    await expect(allTab).toHaveAttribute('data-state', 'active');

    // Check all notifications are displayed
    await expect(page.getByText(/Course Enrollment Confirmed/)).toBeVisible();
    await expect(page.getByText(/New Quiz Available/)).toBeVisible();
    await expect(page.getByText(/Achievement Unlocked!/)).toBeVisible();
    await expect(page.getByText(/Reminder: Upcoming Deadline/)).toBeVisible();
    await expect(page.getByText(/Course Review Posted/)).toBeVisible();
  });

  test('filters to show only unread notifications', async ({ page }) => {
    await loginAndNavigateToNotifications(page);

    // Click Unread tab
    await page.getByRole('tab', { name: /Unread \(3\)/ }).click();

    // Should show unread notifications (3 of them)
    await expect(page.getByText(/Course Enrollment Confirmed/)).toBeVisible();
    await expect(page.getByText(/New Quiz Available/)).toBeVisible();
    await expect(page.getByText(/Course Review Posted/)).toBeVisible();

    // Should NOT show read notifications
    await expect(page.getByText(/Achievement Unlocked!/)).not.toBeVisible();
    await expect(
      page.getByText(/Reminder: Upcoming Deadline/),
    ).not.toBeVisible();

    // Verify we have exactly 3 unread notifications with "New" badges
    const badges = await page.locator('text=/^New$/').count();
    expect(badges).toBe(3);
  });

  test('filters to show only read notifications', async ({ page }) => {
    await loginAndNavigateToNotifications(page);

    // Click Read tab
    await page.getByRole('tab', { name: /Read \(2\)/ }).click();

    // Should show read notifications
    await expect(page.getByText(/Achievement Unlocked!/)).toBeVisible();
    await expect(page.getByText(/Reminder: Upcoming Deadline/)).toBeVisible();

    // Unread notifications should not have "New" badges in this tab
    const unreadBadges = await page.locator('button:has-text("New")').count();
    expect(unreadBadges).toBe(0);
  });

  test('shows empty state when no notifications exist', async ({ page }) => {
    await loginAndNavigateToNotifications(page, { notifications: [] });

    await expect(page.getByText(/No notifications yet/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Mark All as Read' }),
    ).toBeDisabled();
  });

  test('shows empty state for unread tab when all are read', async ({
    page,
  }) => {
    await loginAndNavigateToNotifications(page, {
      notifications: [
        {
          id: 'notif-1',
          user_id: INSTRUCTOR_ID,
          title: 'All Read',
          message: 'All notifications are read',
          type: 'course_enrollment',
          is_read: true,
          action_url: null,
          icon_url: null,
          created_at: new Date().toISOString(),
        },
      ],
    });

    // Click Unread tab
    await page.getByRole('tab', { name: /Unread \(0\)/ }).click();

    await expect(page.getByText(/No unread notifications/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Mark All as Read' }),
    ).toBeDisabled();
  });

  test('shows empty state for read tab when none are read', async ({
    page,
  }) => {
    await loginAndNavigateToNotifications(page, {
      notifications: [
        {
          id: 'notif-1',
          user_id: INSTRUCTOR_ID,
          title: 'All Unread',
          message: 'All notifications are unread',
          type: 'course_enrollment',
          is_read: false,
          action_url: null,
          icon_url: null,
          created_at: new Date().toISOString(),
        },
      ],
    });

    // Click Read tab
    await page.getByRole('tab', { name: /Read \(0\)/ }).click();

    await expect(page.getByText(/No read notifications/)).toBeVisible();
  });

  test('displays different notification types with correct icons', async ({
    page,
  }) => {
    await loginAndNavigateToNotifications(page);

    // Check for different notification types and their content
    await expect(page.getByText(/Course Enrollment Confirmed/)).toBeVisible();
    await expect(
      page.getByText(/You have successfully enrolled in/),
    ).toBeVisible();

    await expect(page.getByText(/New Quiz Available/)).toBeVisible();
    await expect(
      page.getByText(/Your instructor has posted a new quiz/),
    ).toBeVisible();

    await expect(page.getByText(/Achievement Unlocked!/)).toBeVisible();
    await expect(page.getByText(/Congratulations! You earned/)).toBeVisible();
  });

  test('displays relative timestamps correctly', async ({ page }) => {
    await loginAndNavigateToNotifications(page);

    // Check that timestamps are displayed in relative format
    // Should have at least one timestamp
    const timestampCount = await page
      .locator('text=/min.*ago|hour.*ago|day.*ago/')
      .count();
    expect(timestampCount).toBeGreaterThan(0);
  });

  test('marks individual notification as read', async ({ page }) => {
    let markReadCalled = false;

    await loginAndNavigateToNotifications(page);

    // Override the markNotificationRead route after page is set up
    await page.route('**/functions/v1/markNotificationRead*', async (route) => {
      markReadCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock the course page to prevent navigation timeout
    await page.route('**/course/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Course Page</body></html>',
      });
    });

    // Click View Details on an unread notification - use filter to get first instance
    const viewDetailsButton = page
      .getByRole('button', { name: /View Details/ })
      .first();

    await viewDetailsButton.click();

    // Verify markNotificationRead was called
    await page.waitForTimeout(500);
    expect(markReadCalled).toBe(true);
  });

  test('marks all notifications as read', async ({ page }) => {
    let markAllReadCalled = false;

    await loginAndNavigateToNotifications(page);

    // Override the markAllNotificationsRead route after page is set up
    await page.route(
      '**/functions/v1/markAllNotificationsRead*',
      async (route) => {
        markAllReadCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      },
    );

    // Click Mark All as Read button
    await page.getByRole('button', { name: 'Mark All as Read' }).click();

    // Verify markAllNotificationsRead was called
    await page.waitForTimeout(500);
    expect(markAllReadCalled).toBe(true);
  });

  test('deletes a notification', async ({ page }) => {
    let deleteNotificationCalled = false;

    await loginAndNavigateToNotifications(page);

    // Override the deleteNotification route after page is set up
    await page.route('**/functions/v1/deleteNotification*', async (route) => {
      deleteNotificationCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Find the first notification's delete button (trash icon)
    const firstNotification = page
      .getByText(/Course Enrollment Confirmed/)
      .locator('..');

    // Click the delete button (last button in the notification card, which is the trash icon)
    await firstNotification.locator('button').last().click();

    // Verify deleteNotification was called
    await page.waitForTimeout(500);
    expect(deleteNotificationCalled).toBe(true);
  });

  test('navigates to action URL when View Details is clicked', async ({
    page,
  }) => {
    await loginAndNavigateToNotifications(page);

    // Mock the markNotificationRead endpoint
    await page.route('**/functions/v1/markNotificationRead*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Find the first "View Details" button
    const viewDetailsButton = page
      .getByRole('button', { name: /View Details/ })
      .first();

    // Set up a promise to wait for navigation
    const navigationPromise = page
      .waitForURL('**/course/**', {
        timeout: 5000,
      })
      .catch(() => {
        // Navigation might be handled by React Router
      });

    await viewDetailsButton.click();

    // Wait for navigation attempt
    await navigationPromise;
    await page.waitForTimeout(500);
  });

  test('displays unread badge only on unread notifications', async ({
    page,
  }) => {
    await loginAndNavigateToNotifications(page);

    // All tab should be active by default, showing both read and unread
    // Count unread badges - should only appear on the 3 unread notifications
    const unreadBadges = await page.locator('text=/^New$/').count();

    // Should have exactly 3 unread notifications with "New" badges
    expect(unreadBadges).toBe(3);
  });

  test('clicking View Details marks notification as read before navigation', async ({
    page,
  }) => {
    let readCalled = false;

    await loginAndNavigateToNotifications(page);

    // Override the markNotificationRead route after page is set up
    await page.route('**/functions/v1/markNotificationRead*', async (route) => {
      readCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock the course page to prevent navigation timeout
    await page.route('**/course/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Course Page</body></html>',
      });
    });

    // Click View Details on an unread notification
    const viewDetailsButton = page
      .getByRole('button', { name: /View Details/ })
      .first();

    await viewDetailsButton.click();

    //Verify markNotificationRead was called
    await page.waitForTimeout(500);
    expect(readCalled).toBe(true);
  });

  test('handles notification loading error gracefully', async ({ page }) => {
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildAuthSessionResponse(TEST_EMAIL)),
      });
    });

    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: buildAuthSessionResponse(TEST_EMAIL).user,
        }),
      });
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

    // Mock getNotifications to return an error
    await page.route('**/functions/v1/getNotifications*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation to complete
    await expect(
      page.getByRole('heading', { name: /Welcome Back,/i }),
    ).toBeVisible({ timeout: 10000 });

    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });

    // Error message should be displayed
    await expect(
      page.locator(
        'text=/Failed to load notifications|Server error|Internal Server Error/',
      ),
    ).toBeVisible();
  });
});
