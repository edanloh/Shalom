# Integration Tests

## Overview

Integration tests validate the application's interaction with a **real Supabase database**. Unlike page-level E2E tests that mock all API calls, integration tests verify:

- Data is correctly persisted to the database
- Database constraints and relationships work as expected
- Foreign key cascades function properly
- Concurrent operations don't create race conditions
- Transaction rollbacks work correctly

## ⚠️ Important Setup Required

**DO NOT run integration tests against your production or development database!**

Integration tests create and delete data. You must set up a separate test database instance.

**Note:** Environment variables are only checked when integration tests actually run. You can safely run workflow tests (`--grep @journey`) without setting up integration test credentials.

## Setup Instructions

### 1. Create a Test Database

Option A: Create a new Supabase project
```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Name it: "shalom-test" or similar
# Copy the URL and keys
```

Option B: Use local Supabase instance
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# This gives you a local database perfect for testing
```

### 2. Run Migrations on Test Database

Your test database needs the same schema as your main database.

```bash
# If using Supabase CLI (local or remote):
supabase db push

# Or manually run your migration SQL files:
# - Connect to test database in Supabase dashboard
# - Go to SQL Editor
# - Run your schema SQL files from db_schema/ folder
```

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.test.example .env.test

# Edit .env.test with your test database credentials
# VITE_SUPABASE_TEST_URL=https://your-test-project.supabase.co
# VITE_SUPABASE_TEST_ANON_KEY=your-test-anon-key
```

### 4. Add .env.test to .gitignore

Make sure `.env.test` is in your `.gitignore` file:

```gitignore
.env.test
.env.local
.env*.local
```

## Running Integration Tests

### Run all integration tests
```bash
npm run test:e2e:integration
```

### Run specific integration test file
```bash
npx playwright test e2e/integration/enrollment-flow.spec.ts
```

### Run with UI mode (see what's happening)
```bash
npx playwright test e2e/integration --ui
```

### Debug mode
```bash
npx playwright test e2e/integration --debug
```

## Test Files

### `setup.ts`
Contains utility functions for:
- Database connection setup
- Test data creation helpers
- Cleanup functions
- Data verification utilities

### `enrollment-flow.spec.ts`
Tests the complete enrollment workflow:
- ✅ Student enrollment persists to database
- ✅ Duplicate enrollment prevention
- ✅ Progress tracking updates database
- ✅ Concurrent enrollments (race conditions)
- ✅ Cascade deletion when course deleted

### Future Test Files

**`course-crud.spec.ts`** (To be created)
- Create course with modules/lessons
- Update course and verify changes
- Delete course and verify cascade

**`progress-tracking.spec.ts`** (To be created)
- Lesson completion tracking
- Quiz submission tracking
- Progress calculations
- Resume functionality after logout

**`notification-system.spec.ts`** (To be created)
- Notification creation on events
- Notification delivery
- Read status tracking
- Notification cleanup

## Writing Integration Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestCourse,
  testSupabase,
} from './setup';

test.describe('Your Feature - Database Integration', () => {
  
  test.beforeEach(async () => {
    // Clean database before each test
    await setupTestDatabase();
  });
  
  test.afterEach(async () => {
    // Clean database after each test
    await teardownTestDatabase();
  });
  
  test('should do something with database', async ({ page }) => {
    // 1. SETUP: Create test data in database
    const user = await createTestUser({
      email: 'test@test.com',
      role: 'student',
    });
    
    // 2. TEST: Perform actions in UI
    await page.goto('/some-page');
    await page.click('button');
    
    // 3. VERIFY: Check database was updated
    const { data } = await testSupabase
      .from('some_table')
      .select('*')
      .eq('user_id', user.id);
    
    expect(data).toBeTruthy();
  });
});
```

### Best Practices

#### ✅ DO:
- Clean database before AND after each test
- Use unique test data (emails ending in @test.com)
- Wait for database sync with `waitForDatabaseSync()`
- Verify both UI updates AND database changes
- Test foreign key constraints
- Test concurrent operations
- Use descriptive test names

#### ❌ DON'T:
- Run against production database
- Leave test data in database
- Assume instant database sync (use waitForDatabaseSync)
- Skip cleanup in afterEach
- Hard-code production data IDs
- Share data between tests (use beforeEach setup)

### Helper Functions

#### `createTestUser(options)`
Creates a user in the database:
```typescript
const user = await createTestUser({
  email: 'test@test.com',
  role: 'student',
  name: 'Test User',
});
```

#### `createTestCourse(options)`
Creates a course with modules and lessons:
```typescript
const course = await createTestCourse({
  title: 'E2E Test Course',
  instructorId: instructor.id,
  published: true,
  modules: [
    {
      title: 'Module 1',
      lessons: [
        { title: 'Lesson 1', content: 'Content' },
      ],
    },
  ],
});
```

#### `enrollStudent(options)`
Enrolls a student in a course:
```typescript
await enrollStudent({
  studentId: student.id,
  courseId: course.id,
  status: 'active',
});
```

#### `waitForDatabaseSync(checkFn, options)`
Waits for database operation to complete:
```typescript
await waitForDatabaseSync(async () => {
  const { data } = await testSupabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId);
  
  return data !== null && data.length > 0;
}, { timeout: 10000 });
```

## Database Cleanup

Tests automatically clean up data matching test patterns:

- Users with emails ending in `@test.com`
- Courses with titles starting with `E2E Test` or `Test Course`
- All related data (enrollments, progress, etc.)

Cleanup happens in **reverse foreign key order** to avoid constraint violations:

1. Quiz submissions
2. Lesson progress
3. Course reviews
4. Notifications
5. Messages
6. Enrollments
7. Achievements
8. Lessons
9. Quizzes
10. Modules
11. Courses
12. Users

## Troubleshooting

### "Missing required environment variables"
- Make sure `.env.test` exists with correct values
- Check variable names match exactly:
  - `VITE_SUPABASE_TEST_URL`
  - `VITE_SUPABASE_TEST_ANON_KEY`

### "Database not clean" error
- Run manual cleanup: `await teardownTestDatabase()`
- Check if previous test failed without cleanup
- Verify test patterns match your naming conventions

### Foreign key constraint errors
- Ensure cleanup happens in reverse dependency order
- Check if new tables need to be added to cleanup function
- Verify database schema matches your expectations

### Tests timing out
- Increase `waitForDatabaseSync` timeout
- Check network connection to test database
- Verify database is not under heavy load
- Check if RLS (Row Level Security) policies are interfering

### "Cannot read property 'id' of null"
- Test data creation failed
- Check database permissions
- Verify schema migrations ran successfully
- Check Supabase project is active/not paused

## CI/CD Integration

Integration tests should run on:
- ✅ Pull requests to main/production branches
- ✅ Before deployment to staging
- ❌ Not on every commit (too slow)

### GitHub Actions Example

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main, production]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run integration tests
        env:
          VITE_SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
          VITE_SUPABASE_TEST_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
        run: npm run test:e2e:integration
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance

Integration tests are slower than unit tests because they:
- Connect to real database
- Wait for network requests
- Perform actual data operations

Expected timing:
- Unit tests: ~50ms per test
- Page E2E tests: ~2s per test
- Integration tests: ~5-10s per test

Run integration tests less frequently than unit/page tests.

## FAQ

**Q: Why not use mocked database in integration tests?**  
A: The point is to test real database behavior - constraints, cascades, transactions, race conditions. Mocks can't catch these issues.

**Q: Can I use the same database as development?**  
A: No! Tests create and delete data. Always use separate test database.

**Q: How often should I run integration tests?**  
A: On every PR to main branch, before deployments. Not on every commit.

**Q: What if I don't have Supabase project for tests?**  
A: Use local Supabase via CLI: `supabase start`. It's free and fast.

**Q: Should I test every API endpoint?**  
A: No. Focus on critical workflows and edge cases. Page E2E tests already cover happy paths.

**Q: Integration tests are failing in CI but passing locally?**  
A: Check environment variables are set in CI, database migrations ran, and network/firewall allows connection.

## Next Steps

1. ✅ Run your first integration test: `npm run test:e2e:integration`
2. ⏳ Create `course-crud.spec.ts` for course CRUD operations
3. ⏳ Create `progress-tracking.spec.ts` for progress persistence
4. ⏳ Add integration tests to your CI/CD pipeline
5. ⏳ Set up database cleanup monitoring

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [E2E Improvement Plan](../E2E_IMPROVEMENT_PLAN.md)
- [Main Testing Guide](../TESTING.md)
