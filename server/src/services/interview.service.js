import * as interviewsRepo from "../repositories/interviews.repo.js";
import * as problemsRepo from "../repositories/problems.repo.js";

const ALLOWED_STATUSES = ["Scheduled", "Ongoing", "Completed", "Cancelled"];

function normalizeStatusList(statusQuery = "") {
	if (!statusQuery) {
		return [];
	}

	const desired = statusQuery
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

	return ALLOWED_STATUSES.filter((status) => desired.includes(status.toLowerCase()));
}

function asNullableValue(value) {
	if (value === undefined) {
		return undefined;
	}
	if (value === "") {
		return null;
	}
	return value;
}

function isPastInterviewEnd(interview) {
	if (!interview?.end_time) return false;
	return Date.now() > new Date(interview.end_time).getTime();
}

function shouldAutoCompleteByTime(interview) {
	if (!interview) return false;
	if (interview.status !== "Scheduled" && interview.status !== "Ongoing") {
		return false;
	}
	return isPastInterviewEnd(interview);
}

async function syncInterviewStatusByTime(interview) {
	if (!shouldAutoCompleteByTime(interview)) {
		return interview;
	}

	return interviewsRepo.updateInterviewById(interview.id, { status: "Completed" });
}

async function syncInterviewsStatusByTime(interviews = []) {
	if (!Array.isArray(interviews) || interviews.length === 0) {
		return [];
	}

	const updated = await Promise.all(
		interviews.map(async (interview) => {
			if (!shouldAutoCompleteByTime(interview)) {
				return interview;
			}
			return interviewsRepo.updateInterviewById(interview.id, { status: "Completed" });
		})
	);

	return updated;
}

function formatInterview(interview) {
	if (!interview) {
		return null;
	}

	return {
		id: interview.id,
		candidate_clerk_id: interview.candidate_clerk_id,
		interviewer_clerk_id: interview.interviewer_clerk_id,
		problem_id: interview.problem_id,
		room_id: interview.room_id,
		status: interview.status,
		start_time: interview.start_time,
		end_time: interview.end_time,
		actual_duration: interview.actual_duration,
		feedback: interview.feedback,
		candidate_rating: interview.candidate_rating,
		technical_score: interview.technical_score,
		recording_url: interview.recording_url,
		created_at: interview.created_at,
		problem: interview.problem || null,
	};
}

async function requireStaffUser(clerkUserId) {
	const user = await interviewsRepo.getUserProfileByClerkId(clerkUserId);
	if (!user) {
		throw new Error("User profile not found");
	}
	if (user.app_role !== "staff") {
		const err = new Error("Only staff can perform this action");
		err.statusCode = 403;
		throw err;
	}
	return user;
}

export async function getInterviewCandidates(clerkUserId) {
	await requireStaffUser(clerkUserId);
	return interviewsRepo.getInterviewCandidates();
}

export async function createInterview(clerkUserId, payload) {
	await requireStaffUser(clerkUserId);

	const candidateClerkId = payload.candidate_clerk_id?.trim();
	const roomId = payload.room_id?.trim();
	const startTime = payload.start_time;
	const endTime = payload.end_time;

	if (!candidateClerkId) {
		const err = new Error("candidate_clerk_id is required");
		err.statusCode = 400;
		throw err;
	}

	if (!startTime || !endTime) {
		const err = new Error("start_time and end_time are required");
		err.statusCode = 400;
		throw err;
	}

	const startDate = new Date(startTime);
	const endDate = new Date(endTime);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		const err = new Error("Invalid start_time or end_time");
		err.statusCode = 400;
		throw err;
	}
	if (endDate <= startDate) {
		const err = new Error("end_time must be after start_time");
		err.statusCode = 400;
		throw err;
	}

	if (candidateClerkId === clerkUserId) {
		const err = new Error("Interviewer and candidate must be different users");
		err.statusCode = 400;
		throw err;
	}

	// Validate candidate exists
	const candidateProfile = await interviewsRepo.getUserProfileByClerkId(candidateClerkId);
	if (!candidateProfile) {
		const err = new Error("Candidate not found");
		err.statusCode = 404;
		throw err;
	}

	// Validate problem exists (if problem_id is provided)
	const problemId = payload.problem_id?.trim();
	if (problemId) {
		const problem = await problemsRepo.getProblemById(problemId);
		if (!problem) {
			const err = new Error("Problem not found");
			err.statusCode = 404;
			throw err;
		}
	}

	const interview = await interviewsRepo.createInterview({
		candidate_clerk_id: candidateClerkId,
		interviewer_clerk_id: clerkUserId,
		problem_id: problemId || null,
		room_id: roomId || `room_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
		status: "Scheduled",
		start_time: startDate.toISOString(),
		end_time: endDate.toISOString(),
	});

	return formatInterview(interview);
}

export async function getInterviews(clerkUserId, query = {}) {
	const limit = query.limit ? Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 10)) : undefined;
	const status = normalizeStatusList(query.status);
	const upcoming = `${query.upcoming}`.toLowerCase() === "true";

	console.log("[Service] Fetching interviews for user:", clerkUserId, { status, upcoming, limit });

	const interviews = await interviewsRepo.getInterviewsForParticipant(clerkUserId, {
		status,
		upcoming,
		limit,
	});
	const syncedInterviews = await syncInterviewsStatusByTime(interviews);

	console.log("[Service] Found interviews:", syncedInterviews.length);
	return syncedInterviews.map(formatInterview);
}

export async function getInterviewById(interviewId, clerkUserId) {
	const interview = await interviewsRepo.getInterviewById(interviewId);
	if (!interview) {
		return null;
	}

	const isParticipant =
		interview.candidate_clerk_id === clerkUserId || interview.interviewer_clerk_id === clerkUserId;

	if (!isParticipant) {
		const err = new Error("Unauthorized to view this interview");
		err.statusCode = 403;
		throw err;
	}

	const syncedInterview = await syncInterviewStatusByTime(interview);

	return formatInterview(syncedInterview);
}

export async function updateInterview(interviewId, clerkUserId, updates = {}) {
	const interview = await interviewsRepo.getInterviewById(interviewId);
	if (!interview) {
		return null;
	}

	if (interview.interviewer_clerk_id !== clerkUserId) {
		const err = new Error("Only interviewer can update interview details");
		err.statusCode = 403;
		throw err;
	}

	const payload = {
		status: asNullableValue(updates.status),
		feedback: asNullableValue(updates.feedback),
		candidate_rating:
			asNullableValue(updates.candidate_rating) !== undefined
				? Number.parseInt(asNullableValue(updates.candidate_rating), 10) || null
				: undefined,
		technical_score:
			asNullableValue(updates.technical_score) !== undefined
				? Number.parseInt(asNullableValue(updates.technical_score), 10) || null
				: undefined,
		recording_url: asNullableValue(updates.recording_url),
	};

	Object.keys(payload).forEach((key) => {
		if (payload[key] === undefined) {
			delete payload[key];
		}
	});

	if (Object.keys(payload).length === 0) {
		const err = new Error("No updatable fields provided");
		err.statusCode = 400;
		throw err;
	}

	if (payload.status && !ALLOWED_STATUSES.includes(payload.status)) {
		const err = new Error("Invalid status value");
		err.statusCode = 400;
		throw err;
	}

	if (payload.status === "Completed" && !isPastInterviewEnd(interview)) {
		const err = new Error("Interview can be marked completed only after end_time");
		err.statusCode = 400;
		throw err;
	}

	const hasFeedbackFields =
		payload.feedback !== undefined ||
		payload.candidate_rating !== undefined ||
		payload.technical_score !== undefined;

	// DB trigger allows feedback only for completed interviews.
	if (hasFeedbackFields && !payload.status && interview.status !== "Completed") {
		if (!isPastInterviewEnd(interview)) {
			const err = new Error("Feedback can be added only after interview end_time");
			err.statusCode = 400;
			throw err;
		}
		payload.status = "Completed";
	}

	const updated = await interviewsRepo.updateInterviewById(interviewId, payload);
	return formatInterview(updated);
}

export async function getInterviewCodeSubmissions(interviewId, clerkUserId) {
	const interview = await interviewsRepo.getInterviewById(interviewId);
	if (!interview) {
		return null;
	}

	const isParticipant =
		interview.candidate_clerk_id === clerkUserId || interview.interviewer_clerk_id === clerkUserId;
	if (!isParticipant) {
		const err = new Error("Unauthorized to view interview code submissions");
		err.statusCode = 403;
		throw err;
	}

	return interviewsRepo.getInterviewCodeSubmissions(interviewId);
}
