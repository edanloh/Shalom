/**
 * Lambda Function: Get Available Students (Not Enrolled in Course)
 * Endpoint: GET /courses/{courseId}/available-students
 * Description: Retrieves all students who are not enrolled in the specified course
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

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
  const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME });
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

/**
 * Lambda handler
 */
export const handler = async (event) => {
  // Handle OPTIONS preflight request
  if (event.httpMethod === "OPTIONS" || event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "OK" })
    };
  }

  let client;
  
  try {
    // Extract courseId from path parameters
    const courseId = event.pathParameters?.courseId;
    
    if (!courseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: 'Course ID is required'
        })
      };
    }
    
    const secret = await getDbCredentials();
    
    // Updated connection config for Supabase (matching getUserEnrollment pattern)
    const connectionConfig = {
      host: secret.host?.trim(),
      port: parseInt(secret.port) || 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4 // Force IPv4
    };
    
    client = new Client(connectionConfig);
    
    await client.connect();
    
    // Query to get students not enrolled in this course
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT ce.course_id) as total_enrollments,
        COALESCE(AVG(ce.progress_percentage), 0) as average_progress
      FROM users u
      LEFT JOIN course_enrollments ce ON u.id = ce.user_id
      WHERE u.role = 'student'
        AND u.id NOT IN (
          SELECT user_id 
          FROM course_enrollments 
          WHERE course_id = $1
        )
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name ASC
    `;
    
    const result = await client.query(query, [courseId]);
    
    // Format the response
    const availableStudents = result.rows.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      totalEnrollments: parseInt(student.total_enrollments || 0),
      averageProgress: Math.round(parseFloat(student.average_progress || 0))
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: {
          courseId,
          availableStudents,
          totalAvailable: availableStudents.length
        }
      })
    };
    
  } catch (error) {
    console.error('Error fetching available students:', error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'An error occurred while retrieving available students',
        error: error.message || "Unknown error",
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      })
    };
    
  } finally {
    if (client) {
      await client.end().catch(e => console.error("Error closing PG client:", e));
    }
  }
};
