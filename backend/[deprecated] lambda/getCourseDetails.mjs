// import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
// import { Client } from "pg";

// const CORS_HEADERS = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "Content-Type,Authorization",
//   "Access-Control-Allow-Methods": "GET,OPTIONS",
//   "Content-Type": "application/json"
// };

// const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
// let cachedSecret = null;

// async function getDbCredentials() {
//   if (cachedSecret) return cachedSecret;
//   const command = new GetSecretValueCommand({
//     SecretId: process.env.DB_SECRET_NAME
//   });
//   const response = await secretsClient.send(command);
//   cachedSecret = JSON.parse(response.SecretString);
//   return cachedSecret;
// }

// export const handler = async (event) => {
//   console.log("Event:", JSON.stringify(event, null, 2));
  
//   if (event.httpMethod === "OPTIONS") {
//     return { statusCode: 200, headers: CORS_HEADERS, body: "" };
//   }
  
//   let client;
//   try {
//     const { userId } = event.pathParameters || {};
//     const queryParams = event.queryStringParameters || {};
//     const {
//       status, // 'active', 'completed'
//       progress_min,
//       progress_max,
//       limit = "20",
//       offset = "0",
//       sortBy = "enrollment_date",
//       sortOrder = "desc"
//     } = queryParams;
    
//     if (!userId) {
//       return {
//         statusCode: 400,
//         headers: CORS_HEADERS,
//         body: JSON.stringify({
//           success: false,
//           message: "User ID is required"
//         })
//       };
//     }
    
//     const secret = await getDbCredentials();
//     client = new Client({
//       host: process.env.RDS_HOST,
//       port: process.env.RDS_PORT ? parseInt(process.env.RDS_PORT) : 5432,
//       user: secret.username,
//       password: secret.password,
//       database: secret.dbname || process.env.RDS_DATABASE,
//       ssl: { rejectUnauthorized: false }
//     });
    
//     await client.connect();
    
//     let baseQuery = `
//       SELECT 
//         ce.id as enrollment_id,
//         ce.enrollment_date,
//         ce.completion_date,
//         ce.progress_percentage,
//         ce.is_completed,
//         ce.total_watch_time_minutes,
//         c.id as course_id,
//         c.title,
//         c.description,
//         c.instructor_name,
//         c.level,
//         c.duration_hours,
//         c.thumbnail_url,
//         c.rating,
//         c.student_count,
//         c.tags,
//         cat.name as category_name,
//         cat.color as category_color,
//         -- Calculate video progress
//         COALESCE(video_stats.total_videos, 0) as total_videos,
//         COALESCE(video_stats.completed_videos, 0) as completed_videos,
//         COALESCE(video_stats.total_watch_time, 0) as video_watch_time_seconds,
//         -- Calculate quiz progress
//         COALESCE(quiz_stats.total_quizzes, 0) as total_quizzes,
//         COALESCE(quiz_stats.passed_quizzes, 0) as passed_quizzes
//       FROM course_enrollments ce
//       JOIN courses c ON ce.course_id = c.id
//       JOIN categories cat ON c.category_id = cat.id
//       LEFT JOIN (
//         SELECT 
//           cv.course_id,
//           COUNT(*) as total_videos,
//           COUNT(CASE WHEN vp.is_completed = true THEN 1 END) as completed_videos,
//           SUM(COALESCE(vp.watch_time_seconds, 0)) as total_watch_time
//         FROM course_videos cv
//         LEFT JOIN video_progress vp ON cv.id = vp.video_id AND vp.user_id = $1
//         GROUP BY cv.course_id
//       ) video_stats ON c.id = video_stats.course_id
//       LEFT JOIN (
//         SELECT 
//           cq.course_id,
//           COUNT(DISTINCT cq.id) as total_quizzes,
//           COUNT(DISTINCT CASE WHEN qa.is_passed = true THEN qa.quiz_id END) as passed_quizzes
//         FROM course_quizzes cq
//         LEFT JOIN quiz_attempts qa ON cq.id = qa.quiz_id AND qa.user_id = $1
//         GROUP BY cq.course_id
//       ) quiz_stats ON c.id = quiz_stats.course_id
//       WHERE ce.user_id = $1
//     `;
    
//     const values = [userId];
//     const conditions = [];
    
//     // Status filter
//     if (status) {
//       switch (status) {
//         case 'completed':
//           conditions.push(`ce.is_completed = true`);
//           break;
//         case 'active':
//           conditions.push(`ce.is_completed = false`);
//           break;
//       }
//     }
    
//     // Progress filters
//     if (progress_min) {
//       values.push(parseFloat(progress_min));
//       conditions.push(`ce.progress_percentage >= $${values.length}`);
//     }
//     if (progress_max) {
//       values.push(parseFloat(progress_max));
//       conditions.push(`ce.progress_percentage <= $${values.length}`);
//     }
    
//     if (conditions.length > 0) {
//       baseQuery += " AND " + conditions.join(" AND ");
//     }
    
//     // Sorting
//     const allowedSortFields = ["enrollment_date", "progress_percentage", "title", "completion_date"];
//     const sanitizedSortBy = allowedSortFields.includes(sortBy) ?
//       (sortBy === "title" ? "c.title" : `ce.${sortBy}`) : "ce.enrollment_date";
//     const sanitizedSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
    
//     baseQuery += ` ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder}`;
    
//     // Pagination
//     baseQuery += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
//     values.push(parseInt(limit), parseInt(offset));
    
//     console.log("SQL Query:", baseQuery);
//     console.log("Values:", values);
    
//     const result = await client.query(baseQuery, values);
//     const enrollments = result.rows;
    
//     // Get count for pagination
//     let countQuery = `
//       SELECT COUNT(*)
//       FROM course_enrollments ce
//       WHERE ce.user_id = $1
//     `;
//     const countValues = [userId];
//     const countConditions = [];
    
//     if (status) {
//       switch (status) {
//         case 'completed':
//           countConditions.push(`ce.is_completed = true`);
//           break;
//         case 'active':
//           countConditions.push(`ce.is_completed = false`);
//           break;
//       }
//     }
//     if (progress_min) {
//       countValues.push(parseFloat(progress_min));
//       countConditions.push(`ce.progress_percentage >= $${countValues.length}`);
//     }
//     if (progress_max) {
//       countValues.push(parseFloat(progress_max));
//       countConditions.push(`ce.progress_percentage <= $${countValues.length}`);
//     }
//     if (countConditions.length > 0) {
//       countQuery += " AND " + countConditions.join(" AND ");
//     }
    
//     const countResult = await client.query(countQuery, countValues);
//     const totalCount = parseInt(countResult.rows[0].count, 10);
    
//     // Get user learning statistics
//     const statsQuery = `
//       SELECT 
//         COUNT(*) as total_enrollments,
//         COUNT(CASE WHEN ce.is_completed = true THEN 1 END) as completed_courses,
//         COALESCE(AVG(ce.progress_percentage), 0) as average_progress,
//         COALESCE(SUM(ce.total_watch_time_minutes), 0) as total_watch_time_minutes
//       FROM course_enrollments ce
//       WHERE ce.user_id = $1
//     `;
//     const statsResult = await client.query(statsQuery, [userId]);
//     const userStats = statsResult.rows[0];
    
//     // Calculate additional metrics for each enrollment
//     const enrichedEnrollments = enrollments.map(enrollment => {
//       const videoProgressPercent = enrollment.total_videos > 0 ?
//         (enrollment.completed_videos / enrollment.total_videos) * 100 : 0;
//       const quizProgressPercent = enrollment.total_quizzes > 0 ?
//         (enrollment.passed_quizzes / enrollment.total_quizzes) * 100 : 0;
//       const estimatedTimeRemaining = Math.max(0,
//         (enrollment.duration_hours * 60) - enrollment.total_watch_time_minutes);
      
//       return {
//         ...enrollment,
//         video_progress_percent: Math.round(videoProgressPercent * 100) / 100,
//         quiz_progress_percent: Math.round(quizProgressPercent * 100) / 100,
//         estimated_time_remaining_minutes: estimatedTimeRemaining,
//         enrollment_date_formatted: new Date(enrollment.enrollment_date).toISOString(),
//         completion_date_formatted: enrollment.completion_date ?
//           new Date(enrollment.completion_date).toISOString() : null
//       };
//     });
    
//     const responseData = {
//       enrollments: enrichedEnrollments,
//       statistics: {
//         ...userStats,
//         total_enrollments: parseInt(userStats.total_enrollments, 10),
//         completed_courses: parseInt(userStats.completed_courses, 10),
//         average_progress: Math.round(parseFloat(userStats.average_progress) * 100) / 100,
//         total_watch_time_minutes: parseInt(userStats.total_watch_time_minutes, 10),
//         total_watch_time_hours: Math.round((parseInt(userStats.total_watch_time_minutes, 10) / 60) * 100) / 100,
//         completion_rate: parseInt(userStats.total_enrollments, 10) > 0 ?
//           Math.round((parseInt(userStats.completed_courses, 10) / parseInt(userStats.total_enrollments, 10)) * 10000) / 100 : 0
//       },
//       pagination: {
//         currentPageSize: enrollments.length,
//         totalCount,
//         limit: parseInt(limit, 10),
//         offset: parseInt(offset, 10),
//         hasMore: parseInt(offset, 10) + enrollments.length < totalCount,
//         totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
//         currentPage: Math.floor(parseInt(offset, 10) / parseInt(limit, 10)) + 1
//       },
//       filters: {
//         status: status || null,
//         progress_min: progress_min ? parseFloat(progress_min) : null,
//         progress_max: progress_max ? parseFloat(progress_max) : null,
//         sortBy: sanitizedSortBy,
//         sortOrder: sanitizedSortOrder
//       },
//       meta: {
//         timestamp: new Date().toISOString(),
//         requestId: event.requestContext?.requestId || "unknown"
//       }
//     };
    
//     return {
//       statusCode: 200,
//       headers: CORS_HEADERS,
//       body: JSON.stringify({
//         success: true,
//         message: "User enrollments retrieved successfully",
//         data: responseData
//       })
//     };
    
//   } catch (error) {
//     console.error("Error retrieving user enrollments:", error);
//     return {
//       statusCode: 500,
//       headers: CORS_HEADERS,
//       body: JSON.stringify({
//         success: false,
//         message: "An error occurred while retrieving user enrollments",
//         error: error.message || "Unknown error"
//       })
//     };
//   } finally {
//     if (client) {
//       await client.end();
//     }
//   }
// };

// --------------------------------------------------
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
  const command = new GetSecretValueCommand({
    SecretId: process.env.DB_SECRET_NAME
  });
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

export const handler = async (event) => {
  
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  
  let client;
  try {
    const { userId } = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};
    const {
      status, // 'active', 'completed'
      progress_min,
      progress_max,
      limit = "20",
      offset = "0",
      sortBy = "enrollment_date",
      sortOrder = "desc"
    } = queryParams;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "User ID is required"
        })
      };
    }
    
    const secret = await getDbCredentials();
    
    // Updated connection config for Supabase
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
    
    let baseQuery = `
      SELECT 
        ce.id as enrollment_id,
        ce.enrollment_date,
        ce.completion_date,
        ce.progress_percentage,
        ce.is_completed,
        ce.total_watch_time_minutes,
        c.id as course_id,
        c.title,
        c.description,
        c.instructor_name,
        c.level,
        c.duration_hours,
        c.thumbnail_url,
        c.rating,
        c.student_count,
        c.tags,
        cat.name as category_name,
        cat.color as category_color,
        -- Calculate video progress
        COALESCE(video_stats.total_videos, 0) as total_videos,
        COALESCE(video_stats.completed_videos, 0) as completed_videos,
        COALESCE(video_stats.total_watch_time, 0) as video_watch_time_seconds,
        -- Calculate quiz progress
        COALESCE(quiz_stats.total_quizzes, 0) as total_quizzes,
        COALESCE(quiz_stats.passed_quizzes, 0) as passed_quizzes
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT 
          cv.course_id,
          COUNT(*) as total_videos,
          COUNT(CASE WHEN vp.is_completed = true THEN 1 END) as completed_videos,
          SUM(COALESCE(vp.watch_time_seconds, 0)) as total_watch_time
        FROM course_videos cv
        LEFT JOIN video_progress vp ON cv.id = vp.video_id AND vp.user_id = $1
        GROUP BY cv.course_id
      ) video_stats ON c.id = video_stats.course_id
      LEFT JOIN (
        SELECT 
          cq.course_id,
          COUNT(DISTINCT cq.id) as total_quizzes,
          COUNT(DISTINCT CASE WHEN qa.is_passed = true THEN qa.quiz_id END) as passed_quizzes
        FROM course_quizzes cq
        LEFT JOIN quiz_attempts qa ON cq.id = qa.quiz_id AND qa.user_id = $1
        GROUP BY cq.course_id
      ) quiz_stats ON c.id = quiz_stats.course_id
      WHERE ce.user_id = $1
    `;
    
    const values = [userId];
    const conditions = [];
    
    // Status filter
    if (status) {
      switch (status) {
        case 'completed':
          conditions.push(`ce.is_completed = true`);
          break;
        case 'active':
          conditions.push(`ce.is_completed = false`);
          break;
      }
    }
    
    // Progress filters
    if (progress_min) {
      values.push(parseFloat(progress_min));
      conditions.push(`ce.progress_percentage >= $${values.length}`);
    }
    if (progress_max) {
      values.push(parseFloat(progress_max));
      conditions.push(`ce.progress_percentage <= $${values.length}`);
    }
    
    if (conditions.length > 0) {
      baseQuery += " AND " + conditions.join(" AND ");
    }
    
    // Sorting
    const allowedSortFields = ["enrollment_date", "progress_percentage", "title", "completion_date"];
    const sanitizedSortBy = allowedSortFields.includes(sortBy) ?
      (sortBy === "title" ? "c.title" : `ce.${sortBy}`) : "ce.enrollment_date";
    const sanitizedSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
    
    baseQuery += ` ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder}`;
    
    // Pagination
    baseQuery += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), parseInt(offset));
    const result = await client.query(baseQuery, values);
    const enrollments = result.rows;
    
    // Get count for pagination
    let countQuery = `
      SELECT COUNT(*)
      FROM course_enrollments ce
      WHERE ce.user_id = $1
    `;
    const countValues = [userId];
    const countConditions = [];
    
    if (status) {
      switch (status) {
        case 'completed':
          countConditions.push(`ce.is_completed = true`);
          break;
        case 'active':
          countConditions.push(`ce.is_completed = false`);
          break;
      }
    }
    if (progress_min) {
      countValues.push(parseFloat(progress_min));
      countConditions.push(`ce.progress_percentage >= $${countValues.length}`);
    }
    if (progress_max) {
      countValues.push(parseFloat(progress_max));
      countConditions.push(`ce.progress_percentage <= $${countValues.length}`);
    }
    if (countConditions.length > 0) {
      countQuery += " AND " + countConditions.join(" AND ");
    }
    
    const countResult = await client.query(countQuery, countValues);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    // Get user learning statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(CASE WHEN ce.is_completed = true THEN 1 END) as completed_courses,
        COALESCE(AVG(ce.progress_percentage), 0) as average_progress,
        COALESCE(SUM(ce.total_watch_time_minutes), 0) as total_watch_time_minutes
      FROM course_enrollments ce
      WHERE ce.user_id = $1
    `;
    const statsResult = await client.query(statsQuery, [userId]);
    const userStats = statsResult.rows[0];
    
    // Calculate additional metrics for each enrollment
    const enrichedEnrollments = enrollments.map(enrollment => {
      const videoProgressPercent = enrollment.total_videos > 0 ?
        (enrollment.completed_videos / enrollment.total_videos) * 100 : 0;
      const quizProgressPercent = enrollment.total_quizzes > 0 ?
        (enrollment.passed_quizzes / enrollment.total_quizzes) * 100 : 0;
      const estimatedTimeRemaining = Math.max(0,
        (enrollment.duration_hours * 60) - enrollment.total_watch_time_minutes);
      
      return {
        ...enrollment,
        video_progress_percent: Math.round(videoProgressPercent * 100) / 100,
        quiz_progress_percent: Math.round(quizProgressPercent * 100) / 100,
        estimated_time_remaining_minutes: estimatedTimeRemaining,
        enrollment_date_formatted: new Date(enrollment.enrollment_date).toISOString(),
        completion_date_formatted: enrollment.completion_date ?
          new Date(enrollment.completion_date).toISOString() : null
      };
    });
    
    const responseData = {
      enrollments: enrichedEnrollments,
      statistics: {
        ...userStats,
        total_enrollments: parseInt(userStats.total_enrollments, 10),
        completed_courses: parseInt(userStats.completed_courses, 10),
        average_progress: Math.round(parseFloat(userStats.average_progress) * 100) / 100,
        total_watch_time_minutes: parseInt(userStats.total_watch_time_minutes, 10),
        total_watch_time_hours: Math.round((parseInt(userStats.total_watch_time_minutes, 10) / 60) * 100) / 100,
        completion_rate: parseInt(userStats.total_enrollments, 10) > 0 ?
          Math.round((parseInt(userStats.completed_courses, 10) / parseInt(userStats.total_enrollments, 10)) * 10000) / 100 : 0
      },
      pagination: {
        currentPageSize: enrollments.length,
        totalCount,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + enrollments.length < totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        currentPage: Math.floor(parseInt(offset, 10) / parseInt(limit, 10)) + 1
      },
      filters: {
        status: status || null,
        progress_min: progress_min ? parseFloat(progress_min) : null,
        progress_max: progress_max ? parseFloat(progress_max) : null,
        sortBy: sanitizedSortBy,
        sortOrder: sanitizedSortOrder
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId || "unknown"
      }
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "User enrollments retrieved successfully",
        data: responseData
      })
    };
    
  } catch (error) {
    console.error("Error retrieving user enrollments:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while retrieving user enrollments",
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
