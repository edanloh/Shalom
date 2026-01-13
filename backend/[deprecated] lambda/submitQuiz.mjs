/**
 * AWS Lambda Function: submitQuiz
 * Purpose: Submit quiz answers, calculate score, and update progress
 * Endpoint: POST /courses/{courseId}/module/quizzes/{quizId}
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "quizId": "uuid",
 *   "answers": [
 *     { "questionId": "uuid", "answer": "Answer text" }
 *   ]
 * }
 */
import { Client } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json"
};

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-southeast-1"
});

let cachedSecret = null;

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  
  const command = new GetSecretValueCommand({
    SecretId: process.env.DB_SECRET_NAME
  });
  
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

/**
 * Check and update module (section) completion status
 * A module is completed when ALL videos are watched and ALL quizzes are passed
 */
async function checkAndUpdateModuleCompletion(client, userId, courseId, sectionId) {
  try {
    // Get total count of videos and quizzes in this section
    const totalItemsQuery = `
      SELECT 
        COUNT(DISTINCT cv.id) as total_videos,
        COUNT(DISTINCT cq.id) as total_quizzes
      FROM course_sections cs
      LEFT JOIN course_videos cv ON cv.section_id = cs.id
      LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
      WHERE cs.id = $1
    `;
    
    const totalResult = await client.query(totalItemsQuery, [sectionId]);
    const { total_videos, total_quizzes } = totalResult.rows[0];
    
    console.log(`📚 Section ${sectionId}: ${total_videos} videos, ${total_quizzes} quizzes`);
    
    // Get count of completed videos and passed quizzes
    const completedItemsQuery = `
      SELECT 
        COUNT(DISTINCT vp.video_id) FILTER (WHERE vp.is_completed = true) as completed_videos,
        COUNT(DISTINCT CASE 
          WHEN qa.is_passed = true THEN qa.quiz_id 
        END) as passed_quizzes
      FROM course_sections cs
      LEFT JOIN course_videos cv ON cv.section_id = cs.id
      LEFT JOIN video_progress vp ON vp.video_id = cv.id AND vp.user_id = $1
      LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (quiz_id) quiz_id, is_passed
        FROM quiz_attempts
        WHERE user_id = $1 AND quiz_id = cq.id
        ORDER BY quiz_id, completed_at DESC
      ) qa ON qa.quiz_id = cq.id
      WHERE cs.id = $2
    `;
    
    const completedResult = await client.query(completedItemsQuery, [userId, sectionId]);
    const { completed_videos, passed_quizzes } = completedResult.rows[0];
    
    console.log(`📊 Section ${sectionId} progress:`);
    console.log(`   Videos: ${completed_videos}/${total_videos} (${parseInt(completed_videos) === parseInt(total_videos) ? '✅ All complete' : '❌ Incomplete'})`);
    console.log(`   Quizzes: ${passed_quizzes}/${total_quizzes} (${parseInt(total_quizzes) === 0 ? '✅ No quizzes required' : (parseInt(passed_quizzes) === parseInt(total_quizzes) ? '✅ All passed' : '❌ Not all passed')})`);
    
    // Check if module is completed (all items done)
    const videosComplete = parseInt(completed_videos) === parseInt(total_videos);
    const quizzesComplete = parseInt(total_quizzes) === 0 || parseInt(passed_quizzes) === parseInt(total_quizzes);
    const hasVideos = parseInt(total_videos) > 0;
    const hasQuizzes = parseInt(total_quizzes) > 0;
    const hasContent = hasVideos || hasQuizzes; // Module must have at least videos OR quizzes
    
    // Module is complete if:
    // - Has at least some content (videos or quizzes)
    // - All videos watched (if any)
    // - All quizzes passed (if any)
    const isModuleCompleted = hasContent && videosComplete && quizzesComplete;
    
    console.log(`📝 Module completion check:`);
    console.log(`   All videos watched: ${videosComplete} (${total_videos} videos)`);
    console.log(`   All quizzes passed: ${quizzesComplete} (${total_quizzes} quizzes)`);
    console.log(`   Has content: ${hasContent} (videos: ${hasVideos}, quizzes: ${hasQuizzes})`);
    console.log(`   ➡️  Module ${sectionId} is ${isModuleCompleted ? '✅ COMPLETED' : '❌ NOT COMPLETED'}`);
    
    // Update or insert module progress
    const upsertModuleProgressQuery = `
      INSERT INTO user_module_progress (user_id, course_id, section_id, is_completed, completed_at)
      VALUES ($1, $2, $3, $4, CASE WHEN $4 = true THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT (user_id, course_id, section_id)
      DO UPDATE SET 
        is_completed = EXCLUDED.is_completed,
        completed_at = CASE 
          WHEN EXCLUDED.is_completed = true AND user_module_progress.completed_at IS NULL 
          THEN CURRENT_TIMESTAMP
          WHEN EXCLUDED.is_completed = false
          THEN NULL
          ELSE user_module_progress.completed_at
        END
      RETURNING *
    `;
    
    const moduleProgressResult = await client.query(upsertModuleProgressQuery, [
      userId, 
      courseId, 
      sectionId, 
      isModuleCompleted
    ]);
    
    return {
      isCompleted: isModuleCompleted,
      totalVideos: parseInt(total_videos),
      completedVideos: parseInt(completed_videos),
      totalQuizzes: parseInt(total_quizzes),
      passedQuizzes: parseInt(passed_quizzes),
      moduleProgress: moduleProgressResult.rows[0]
    };
    
  } catch (error) {
    console.error('Error checking module completion:', error);
    // Don't throw - just log the error and continue
    return null;
  }
}

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  let client;
  
  try {
    // Extract parameters
    const quizId = event.pathParameters?.quizId;
    const body = JSON.parse(event.body || '{}');
    const { userId, answers } = body;

    // Validate required fields
    if (!quizId || !userId || !answers || !Array.isArray(answers)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "quizId, userId, and answers array are required" 
        })
      };
    }

    // Connect to database
    const secret = await getDbCredentials();
    
    const connectionConfig = {
      host: secret.host?.trim(),
      port: parseInt(secret.port) || 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    };

    client = new Client(connectionConfig);
    await client.connect();

    // Begin transaction
    await client.query('BEGIN');

    try {
      // ========================================
      // 1. Get quiz info and validate
      // ========================================
      const quizQuery = `
        SELECT 
          id, course_id, section_id, passing_score, max_attempts
        FROM course_quizzes
        WHERE id = $1
      `;
      
      const quizResult = await client.query(quizQuery, [quizId]);

      if (quizResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            success: false, 
            message: "Quiz not found" 
          })
        };
      }

      const quiz = quizResult.rows[0];

      // Get previous attempts count (for tracking only, no limit enforced)
      const attemptsQuery = `
        SELECT COUNT(*) as attempt_count
        FROM quiz_attempts
        WHERE user_id = $1 AND quiz_id = $2
      `;
      
      const attemptsResult = await client.query(attemptsQuery, [userId, quizId]);
      const previousAttempts = parseInt(attemptsResult.rows[0].attempt_count);

      // ========================================
      // 2. Get all questions with correct answers
      // ========================================
      const questionsQuery = `
        SELECT 
          id,
          question,
          correct_answer,
          points
        FROM quiz_questions
        WHERE quiz_id = $1
      `;
      
      const questionsResult = await client.query(questionsQuery, [quizId]);
      const questionsMap = new Map(
        questionsResult.rows.map(row => [row.id, row])
      );

      // ========================================
      // 3. Grade answers
      // ========================================
      let correctCount = 0;
      let totalPoints = 0;
      const gradedAnswers = [];

      for (const answer of answers) {
        const { questionId, answer: userAnswer } = answer;
        const question = questionsMap.get(questionId);
        
        if (!question) continue;
        
        const isCorrect = question.correct_answer === userAnswer;
        
        if (isCorrect) {
          correctCount++;
          totalPoints += question.points || 1;
        }

        gradedAnswers.push({
          questionId,
          isCorrect,
          correctAnswer: question.correct_answer
        });
      }

      const totalQuestions = questionsResult.rows.length;
      const score = totalQuestions > 0 
        ? Math.round((correctCount / totalQuestions) * 100) 
        : 0;
      const isPassed = score >= quiz.passing_score;
      const attemptNumber = previousAttempts + 1;

      // ========================================
      // 4. Save quiz attempt
      // ========================================
      // Calculate time taken (if quiz has time limit)
      const timeTakenMinutes = body.timeTakenMinutes || null;
      
      // Convert answers to JSON format for storage
      const answersJson = JSON.stringify(
        answers.reduce((acc, ans) => {
          acc[ans.questionId] = ans.answer;
          return acc;
        }, {})
      );

      const insertAttemptQuery = `
        INSERT INTO quiz_attempts (
          user_id, quiz_id, attempt_number, score, total_questions, 
          correct_answers, is_passed, time_taken_minutes, answers, 
          started_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      await client.query(insertAttemptQuery, [
        userId,
        quizId,
        attemptNumber,
        score,
        totalQuestions,
        correctCount,
        isPassed,
        timeTakenMinutes,
        answersJson
      ]);

      // ========================================
      // 5. Update course progress if quiz passed
      // ========================================
      if (isPassed) {
        // Get course completion stats
        const statsQuery = `
          SELECT 
            COUNT(DISTINCT cq.id) as total_quizzes,
            COUNT(DISTINCT CASE WHEN qa.is_passed = true THEN cq.id END) as passed_quizzes,
            COUNT(DISTINCT cv.id) as total_videos,
            COUNT(DISTINCT CASE WHEN vp.is_completed = true THEN cv.id END) as completed_videos
          FROM course_quizzes cq
          LEFT JOIN quiz_attempts qa ON cq.id = qa.quiz_id AND qa.user_id = $1
          CROSS JOIN course_videos cv
          LEFT JOIN video_progress vp ON cv.id = vp.video_id AND vp.user_id = $1
          WHERE cq.course_id = $2 AND cv.course_id = $2
        `;

        const statsResult = await client.query(statsQuery, [userId, quiz.course_id]);
        const stats = statsResult.rows[0];

        const totalItems = parseInt(stats.total_quizzes) + parseInt(stats.total_videos);
        const completedItems = parseInt(stats.passed_quizzes) + parseInt(stats.completed_videos);
        
        const progressPercentage = totalItems > 0 
          ? (completedItems / totalItems) * 100 
          : 0;

        const isEnrollmentCompleted = progressPercentage >= 100;

        // Update enrollment
        const updateEnrollmentQuery = `
          UPDATE course_enrollments
          SET 
            progress_percentage = $1,
            is_completed = $2,
            completion_date = CASE 
              WHEN $2 = true AND completion_date IS NULL 
              THEN CURRENT_TIMESTAMP 
              ELSE completion_date 
            END,    
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3 AND course_id = $4
        `;

        await client.query(updateEnrollmentQuery, [
          progressPercentage.toFixed(2),
          isEnrollmentCompleted,
          userId,
          quiz.course_id
        ]);
      }

      // ========================================
      // 5.5. Check and update module completion (if quiz belongs to a section)
      // This runs after EVERY quiz submission (pass or fail) to update module status
      // ========================================
      let moduleCompletionStatus = null;
      if (quiz.section_id) {
        console.log(`\n🔍 Checking module completion for section ${quiz.section_id} after quiz ${isPassed ? 'PASS' : 'FAIL'}`);
        moduleCompletionStatus = await checkAndUpdateModuleCompletion(
          client, 
          userId, 
          quiz.course_id, 
          quiz.section_id
        );
        
        if (moduleCompletionStatus) {
          console.log(`✅ Module completion check completed:`, {
            sectionId: quiz.section_id,
            isCompleted: moduleCompletionStatus.isCompleted,
            videosProgress: `${moduleCompletionStatus.completedVideos}/${moduleCompletionStatus.totalVideos}`,
            quizzesProgress: `${moduleCompletionStatus.passedQuizzes}/${moduleCompletionStatus.totalQuizzes}`,
            moduleProgressId: moduleCompletionStatus.moduleProgress?.id
          });
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      // ========================================
      // 6. Return response
      // ========================================
      // Calculate remaining attempts based on max_attempts
      const attemptsRemaining = Math.max(0, quiz.max_attempts - attemptNumber);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: "Quiz submitted successfully",
          data: {
            score,
            totalQuestions,
            correctAnswers: correctCount,
            isPassed,
            attemptNumber,
            attemptsRemaining,
            answers: gradedAnswers,
            moduleProgress: moduleCompletionStatus ? {
              section_id: quiz.section_id,
              is_completed: moduleCompletionStatus.isCompleted,
              completed_videos: moduleCompletionStatus.completedVideos,
              total_videos: moduleCompletionStatus.totalVideos,
              passed_quizzes: moduleCompletionStatus.passedQuizzes,
              total_quizzes: moduleCompletionStatus.totalQuizzes
            } : null
          }
        })
      };

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Error submitting quiz:", error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while submitting quiz",
        error: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
    
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error("Error closing database connection:", e);
      }
    }
  }
};
