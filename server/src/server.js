import express from "express";
const app = express();
import { ENV } from "./config/env.config.js";
import path from "path";
const __dirname = path.resolve();
import cors from "cors";
import cookieParser from "cookie-parser";
import {clerkMiddleware} from "@clerk/express";
import judgeRoutes from "./routes/judge0.route.js";
import usersRoutes from "./routes/users.route.js";
import submissionsRoutes from "./routes/submissions.route.js";
import webhooksRoutes from "./routes/webhooks.route.js";
import problemsRoutes from "./routes/problems.route.js";
import { startVMSyncJob } from "./jobs/vmSync.job.js";
import { trackActivityAndStartVM } from "./middleware/auth.middleware.js";

// Middleware

// Set request timeout (120 seconds for submissions, 30 seconds for others)
app.use((req, res, next) => {
  if (req.path.includes('/api/submissions')) {
    req.setTimeout(120000); // 120 seconds for submission endpoints
  } else {
    req.setTimeout(30000); // 30 seconds for other endpoints
  }
  next();
});

app.use(cors({
  origin: ENV.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(clerkMiddleware());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.use("/api/health", (req, res) => {
  res.status(200).send("OK");
});
// Problems Routes (public - no auth)
app.use("/api/problems", problemsRoutes);
// Judge0 Health Route
app.use("/api/judge0", judgeRoutes);
// Webhooks Routes (no auth - Judge0 calls directly)
app.use("/api/webhooks", webhooksRoutes);
// Users Routes (with activity tracking)
app.use("/api/users", trackActivityAndStartVM, usersRoutes);
// Submission Routes (with activity tracking)
app.use("/api/submissions", trackActivityAndStartVM, submissionsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    return res.status(504).json({
      error: 'Gateway Timeout',
      message: 'The server took too long to process your request. Please try again.',
      details: err.message,
    });
  }
  
  // Handle other errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});








if(ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  }
  );
}

const startServer = async () => {
  try {
    // Start VM sync cron job 
    if(ENV.NODE_ENV === "production") startVMSyncJob();
    
    app.listen(ENV.PORT, () => console.log(`Server is running on port ${ENV.PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};
startServer();