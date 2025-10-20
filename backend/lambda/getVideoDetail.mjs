/**
 * AWS Lambda Function: getVideoDetail
 * Purpose: Fetch video details with navigation (prev/next) and user progress
 * Endpoint: GET /videos/{videoId}?userId={userId}
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
    const videoId = event.pathParameters?.videoId;
    const userId = event.queryStringParameters?.userId || null;

    if (!videoId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "videoId is required" 
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
    // 1. Fetch video details with course and section info
    // ========================================
    const videoQuery = `
      SELECT 
        v.id, v.title, v.description, v.video_url, v.duration_seconds,
        v.thumbnail_url, v.is_preview, v.order_index,
        v.course_id, v.section_id,
        c.title as course_title,
        s.title as section_title
      FROM course_videos v
      JOIN courses c ON v.course_id = c.id
      JOIN course_sections s ON v.section_id = s.id
      WHERE v.id = $1
    `;
    
    const videoResult = await client.query(videoQuery, [videoId]);

    if (videoResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "Video not found" 
        })
      };
    }

    const video = videoResult.rows[0];

    // ========================================
    // 2. Fetch navigation (previous and next videos in same section)
    // ========================================
    const navigationQuery = `
      SELECT id, title, order_index
      FROM course_videos
      WHERE section_id = $1 AND course_id = $2
      ORDER BY order_index ASC
    `;
    
    const navigationResult = await client.query(navigationQuery, [
      video.section_id,
      video.course_id
    ]);

    const allVideos = navigationResult.rows;
    const currentIndex = allVideos.findIndex(v => v.id === videoId);
    
    const previousVideo = currentIndex > 0 
      ? { id: allVideos[currentIndex - 1].id, title: allVideos[currentIndex - 1].title }
      : null;
    
    const nextVideo = currentIndex < allVideos.length - 1
      ? { id: allVideos[currentIndex + 1].id, title: allVideos[currentIndex + 1].title }
      : null;

    // ========================================
    // 3. Fetch user progress if userId provided
    // ========================================
    let userProgress = null;
    
    if (userId) {
      try {
        const progressQuery = `
          SELECT 
            watch_time_seconds, 
            is_completed, 
            last_position_seconds,
            completed_at,
            updated_at
          FROM video_progress
          WHERE user_id = $1 AND video_id = $2
        `;
        
        const progressResult = await client.query(progressQuery, [userId, videoId]);

        if (progressResult.rows.length > 0) {
          userProgress = progressResult.rows[0];
        }
      } catch (progressError) {
        console.error('Error fetching user progress:', progressError);
        // Continue without progress data
      }
    }

    // ========================================
    // 4. Construct response
    // ========================================
    const responseData = {
      id: video.id,
      title: video.title,
      description: video.description,
      video_url: video.video_url,
      duration_seconds: video.duration_seconds,
      thumbnail_url: video.thumbnail_url,
      is_preview: video.is_preview,
      course: {
        id: video.course_id,
        title: video.course_title
      },
      section: {
        id: video.section_id,
        title: video.section_title
      },
      navigation: {
        previousVideo,
        nextVideo
      },
      userProgress
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Video details retrieved successfully",
        data: responseData
      })
    };

  } catch (error) {
    console.error("Error retrieving video details:", error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while retrieving video details",
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
