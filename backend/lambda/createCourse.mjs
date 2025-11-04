/**
 * AWS Lambda Function: createCourse
 * Purpose: Create a new course with category auto-creation and instructor assignment
 * Endpoint: POST /courses
 * Database: PostgreSQL (Supabase compatible)
 */
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

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
    const body = JSON.parse(event.body || "{}");
    const {
      title,
      description,
      category,
      level = "Beginner",
      instructorId,
      instructorName,
      thumbnailUrl,
      durationHours = 0,
      tags = [],
      modules = [], // Array of modules with lessons and quizzes
      outcomes = [], // Learning outcomes
      requirements = [] // Prerequisites
    } = body;

    if (!title || !instructorId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Title and Instructor ID are required"
        })
      };
    }

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

    // Get or create category
    let categoryId;
    if (category) {
      const categoryQuery = `
        SELECT id FROM categories WHERE name = $1
      `;
      const categoryResult = await client.query(categoryQuery, [category]);
      
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
          category,
          `${category} courses`,
          '#6366F1' // Default purple color
        ]);
        categoryId = newCategory.rows[0].id;
      }
    }

    // Create course
    const createCourseQuery = `
      INSERT INTO courses (
        title,
        description,
        category_id,
        level,
        instructor_name,
        thumbnail_url,
        duration_hours,
        tags,
        is_published,
        rating,
        student_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 0, 0)
      RETURNING *
    `;

    const result = await client.query(createCourseQuery, [
      title,
      description || '',
      categoryId,
      level,
      instructorName || 'Shalom Instructor',
      thumbnailUrl || null,
      durationHours,
      tags
    ]);

    const course = result.rows[0];

    // Insert modules (sections) with their lessons and quizzes
    const createdModules = [];
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      
      // Create section
      const sectionQuery = `
        INSERT INTO course_sections (course_id, title, description, order_index)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const sectionResult = await client.query(sectionQuery, [
        course.id,
        module.title,
        module.description || '',
        module.order ?? i
      ]);
      const section = sectionResult.rows[0];

      // Create lessons (videos) for this section
      const createdLessons = [];
      const lessons = module.lessons || [];
      for (let j = 0; j < lessons.length; j++) {
        const lesson = lessons[j];
        const lessonQuery = `
          INSERT INTO course_videos (
            course_id,
            section_id, 
            title, 
            description,
            video_url, 
            duration_seconds,
            order_index,
            is_preview
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const lessonResult = await client.query(lessonQuery, [
          course.id,
          section.id,
          lesson.title,
          lesson.content || '', // Store content in description field
          lesson.videoUrl || '', // video_url
          (lesson.durationMinutes || 0) * 60, // Convert minutes to seconds
          lesson.order ?? j,
          lesson.isPreview || false
        ]);
        createdLessons.push(lessonResult.rows[0]);
      }

      // Create quizzes for this section
      const createdQuizzes = [];
      const quizzes = module.quizzes || [];
      for (let k = 0; k < quizzes.length; k++) {
        const quiz = quizzes[k];
        
        // Create quiz without questions column (use normalized table)
        const quizQuery = `
          INSERT INTO course_quizzes (
            course_id,
            section_id,
            title,
            description,
            passing_score,
            order_index,
            time_limit_minutes,
            max_attempts
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const quizResult = await client.query(quizQuery, [
          course.id,
          section.id,
          quiz.title,
          quiz.description || '',
          quiz.passingScore || 70,
          quiz.order ?? k,
          quiz.timeLimitMinutes || 30,
          quiz.maxAttempts || 3
        ]);
        const createdQuiz = quizResult.rows[0];

        // Create questions in quiz_questions table
        const questions = quiz.questions || [];
        const createdQuestions = [];
        for (let q = 0; q < questions.length; q++) {
          const question = questions[q];
          
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
          
          const questionQuery = `
            INSERT INTO quiz_questions (
              quiz_id,
              question,
              question_type,
              options,
              correct_answer,
              explanation,
              points,
              order_index
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `;
          const questionResult = await client.query(questionQuery, [
            createdQuiz.id,
            question.text || '',
            questionType,
            JSON.stringify(question.options || []),
            String(question.correctAnswer || ''), // Convert to string
            question.explanation || question.sampleAnswer || '',
            question.points || 1,
            q
          ]);
          createdQuestions.push(questionResult.rows[0]);
        }

        createdQuizzes.push({
          ...createdQuiz,
          questions: createdQuestions
        });
      }

      createdModules.push({
        ...section,
        lessons: createdLessons,
        quizzes: createdQuizzes
      });
    }

    // Insert learning outcomes
    for (let i = 0; i < outcomes.length; i++) {
      await client.query(
        `INSERT INTO course_outcomes (course_id, outcome, order_index) VALUES ($1, $2, $3)`,
        [course.id, outcomes[i], i]
      );
    }

    // Insert requirements
    for (let i = 0; i < requirements.length; i++) {
      await client.query(
        `INSERT INTO course_requirements (course_id, requirement, order_index) VALUES ($1, $2, $3)`,
        [course.id, requirements[i], i]
      );
    }

    // Get category details
    const categoryDetailsQuery = `
      SELECT name, color FROM categories WHERE id = $1
    `;
    const categoryDetails = await client.query(categoryDetailsQuery, [categoryId]);

    const enrichedCourse = {
      ...course,
      courseid: course.id,
      category_name: categoryDetails.rows[0]?.name,
      category_color: categoryDetails.rows[0]?.color,
      modules: createdModules,
      created_at: course.created_at,
      updated_at: course.updated_at
    };

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Course created successfully with modules",
        data: {
          course: enrichedCourse
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown",
          modulesCreated: createdModules.length,
          lessonsCreated: createdModules.reduce((sum, m) => sum + m.lessons.length, 0),
          quizzesCreated: createdModules.reduce((sum, m) => sum + m.quizzes.length, 0)
        }
      })
    };

  } catch (error) {
    console.error("Error creating course:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to create course",
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
