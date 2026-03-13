# Workflow Journey Tests

## Overview

Workflow journey tests validate **complete user workflows** that span multiple pages and verify state persistence throughout the application. Unlike page-level tests that test individual pages in isolation, journey tests follow the actual path a user would take through the application.

## Why Workflow Tests?

**Page-level tests** answer: "Does this page work correctly?"

**Workflow tests** answer: "Can users complete their actual tasks end-to-end?"

### Example: Course Creation

**Page-level test** (existing):
- ✅ Course builder page renders
- ✅ Form validation works
- ✅ Save button triggers API call

**Workflow test** (new):
- ✅ Login as instructor
- ✅ Navigate to course builder
- ✅ Create course with modules
- ✅ Save course
- ✅ Navigate to courses list
- ✅ Verify course appears in list
- ✅ Open course details
- ✅ Edit course
- ✅ Publish course
- ✅ View in analytics

This catches issues that page-level tests can't:
- Navigation state not preserved
- Data not persisting between pages
- URLs not updating correctly
- Cross-page integration bugs

## Implemented Workflows

### 1. Instructor Course Lifecycle

**File**: `instructor-course-lifecycle.spec.ts`

**User Story**: As an instructor, I want to create, edit, publish, and manage courses.

**Workflow**:
```
Login → Course Builder → Create Course → Courses List → 
Course Details → Edit Course → Publish → Analytics → Cleanup
```

**Tests**:
1. ✅ Complete course creation, editing, publishing workflow
2. ✅ Course publishing with validation errors
3. ✅ Data persistence across navigation and page refreshes

**Key Validations**:
- Course appears in courses list after creation
- Draft status shown before publishing
- Published status shown after publishing
- Course data persists after page refresh
- Validation errors prevent incomplete publishing
- Course analytics updates after publishing

### 2. Student Learning Journey

**File**: `student-learning-journey.spec.ts`

**User Story**: As a student, I want to discover courses, enroll, learn, complete courses, and earn certificates.

**Workflow**:
```
Login → Browse Courses → Course Details → Enroll → 
Lessons → Quizzes → Complete Course → Certificate → Badges
```

**Tests**:
1. ✅ Full learning journey from discovery to certification
2. ✅ Course completion and certification workflow
3. ✅ Course interruption and resume functionality

**Key Validations**:
- Search and filtering work across course catalog
- Enrollment button changes after enrollment
- Progress saves automatically
- Can resume from last position after logout
- Quiz results display correctly
- Certificate generates after completion
- Badges appear on profile
- Progress persists across sessions

### 3. Assessment & Grading Workflow

**File**: `assessment-grading-workflow.spec.ts`

**User Story**: As an instructor, I create quizzes. As a student, I take them. As an instructor, I grade them.

**Workflow**:
```
Instructor: Create Quiz → Add Questions → Publish
Student: Enroll → Take Quiz → Submit
Instructor: View Submissions → Grade → Leave Feedback
Student: View Results → See Feedback
Analytics: Updated with scores
```

**Tests**:
1. ✅ Complete assessment lifecycle (creation to grading)
2. ✅ Quiz retakes and score tracking
3. ✅ Quiz timeout and auto-submission

**Key Validations**:
- Multi-user scenarios (instructor + student simultaneously)
- Auto-grading works immediately
- Manual grading updates student results
- Notifications sent to both parties
- Analytics reflect grading data
- Highest score tracked across retakes
- Timer enforces time limits

**Special Feature**: Uses **multiple browser contexts** to simulate instructor and student simultaneously, testing real multi-user interactions.

## Running Workflow Tests

### Run all workflow tests
```bash
npm run test:e2e:journeys
```

### Run specific workflow
```bash
npx playwright test e2e/journeys/instructor-course-lifecycle.spec.ts
```

### Run with UI (see what's happening)
```bash
npm run test:e2e:journeys:ui
```

### Debug specific test
```bash
npx playwright test e2e/journeys/student-learning-journey.spec.ts --debug
```

## Writing Your Own Workflow Tests

### Template Structure

```typescript
import { test, expect, Page } from '@playwright/test';

// Helper functions for setup
async function loginAsRole(page: Page, role: 'instructor' | 'student') {
  await page.goto('/login');
  await page.evaluate((userRole) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'test-token',
      user: {
        id: `test-${userRole}-id`,
        email: `${userRole}@test.com`,
        role: userRole
      }
    }));
  }, role);
  await page.goto('/');
}

test.describe('Your Workflow Name', () => {
  
  test('should complete full workflow from A to Z', async ({ page }) => {
    // ====== STEP 1: Setup/Login ======
    await loginAsRole(page, 'instructor');
    await expect(page).toHaveURL('/');
    
    // ====== STEP 2: Page A ======
    await page.goto('/page-a');
    await page.click('button:has-text("Action")');
    const dataId = 'captured-value';
    
    // ====== STEP 3: Navigate to Page B ======
    await page.goto('/page-b');
    
    // ====== STEP 4: Verify data persisted ======
    await expect(page.locator(`[data-id="${dataId}"]`)).toBeVisible();
    
    // ====== STEP 5: Complete workflow ======
    await page.click('button:has-text("Complete")');
    
    // ====== STEP 6: Verify final state ======
    await page.goto('/page-c');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

#### ✅ DO:
- Use descriptive step comments (`// ====== STEP N: Description ======`)
- Test the happy path first, edge cases in separate tests
- Verify state persistence after navigation
- Wait for visible elements, not arbitrary timeouts
- Use realistic user actions (clicks, typing, navigation)
- Test multi-page workflows (3+ pages minimum)
- Clean up test data at the end

#### ❌ DON'T:
- Test every detail on every page (that's for page-level tests)
- Duplicate existing page-level test cases
- Make workflows too long (split into multiple tests)
- Hard-code IDs or URLs (capture them dynamically)
- Skip navigation (use actual page.goto, not direct URLs)
- Assume instant state updates (use waitFor methods)

### Multi-User Workflow Template

```typescript
import { test, expect, browser } from '@playwright/test';

test('should handle instructor-student interaction', async ({ browser }) => {
  // Create separate contexts for each user
  const instructorContext = await browser.newContext();
  const studentContext = await browser.newContext();
  
  const instructorPage = await instructorContext.newPage();
  const studentPage = await studentContext.newPage();
  
  try {
    // ====== INSTRUCTOR: Setup ======
    await loginAsInstructor(instructorPage);
    await instructorPage.goto('/create-something');
    await instructorPage.click('button:has-text("Create")');
    
    const resourceId = await instructorPage.getAttribute('[data-resource-id]', 'data-resource-id');
    
    // ====== STUDENT: Interact ======
    await loginAsStudent(studentPage);
    await studentPage.goto(`/resource/${resourceId}`);
    await studentPage.click('button:has-text("Interact")');
    
    // ====== INSTRUCTOR: Verify notification ======
    await instructorPage.click('[aria-label="Notifications"]');
    await expect(instructorPage.locator('text=Student interacted')).toBeVisible();
    
  } finally {
    // Always cleanup
    await instructorContext.close();
    await studentContext.close();
  }
});
```

## Planned Workflows

### 4. Communication Flow
**Status**: ⏳ Planned

**Workflow**:
```
Student: Send Message → Instructor: Receive Notification →
Instructor: Respond → Student: Receive Notification →
Two-way Conversation
```

**Why Important**: Tests message persistence, notification system, real-time updates

### 5. Badge & Achievement Workflow
**Status**: ⏳ Planned

**Workflow**:
```
Complete Requirements → Badge Unlocked Notification →
Badge on Profile → Share Badge → Multiple Badge Earning
```

**Why Important**: Tests achievement tracking, badge display, gamification features

### 6. Admin User Management
**Status**: ⏳ Planned

**Workflow**:
```
Instructor Application → Admin Approval → Instructor Access Granted →
Admin Disable User → Login Blocked → Admin Re-enable → Login Works
```

**Why Important**: Tests role-based access, admin controls, user state management

## Comparison with Other Test Types

### Page-Level E2E Tests
- **Focus**: Individual page functionality
- **Navigation**: Single page only
- **APIs**: All mocked
- **Speed**: Fast (~2s per test)
- **Coverage**: 17/17 pages
- **Use Case**: Regression testing, UI validation

### Workflow Tests (This Folder)
- **Focus**: Complete user journeys
- **Navigation**: Multiple pages (3-10+ pages)
- **APIs**: Mostly real, minimal auth mocking
- **Speed**: Slower (~10s per test)
- **Coverage**: 3/6 critical workflows
- **Use Case**: User experience validation, integration testing

### Integration Tests
- **Focus**: Database persistence
- **Navigation**: Minimal (UI just triggers DB operations)
- **APIs**: Real database connections
- **Speed**: Slowest (~10s + DB operations)
- **Coverage**: 1 workflow implemented
- **Use Case**: Data integrity, constraint validation

## Troubleshooting

### "State not persisting between pages"
- Check localStorage/sessionStorage is preserved
- Verify cookies are not cleared
- Check auth token is set correctly
- Use browser context, not incognito mode

### "Test is too slow"
- Split into multiple smaller tests
- Remove unnecessary waits
- Mock time-consuming operations
- Use `page.waitForLoadState('networkidle')` instead of arbitrary timeouts

### "Multi-user test failing"
- Ensure each user has separate browser context
- Verify auth state is isolated per context
- Check for race conditions (use waitForDatabaseSync if needed)
- Close contexts in `finally` block

### "Cannot find element after navigation"
- Use `page.waitForURL()` to confirm navigation
- Wait for specific element: `await page.waitForSelector('...')`
- Check if page loaded: `await page.waitForLoadState()`
- Use Playwright Inspector to debug: `--debug` flag

## Metrics

### Current Status
- ✅ **3 workflows implemented**
- ✅ **~15 test cases** across 3 workflows
- ✅ Tests span **20+ pages** total
- ✅ Tests validate **multi-user interactions**

### Target Status
- 🎯 **6 workflows** (3 more to add)
- 🎯 **~30 test cases** total
- 🎯 Cover all critical user journeys
- 🎯 Multi-user tests for collaboration features

## Contributing

When adding new workflow tests:

1. **Identify the workflow**: What complete task are users trying to accomplish?
2. **Map the journey**: List every page user visits
3. **Define success criteria**: What validates the workflow worked?
4. **Write the test**: Follow template structure
5. **Test multi-user if applicable**: Use separate browser contexts
6. **Add to this README**: Document your workflow

## Resources

- [E2E Improvement Plan](../../E2E_IMPROVEMENT_PLAN.md) - Full testing strategy
- [TESTING.md](../../TESTING.md) - All test types overview
- [Integration Tests README](../integration/README.md) - Database testing
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
