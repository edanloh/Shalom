/**
 * AWS Lambda Function: updateVideoProgress
 * Purpose: Update user's video watch progress and course completion
 * Endpoint: POST /courses/{courseId}/module/videos/progress
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "videoId": "uuid",
 *   "watchTimeSeconds": 450,
 *   "isCompleted": false,
 *   "lastPositionSeconds": 450
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
    
    console.log(`Section ${sectionId}: ${total_videos} videos, ${total_quizzes} quizzes`);
    
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
    console.log(`   Videos: ${completed_videos}/${total_videos} (${completed_videos === total_videos ? '✅ All complete' : '❌ Incomplete'})`);
    console.log(`   Quizzes: ${passed_quizzes}/${total_quizzes} (${passed_quizzes === total_quizzes ? '✅ All passed' : '❌ Not all passed'})`);
    
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
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, videoId, watchTimeSeconds, isCompleted, lastPositionSeconds } = body;

    // Validate required fields
    if (!userId || !videoId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "userId and videoId are required" 
        })
      };
    }

    if (watchTimeSeconds === undefined || lastPositionSeconds === undefined) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "watchTimeSeconds and lastPositionSeconds are required" 
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
      // 1. Get video and course info
      // ========================================
      const videoInfoQuery = `
        SELECT course_id, duration_seconds, section_id
        FROM course_videos
        WHERE id = $1
      `;
      
      const videoInfoResult = await client.query(videoInfoQuery, [videoId]);

      if (videoInfoResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            success: false, 
            message: "Video not found" 
          })
        };
      }

      const { course_id, duration_seconds, section_id } = videoInfoResult.rows[0];

      // Log video details
      console.log('🎬 Video info:', {
        videoId,
        courseId: course_id,
        sectionId: section_id,
        duration: duration_seconds,
      });

      console.log('📊 Progress update request:', {
        userId,
        watchTimeSeconds,
        lastPositionSeconds,
        isCompleted,
        watchPercentage: duration_seconds > 0 
          ? ((watchTimeSeconds / duration_seconds) * 100).toFixed(2) + '%' 
          : 'N/A'
      });

      // ========================================
      // 2. Upsert video progress
      // ========================================
      const upsertProgressQuery = `
        INSERT INTO video_progress (
          user_id, video_id, watch_time_seconds, is_completed, 
          last_position_seconds, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, video_id)
        DO UPDATE SET
          watch_time_seconds = EXCLUDED.watch_time_seconds,
          is_completed = CASE
            WHEN video_progress.is_completed = true THEN true
            ELSE EXCLUDED.is_completed
          END,
          last_position_seconds = EXCLUDED.last_position_seconds,
          completed_at = CASE 
            WHEN EXCLUDED.is_completed = true AND video_progress.completed_at IS NULL 
            THEN EXCLUDED.completed_at 
            ELSE video_progress.completed_at 
          END,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const completedAt = isCompleted ? new Date().toISOString() : null;

      const progressResult = await client.query(upsertProgressQuery, [
        userId,
        videoId,
        watchTimeSeconds,
        isCompleted || false,
        lastPositionSeconds,
        completedAt
      ]);

      console.log('✅ Video progress saved to DB:', {
        videoId: progressResult.rows[0].video_id,
        watchTime: progressResult.rows[0].watch_time_seconds,
        lastPosition: progressResult.rows[0].last_position_seconds,
        isCompleted: progressResult.rows[0].is_completed,
        completedAt: progressResult.rows[0].completed_at
      });

      // ========================================
      // 3. Update course enrollment progress
      // ========================================
      // Get total videos and completed videos count
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT cv.id) as total_videos,
          COUNT(DISTINCT CASE WHEN vp.is_completed = true THEN cv.id END) as completed_videos
        FROM course_videos cv
        LEFT JOIN video_progress vp ON cv.id = vp.video_id AND vp.user_id = $1
        WHERE cv.course_id = $2
      `;

      const statsResult = await client.query(statsQuery, [userId, course_id]);
      const { total_videos, completed_videos } = statsResult.rows[0];

      // Calculate progress percentage
      const progressPercentage = total_videos > 0 
        ? (parseInt(completed_videos) / parseInt(total_videos)) * 100 
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
          current_video_id = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND course_id = $5
        RETURNING *
      `;

      const enrollmentResult = await client.query(updateEnrollmentQuery, [
        progressPercentage.toFixed(2),
        isEnrollmentCompleted,
        videoId,
        userId,
        course_id
      ]);

      // ========================================
      // 3.5. Check and update module completion (if video belongs to a section)
      // ========================================
      let moduleCompletionStatus = null;
      if (section_id) {
        moduleCompletionStatus = await checkAndUpdateModuleCompletion(
          client, 
          userId, 
          course_id, 
          section_id
        );
        console.log('Module completion status:', moduleCompletionStatus);
      }

      // Commit transaction
      await client.query('COMMIT');

      // ========================================
      // 4. Return response
      // ========================================
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: "Video progress updated successfully",
          data: {
            videoProgress: progressResult.rows[0],
            courseProgress: {
              progress_percentage: progressPercentage.toFixed(2),
              is_completed: isEnrollmentCompleted,
              completed_videos: parseInt(completed_videos),
              total_videos: parseInt(total_videos)
            },
            moduleProgress: moduleCompletionStatus ? {
              section_id: section_id,
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
    console.error("Error updating video progress:", error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while updating video progress",
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
