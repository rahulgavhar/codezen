import express from "express";
import http from "http";
import { Server } from "socket.io";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
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
import contestsRoutes from "./routes/contests.route.js";
import interviewsRoutes from "./routes/interviews.route.js";
import interviewProblemsRoutes from "./routes/interview_problems.route.js";
import { startVMSyncJob } from "./jobs/vmSync.job.js";
import { trackActivityAndStartVM } from "./middleware/auth.middleware.js";
import { setupInterviewSignaling } from "./lib/webrtc.signaling.js";
import { setupContestReplaySignaling } from "./lib/contestReplay.signaling.js";
import { startContestReplayWorker, stopContestReplayWorker } from "./services/contestReplay.service.js";

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
app.use(express.json({ limit: ENV.MAX_REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: ENV.MAX_REQUEST_BODY_LIMIT }));

// Health Check Route
app.use("/api/health", (req, res) => {
  res.status(200).send("OK");
});
// Problems Routes (public - no auth)
app.use("/api/problems", problemsRoutes);
// Contests Routes (with activity tracking)
app.use("/api/contests", trackActivityAndStartVM, contestsRoutes);
// Judge0 Health Route
app.use("/api/judge0", judgeRoutes);
// Webhooks Routes (no auth - Judge0 calls directly)
app.use("/api/webhooks", webhooksRoutes);
// Users Routes (with activity tracking)
app.use("/api/users", trackActivityAndStartVM, usersRoutes);
// Submission Routes (with activity tracking)
app.use("/api/submissions", trackActivityAndStartVM, submissionsRoutes);
// Interview Routes (with activity tracking)
app.use("/api/interviews", trackActivityAndStartVM, interviewsRoutes);
// Interview Problems Routes (with activity tracking)
app.use("/api/interview-problems", trackActivityAndStartVM, interviewProblemsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds allowed limit.',
      limit: ENV.MAX_REQUEST_BODY_LIMIT,
    });
  }
  
  // Handle timeout errors
  if (err?.code === 'ETIMEDOUT' || String(err?.message || '').includes('timeout')) {
    return res.status(504).json({
      error: 'Gateway Timeout',
      message: 'The server took too long to process your request. Please try again.',
      details: err?.message,
    });
  }
  
  // Handle other errors
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Error',
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
    
    // Initialize WebRTC signaling
    setupInterviewSignaling(io);

    // Initialize contest replay signaling.
    setupContestReplaySignaling(io);

    // Start replay flush worker for contest timeline event chunks.
    startContestReplayWorker();
    
    server.listen(ENV.PORT, () => console.log(`Server is running on port ${ENV.PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

const gracefulShutdown = async (signal) => {
  try {
    console.log(`Received ${signal}. Flushing replay buffers before shutdown...`);
    await stopContestReplayWorker();
  } catch (error) {
    console.error('Error while stopping replay worker:', error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

startServer();