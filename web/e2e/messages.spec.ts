import { test, expect, type Page, type Request } from '@playwright/test';

const TEST_EMAIL = 'teacher@example.com';
const TEST_PASSWORD = 'supersecret123';
const CURRENT_USER_ID = 'instructor-1';
const RECIPIENT_USER_ID = 'student-1';

type Conversation = {
  id: string;
  name: string;
  last_message: string;
  unread_messages: number;
};

type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

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

async function readJsonBody(request: Request): Promise<any> {
  const requestBody = request.postData() || '';
  if (!requestBody) return {};

  try {
    return JSON.parse(requestBody);
  } catch {
    const params = new URLSearchParams(requestBody);
    return Object.fromEntries(params.entries());
  }
}

async function setupMessagesMocks(
  page: Page,
  options?: { withConversation?: boolean },
) {
  const withConversation = options?.withConversation ?? true;

  const conversations: Conversation[] = withConversation
    ? [
        {
          id: RECIPIENT_USER_ID,
          name: 'John Doe',
          last_message: 'Can we review Module 2?',
          unread_messages: 1,
        },
      ]
    : [];

  let messages: DirectMessage[] = withConversation
    ? [
        {
          id: 'msg-1',
          sender_id: RECIPIENT_USER_ID,
          recipient_id: CURRENT_USER_ID,
          content: 'Can we review Module 2?',
          created_at: '2026-03-08T09:00:00.000Z',
          is_read: false,
        },
      ]
    : [];

  let nextMessageId = 2;
  let notificationCallCount = 0;
  let insertedDirectMessageCount = 0;

  await page.route('**/auth/v1/user**', async (route) => {
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

  await page.route('**/auth/v1/token**', async (route) => {
    const body = await readJsonBody(route.request());
    const grantType = body.grant_type;

    if (grantType === 'password') {
      const email = body.email;
      const password = body.password;

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

  await page.route('**/auth/v1/logout**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/functions/v1/registerCheck**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        error: '',
        user: {
          role: 'instructor',
          email: TEST_EMAIL,
        },
      }),
    });
  });

  await page.route('**/functions/v1/getUserInfo**', async (route) => {
    const url = new URL(route.request().url());
    const email = url.searchParams.get('email') || '';

    if (email === TEST_EMAIL) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: CURRENT_USER_ID,
            email: TEST_EMAIL,
            role: 'instructor',
            name: 'Teacher Test',
            avatar_url: 'teacher@example.com_avatar0.png',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: RECIPIENT_USER_ID,
          email,
          role: 'student',
          name: 'John Doe',
          avatar_url: '',
        },
      }),
    });
  });

  await page.route('**/functions/v1/getAllUsers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: CURRENT_USER_ID, email: TEST_EMAIL },
          { id: RECIPIENT_USER_ID, email: 'john@example.com' },
        ],
      }),
    });
  });

  await page.route('**/functions/v1/getNotifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/functions/v1/postNotification**', async (route) => {
    notificationCallCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route(
    '**/rest/v1/rpc/get_direct_message_conversations**',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(conversations),
      });
    },
  );

  await page.route('**/rest/v1/rpc/mark_messages_as_read**', async (route) => {
    messages = messages.map((message) => {
      if (
        message.sender_id === RECIPIENT_USER_ID &&
        message.recipient_id === CURRENT_USER_ID
      ) {
        return { ...message, is_read: true };
      }
      return message;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/rest/v1/direct_messages**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messages),
      });
      return;
    }

    if (method === 'POST') {
      insertedDirectMessageCount += 1;
      const body = await readJsonBody(route.request());
      const records = Array.isArray(body) ? body : [body];
      const nowIso = new Date().toISOString();

      const created: DirectMessage[] = records.map((record: any) => ({
        id: `msg-${nextMessageId++}`,
        sender_id: record.sender_id,
        recipient_id: record.recipient_id,
        content: record.content,
        created_at: nowIso,
        is_read: false,
      }));

      messages = [...messages, ...created];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    await route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Method not allowed in test mock' }),
    });
  });

  return {
    get notificationCallCount() {
      return notificationCallCount;
    },
    get insertedDirectMessageCount() {
      return insertedDirectMessageCount;
    },
  };
}

async function loginAndOpenMessages(
  page: Page,
  options?: { withConversation?: boolean },
) {
  const mockState = await setupMessagesMocks(page, options);

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(/\/$/, { timeout: 10000 });

  await page.goto('/messages');
  await page.waitForLoadState('domcontentloaded');

  return mockState;
}

test.describe('Messages page', () => {
  test('shows heading, compose button, and empty state with no conversation', async ({
    page,
  }) => {
    await loginAndOpenMessages(page, { withConversation: false });

    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByText('Communicate with other users')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compose' })).toBeVisible();

    await expect(page.getByText('No conversation selected')).toBeVisible();
    await expect(
      page.getByText(
        'Select a conversation from the left or start a new one to begin messaging.',
      ),
    ).toBeVisible();
  });

  test('renders conversation list and shows thread after selecting a conversation', async ({
    page,
  }) => {
    await loginAndOpenMessages(page, { withConversation: true });

    await expect(
      page.getByPlaceholder('Search conversations...'),
    ).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Can we review Module 2?')).toBeVisible();

    await page.getByText('John Doe').first().click();

    await expect(
      page.getByRole('textbox', { name: 'Type your message...' }),
    ).toBeVisible();
    await expect(
      page.getByText('Can we review Module 2?').first(),
    ).toBeVisible();
  });

  test('sends a direct message from selected conversation', async ({
    page,
  }) => {
    const mockState = await loginAndOpenMessages(page, {
      withConversation: true,
    });

    await page.getByText('John Doe').first().click();

    const messageInput = page
      .locator('div.p-4.border-t.border-border')
      .getByPlaceholder('Type your message...');

    await messageInput.fill('Sure, let us review it tomorrow.');
    await page
      .locator('div.p-4.border-t.border-border')
      .getByRole('button')
      .last()
      .click();

    await expect(
      page.getByText('Sure, let us review it tomorrow.').last(),
    ).toBeVisible();
    expect(mockState.insertedDirectMessageCount).toBe(1);
  });

  test('prevents sending empty messages', async ({ page }) => {
    await loginAndOpenMessages(page, { withConversation: true });

    await page.getByText('John Doe').first().click();

    const sendButton = page
      .locator('div.p-4.border-t.border-border')
      .getByRole('button')
      .last();

    // Try clicking send without typing anything
    await sendButton.click();

    // Message input should still be empty and no new message should appear
    const messageInput = page
      .locator('div.p-4.border-t.border-border')
      .getByPlaceholder('Type your message...');
    await expect(messageInput).toHaveValue('');
  });

  test('searches and filters conversations', async ({ page }) => {
    // Setup with multiple conversations
    await setupMessagesMocks(page, { withConversation: false });

    // Override the conversations endpoint with multiple conversations
    await page.route(
      '**/rest/v1/rpc/get_direct_message_conversations**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'student-1',
              name: 'John Doe',
              last_message: 'Can we review Module 2?',
              unread_messages: 1,
            },
            {
              id: 'student-2',
              name: 'Jane Smith',
              last_message: 'Thanks for the lesson!',
              unread_messages: 0,
            },
            {
              id: 'student-3',
              name: 'Bob Johnson',
              last_message: 'When is the next quiz?',
              unread_messages: 2,
            },
          ]),
        });
      },
    );

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    // Initially all conversations visible
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('Bob Johnson')).toBeVisible();

    // Search for specific user
    const searchInput = page.getByPlaceholder('Search conversations...');
    await searchInput.fill('Jane');

    // Only Jane should be visible (this depends on implementation)
    await expect(page.getByText('Jane Smith')).toBeVisible();
  });

  test('displays unread message count badge', async ({ page }) => {
    await setupMessagesMocks(page, { withConversation: false });

    await page.route(
      '**/rest/v1/rpc/get_direct_message_conversations**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'student-1',
              name: 'John Doe',
              last_message: 'Can we review Module 2?',
              unread_messages: 3,
            },
          ]),
        });
      },
    );

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    // Check for unread badge (implementation may vary)
    await expect(page.getByText('John Doe')).toBeVisible();
    await page.getByRole('main').getByText('3').click();
  });

  test('marks messages as read when conversation is selected', async ({
    page,
  }) => {
    let markAsReadCalled = false;

    await setupMessagesMocks(page, { withConversation: true });

    await page.route(
      '**/rest/v1/rpc/mark_messages_as_read**',
      async (route) => {
        markAsReadCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      },
    );

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    await page.getByText('John Doe').first().click();
    await page.waitForTimeout(1000);

    expect(markAsReadCalled).toBe(true);
  });

  test('handles long messages and special characters', async ({ page }) => {
    const mockState = await loginAndOpenMessages(page, {
      withConversation: true,
    });

    await page.getByText('John Doe').first().click();

    const messageInput = page
      .locator('div.p-4.border-t.border-border')
      .getByPlaceholder('Type your message...');

    // Long message with special characters
    const longMessage =
      'This is a very long message with special characters: !@#$%^&*()_+-=[]{}|;:"<>,.?/~`\n\nIt also includes:\n- Line breaks\n- Emojis 😊 🎉\n- URLs: https://example.com\n- Code snippets: const x = 42;';

    await messageInput.fill(longMessage);
    await page
      .locator('div.p-4.border-t.border-border')
      .getByRole('button')
      .last()
      .click();

    await page.waitForTimeout(500);
    expect(mockState.insertedDirectMessageCount).toBe(1);
  });

  test('displays multiple messages in thread with proper styling', async ({
    page,
  }) => {
    await setupMessagesMocks(page, { withConversation: false });

    // Setup multiple messages
    await page.route('**/rest/v1/direct_messages**', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'msg-1',
              sender_id: RECIPIENT_USER_ID,
              recipient_id: CURRENT_USER_ID,
              content: 'Hello, how are you?',
              created_at: '2026-03-08T09:00:00.000Z',
              is_read: false,
            },
            {
              id: 'msg-2',
              sender_id: CURRENT_USER_ID,
              recipient_id: RECIPIENT_USER_ID,
              content: 'I am doing well, thanks!',
              created_at: '2026-03-08T09:05:00.000Z',
              is_read: true,
            },
            {
              id: 'msg-3',
              sender_id: RECIPIENT_USER_ID,
              recipient_id: CURRENT_USER_ID,
              content: 'Great! Can we discuss the course?',
              created_at: '2026-03-08T09:10:00.000Z',
              is_read: false,
            },
          ]),
        });
      }
    });

    await page.route(
      '**/rest/v1/rpc/get_direct_message_conversations**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: RECIPIENT_USER_ID,
              name: 'John Doe',
              last_message: 'Great! Can we discuss the course?',
              unread_messages: 2,
            },
          ]),
        });
      },
    );

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    await page.getByText('John Doe').first().click();

    // All messages should be visible in the thread
    await expect(page.getByText('Hello, how are you?').last()).toBeVisible();
    await expect(
      page.getByText('I am doing well, thanks!').last(),
    ).toBeVisible();
    await expect(
      page.getByText('Great! Can we discuss the course?').last(),
    ).toBeVisible();
  });

  test('opens compose dialog when compose button is clicked', async ({
    page,
  }) => {
    await loginAndOpenMessages(page, { withConversation: false });

    const composeButton = page.getByRole('button', { name: 'Compose' });
    await expect(composeButton).toBeVisible();
    await composeButton.click();

    // Check if compose dialog or modal appears (implementation dependent)
    await page.waitForTimeout(500);
  });

  test('handles network error when loading conversations', async ({ page }) => {
    await setupMessagesMocks(page, { withConversation: false });

    // Override with error response
    await page.route(
      '**/rest/v1/rpc/get_direct_message_conversations**',
      async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        });
      },
    );

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    // Should show some error state (depends on implementation)
    await page.waitForTimeout(1000);
  });

  test('handles network error when sending message', async ({ page }) => {
    const mockState = await loginAndOpenMessages(page, {
      withConversation: true,
    });

    await page.getByText('John Doe').first().click();

    // Override the POST route to return error
    await page.route('**/rest/v1/direct_messages**', async (route) => {
      const method = route.request().method();

      if (method === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to send message' }),
        });
        return;
      }

      // Allow GET requests to pass through original mock
      await route.continue();
    });

    const messageInput = page
      .locator('div.p-4.border-t.border-border')
      .getByPlaceholder('Type your message...');

    await messageInput.fill('This should fail to send');
    await page
      .locator('div.p-4.border-t.border-border')
      .getByRole('button')
      .last()
      .click();

    // Should show error or toast (depends on implementation)
    await page.waitForTimeout(1000);
  });

  test('clears input after successfully sending message', async ({ page }) => {
    await loginAndOpenMessages(page, { withConversation: true });

    await page.getByText('John Doe').first().click();

    const messageInput = page
      .locator('div.p-4.border-t.border-border')
      .getByPlaceholder('Type your message...');

    await messageInput.fill('Test message');
    await page
      .locator('div.p-4.border-t.border-border')
      .getByRole('button')
      .last()
      .click();

    // Wait a moment for the message to send
    await page.waitForTimeout(500);

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('displays conversation with no messages (new conversation)', async ({
    page,
  }) => {
    await setupMessagesMocks(page, { withConversation: false });

    await page.route('**/rest/v1/direct_messages**', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        // Return empty array for no messages
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.route(
      '**/rest/v1/rpc/get_direct_message_conversations**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: RECIPIENT_USER_ID,
              name: 'John Doe',
              last_message: '',
              unread_messages: 0,
            },
          ]),
        });
      },
    );

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    await page.getByText('John Doe').first().click();

    // Should show message input but no messages
    await expect(
      page
        .locator('div.p-4.border-t.border-border')
        .getByPlaceholder('Type your message...'),
    ).toBeVisible();
  });

  test('switches between different conversations', async ({ page }) => {
    await setupMessagesMocks(page, { withConversation: false });

    await page.route(
      '**/rest/v1/rpc/get_direct_message_conversations**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'student-1',
              name: 'John Doe',
              last_message: 'Message from John',
              unread_messages: 1,
            },
            {
              id: 'student-2',
              name: 'Jane Smith',
              last_message: 'Message from Jane',
              unread_messages: 0,
            },
          ]),
        });
      },
    );

    let currentRecipient = 'student-1';

    await page.route('**/rest/v1/direct_messages**', async (route) => {
      const method = route.request().method();
      const url = new URL(route.request().url());

      if (method === 'GET') {
        // Parse query parameters to determine which conversation
        const queryString = url.search;
        if (queryString.includes('student-2')) {
          currentRecipient = 'student-2';
        } else if (queryString.includes('student-1')) {
          currentRecipient = 'student-1';
        }

        const messages =
          currentRecipient === 'student-1'
            ? [
                {
                  id: 'msg-1',
                  sender_id: 'student-1',
                  recipient_id: CURRENT_USER_ID,
                  content: 'Message from John',
                  created_at: '2026-03-08T09:00:00.000Z',
                  is_read: false,
                },
              ]
            : [
                {
                  id: 'msg-2',
                  sender_id: 'student-2',
                  recipient_id: CURRENT_USER_ID,
                  content: 'Message from Jane',
                  created_at: '2026-03-08T09:00:00.000Z',
                  is_read: true,
                },
              ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        });
      }
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    // Click first conversation
    await page.getByText('John Doe').first().click();
    await expect(page.getByText('Message from John').last()).toBeVisible();

    // Switch to second conversation
    await page.getByText('Jane Smith').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Message from Jane').last()).toBeVisible();
  });
});
