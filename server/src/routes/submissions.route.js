import express from "express";
const router = express.Router();

import {
  getUserSubmissions,
  getSubmissionById,
  createSubmission,
  runSampleTest,
  getUserSubmissionStats,
} from "../controllers/submissions.controller.js";

// Protected route to get submission statistics for current user
router.get("/stats", getUserSubmissionStats);

// Protected route to run code against a sample test case
router.post("/run-sample", runSampleTest);

// Protected route to get submissions of the current user
router.get("/", getUserSubmissions);

// Protected route to create a new submission
router.post("/", createSubmission);

// Protected route to get a specific submission by ID
router.get("/:submissionId", getSubmissionById);

export default router;