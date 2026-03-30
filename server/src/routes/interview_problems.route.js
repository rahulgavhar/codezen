import express from "express";
import * as interviewProblemsController from "../controllers/interview_problems.controller.js";

const router = express.Router();

// Get interview problems by interview ID
router.get("/:interviewId", interviewProblemsController.getInterviewProblems);

// Create interview problem from a problem
router.post("/", interviewProblemsController.createInterviewProblem);

// Transform problem description to story-type using Gemini
router.post("/:interviewId/transform", interviewProblemsController.transformProblemDescription);

// Update interview problem
router.patch("/:interviewId", interviewProblemsController.updateInterviewProblem);

export default router;
