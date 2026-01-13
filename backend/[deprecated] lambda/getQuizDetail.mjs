/**
 * AWS Lambda Function: getQuizDetail
 * Purpose: Fetch quiz questions and user's previous attempts
 * Endpoint: GET /quizzes/{quizId}?userId={userId}
 * Database: PostgreSQL (Supabase compatible)
 */
import { Client } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
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

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  let client;
  
  try {
    // Extract parameters
    const quizId = event.pathParameters?.quizId;
    const userId = event.queryStringParameters?.userId || null;

    if (!quizId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "quizId is required" 
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

    // ========================================
    // 1. Fetch quiz details with course and section info
    // ========================================
    const quizQuery = `
      SELECT 
        q.id, q.title, q.description, q.passing_score,
        q.time_limit_minutes, q.max_attempts, q.order_index,
        q.course_id, q.section_id,
        c.title as course_title,
        s.title as section_title
      FROM course_quizzes q
      JOIN courses c ON q.course_id = c.id
      JOIN course_sections s ON q.section_id = s.id
      WHERE q.id = $1
    `;
    
    const quizResult = await client.query(quizQuery, [quizId]);

    if (quizResult.rows.length === 0) {
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

    // ========================================
    // 2. Fetch quiz questions with options
    // ========================================
    const questionsQuery = `
      SELECT 
        id,
        question as question_text,
        question_type,
        options,
        correct_answer,
        explanation,
        points,
        order_index
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY order_index ASC
    `;
    
    const questionsResult = await client.query(questionsQuery, [quizId]);

    // ========================================
    // 3. Fetch user attempts if userId provided
    // ========================================
    let userAttempts = [];
    
    if (userId) {
      try {
        const attemptsQuery = `
          SELECT 
            attempt_number,
            score,
            is_passed,
            completed_at
          FROM quiz_attempts
          WHERE user_id = $1 AND quiz_id = $2
          ORDER BY attempt_number DESC
        `;
        
        const attemptsResult = await client.query(attemptsQuery, [userId, quizId]);
        userAttempts = attemptsResult.rows;
      } catch (attemptsError) {
        console.error('Error fetching user attempts:', attemptsError);
        // Continue without attempts data
      }
    }

    // ========================================
    // 4. Construct response
    // ========================================
    const responseData = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passing_score: quiz.passing_score,
      time_limit_minutes: quiz.time_limit_minutes,
      max_attempts: quiz.max_attempts,
      course: {
        id: quiz.course_id,
        title: quiz.course_title
      },
      section: {
        id: quiz.section_id,
        title: quiz.section_title
      },
      questions: questionsResult.rows,
      userAttempts
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Quiz details retrieved successfully",
        data: responseData
      })
    };

  } catch (error) {
    console.error("Error retrieving quiz details:", error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while retrieving quiz details",
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
