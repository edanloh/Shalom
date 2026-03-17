# Testing Guide

## Overview

This project uses multiple levels of testing to ensure quality:

1. **Unit Tests** (Vitest) - Test individual components, hooks, services
2. **Page E2E Tests** (Playwright) - Test individual pages in isolation
3. **Workflow E2E Tests** (Playwright) - Test complete user journeys across pages
4. **Integration Tests** (Playwright + Real Database) - Test database persistence

---

## Component Testing with Vitest

### Running Tests

```bash
npm test              # Run in watch mode
npm run test:ui       # Open Vitest UI
npm run test:run      # Run once (CI mode)
```

### Test Coverage

✅ **Current Status**: 393/393 tests passing (100% pass rate)

- 70 test files covering:
  - 38 component tests
  - 12 service tests
  - 13 page tests
  - 5 hook tests
  - 2 context tests

### Writing Component Tests

Place test files next to components with `.test.tsx` extension:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Best Practices

- Test user behavior, not implementation
- Use semantic queries: `getByRole`, `getByLabelText`, `getByText`
- Mock external dependencies (API calls, Supabase)
- Keep tests focused and isolated

---

## E2E Testing with Playwright

### Test Types

The E2E suite is organized into three categories using Playwright test tags:

- **Page-level tests**: No tags (default)
- **Workflow tests**: Tagged with `@journey`
- **Integration tests**: Tagged with `@integration`

This tag-based approach ensures cross-platform compatibility and makes it easy to run specific test categories.

#### 1. Page-Level Tests (`e2e/*.spec.ts`)
Test individual pages in isolation with mocked APIs.

**Coverage**: 17/17 pages, ~250 test cases

**Run**:
```bash
npm run test:e2e        # Run all page tests
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:debug  # Debug mode
```

**Example files**:
- `analytics.spec.ts` - Analytics page rendering and filtering
- `courseBuilder.spec.ts` - Course creation form
- `settings.spec.ts` - User settings and preferences

#### 2. Workflow Tests (`e2e/integration/*-workflow.spec.ts` + `@journey` tag)
Test complete user journeys across multiple pages.

**Coverage**: 3 critical workflows implemented

**Run**:
```bash
npm run test:e2e:journeys        # Run workflow tests (tagged @journey)
npm run test:e2e:journeys:ui     # Open in UI mode
```

**Implemented workflows**:
- ✅ `instructor-course-lifecycle.spec.ts` - Course creation → editing → publishing → analytics
- ✅ `student-learning-journey.spec.ts` - Instructor student monitoring (students page → courses → analytics)
- ✅ `Quiz-grading-workflow.spec.ts` - Instructor Quiz center navigation → quiz oversight → analytics

**Planned workflows**:
- ⏳ Communication flow (messages & notifications)
- ⏳ Badge/achievement earning
- ⏳ Admin user management

#### 3. Integration Tests (`e2e/integration/*.spec.ts`)
Test with **real database** to verify persistence.

**⚠️ Requires separate test database setup!**

**Run**:
```bash
npm run test:e2e:integration        # Run integration tests (tagged @integration)
npm run test:e2e:integration:ui     # Open in UI mode
```

**Setup Required**:
1. Create test database (separate from dev/prod)
2. Copy `.env.test.example` to `.env.test`
3. Fill in test database credentials
4. Run migrations on test database

**See**: [e2e/integration/README.md](e2e/integration/README.md) for detailed setup

**Implemented tests**:
- ✅ `enrollment-flow.spec.ts` - Enrollment persistence, duplicate prevention, concurrent operations

---

## Running All Tests

```bash
# Run everything (unit + all E2E)
npm run test:run && npm run test:e2e:all

# Run just E2E (page + workflow + integration)
npm run test:e2e:all

# Run specific categories
npm run test:e2e              # Page tests only
npm run test:e2e:journeys     # Workflow tests only
npm run test:e2e:integration  # Integration tests only (requires setup)
```

---

## Writing E2E Tests

### Page-Level Test Example

Create tests in `e2e/` directory with `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Workflow Test Example

Test complete user journey across multiple pages:

```typescript
import { test, expect } from '@playwright/test';

test('complete course creation workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await loginAsInstructor(page);
  
  // Navigate to course builder
  await page.goto('/course-builder');
  
  // Create course
  await page.fill('input[name="title"]', 'My Course');
  await page.click('button:has-text("Save")');
  
  // Navigate to courses list
  await page.goto('/courses');
  
  // Verify course appears
  await expect(page.locator('text=My Course')).toBeVisible();
  
  // Open course details
  await page.click('text=My Course');
  
  // Verify on course detail page
  await expect(page.url()).toContain('/course/');
});
```

### Integration Test Example

Test with real database:

```typescript
import { test, expect } from '@playwright/test';
import { setupTestDatabase, createTestUser, testSupabase } from './setup';

test.beforeEach(() => setupTestDatabase());

test('enrollment persists to database', async ({ page }) => {
  // Create test data
  const student = await createTestUser({ email: 'test@test.com', role: 'student' });
  
  // Enroll via UI
  await page.goto('/course/123');
  await page.click('button:has-text("Enroll")');
  
  // Verify in database
  const { data } = await testSupabase
    .from('enrollments')
    .select('*')
    .eq('student_id', student.id);
  
  expect(data).toHaveLength(1);
});
```

---

## Test Organization

```
web/
├── src/
│   ├── __tests__/              # Unit tests
│   │   ├── components/         # Component tests
│   │   ├── services/           # Service tests
│   │   ├── pages/              # Page tests
│   │   ├── hooks/              # Hook tests
│   │   └── contexts/           # Context tests
│   └── ...
│
├── e2e/
│   ├── *.spec.ts               # Page-level E2E tests (17 files)
│   │
│   └── integration/            # Workflow + integration E2E tests
│       ├── instructor-course-lifecycle.spec.ts
│       ├── student-learning-journey.spec.ts
│       ├── Quiz-grading-workflow.spec.ts
│       ├── README.md           # Setup instructions
│       ├── setup.ts            # Database utilities
│       └── enrollment-flow.spec.ts
│
├── TESTING.md                  # This file
├── E2E_IMPROVEMENT_PLAN.md     # Detailed E2E strategy
└── .env.test.example           # Integration test config template
```

---
```

## CI/CD Integration

### Recommended Test Execution Strategy

Different test types should run at different frequencies:

```yaml
# Example GitHub Actions workflow

jobs:
  unit-tests:
    # Run on EVERY commit
    run: npm run test:run
    
  page-e2e-tests:
    # Run on EVERY pull request
    run: npm run test:e2e
    
  workflow-e2e-tests:
    # Run on EVERY pull request (critical workflows)
    run: npm run test:e2e:journeys
    
  integration-tests:
    # Run on PR to main/production ONLY
    run: npm run test:e2e:integration
```

### Why Different Frequencies?

- **Unit tests**: Fast (~50ms each), run on every commit
- **Page E2E**: Moderate (~2s each), run on every PR
- **Workflow E2E**: Slower (~10s each), run on every PR (critical)
- **Integration tests**: Slowest (~10s each + DB operations), run before merge only

### Legacy CI Configuration

Both test frameworks are CI-ready:

- Vitest runs in headless mode with `npm run test:run`
- Playwright automatically detects CI environment
- Configure in your CI pipeline:

```yaml
- name: Run Tests
  run: |
    npm run test:run
    npm run test:e2e
```

---

## Installation Commands

If you haven't installed dependencies yet:

```bash
# Vitest dependencies
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Playwright
npm install -D @playwright/test
npx playwright install  # Install browser binaries
```

---

## Best Practices

### Unit Tests
- ✅ Test user-facing behavior, not implementation details
- ✅ Use semantic queries (`getByRole`, `getByLabelText`)
- ✅ Mock external dependencies
- ✅ Keep tests isolated and independent
- ❌ Don't test internal state
- ❌ Don't test library code

### Page E2E Tests
- ✅ Mock API responses for speed
- ✅ Test page in isolation
- ✅ Test form validation and interactions
- ✅ Test error states
- ❌ Don't navigate to other pages
- ❌ Don't rely on real database

### Workflow E2E Tests
- ✅ Navigate across multiple pages
- ✅ Test complete user journeys
- ✅ Verify state persistence across pages
- ✅ Test role-correct web scenarios (instructor/admin only)
- ❌ Don't test individual page details (that's page-level tests)
- ❌ Don't duplicate page-level test cases

### Integration Tests
- ✅ Use separate test database
- ✅ Clean database before AND after each test
- ✅ Verify database state after UI actions
- ✅ Test database constraints and relationships
- ✅ Wait for database sync (`waitForDatabaseSync`)
- ❌ Don't run against production database
- ❌ Don't skip cleanup steps
- ❌ Don't assume instant synchronization

---

## Troubleshooting

### Unit Tests

**"Cannot find module" errors**
- Check import paths are correct
- Verify file extensions match (`.ts` vs `.tsx`)
- Check vite.config.ts has correct resolve aliases

**"ReferenceError: X is not defined"**
- Add to `setupTests.ts`
- Check if polyfills are needed
- Verify vitest configuration

### Page E2E Tests

**Tests timing out**
- Increase timeout in test: `test.setTimeout(60000)`
- Check if selectors are correct
- Verify application is running

**Element not found**
- Use Playwright Inspector: `npm run test:e2e:debug`
- Check if element requires scrolling: `scrollIntoViewIfNeeded()`
- Verify auth state is set correctly

### Workflow E2E Tests

**State not persisting between pages**
- Check if localStorage/sessionStorage is cleared
- Verify auth token is set correctly
- Check if cookies are preserved

**Multi-user tests failing**
- Ensure separate browser contexts for each user
- Verify each context has correct auth state
- Check for race conditions in concurrent operations

### Integration Tests

**"Missing required environment variables"**
- Create `.env.test` file with test database credentials
- Check variable names match exactly
- See [e2e/integration/README.md](e2e/integration/README.md)

**"Database not clean" errors**
- Run cleanup manually: `await teardownTestDatabase()`
- Check if previous test failed without cleanup
- Verify cleanup patterns match your test data

**Foreign key constraint errors**
- Check cleanup order (reverse foreign key dependencies)
- Verify database schema matches expectations
- Add new tables to cleanup function if needed

---

## Additional Resources

- [E2E Improvement Plan](E2E_IMPROVEMENT_PLAN.md) - Detailed strategy and roadmap
- [Integration Test Setup](e2e/integration/README.md) - Database setup guide
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library Docs](https://testing-library.com)

---

## Test Status Summary

### Unit Tests
- ✅ Status: **393/393 passing** (100% pass rate)
- ✅ Coverage: 70 files (components, services, pages, hooks, contexts)
- ✅ Run on: Every commit

### Page E2E Tests
- ✅ Status: **17/17 pages covered**
- ✅ Coverage: ~250 test cases across 17 pages
- ✅ Run on: Every pull request

### Workflow E2E Tests
- ✅ Status: **3/6 critical workflows implemented**
- ✅ Implemented: Instructor lifecycle, student journey, Quiz grading
- ⏳ Planned: Communication flow, badge earning, admin management
- ✅ Run on: Every pull request

### Integration Tests
- ✅ Status: **1 test suite implemented** (enrollment flow)
- ⏳ Planned: Course CRUD, progress tracking, notifications
- ⚠️ Requires: Separate test database setup
- ✅ Run on: Pull requests to main branch

---

## Quick Reference

```bash
# Unit Tests
npm test                        # Watch mode
npm run test:ui                 # UI mode
npm run test:run                # Run once

# Page E2E Tests
npm run test:e2e                # All page tests
npm run test:e2e:ui             # UI mode
npm run test:e2e:debug          # Debug mode

# Workflow E2E Tests
npm run test:e2e:journeys       # All workflow tests
npm run test:e2e:journeys:ui    # UI mode

# Integration Tests (requires setup!)
npm run test:e2e:integration    # All integration tests
npm run test:e2e:integration:ui # UI mode

# Run Everything
npm run test:run && npm run test:e2e:all
```


# E2E Testing Improvement Plan

## Executive Summary

**Current State**: The E2E test suite provides **excellent page-level coverage** (17/17 pages tested, ~250 test cases) but lacks **true end-to-end workflow testing**.

**Gap Identified**: Existing tests are page-centric integration tests with mocked APIs. They validate individual page functionality but don't test complete user journeys across multiple pages or verify data persistence throughout the application flow.

**Recommendation**: Implement workflow-based E2E tests while maintaining existing page-level tests. Both testing strategies are valuable and serve different purposes.

---

## Current E2E Test Analysis

### ✅ Strengths

1. **Complete Page Coverage**
   - All 17 pages have dedicated E2E test files
   - 1:1 mapping: `e2e/pageN.spec.ts` ↔ `src/pages/PageN.tsx`

2. **Comprehensive Page Testing**
   - ~250 test cases across 25 test suites
   - Tests page rendering, interactions, form validation
   - Good coverage of UI components and user interactions

3. **Consistent Test Patterns**
   - Standardized auth mocking (`buildAuthSessionResponse`)
   - Consistent API mocking helpers (`mockPageData`)
   - Reusable test utilities

4. **Well-Structured Tests**
   - settings.spec.ts: 35 tests (most comprehensive)
   - courseBuilder.spec.ts: 25 tests
   - courseStudents.spec.ts: 23 tests
   - Clear test descriptions and assertions

### ❌ Gaps

1. **No Cross-Page Workflows**
   - Tests navigate to single page and stay there
   - No validation of state persistence across navigation
   - Missing complete user journey testing

2. **Fully Mocked APIs**
   - All backend calls are mocked
   - No database integration validation
   - Can't catch real API/database issues

3. **No Multi-User Scenarios**
   - Tests run with single user context
   - Missing instructor-student interaction workflows
   - No concurrent user testing

4. **Limited Error Recovery Testing**
   - Few tests for network failures
   - Limited validation error scenario testing
   - No timeout/retry logic validation

5. **No Performance Testing**
   - No load time measurements
   - No large dataset testing
   - No real file upload testing

6. **Sparse Coverage in Some Files**
   - notFound.spec.ts: Only 2 tests
   - students.spec.ts: Only 5 tests
   - quizTaking.spec.ts: Only 7 tests

---

## Recommended Test Architecture

### Dual-Strategy Approach

```
e2e/
├── [existing] *.spec.ts          # Page-level tests (KEEP)
│   ├── analytics.spec.ts
│   ├── courseBuilder.spec.ts
│   └── ... (17 files)
│
├── integration/                  # Workflow + integration tests (NEW)
│   ├── instructor-course-lifecycle.spec.ts
│   ├── student-learning-journey.spec.ts
│   ├── Quiz-grading-workflow.spec.ts
│   ├── course-crud.spec.ts
│   ├── enrollment-flow.spec.ts
│   ├── progress-tracking.spec.ts
│   └── notification-system.spec.ts
│
└── performance/                  # Performance tests (NEW)
    ├── course-list-loading.spec.ts
    ├── video-upload.spec.ts
    └── large-dataset-rendering.spec.ts
```

---

## Priority 1: Workflow Tests (CREATED ✅)

### Instructor Course Lifecycle
**File**: `e2e/integration/instructor-course-lifecycle.spec.ts`

**Tests**:
- Complete course creation, editing, publishing workflow
- Course publishing with validation errors
- Data persistence across navigation and refreshes

**Covers**:
- Login → Course Builder → Courses List → Course Detail → Edit → Publish → Analytics
- Validates state persistence across 5+ page navigations
- Tests error scenarios and validation

### Student Learning Journey
**File**: `e2e/integration/student-learning-journey.spec.ts`

**Tests**:
- Full learning journey from discovery to certification
- Course completion and certification workflow
- Course interruption and resume functionality

**Covers**:
- Browse → Enroll → Lessons → Quiz → Complete → Certificate → Badge
- Tests progress persistence across sessions
- Tests resume functionality after logout/login

### Quiz & Grading Workflow
**File**: `e2e/integration/Quiz-grading-workflow.spec.ts`

**Tests**:
- Complete Quiz lifecycle (creation to grading)
- Quiz retakes and score tracking
- Quiz timeout and auto-submission

**Covers**:
- Multi-user scenarios (instructor + student)
- Auto-grading vs manual grading flow
- Notification system integration
- Analytics updates after grading

---

## Priority 2: Integration Tests (NEXT)

### Purpose
Test with **real database connections** to catch:
- Database constraint violations
- Foreign key relationship issues
- Transaction rollback problems
- Race conditions in concurrent operations

### Implementation Plan

#### 1. Test Database Setup

**File**: `e2e/integration/setup.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Create test database client
export const testSupabase = createClient(
  process.env.VITE_SUPABASE_TEST_URL!,
  process.env.VITE_SUPABASE_TEST_ANON_KEY!
);

// Cleanup helper
export async function cleanupTestData() {
  // Delete test data in correct order (respect foreign keys)
  await testSupabase.from('quiz_submissions').delete().like('email', '%@test.com');
  await testSupabase.from('enrollments').delete().like('student_email', '%@test.com');
  await testSupabase.from('courses').delete().like('title', 'E2E Test%');
  await testSupabase.from('users').delete().like('email', '%@test.com');
}

// Seed helper
export async function seedTestCourse() {
  const { data } = await testSupabase.from('courses').insert({
    title: 'E2E Test Course',
    description: 'Integration test course',
    instructor_id: 'test-instructor-id'
  }).select().single();
  
  return data;
}
```

#### 2. Sample Integration Test

**File**: `e2e/integration/enrollment-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { testSupabase, cleanupTestData, seedTestCourse } from './setup';

test.describe('Enrollment Flow - Database Integration', () => {
  
  test.beforeEach(async () => {
    await cleanupTestData();
  });
  
  test.afterEach(async () => {
    await cleanupTestData();
  });
  
  test('should persist enrollment to database', async ({ page }) => {
    // Seed test course
    const course = await seedTestCourse();
    
    // Login as student
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test-student@test.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    
    // Enroll in course (REAL API CALL)
    await page.goto(`/course/${course.id}`);
    await page.click('button:has-text("Enroll Now")');
    await page.click('button:has-text("Confirm")');
    
    // Verify in UI
    await expect(page.locator('text=Successfully enrolled')).toBeVisible();
    
    // Verify in DATABASE
    const { data: enrollment } = await testSupabase
      .from('enrollments')
      .select('*')
      .eq('course_id', course.id)
      .eq('student_email', 'test-student@test.com')
      .single();
    
    expect(enrollment).toBeTruthy();
    expect(enrollment!.status).toBe('active');
    expect(enrollment!.progress).toBe(0);
  });
  
  test('should prevent duplicate enrollments', async ({ page }) => {
    // Setup: Student already enrolled
    const course = await seedTestCourse();
    await testSupabase.from('enrollments').insert({
      course_id: course.id,
      student_email: 'test-student@test.com',
      status: 'active'
    });
    
    // Try to enroll again
    await page.goto(`/course/${course.id}`);
    
    // Should NOT show enroll button (already enrolled)
    await expect(page.locator('button:has-text("Enroll Now")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Continue Learning")')).toBeVisible();
  });
});
```

#### 3. Required Test Cases

**Course CRUD Integration** (`course-crud.spec.ts`):
- ✅ Create course with modules/lessons
- ✅ Verify all related records in database
- ✅ Update course and verify changes persisted
- ✅ Delete course and verify cascade deletion
- ✅ Test foreign key constraints

**Progress Tracking Integration** (`progress-tracking.spec.ts`):
- ✅ Complete lessons and verify progress updates
- ✅ Test concurrent progress updates (race conditions)
- ✅ Verify progress calculations match database state
- ✅ Test progress rollback on errors

**Notification System Integration** (`notification-system.spec.ts`):
- ✅ Trigger notification events (enrollment, grading, etc.)
- ✅ Verify notifications created in database
- ✅ Test notification delivery and read status
- ✅ Verify notification cleanup/expiration

---

## Priority 3: Enhance Existing Page Tests

### Increase Coverage for Sparse Files

#### notFound.spec.ts (Currently: 2 tests)
**Add**:
- Test various invalid route patterns
- Test redirect behavior for expired links
- Test 404 page search functionality
- Test suggestions for similar valid pages

#### students.spec.ts (Currently: 5 tests)
**Add**:
- Test student filtering and sorting
- Test bulk actions (enable/disable multiple students)
- Test student detail view navigation
- Test search with various criteria
- Test pagination with large student lists
- Test export functionality

#### quizTaking.spec.ts (Currently: 7 tests)
**Add**:
- Test quiz navigation (next/previous questions)
- Test answer saving and restoration
- Test timer functionality comprehensively
- Test different question types (essay, file upload)
- Test quiz review after submission
- Test keyboard navigation in quiz

### Add Error Scenario Tests

For ALL page tests, add:
- Network failure simulation (offline mode)
- API timeout handling
- 500 server error responses
- Validation error displays
- Authentication failures mid-session
- Optimistic UI update rollbacks

---

## Priority 4: Performance Testing

### Setup Performance Test Suite

**File**: `e2e/performance/playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './performance',
  timeout: 60000, // Longer timeout for performance tests
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    // Performance tracking
    actionTimeout: 30000,
  },
  // Run performance tests separately
  grep: /@performance/,
});
```

### Performance Test Examples

**Course List Loading** (`course-list-loading.spec.ts`):
```typescript
test('should load course list within 3 seconds @performance', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/courses');
  await page.waitForSelector('.course-card', { timeout: 10000 });
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
  
  // Verify all courses rendered
  const courseCount = await page.locator('.course-card').count();
  expect(courseCount).toBeGreaterThan(0);
});

test('should handle 100+ courses without lag @performance', async ({ page }) => {
  // Seed 100 courses
  await seedManyCourses(100);
  
  const startTime = Date.now();
  await page.goto('/courses');
  await page.waitForSelector('.course-card');
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(5000);
  
  // Test scrolling performance
  const scrollStartTime = Date.now();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000); // Let images load
  const scrollTime = Date.now() - scrollStartTime;
  
  expect(scrollTime).toBeLessThan(2000);
});
```

**Video Upload Performance** (`video-upload.spec.ts`):
```typescript
test('should upload video within reasonable time @performance', async ({ page }) => {
  await page.goto('/course-builder');
  
  // Create large video file (10MB)
  const videoBuffer = await createTestVideo(10 * 1024 * 1024);
  
  const uploadStartTime = Date.now();
  
  // Upload video
  await page.setInputFiles('input[type="file"]', {
    name: 'test-video.mp4',
    mimeType: 'video/mp4',
    buffer: videoBuffer,
  });
  
  // Wait for upload completion
  await page.waitForSelector('text=Upload complete', { timeout: 60000 });
  
  const uploadTime = Date.now() - uploadStartTime;
  
  // Should upload within 30 seconds
  expect(uploadTime).toBeLessThan(30000);
  
  // Verify progress indicator worked
  const progressUpdates = await page.evaluate(() => {
    return (window as any).uploadProgressHistory || [];
  });
  
  expect(progressUpdates.length).toBeGreaterThan(0);
});
```

---

## Priority 5: Accessibility Testing

### Add Accessibility Test Suite

**File**: `e2e/accessibility/a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page);
  });
  
  test('should have no accessibility violations on login page', async ({ page }) => {
    await page.goto('/login');
    await checkA11y(page);
  });
  
  test('should have no accessibility violations on course builder', async ({ page }) => {
    // Login first
    await loginAsInstructor(page);
    await page.goto('/course-builder');
    await checkA11y(page);
  });
  
  test('should support keyboard navigation in course list', async ({ page }) => {
    await page.goto('/courses');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Should be able to navigate to course card
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Press Enter to open course
    await page.keyboard.press('Enter');
    
    // Should navigate to course detail
    await expect(page.url()).toContain('/course/');
  });
});
```

### Required Accessibility Tests
- ✅ Keyboard navigation for all interactive elements
- ✅ Screen reader compatibility (ARIA labels)
- ✅ Color contrast ratios
- ✅ Focus indicators visible
- ✅ Form error announcements
- ✅ Skip navigation links
- ✅ Semantic HTML validation

---

## Priority 6: Additional Workflow Tests

### Communication Flow
**File**: `e2e/integration/communication-flow.spec.ts`

**Workflow**:
- Student sends message to instructor
- Instructor receives notification
- Instructor responds
- Student receives notification
- Two-way conversation continues
- Verify message persistence

### Badge & Achievement Workflow
**File**: `e2e/integration/badge-achievement-workflow.spec.ts`

**Workflow**:
- Complete requirements for badge
- Badge unlocked notification
- Badge visible on profile
- Multiple badge earning
- Badge sharing functionality

### Admin User Management
**File**: `e2e/integration/admin-user-management.spec.ts`

**Workflow**:
- Admin approves instructor application
- Instructor gains access to instructor pages
- Admin disables user account
- User cannot login
- Admin re-enables user
- User can login again

---

## Implementation Timeline

### Week 1: Foundation
- ✅ Create workflow tests under `e2e/integration/`
- ✅ Implement 3 core workflow tests (instructor, student, Quiz)
- ✅ Document gaps and create improvement plan

### Week 2: Integration Testing
- ⏳ Set up test database configuration
- ⏳ Create database setup/cleanup utilities
- ⏳ Implement 3 integration tests (course CRUD, enrollment, progress)

### Week 3: Enhance Existing Tests
- ⏳ Add 10+ tests to sparse files (notFound, students, quizTaking)
- ⏳ Add error scenario tests to all page tests
- ⏳ Standardize test patterns across all files

### Week 4: Additional Workflows
- ⏳ Implement communication flow tests
- ⏳ Implement badge/achievement workflow tests
- ⏳ Implement admin user management tests

### Week 5: Performance & Accessibility
- ⏳ Set up performance test configuration
- ⏳ Implement 5 performance tests
- ⏳ Set up accessibility testing framework
- ⏳ Run a11y audit on all 17 pages

### Week 6: Documentation & CI/CD
- ⏳ Update TESTING.md with new test types
- ⏳ Configure CI/CD pipelines for different test types
- ⏳ Create test execution guidelines
- ⏳ Train team on new test structure

---

## Test Execution Strategy

### Different Test Types, Different Frequencies

```yaml
# .github/workflows/tests.yml

name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:run
    # Run on EVERY commit
    
  page-e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e
    # Run on EVERY PR
    
  workflow-e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e:journeys
    # Run on EVERY PR (critical workflows)
    
  integration-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, page-e2e-tests]
    steps:
      - run: npm run test:e2e:integration
    # Run on PR to main/production branches ONLY
    
  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run test:e2e:performance
    # Run on main branch merges ONLY
    
  accessibility-tests:
    runs-on: ubuntu-latest
    schedule:
      - cron: '0 0 * * 0' # Weekly
    steps:
      - run: npm run test:e2e:a11y
    # Run weekly on schedule
```

### NPM Scripts to Add

```json
{
  "scripts": {
    "test:e2e": "playwright test e2e/*.spec.ts",
    "test:e2e:journeys": "playwright test --grep @journey",
    "test:e2e:integration": "playwright test e2e/integration/*.spec.ts",
    "test:e2e:performance": "playwright test e2e/performance/*.spec.ts --grep @performance",
    "test:e2e:a11y": "playwright test e2e/accessibility/*.spec.ts",
    "test:e2e:all": "npm run test:e2e && npm run test:e2e:journeys && npm run test:e2e:integration"
  }
}
```

---

## Metrics & Success Criteria

### Current Metrics
- ✅ Page coverage: 17/17 (100%)
- ✅ Test count: ~250 tests
- ❌ Workflow coverage: 0/6 critical workflows (0%)
- ❌ Database integration tests: 0
- ❌ Performance tests: 0
- ❌ Accessibility tests: 0

### Target Metrics (End of Week 6)
- ✅ Page coverage: 17/17 (maintain 100%)
- ✅ Test count: ~400+ tests (60% increase)
- ✅ Workflow coverage: 6/6 critical workflows (100%)
- ✅ Database integration tests: 10+ tests covering CRUD operations
- ✅ Performance tests: 5+ tests with benchmarks
- ✅ Accessibility tests: 17 page audits + keyboard nav tests

### Quality Gates
1. **No regressions**: All existing 250 tests must continue passing
2. **Workflow success**: All 6 workflow tests must pass before release
3. **Integration validation**: Integration tests must pass on staging env
4. **Performance benchmarks**: No page should regress by >20% load time
5. **Accessibility compliance**: WCAG 2.1 AA standard (no critical violations)

---

## Conclusion

**You were absolutely right** - the existing E2E tests cover individual pages comprehensively but don't test the complete application workflows that users actually experience.

**Dual-strategy approach recommended**:
1. **Keep existing page tests** - They provide value for regression testing individual page functionality
2. **Add workflow tests** - To test complete user journeys across multiple pages
3. **Add integration tests** - To validate real database interactions
4. **Add performance tests** - To prevent performance regressions
5. **Add accessibility tests** - To ensure application is usable by everyone

**Immediate next steps**:
✅ 3 workflow tests created (instructor, student, Quiz)  
⏳ Set up integration test infrastructure  
⏳ Run first integration test with real database

This plan transforms your E2E suite from "page-level integration tests" to true "end-to-end testing" that validates the complete user experience.
