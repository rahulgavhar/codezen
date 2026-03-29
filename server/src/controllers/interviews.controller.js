import * as interviewService from "../services/interview.service.js";

function getAuthUserId(req) {
	return req.auth()?.userId;
}

export async function getInterviewCandidates(req, res) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const candidates = await interviewService.getInterviewCandidates(clerkUserId);
		return res.status(200).json(candidates);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		return res.status(statusCode).json({
			error: error.message || "Failed to fetch interview candidates",
		});
	}
}

export async function createInterview(req, res) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const interview = await interviewService.createInterview(clerkUserId, req.body || {});
		return res.status(201).json(interview);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		return res.status(statusCode).json({
			error: error.message || "Failed to create interview",
		});
	}
}

export async function getInterviews(req, res) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		console.log("[API] Getting interviews for user:", clerkUserId, "Query:", req.query);
		const interviews = await interviewService.getInterviews(clerkUserId, req.query || {});
		console.log("[API] Returning interviews:", interviews.length, "interviews");
		return res.status(200).json(interviews);
	} catch (error) {
		console.error("[API] Error getting interviews:", error);
		const statusCode = error.statusCode || 500;
		return res.status(statusCode).json({
			error: error.message || "Failed to fetch interviews",
		});
	}
}

export async function getInterviewById(req, res) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const interview = await interviewService.getInterviewById(req.params.interviewId, clerkUserId);
		if (!interview) {
			return res.status(404).json({ error: "Interview not found" });
		}

		return res.status(200).json(interview);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		return res.status(statusCode).json({
			error: error.message || "Failed to fetch interview",
		});
	}
}

export async function updateInterview(req, res) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const interview = await interviewService.updateInterview(
			req.params.interviewId,
			clerkUserId,
			req.body || {}
		);

		if (!interview) {
			return res.status(404).json({ error: "Interview not found" });
		}

		return res.status(200).json(interview);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		return res.status(statusCode).json({
			error: error.message || "Failed to update interview",
		});
	}
}

export async function getInterviewCodeSubmissions(req, res) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const submissions = await interviewService.getInterviewCodeSubmissions(
			req.params.interviewId,
			clerkUserId
		);

		if (submissions === null) {
			return res.status(404).json({ error: "Interview not found" });
		}

		return res.status(200).json(submissions);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		return res.status(statusCode).json({
			error: error.message || "Failed to fetch interview code submissions",
		});
	}
}
