import express from "express";
import {
	createInterview,
	getInterviewById,
	getInterviewCandidates,
	getInterviewCodeSubmissions,
	getInterviews,
	updateInterview,
} from "../controllers/interviews.controller.js";

const router = express.Router();

router.get("/candidates", getInterviewCandidates);
router.get("/", getInterviews);
router.get("/:interviewId/code-submissions", getInterviewCodeSubmissions);
router.get("/:interviewId", getInterviewById);
router.post("/", createInterview);
router.put("/:interviewId", updateInterview);

export default router;
