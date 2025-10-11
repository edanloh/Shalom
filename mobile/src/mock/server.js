const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

// Enable CORS for React Native
app.use(cors());
app.use(express.json());

// Logging middleware to see what endpoints are being called
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.params);
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
    "/courses/enrollment/:userId": (params) => db.enrollments[params.userId],
    "/courses/enrollment/:userId/wishlist": (params) =>
      db.wishlist[params.userId],
    "/courses/:courseId": (params) => db["course-details"][params.courseId],
  },
  POST: {
    "/courses/enrollment/:userId/wishlist": (params, body) => ({
      success: true,
      message: `Course ${body.courseId || "unknown"} added to wishlist`,
      data: { added: true, courseId: body.courseId },
    }),
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
  console.log(`🚀 Mock API server running at http://localhost:${PORT}`);
  console.log("📊 Available endpoints:");
  Object.entries(endpointMap).forEach(([method, endpoints]) => {
    Object.keys(endpoints).forEach(endpoint => {
      console.log(`   ${method} ${endpoint}`);
    });
  });
});
