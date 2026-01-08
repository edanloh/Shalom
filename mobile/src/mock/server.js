const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;
const eventsLogPath = path.join(__dirname, "events.log");

// Enable CORS for React Native
app.use(cors());
app.use(express.json());

// Logging middleware to see what endpoints are being called
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.params);
  if (req.path.includes("/recommendations")) {
    console.log("↳ recommendations mock hit");
  }
  next();
});

// Read the mock data
const dbPath = path.join(__dirname, "db.json");
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

// Dynamic endpoint mapping for all HTTP methods
const endpointMap = {
  GET: {
    "/health": () => db.health,
    "/courses": () => db.courses,
    "/courses/enrollment/:userId": (params) =>
      db.enrollments[params.userId] || db.enrollments.default,
    "/courses/enrollment/:userId/wishlist": (params) =>
      db.wishlist[params.userId] || db.wishlist.default,
    "/courses/:courseId": (params) =>
      db["course-details"][params.courseId] || db["course-details"]["1"],
    "/courses/:courseId/module": (params, body, query) => {
      const courseId = params.courseId;
      const userId = query.userId;
      return db["module-details"][courseId] || db["module-details"]["1"];
    },
    "/courses/:courseId/module/videos/:videoId": (params, body, query) => {
      const videoId = params.videoId;
      return db["video-details"][videoId] || db["video-details"]["vid_1"];
    },
    "/courses/:courseId/module/quizzes/:quizId": (params, body, query) => {
      const quizId = params.quizId;
      return db["quiz-details"][quizId] || db["quiz-details"]["quiz_1"];
    },
    "/courseReviewHandler/:courseId": (params, body, query) => {
      const courseId = params.courseId;
      const userId = query.userId;
      if (userId) {
        // Return user's review if exists
        return db["user-reviews"][`${userId}_${courseId}`] || null;
      } else {
        // Return all reviews for the course
        return Object.values(db["user-reviews"] || {}).filter(review => review.courseId === courseId);
      }
    },
    "/dev/getAllUserInfo": () => db["all-users-info"].data,
    "/recommendations": () => db.recommendations,
    "/getRecommendations": () => db.recommendations,
    "/credits": () => ({
      success: true,
      data: {
        balance: db.credits.balance,
        lastUpdated: db.credits.lastUpdated,
      },
    }),
    "/getCredits": () => ({
      success: true,
      data: {
        balance: db.credits.balance,
        lastUpdated: db.credits.lastUpdated,
      },
    }),
    "/credits/history": () => ({
      success: true,
      data: db.credits.history || [],
    }),
    "/getCreditHistory": () => ({
      success: true,
      data: db.credits.history || [],
    }),
    "/credits/achievements": () => ({
      success: true,
      data: db.credits.achievements || [],
    }),
    "/getAchievements": () => ({
      success: true,
      data: db.credits.achievements || [],
    }),
    "/credits/goals": () => ({
      success: true,
      data: db.credits.goals || [],
    }),
    "/getGoals": () => ({
      success: true,
      data: db.credits.goals || [],
    }),
    "/credits/certificates": () => ({
      success: true,
      data: db.credits.certificates || [],
    }),
    "/getCertificates": () => ({
      success: true,
      data: db.credits.certificates || [],
    }),
  },
  POST: {
    "/recommendations/events": (params, body) => {
      const event = {
        userId: body.userId || body.user_id || "anon",
        courseId: body.courseId || body.course_id || null,
        eventType: body.eventType || body.event_type || "unknown",
        placement: body.context?.placement || body.placement || "unknown",
        context: body.context || {},
        timestamp: new Date().toISOString(),
      };
      const line = JSON.stringify(event) + "\n";
      try {
        fs.appendFileSync(eventsLogPath, line, "utf8");
      } catch (err) {
        console.warn("Failed to write event log", err);
      }
      return {
        success: true,
        message: "Mock event recorded",
      };
    },
    "/postRecommendationEvent": (params, body) => {
      const event = {
        userId: body.userId || body.user_id || "anon",
        courseId: body.courseId || body.course_id || null,
        eventType: body.eventType || body.event_type || "unknown",
        placement: body.context?.placement || body.placement || "unknown",
        context: body.context || {},
        timestamp: new Date().toISOString(),
      };
      const line = JSON.stringify(event) + "\n";
      try {
        fs.appendFileSync(eventsLogPath, line, "utf8");
      } catch (err) {
        console.warn("Failed to write event log", err);
      }
      return {
        success: true,
        message: "Mock event recorded",
      };
    },
    "/credits/events": (params, body) => {
      const event = {
        id: `credit_${Date.now()}`,
        userId: body.userId || body.user_id || "anon",
        type: body.type || "generic",
        title: body.title || "Credit event",
        points: Number(body.points) || 0,
        courseId: body.courseId || body.course_id || null,
        timestamp: body.timestamp || new Date().toISOString(),
      };

      // Update in-memory balance and history
      db.credits.balance = (db.credits.balance || 0) + event.points;
      db.credits.history = [event, ...(db.credits.history || [])];

      // Log to events.log for parity with recommendations
      const line = JSON.stringify({ kind: "credit", ...event }) + "\n";
      try {
        fs.appendFileSync(eventsLogPath, line, "utf8");
      } catch (err) {
        console.warn("Failed to write credit event log", err);
      }

      return {
        success: true,
        message: "Credit event recorded",
        data: { balance: db.credits.balance, event },
      };
    },
    "/postCreditEvent": (params, body) => {
      const event = {
        id: `credit_${Date.now()}`,
        userId: body.userId || body.user_id || "anon",
        type: body.type || "generic",
        title: body.title || "Credit event",
        points: Number(body.points) || 0,
        courseId: body.courseId || body.course_id || null,
        timestamp: body.timestamp || new Date().toISOString(),
      };

      db.credits.balance = (db.credits.balance || 0) + event.points;
      db.credits.history = [event, ...(db.credits.history || [])];

      const line = JSON.stringify({ kind: "credit", ...event }) + "\n";
      try {
        fs.appendFileSync(eventsLogPath, line, "utf8");
      } catch (err) {
        console.warn("Failed to write credit event log", err);
      }

      return {
        success: true,
        message: "Credit event recorded",
        data: { balance: db.credits.balance, event },
      };
    },
    "/courses/enrollment/:userId/wishlist": (params, body, query) => ({
      success: true,
      message: `Course ${
        query.courseId || body.courseId || "unknown"
      } added to wishlist`,
      data: { added: true, courseId: query.courseId || body.courseId },
    }),
    "/courses/enrollment/:userId": (params, body) => ({
      success: true,
      message: "Successfully enrolled in course",
      data: {
        enrollment_id: `enr_${Date.now()}`,
        firstModuleId: "sec_1",
      },
    }),
    "/courses/:courseId/module/videos/progress": (params, body) => ({
      success: true,
      message: "Video progress updated successfully",
      data: {
        videoProgress: {
          user_id: body.userId,
          video_id: body.videoId,
          watch_time_seconds: body.watchTimeSeconds,
          is_completed: body.isCompleted,
          last_position_seconds: body.lastPositionSeconds,
          updated_at: new Date().toISOString(),
        },
        courseProgress: {
          progress_percentage: "75",
          is_completed: false,
          completed_videos: 18,
          total_videos: 24,
        },
      },
    }),
    "/courses/:courseId/module/quizzes/:quizId": (params, body) => ({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        score: 80,
        totalQuestions: 5,
        correctAnswers: 4,
        isPassed: true,
        attemptNumber: 1,
        attemptsRemaining: 2,
        answers: body.answers.map((ans, idx) => ({
          questionId: ans.questionId,
          isCorrect: idx < 4,
          correctAnswer: "Option A",
        })),
      },
    }),
    "/courses/:courseId/reviews": (params, body) => ({
      success: true,
      message: "Review posted successfully",
      data: {
        id: `review_${Date.now()}`,
        rating: body.rating,
        review: body.review,
        createdAt: new Date().toISOString(),
        reviewerName: body.isAnonymous ? "Anonymous" : "User Name",
        reviewerAvatar: body.isAnonymous
          ? null
          : "https://ui-avatars.com/api/?name=User+Name&size=40",
      },
    }),
    "/courseReviewHandler/:courseId": (params, body) => ({
      success: true,
      message: "Review posted successfully",
      data: {
        id: `review_${Date.now()}`,
        rating: body.rating,
        review: body.review,
        createdAt: new Date().toISOString(),
        reviewerName: body.isAnonymous ? "Anonymous" : "User Name",
        reviewerAvatar: body.isAnonymous
          ? null
          : "https://ui-avatars.com/api/?name=User+Name&size=40",
      },
    }),
  },
  PUT: {
    "/courses/:courseId/reviews": (params, body) => ({
      success: true,
      message: "Review updated successfully",
      data: {
        id: `review_${Date.now()}`,
        rating: body.rating,
        review: body.review,
        createdAt: new Date().toISOString(),
        reviewerName: body.isAnonymous ? "Anonymous" : "User Name",
        reviewerAvatar: body.isAnonymous
          ? null
          : "https://ui-avatars.com/api/?name=User+Name&size=40",
      },
    }),
    "/courseReviewHandler/:courseId": (params, body) => ({
      success: true,
      message: "Review updated successfully",
      data: {
        id: `review_${Date.now()}`,
        rating: body.rating,
        review: body.review,
        createdAt: new Date().toISOString(),
        reviewerName: body.isAnonymous ? "Anonymous" : "User Name",
        reviewerAvatar: body.isAnonymous
          ? null
          : "https://ui-avatars.com/api/?name=User+Name&size=40",
      },
    }),
    "/recommendations/events": (params, body) => {
      const event = {
        userId: body.userId || body.user_id || "anon",
        courseId: body.courseId || body.course_id || null,
        eventType: body.eventType || body.event_type || "unknown",
        placement: body.context?.placement || body.placement || "unknown",
        context: body.context || {},
        timestamp: new Date().toISOString(),
      };
      const line = JSON.stringify(event) + "\n";
      try {
        fs.appendFileSync(eventsLogPath, line, "utf8");
      } catch (err) {
        console.warn("Failed to write event log", err);
      }
      return {
        success: true,
        message: "Mock event recorded",
      };
    },
  },
  PUT: {
    "/courses/:courseId/reviews": (params, body) => ({
      success: true,
      message: "Review updated successfully",
      data: {
        id: `review_${Date.now()}`,
        rating: body.rating,
        review: body.review,
        createdAt: new Date().toISOString(),
        reviewerName: body.isAnonymous ? "Anonymous" : "User Name",
        reviewerAvatar: body.isAnonymous
          ? null
          : "https://ui-avatars.com/api/?name=User+Name&size=40",
      },
    }),
    "/recommendations/events": (params, body) => {
      const event = {
        userId: body.userId || body.user_id || "anon",
        courseId: body.courseId || body.course_id || null,
        eventType: body.eventType || body.event_type || "unknown",
        placement: body.context?.placement || body.placement || "unknown",
        context: body.context || {},
        timestamp: new Date().toISOString(),
      };
      const line = JSON.stringify(event) + "\n";
      try {
        fs.appendFileSync(eventsLogPath, line, "utf8");
      } catch (err) {
        console.warn("Failed to write event log", err);
      }
      return {
        success: true,
        message: "Mock event recorded",
      };
    },
  },
  DELETE: {
    "/courses/enrollment/:userId/wishlist": (params, body, query) => ({
      success: true,
      message: `Course ${query.courseId || "unknown"} removed from wishlist`,
      data: { removed: true, courseId: query.courseId },
    }),
  },
};

// Generic handler for all HTTP methods
const handleRequest = (method) => (req, res) => {
  const requestPath = req.path;
  const methodMap = endpointMap[method];

  if (!methodMap) {
    return res.status(405).json({
      success: false,
      message: `Method ${method} not allowed`,
      allowedMethods: Object.keys(endpointMap),
    });
  }

  // Direct match first
  if (methodMap[requestPath]) {
    const result = methodMap[requestPath](req.params, req.body, req.query);
    return res.json(result);
  }

  // Pattern matching for parameterized routes
  for (const [pattern, handler] of Object.entries(methodMap)) {
    const regex = pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)");
    const match = requestPath.match(new RegExp(`^${regex}$`));

    if (match) {
      const params = match.groups || {};
      const result = handler(params, req.body, req.query);

      if (result) {
        return res.json(result);
      } else {
        return res.status(404).json({
          success: false,
          message: `Resource not found for ${method} ${requestPath}`,
          data: null,
        });
      }
    }
  }

  // No match found
  res.status(404).json({
    success: false,
    message: `Endpoint not found for ${method} ${requestPath}`,
    path: requestPath,
    availableEndpoints: Object.keys(methodMap || {}),
  });
};

// Register handlers for all HTTP methods
app.get("*", handleRequest("GET"));
app.post("*", handleRequest("POST"));
app.put("*", handleRequest("PUT"));
app.patch("*", handleRequest("PATCH"));
app.delete("*", handleRequest("DELETE"));

app.listen(PORT, () => {
  console.log(`🚀 Mock API server running at port ${PORT}`);
  console.log("📊 Available endpoints:");
  Object.entries(endpointMap).forEach(([method, endpoints]) => {
    Object.keys(endpoints).forEach((endpoint) => {
      console.log(`   ${method} ${endpoint}`);
    });
  });
});
