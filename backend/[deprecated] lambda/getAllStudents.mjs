/**
 * Lambda Function: Get All Students
 * Endpoint: GET /students
 * Description: Retrieves all users with role='student' with their enrollment statistics
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
 * Helper function to format last activity timestamp
 */
const formatLastActive = (hours) => {
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)} ${Math.floor(hours) === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

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
    
    // Query to get all students with their enrollment statistics
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.is_active,
        u.created_at as enrolled_date,
        COUNT(DISTINCT ce.course_id) as courses_enrolled,
        COUNT(DISTINCT CASE WHEN ce.is_completed = true THEN ce.course_id END) as completed_courses,
        COALESCE(AVG(ce.progress_percentage), 0) as overall_progress,
        MAX(ce.updated_at) as last_activity,
        COALESCE(SUM(ce.total_watch_time_minutes), 0) as total_study_hours,
        COALESCE(AVG(
          CASE 
            WHEN ce.updated_at > NOW() - INTERVAL '7 days' THEN 100
            WHEN ce.updated_at > NOW() - INTERVAL '14 days' THEN 70
            WHEN ce.updated_at > NOW() - INTERVAL '30 days' THEN 50
            ELSE 30
          END
        ), 0) as engagement_score
      FROM users u
      LEFT JOIN course_enrollments ce ON u.id = ce.user_id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.email, u.is_active, u.created_at
      ORDER BY last_activity DESC NULLS LAST
    `;
    
    const result = await client.query(query);
    
    // Format the response
    const students = result.rows.map(student => {
      const lastActivity = student.last_activity 
        ? formatLastActive((Date.now() - new Date(student.last_activity).getTime()) / (1000 * 60 * 60))
        : 'Never';
      
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        enabled: student.is_active !== false, // Map is_active to enabled, default to true if null
        enrolledDate: student.enrolled_date ? new Date(student.enrolled_date).toISOString().split('T')[0] : 'N/A',
        progress: Math.round(parseFloat(student.overall_progress || 0)),
        lastActivity: lastActivity,
        engagement: Math.round(parseFloat(student.engagement_score || 0)),
        coursesEnrolled: parseInt(student.courses_enrolled || 0),
        completedCourses: parseInt(student.completed_courses || 0),
        totalHours: Math.round(parseFloat(student.total_study_hours || 0) / 60), // Convert minutes to hours
      };
    });
    
    // Calculate summary statistics
    const statistics = {
      total_students: students.length,
      active_students: students.filter(s => s.engagement >= 70).length,
      engaged_students: students.filter(s => s.engagement >= 50 && s.engagement < 70).length,
      at_risk_students: students.filter(s => s.engagement < 50).length,
      average_progress: students.length > 0 
        ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length)
        : 0,
      average_engagement: students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.engagement, 0) / students.length)
        : 0,
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: {
          students,
          statistics
        }
      })
    };
    
  } catch (error) {
    console.error('Error fetching students:', error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'An error occurred while retrieving students',
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
