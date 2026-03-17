import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration Test Setup & Utilities
 * 
 * This file provides database connection and helper functions for
 * integration tests that interact with a real Supabase database.
 * 
 * IMPORTANT: These tests should use a SEPARATE test database instance,
 * NOT your production or development database.
 */

// Environment variables - use real database for integration tests
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Lazy initialization - only check env vars when actually used
let _testSupabase: SupabaseClient | null = null;

function getTestSupabase(): SupabaseClient {
  if (!_testSupabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing required environment variables for integration tests. ' +
        'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
      );
    }
    _testSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _testSupabase;
}

// Test database client (uses anon key for regular operations)
export const testSupabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getTestSupabase()[prop as keyof SupabaseClient];
  }
});

/**
 * Get Supabase URL for mocking auth endpoints
 */
export function getSupabaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error('Missing VITE_SUPABASE_URL');
  }
  return SUPABASE_URL;
}

/**
 * Cleanup all test data from the database
 * 
 * Deletes records in proper order to respect foreign key constraints.
 * Only deletes records that match test patterns (e.g., emails ending in @test.com)
 */
export async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete in reverse foreign key dependency order
    
    // 1. Quiz submissions (references enrollments)
    await testSupabase
      .from('quiz_submissions')
      .delete()
      .like('student_email', '%@test.com');
    
    // 2. Lesson progress (references enrollments)
    await testSupabase
      .from('lesson_progress')
      .delete()
      .like('student_email', '%@test.com');
    
    // 3. Course reviews (references enrollments)
    await testSupabase
      .from('course_reviews')
      .delete()
      .like('student_email', '%@test.com');
    
    // 4. Notifications (references users)
    await testSupabase
      .from('notifications')
      .delete()
      .or('recipient_email.like.%@test.com,sender_email.like.%@test.com');
    
    // 5. Messages (references users)
    await testSupabase
      .from('messages')
      .delete()
      .or('sender_email.like.%@test.com,recipient_email.like.%@test.com');
    
    // 6. Enrollments (references courses and users)
    await testSupabase
      .from('enrollments')
      .delete()
      .like('student_email', '%@test.com');
    
    // 7. Achievements/Badges (references users)
    await testSupabase
      .from('user_achievements')
      .delete()
      .like('user_email', '%@test.com');
    
    // 8. Lessons (references modules)
    const { data: testModules } = await testSupabase
      .from('modules')
      .select('id')
      .like('title', 'E2E Test%,Test Module%', { matchSome: true });
    
    if (testModules && testModules.length > 0) {
      const moduleIds = testModules.map(m => m.id);
      await testSupabase
        .from('lessons')
        .delete()
        .in('module_id', moduleIds);
    }
    
    // 9. Quizzes (references modules)
    if (testModules && testModules.length > 0) {
      const moduleIds = testModules.map(m => m.id);
      await testSupabase
        .from('quizzes')
        .delete()
        .in('module_id', moduleIds);
    }
    
    // 10. Modules (references courses)
    await testSupabase
      .from('modules')
      .delete()
      .like('title', 'E2E Test%,Test Module%');
    
    // 11. Courses (references instructors)
    await testSupabase
      .from('courses')
      .delete()
      .like('title', 'E2E Test%,Test Course%,Quiz Test%,Retake Quiz%');
    
    // 12. Users (root level)
    await testSupabase
      .from('users')
      .delete()
      .like('email', '%@test.com');
    
    console.log('✅ Test data cleanup complete');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

/**
 * Create a test user in the database
 */
export async function createTestUser(options: {
  email: string;
  role: 'student' | 'instructor' | 'admin';
  name?: string;
  enabled?: boolean;
}) {
  const { data, error } = await testSupabase
    .from('users')
    .insert({
      email: options.email,
      role: options.role,
      name: options.name || `Test ${options.role}`,
      enabled: options.enabled ?? true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a test course with modules and lessons
 */
export async function createTestCourse(options: {
  title: string;
  instructorId: string;
  description?: string;
  category?: string;
  published?: boolean;
  modules?: Array<{
    title: string;
    description?: string;
    lessons?: Array<{
      title: string;
      content?: string;
      type?: 'video' | 'text' | 'document';
    }>;
  }>;
}) {
  // Create course
  const { data: course, error: courseError } = await testSupabase
    .from('courses')
    .insert({
      title: options.title,
      description: options.description || 'Test course description',
      category: options.category || 'Programming',
      instructor_id: options.instructorId,
      status: options.published ? 'published' : 'draft',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (courseError) throw courseError;
  
  // Create modules if provided
  if (options.modules) {
    for (let i = 0; i < options.modules.length; i++) {
      const moduleData = options.modules[i];
      
      const { data: module, error: moduleError } = await testSupabase
        .from('modules')
        .insert({
          course_id: course.id,
          title: moduleData.title,
          description: moduleData.description || '',
          order: i,
        })
        .select()
        .single();
      
      if (moduleError) throw moduleError;
      
      // Create lessons if provided
      if (moduleData.lessons) {
        for (let j = 0; j < moduleData.lessons.length; j++) {
          const lessonData = moduleData.lessons[j];
          
          const { error: lessonError } = await testSupabase
            .from('lessons')
            .insert({
              module_id: module.id,
              title: lessonData.title,
              content: lessonData.content || 'Test lesson content',
              type: lessonData.type || 'text',
              order: j,
            });
          
          if (lessonError) throw lessonError;
        }
      }
    }
  }
  
  return course;
}

/**
 * Enroll a student in a course
 */
export async function enrollStudent(options: {
  studentId: string;
  courseId: string;
  status?: 'active' | 'completed' | 'dropped';
  progress?: number;
}) {
  const { data, error } = await testSupabase
    .from('enrollments')
    .insert({
      student_id: options.studentId,
      course_id: options.courseId,
      status: options.status || 'active',
      progress: options.progress || 0,
      enrolled_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Mark a lesson as complete for a student
 */
export async function completeLessonForStudent(options: {
  studentId: string;
  lessonId: string;
  progress?: number;
}) {
  const { data, error } = await testSupabase
    .from('lesson_progress')
    .insert({
      student_id: options.studentId,
      lesson_id: options.lessonId,
      progress: options.progress || 100,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a quiz for a module
 */
export async function createTestQuiz(options: {
  moduleId: string;
  title: string;
  passingGrade?: number;
  timeLimit?: number;
  allowRetakes?: boolean;
  maxAttempts?: number;
  questions?: Array<{
    text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer?: string | number | boolean;
  }>;
}) {
  const { data: quiz, error: quizError } = await testSupabase
    .from('quizzes')
    .insert({
      module_id: options.moduleId,
      title: options.title,
      passing_grade: options.passingGrade || 70,
      time_limit: options.timeLimit || 30,
      allow_retakes: options.allowRetakes ?? false,
      max_attempts: options.maxAttempts || 1,
    })
    .select()
    .single();
  
  if (quizError) throw quizError;
  
  // Create questions if provided
  if (options.questions) {
    for (let i = 0; i < options.questions.length; i++) {
      const q = options.questions[i];
      
      const { error: questionError } = await testSupabase
        .from('quiz_questions')
        .insert({
          quiz_id: quiz.id,
          text: q.text,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          correct_answer: q.correctAnswer ? JSON.stringify(q.correctAnswer) : null,
          order: i,
        });
      
      if (questionError) throw questionError;
    }
  }
  
  return quiz;
}

/**
 * Submit a quiz for a student
 */
export async function submitQuiz(options: {
  studentId: string;
  quizId: string;
  answers: Record<string, any>;
  score?: number;
  passed?: boolean;
}) {
  const { data, error } = await testSupabase
    .from('quiz_submissions')
    .insert({
      student_id: options.studentId,
      quiz_id: options.quizId,
      answers: JSON.stringify(options.answers),
      score: options.score,
      passed: options.passed,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Wait for database operation to complete
 * Useful for testing eventual consistency
 */
export async function waitForDatabaseSync(
  checkFn: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 10000; // 10 seconds
  const interval = options.interval || 500; // 500ms
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Database sync timeout: condition not met within ' + timeout + 'ms');
}

/**
 * Get count of records matching a pattern
 */
export async function getTestRecordCount(table: string, pattern: string = '%@test.com'): Promise<number> {
  const { count, error } = await testSupabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .like('email', pattern);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Verify test database is empty
 */
export async function verifyDatabaseClean(): Promise<void> {
  const tables = [
    'users',
    'courses',
    'modules',
    'lessons',
    'enrollments',
    'quiz_submissions',
    'notifications',
    'messages',
  ];
  
  for (const table of tables) {
    const count = await getTestRecordCount(table);
    if (count > 0) {
      throw new Error(`Database not clean: ${table} has ${count} test records`);
    }
  }
  
  console.log('✅ Database is clean');
}

// Export convenience function for test setup
export async function setupTestDatabase() {
  await cleanupTestData();
  await verifyDatabaseClean();
  console.log('✅ Test database ready');
}

// Export convenience function for test teardown
export async function teardownTestDatabase() {
  await cleanupTestData();
  console.log('✅ Test database cleaned up');
}
