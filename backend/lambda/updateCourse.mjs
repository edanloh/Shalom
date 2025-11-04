/**
 * AWS Lambda Function: updateCourse
 * Purpose: Update existing course details with dynamic field updates and category management
 * Endpoint: PUT /courses/{courseId}
 * Database: PostgreSQL (Supabase compatible)
 */
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "PUT,OPTIONS",
  "Content-Type": "application/json"
};

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-southeast-1"
});

let cachedSecret = null;

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME });
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  let client;

  try {
    const { courseId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");

    if (!courseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Course ID is required"
        })
      };
    }

    // Extract modules, outcomes, requirements for separate handling
    const { modules, outcomes, requirements, ...courseFields } = body;

    const secret = await getDbCredentials();

    const connectionConfig = {
      host: secret.host?.trim(),
      port: 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    };

    client = new Client(connectionConfig);
    await client.connect();

    // Build dynamic UPDATE query for course fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (courseFields.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(courseFields.title);
    }
    if (courseFields.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(courseFields.description);
    }
    if (courseFields.level !== undefined) {
      updates.push(`level = $${paramIndex++}`);
      values.push(courseFields.level);
    }
    if (courseFields.instructorName !== undefined) {
      updates.push(`instructor_name = $${paramIndex++}`);
      values.push(courseFields.instructorName);
    }
    if (courseFields.thumbnailUrl !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex++}`);
      values.push(courseFields.thumbnailUrl);
    }
    if (courseFields.durationHours !== undefined) {
      updates.push(`duration_hours = $${paramIndex++}`);
      values.push(courseFields.durationHours);
    }
    if (courseFields.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(courseFields.tags);
    }
    if (courseFields.isPublished !== undefined) {
      updates.push(`is_published = $${paramIndex++}`);
      values.push(courseFields.isPublished);
    }

    // Handle category update
    if (courseFields.category) {
      const categoryQuery = `
        SELECT id FROM categories WHERE name = $1
      `;
      const categoryResult = await client.query(categoryQuery, [courseFields.category]);
      
      let categoryId;
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      } else {
        // Create new category
        const createCategoryQuery = `
          INSERT INTO categories (name, description, color)
          VALUES ($1, $2, $3)
          RETURNING id
        `;
        const newCategory = await client.query(createCategoryQuery, [
          courseFields.category,
          `${courseFields.category} courses`,
          '#6366F1'
        ]);
        categoryId = newCategory.rows[0].id;
      }
      updates.push(`category_id = $${paramIndex++}`);
      values.push(categoryId);
    }

    // Update course if there are fields to update
    let course;
    if (updates.length > 0) {
      // Always update updated_at
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(courseId);
      const updateQuery = `
        UPDATE courses
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            message: "Course not found"
          })
        };
      }

      course = result.rows[0];
    } else {
      // Just fetch existing course if no updates
      const fetchQuery = `SELECT * FROM courses WHERE id = $1`;
      const fetchResult = await client.query(fetchQuery, [courseId]);
      if (fetchResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            message: "Course not found"
          })
        };
      }
      course = fetchResult.rows[0];
    }

    // Update modules if provided - PRESERVE STUDENT PROGRESS
    if (modules && Array.isArray(modules)) {
      // Get existing section IDs for this course
      const existingSectionsResult = await client.query(
        `SELECT id FROM course_sections WHERE course_id = $1`,
        [courseId]
      );
      const existingSectionIds = existingSectionsResult.rows.map(r => r.id);
      const processedSectionIds = [];

      // Process each module (section)
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        let sectionId;
        
        if (module.id && existingSectionIds.includes(module.id)) {
          // UPDATE existing section - preserves user_module_progress
          await client.query(
            `UPDATE course_sections 
             SET title = $1, description = $2, section_order = $3
             WHERE id = $4`,
            [module.title, module.description || '', i, module.id]
          );
          sectionId = module.id;
        } else {
          // INSERT new section
          const sectionResult = await client.query(
            `INSERT INTO course_sections (course_id, title, description, section_order)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [courseId, module.title, module.description || '', i]
          );
          sectionId = sectionResult.rows[0].id;
        }
        
        processedSectionIds.push(sectionId);

        // Handle lessons (videos) for this section
        const existingVideosResult = await client.query(
          `SELECT id FROM course_videos WHERE section_id = $1`,
          [sectionId]
        );
        const existingVideoIds = existingVideosResult.rows.map(r => r.id);
        const processedVideoIds = [];

        const lessons = module.lessons || [];
        for (let j = 0; j < lessons.length; j++) {
          const lesson = lessons[j];
          
          if (lesson.id && existingVideoIds.includes(lesson.id)) {
            // UPDATE existing video - preserves user video progress
            await client.query(
              `UPDATE course_videos 
               SET title = $1, description = $2, video_url = $3, 
                   duration_seconds = $4, order_index = $5, is_preview = $6,
                   thumbnail_url = $7
               WHERE id = $8`,
              [
                lesson.title,
                lesson.content || '',
                lesson.videoUrl || '',
                (lesson.durationMinutes || 0) * 60,
                lesson.order ?? j,
                lesson.isPreview || false,
                lesson.thumbnailUrl || null,
                lesson.id
              ]
            );
            processedVideoIds.push(lesson.id);
          } else {
            // INSERT new video
            const videoResult = await client.query(
              `INSERT INTO course_videos (
                course_id, section_id, title, description, 
                video_url, duration_seconds, order_index, is_preview, thumbnail_url
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING id`,
              [
                courseId,
                sectionId,
                lesson.title,
                lesson.content || '',
                lesson.videoUrl || '',
                (lesson.durationMinutes || 0) * 60,
                lesson.order ?? j,
                lesson.isPreview || false,
                lesson.thumbnailUrl || null
              ]
            );
            processedVideoIds.push(videoResult.rows[0].id);
          }
        }

        // Delete videos that were removed from this section
        const videosToDelete = existingVideoIds.filter(id => !processedVideoIds.includes(id));
        if (videosToDelete.length > 0) {
          await client.query(
            `DELETE FROM course_videos WHERE id = ANY($1)`,
            [videosToDelete]
          );
        }

        // Handle quizzes for this section
        const existingQuizzesResult = await client.query(
          `SELECT id FROM course_quizzes WHERE section_id = $1`,
          [sectionId]
        );
        const existingQuizIds = existingQuizzesResult.rows.map(r => r.id);
        const processedQuizIds = [];

        const quizzes = module.quizzes || [];
        for (let k = 0; k < quizzes.length; k++) {
          const quiz = quizzes[k];
          let quizId;
          
          if (quiz.id && existingQuizIds.includes(quiz.id)) {
            // UPDATE existing quiz - preserves user_quiz_attempts
            await client.query(
              `UPDATE course_quizzes 
               SET title = $1, description = $2, passing_score = $3, 
                   order_index = $4, time_limit_minutes = $5, max_attempts = $6
               WHERE id = $7`,
              [
                quiz.title,
                quiz.description || '',
                quiz.passingScore || 70,
                quiz.order ?? k,
                quiz.timeLimitMinutes || 30,
                quiz.maxAttempts || 3,
                quiz.id
              ]
            );
            quizId = quiz.id;
          } else {
            // INSERT new quiz
            const quizResult = await client.query(
              `INSERT INTO course_quizzes (
                course_id, section_id, title, description, 
                passing_score, order_index, time_limit_minutes, max_attempts
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id`,
              [
                courseId,
                sectionId,
                quiz.title,
                quiz.description || '',
                quiz.passingScore || 70,
                quiz.order ?? k,
                quiz.timeLimitMinutes || 30,
                quiz.maxAttempts || 3
              ]
            );
            quizId = quizResult.rows[0].id;
          }
          
          processedQuizIds.push(quizId);

          // Handle quiz questions
          const existingQuestionsResult = await client.query(
            `SELECT id FROM quiz_questions WHERE quiz_id = $1`,
            [quizId]
          );
          const existingQuestionIds = existingQuestionsResult.rows.map(r => r.id);
          const processedQuestionIds = [];

          const questions = quiz.questions || [];
          for (let q = 0; q < questions.length; q++) {
            const question = questions[q];
            
            if (question.id && existingQuestionIds.includes(question.id)) {
              // UPDATE existing question
              // Normalize question type: 'multiple-correct' -> 'multiple-choice' (DB uses hyphens)
              let questionType = question.type || 'multiple-choice';
              if (questionType === 'multiple-correct') {
                // Multiple correct is still multiple-choice in DB
                questionType = 'multiple-choice';
              } else if (questionType === 'short-answer') {
                // Short answer is 'text' in DB
                questionType = 'text';
              } else if (questionType === 'matching') {
                // Matching is 'text' in DB
                questionType = 'text';
              }
              // Keep hyphens: 'multiple-choice', 'true-false', 'text'
              
              await client.query(
                `UPDATE quiz_questions 
                 SET question = $1, question_type = $2, options = $3,
                     correct_answer = $4, explanation = $5, points = $6, order_index = $7
                 WHERE id = $8`,
                [
                  question.text || question.question || '',
                  questionType,
                  JSON.stringify(question.options || []),
                  String(question.correctAnswer || question.correct_answer || ''),
                  question.explanation || question.sampleAnswer || '',
                  question.points || 1,
                  q,
                  question.id
                ]
              );
              processedQuestionIds.push(question.id);
            } else {
              // INSERT new question
              // Normalize question type: 'multiple-correct' -> 'multiple-choice' (DB uses hyphens)
              let questionType = question.type || 'multiple-choice';
              if (questionType === 'multiple-correct') {
                // Multiple correct is still multiple-choice in DB
                questionType = 'multiple-choice';
              } else if (questionType === 'short-answer') {
                // Short answer is 'text' in DB
                questionType = 'text';
              } else if (questionType === 'matching') {
                // Matching is 'text' in DB
                questionType = 'text';
              }
              // Keep hyphens: 'multiple-choice', 'true-false', 'text'
              
              const questionResult = await client.query(
                `INSERT INTO quiz_questions (
                  quiz_id, question, question_type, options,
                  correct_answer, explanation, points, order_index
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`,
                [
                  quizId,
                  question.text || question.question || '',
                  questionType,
                  JSON.stringify(question.options || []),
                  String(question.correctAnswer || question.correct_answer || ''),
                  question.explanation || question.sampleAnswer || '',
                  question.points || 1,
                  q
                ]
              );
              processedQuestionIds.push(questionResult.rows[0].id);
            }
          }

          // Delete questions that were removed
          const questionsToDelete = existingQuestionIds.filter(id => !processedQuestionIds.includes(id));
          if (questionsToDelete.length > 0) {
            await client.query(
              `DELETE FROM quiz_questions WHERE id = ANY($1)`,
              [questionsToDelete]
            );
          }
        }

        // Delete quizzes that were removed from this section
        const quizzesToDelete = existingQuizIds.filter(id => !processedQuizIds.includes(id));
        if (quizzesToDelete.length > 0) {
          // Delete quiz attempts for removed quizzes
          await client.query(
            `DELETE FROM user_quiz_attempts WHERE quiz_id = ANY($1)`,
            [quizzesToDelete]
          );
          await client.query(
            `DELETE FROM course_quizzes WHERE id = ANY($1)`,
            [quizzesToDelete]
          );
        }
      }

      // Delete sections that were completely removed
      const sectionsToDelete = existingSectionIds.filter(id => !processedSectionIds.includes(id));
      if (sectionsToDelete.length > 0) {
        // Delete user progress for removed sections
        await client.query(
          `DELETE FROM user_module_progress WHERE section_id = ANY($1)`,
          [sectionsToDelete]
        );
        // Cascade will handle videos and quizzes
        await client.query(
          `DELETE FROM course_sections WHERE id = ANY($1)`,
          [sectionsToDelete]
        );
      }
    }

    // Update outcomes if provided
    if (outcomes && Array.isArray(outcomes)) {
      await client.query(`DELETE FROM course_outcomes WHERE course_id = $1`, [courseId]);
      for (let i = 0; i < outcomes.length; i++) {
        await client.query(
          `INSERT INTO course_outcomes (course_id, outcome, order_index) VALUES ($1, $2, $3)`,
          [courseId, outcomes[i], i]
        );
      }
    }

    // Update requirements if provided
    if (requirements && Array.isArray(requirements)) {
      await client.query(`DELETE FROM course_requirements WHERE course_id = $1`, [courseId]);
      for (let i = 0; i < requirements.length; i++) {
        await client.query(
          `INSERT INTO course_requirements (course_id, requirement, order_index) VALUES ($1, $2, $3)`,
          [courseId, requirements[i], i]
        );
      }
    }

    // Get category details
    let enrichedCourse = {
      ...course,
      courseid: course.id
    };

    if (course.category_id) {
      const categoryDetailsQuery = `
        SELECT name, color FROM categories WHERE id = $1
      `;
      const categoryDetails = await client.query(categoryDetailsQuery, [course.category_id]);
      enrichedCourse.category_name = categoryDetails.rows[0]?.name;
      enrichedCourse.category_color = categoryDetails.rows[0]?.color;
    }

    // Get updated modules if they were updated
    if (modules) {
      const modulesQuery = `
        SELECT 
          cs.id,
          cs.title,
          cs.description,
          cs.section_order,
          COALESCE(
            json_agg(
              jsonb_build_object(
                'id', cv.id,
                'title', cv.title,
                'content', cv.description,
                'videoUrl', cv.video_url,
                'order', cv.order_index,
                'durationMinutes', FLOOR(cv.duration_seconds / 60),
                'isPreview', cv.is_preview
              ) ORDER BY cv.order_index
            ) FILTER (WHERE cv.id IS NOT NULL),
            '[]'::json
          ) as lessons,
          COALESCE(
            json_agg(
              jsonb_build_object(
                'id', cq.id,
                'title', cq.title,
                'passingScore', cq.passing_score,
                'order', cq.order_index
              ) ORDER BY cq.order_index
            ) FILTER (WHERE cq.id IS NOT NULL),
            '[]'::json
          ) as quizzes
        FROM course_sections cs
        LEFT JOIN course_videos cv ON cs.id = cv.section_id
        LEFT JOIN course_quizzes cq ON cs.id = cq.section_id
        WHERE cs.course_id = $1
        GROUP BY cs.id, cs.title, cs.description, cs.section_order
        ORDER BY cs.section_order
      `;
      const modulesResult = await client.query(modulesQuery, [courseId]);
      enrichedCourse.modules = modulesResult.rows;
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Course updated successfully",
        data: {
          course: enrichedCourse
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown",
          modulesUpdated: modules ? modules.length : 0
        }
      })
    };

  } catch (error) {
    console.error("Error updating course:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to update course",
        error: error.message,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      })
    };
  } finally {
    if (client) await client.end().catch(e => console.error("Error closing PG client:", e));
  }
};
