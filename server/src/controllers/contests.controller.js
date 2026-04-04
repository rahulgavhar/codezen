import * as problemsService from '../services/problems.service.js';
import * as contestService from '../services/contest.service.js';
import * as contestReplayService from '../services/contestReplay.service.js';
import { ENV } from '../config/env.config.js';
import { callGroqLLM } from '../config/groq.client.js';

function getAuthUserId(req) {
	return req.auth()?.userId;
}

export async function createContest(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const createdContest = await contestService.createContest(clerkUserId, req.body || {});

		return res.status(201).json(createdContest);
	} catch (error) {
		console.error('Error in createContest:', error);
		next(error);
	}
}

export async function getContests(req, res, next) {
	try {
		const contests = await contestService.getContests();
		return res.status(200).json(contests);
	} catch (error) {
		console.error('Error in getContests:', error);
		next(error);
	}
}

export async function getContestById(req, res, next) {
	try {
		const { contestId } = req.params;
		const contest = await contestService.getContestById(contestId);

		if (!contest) {
			return res.status(404).json({
				success: false,
				message: 'Contest not found',
			});
		}

		return res.status(200).json(contest);
	} catch (error) {
		console.error('Error in getContestById:', error);
		next(error);
	}
}

export async function getContestProblems(req, res, next) {
	try {
		const { contestId } = req.params;
		const contest = await contestService.getContestById(contestId);

		if (!contest) {
			return res.status(404).json({
				success: false,
				message: 'Contest not found',
			});
		}

		const problems = await contestService.getContestProblems(contestId);
		return res.status(200).json(problems);
	} catch (error) {
		console.error('Error in getContestProblems:', error);
		next(error);
	}
}

export async function getContestSubmissions(req, res, next) {
	try {
		const { contestId } = req.params;
		const contest = await contestService.getContestById(contestId);

		if (!contest) {
			return res.status(404).json({
				success: false,
				message: 'Contest not found',
			});
		}

		const submissions = await contestService.getContestSubmissions(contestId);
		return res.status(200).json(submissions);
	} catch (error) {
		console.error('Error in getContestSubmissions:', error);
		next(error);
	}
}

export async function createContestSubmission(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId } = req.params;
		const created = await contestService.createContestSubmission(
			contestId,
			clerkUserId,
			req.body || {}
		);

		return res.status(201).json(created);
	} catch (error) {
		console.error('Error in createContestSubmission:', error);
		next(error);
	}
}

export async function getContestRegistrants(req, res, next) {
	try {
		const { contestId } = req.params;
		const page = req.query?.page;
		const limit = req.query?.limit;

		const contest = await contestService.getContestById(contestId);

		if (!contest) {
			return res.status(404).json({
				success: false,
				message: 'Contest not found',
			});
		}

		const registrantsResult = await contestService.getContestRegistrants(contestId, { page, limit });
		return res.status(200).json(registrantsResult);
	} catch (error) {
		console.error('Error in getContestRegistrants:', error);
		next(error);
	}
}

export async function getContestRegistrationStatus(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId } = req.params;
		const status = await contestService.getContestRegistrationStatus(contestId, clerkUserId);
		return res.status(200).json(status);
	} catch (error) {
		console.error('Error in getContestRegistrationStatus:', error);
		next(error);
	}
}

export async function registerForContest(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId } = req.params;
		const result = await contestService.registerForContest(contestId, clerkUserId);
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error in registerForContest:', error);
		next(error);
	}
}

export async function getContestLeaderboard(req, res, next) {
	try {
		const { contestId } = req.params;
		const page = req.query?.page;
		const limit = req.query?.limit;
		const clerkUserId = req.query?.clerk_user_id;

		const leaderboardResult = await contestService.getContestLeaderboard(contestId, {
			page,
			limit,
			clerk_user_id: clerkUserId,
		});

		return res.status(200).json(leaderboardResult);
	} catch (error) {
		console.error('Error in getContestLeaderboard:', error);
		next(error);
	}
}

export async function initContestReplay(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId } = req.params;
		const { contest_problem_id: contestProblemId } = req.body || {};

		const replay = await contestReplayService.initContestReplayTimeline(
			contestId,
			contestProblemId,
			clerkUserId
		);

		return res.status(200).json(replay);
	} catch (error) {
		console.error('Error in initContestReplay:', error);
		next(error);
	}
}

export async function appendContestReplayEvents(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId, timelineId } = req.params;
		const result = await contestReplayService.appendContestReplayEvents(
			contestId,
			timelineId,
			clerkUserId,
			req.body || {}
		);

		return res.status(202).json(result);
	} catch (error) {
		console.error('Error in appendContestReplayEvents:', error);
		next(error);
	}
}

export async function finalizeContestReplay(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId, timelineId } = req.params;
		const replay = await contestReplayService.finalizeContestReplayTimeline(
			contestId,
			timelineId,
			clerkUserId,
			req.body || {}
		);

		return res.status(200).json(replay);
	} catch (error) {
		console.error('Error in finalizeContestReplay:', error);
		next(error);
	}
}

export async function getContestReplay(req, res, next) {
	try {
		const clerkUserId = getAuthUserId(req);
		if (!clerkUserId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const { contestId, timelineId } = req.params;
		const replay = await contestReplayService.getContestReplayTimeline(
			contestId,
			timelineId,
			clerkUserId
		);

		return res.status(200).json(replay);
	} catch (error) {
		console.error('Error in getContestReplay:', error);
		next(error);
	}
}

export async function getContestReplayByUserProblem(req, res, next) {
	try {
		const { contestId } = req.params;
		const contestProblemId = String(req.query?.contest_problem_id || '').trim();
		const replayOwnerClerkUserId = String(req.query?.clerk_user_id || '').trim();

		const replay = await contestReplayService.getContestReplayByUserProblem(
			contestId,
			contestProblemId,
			replayOwnerClerkUserId
		);

		return res.status(200).json(replay);
	} catch (error) {
		console.error('Error in getContestReplayByUserProblem:', error);
		next(error);
	}
}

/**
 * GET /api/contests/problems/:problemId
 * Fetch problem data used while assembling contest problem snapshots.
 */
export async function getContestProblemPreview(req, res, next) {
	try {
		const { problemId } = req.params;

		if (!problemId) {
			return res.status(400).json({
				success: false,
				message: 'problemId is required',
			});
		}

		const problem = await problemsService.getSingleProblem(problemId);

		if (!problem) {
			return res.status(404).json({
				success: false,
				message: 'Problem not found',
			});
		}

		return res.json({
			success: true,
			data: problem,
		});
	} catch (error) {
		console.error('Error in getContestProblemPreview:', error);
		next(error);
	}
}

/**
 * POST /api/contests/problems/:problemId/transform-description
 * Generate an engaging transformed description for contest snapshot editing.
 */
export async function transformContestProblemDescription(req, res, next) {
	try {
		if (!ENV.GROQ_API_KEY) {
			return res.status(400).json({
				success: false,
				message: 'Groq API key is not configured',
			});
		}

		const { problemId } = req.params;
		const { description, title } = req.body || {};

		let baseDescription = description;
		let baseTitle = title;

		if (!baseDescription) {
			const problem = await problemsService.getSingleProblem(problemId);

			if (!problem) {
				return res.status(404).json({
					success: false,
					message: 'Problem not found',
				});
			}

			baseDescription = problem.description;
			baseTitle = problem.title;
		}

		if (!baseDescription) {
			return res.status(400).json({
				success: false,
				message: 'Problem has no description to transform',
			});
		}

		const prompt = `Make this coding problem description more engaging and story-like while preserving all technical correctness and formatting. Keep HTML and KaTeX tags intact and do not remove constraints or edge-case details.\n\nProblem Title: ${baseTitle || 'Untitled'}\n\nOriginal Description:\n${baseDescription}`;

		const transformedDescription = await callGroqLLM(prompt, {
			temperature: 0.7,
			maxTokens: 2048,
		});

		return res.json({
			success: true,
			data: {
				gemini_description: transformedDescription,
			},
		});
	} catch (error) {
		console.error('Error in transformContestProblemDescription:', error);
		next(error);
	}
}
