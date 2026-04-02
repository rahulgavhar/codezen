import * as contestsRepo from '../repositories/contests.repo.js';
import * as submissionsRepo from '../repositories/submissions.repo.js';

function buildHttpError(message, statusCode) {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
}

function parseDateOrThrow(value, fieldName) {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw buildHttpError(`${fieldName} is invalid`, 400);
	}
	return parsed.toISOString();
}

async function assertStaff(clerkUserId) {
	const role = await contestsRepo.getUserRole(clerkUserId);
	if (role !== 'staff') {
		throw buildHttpError('Only staff users can perform this action', 403);
	}
}

function normalizeProblems(problems) {
	if (!Array.isArray(problems) || problems.length === 0) {
		throw buildHttpError('At least one contest problem is required', 400);
	}

	return problems.map((problem, index) => {
		if (!problem?.problem_id) {
			throw buildHttpError(`Problem at index ${index} is missing problem_id`, 400);
		}
		if (!problem?.title || typeof problem.title !== 'string') {
			throw buildHttpError(`Problem at index ${index} is missing title`, 400);
		}
		if (!problem?.description || typeof problem.description !== 'string') {
			throw buildHttpError(`Problem at index ${index} is missing description`, 400);
		}

		const displayOrder = Number.isInteger(problem.display_order) && problem.display_order >= 1
			? problem.display_order
			: index + 1;

		const points = Number.isFinite(Number(problem.points))
			? Math.max(0, Number(problem.points))
			: 100;

		return {
			problem_id: problem.problem_id,
			title: problem.title.trim(),
			description: problem.description,
			gemini_description: problem.gemini_description || null,
			input_format: problem.input_format || null,
			output_format: problem.output_format || null,
			constraints: problem.constraints || null,
			time_limit_ms: Number(problem.time_limit_ms) || 2000,
			memory_limit_mb: Number(problem.memory_limit_mb) || 256,
			display_order: displayOrder,
			points,
		};
	});
}

const terminalVerdicts = new Set([
	'accepted',
	'wrong_answer',
	'compilation_error',
	'runtime_error',
	'time_limit',
	'internal_error',
	'exec_format_error',
	'error',
]);

function buildContestSubmissionPayload(contestId, contestProblemId, clerkUserId, submission) {
	const normalizedVerdict = submission.verdict === 'error' ? 'internal_error' : submission.verdict;
	const requiresMetrics = !['pending', 'compilation_error'].includes(normalizedVerdict);

	return {
		contest_id: contestId,
		contest_problem_id: contestProblemId,
		clerk_user_id: clerkUserId,
		submitted_at: submission.submitted_at,
		language: submission.language,
		verdict: normalizedVerdict,
		runtime_ms: requiresMetrics ? (submission.runtime_ms ?? 0) : submission.runtime_ms,
		memory_kb: requiresMetrics ? (submission.memory_kb ?? 0) : submission.memory_kb,
		test_cases_passed: submission.test_cases_passed || 0,
		test_cases_total: submission.test_cases_total || 0,
		source_code: submission.source_code,
		error_message: submission.error_message || null,
	};
}

async function upsertContestSubmissionFromBase(contestId, contestProblemId, clerkUserId, submission) {
	const existing = await contestsRepo.fetchContestSubmissionByFingerprint({
		contestId,
		contestProblemId,
		clerkUserId,
		submittedAt: submission.submitted_at,
	});

	if (existing) {
		return existing;
	}

	const insertPayload = buildContestSubmissionPayload(contestId, contestProblemId, clerkUserId, submission);
	return contestsRepo.insertContestSubmission(insertPayload);
}

async function syncContestSubmissionsFromBase(contestId) {
	const contest = await contestsRepo.fetchContestById(contestId);
	if (!contest?.start_time || !contest?.end_time) {
		return;
	}

	const contestProblems = await contestsRepo.fetchContestProblems(contestId);
	if (!Array.isArray(contestProblems) || contestProblems.length === 0) {
		return;
	}

	const problemIdToContestProblemId = new Map();
	for (const contestProblem of contestProblems) {
		if (!contestProblem?.problem_id || !contestProblem?.id) {
			continue;
		}
		if (!problemIdToContestProblemId.has(contestProblem.problem_id)) {
			problemIdToContestProblemId.set(contestProblem.problem_id, contestProblem.id);
		}
	}

	const problemIds = Array.from(problemIdToContestProblemId.keys());
	if (problemIds.length === 0) {
		return;
	}

	const baseSubmissions = await contestsRepo.fetchBaseSubmissionsForContestWindow(
		problemIds,
		contest.start_time,
		contest.end_time
	);

	for (const submission of baseSubmissions) {
		if (!terminalVerdicts.has(submission.verdict)) {
			continue;
		}

		const contestProblemId = problemIdToContestProblemId.get(submission.problem_id);
		if (!contestProblemId) {
			continue;
		}

		try {
			await upsertContestSubmissionFromBase(
				contestId,
				contestProblemId,
				submission.clerk_user_id,
				submission
			);
		} catch (error) {
			console.warn(
				`Skipping contest submission sync for submission ${submission.id}:`,
				error.message
			);
		}
	}
}

export async function createContest(clerkUserId, payload = {}) {
	await assertStaff(clerkUserId);

	if (!payload?.title || typeof payload.title !== 'string') {
		throw buildHttpError('title is required', 400);
	}

	const trimmedTitle = payload.title.trim();
	if (trimmedTitle.length < 5 || trimmedTitle.length > 150) {
		throw buildHttpError('title must be between 5 and 150 characters', 400);
	}

	if (!payload?.start_time) {
		throw buildHttpError('start_time is required', 400);
	}
	if (!payload?.end_time) {
		throw buildHttpError('end_time is required', 400);
	}

	const startTimeISO = parseDateOrThrow(payload.start_time, 'start_time');
	const endTimeISO = parseDateOrThrow(payload.end_time, 'end_time');

	if (new Date(endTimeISO) <= new Date(startTimeISO)) {
		throw buildHttpError('end_time must be after start_time', 400);
	}

	const registrationDeadlineISO = payload.registration_deadline
		? parseDateOrThrow(payload.registration_deadline, 'registration_deadline')
		: null;

	const contestPayload = {
		title: trimmedTitle,
		description: payload.description || null,
		start_time: startTimeISO,
		end_time: endTimeISO,
		max_participants: payload.max_participants ?? null,
		registration_deadline: registrationDeadlineISO,
		is_rated: payload.is_rated !== false,
		created_by: clerkUserId,
	};

	const normalizedProblems = normalizeProblems(payload.problems);

	let createdContest;
	try {
		createdContest = await contestsRepo.insertContest(contestPayload);
		const contestProblems = await contestsRepo.insertContestProblems(createdContest.id, normalizedProblems);

		return {
			...createdContest,
			problems: contestProblems,
		};
	} catch (error) {
		if (createdContest?.id) {
			try {
				await contestsRepo.deleteContestById(createdContest.id);
			} catch (rollbackError) {
				console.error('Rollback failed after contest creation error:', rollbackError);
			}
		}
		throw error;
	}
}

export async function getContests() {
	return contestsRepo.fetchContests();
}

export async function getContestById(contestId) {
	return contestsRepo.fetchContestById(contestId);
}

export async function getContestProblems(contestId) {
	return contestsRepo.fetchContestProblems(contestId);
}

export async function getContestSubmissions(contestId) {
	await syncContestSubmissionsFromBase(contestId);
	return contestsRepo.fetchContestSubmissions(contestId);
}

export async function createContestSubmission(contestId, clerkUserId, payload = {}) {
	if (!contestId) {
		throw buildHttpError('contestId is required', 400);
	}

	const { submission_id: submissionId, contest_problem_id: contestProblemId } = payload;

	if (!submissionId || !contestProblemId) {
		throw buildHttpError('submission_id and contest_problem_id are required', 400);
	}

	const contest = await contestsRepo.fetchContestById(contestId);
	if (!contest) {
		throw buildHttpError('Contest not found', 404);
	}

	const contestProblem = await contestsRepo.fetchContestProblemById(contestId, contestProblemId);
	if (!contestProblem) {
		throw buildHttpError('Contest problem not found', 404);
	}

	const submission = await submissionsRepo.getSubmissionById(submissionId, clerkUserId);
	if (!submission) {
		throw buildHttpError('Submission not found', 404);
	}

	if (submission.problem_id !== contestProblem.problem_id) {
		throw buildHttpError('Submission problem does not match contest problem', 400);
	}

	if (!terminalVerdicts.has(submission.verdict)) {
		throw buildHttpError('Submission is not finalized yet', 409);
	}

	return upsertContestSubmissionFromBase(contestId, contestProblemId, clerkUserId, submission);
}

export async function getContestRegistrants(contestId, queryParams = {}) {
	let page = Number.parseInt(queryParams.page, 10);
	let limit = Number.parseInt(queryParams.limit, 10);

	if (Number.isNaN(page) || page < 1) {
		page = 1;
	}
	if (Number.isNaN(limit) || limit < 1) {
		limit = 10;
	}
	limit = Math.min(limit, 50);

	return contestsRepo.fetchContestRegistrants(contestId, { page, limit });
}
