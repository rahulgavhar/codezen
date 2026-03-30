import { ensureSupabaseConfigured, supabase } from "../config/supabase.client.js";

const INTERVIEW_SELECT = `
	id,
	candidate_clerk_id,
	interviewer_clerk_id,
	problem_id,
	room_id,
	status,
	start_time,
	end_time,
	actual_duration,
	feedback,
	candidate_rating,
	technical_score,
	recording_url,
	created_at,
	problem:problems (
		id,
		title,
		slug,
		difficulty
	),
	interviewer_profile:user_profiles!interviews_interviewer_clerk_id_fkey (
		company_name
	)
`;

export async function getUserProfileByClerkId(clerkUserId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("user_profiles")
		.select("clerk_user_id, username, display_name, email, app_role, is_banned")
		.eq("clerk_user_id", clerkUserId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null;
		}
		throw error;
	}

	return data;
}

export async function createOrGetUserProfile(clerkUserId) {
	ensureSupabaseConfigured();

	// Check if profile exists
	const existing = await getUserProfileByClerkId(clerkUserId);
	if (existing) {
		return existing;
	}

	// Generate a unique username by appending timestamp
	const uniqueUsername = `${clerkUserId}_${Date.now()}`;

	// Create new profile with minimal data
	const { data, error } = await supabase
		.from("user_profiles")
		.insert({
			clerk_user_id: clerkUserId,
			username: uniqueUsername,
			display_name: clerkUserId,
			email: `${clerkUserId}@pending.local`,
			app_role: "user",
			is_banned: false,
		})
		.select("clerk_user_id, username, display_name, email, app_role, is_banned")
		.single();

	if (error) {
		throw error;
	}

	return data;
}

export async function getInterviewCandidates() {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("user_profiles")
		.select("clerk_user_id, username, display_name, email")
		.eq("app_role", "user")
		.eq("is_banned", false)
		.order("display_name", { ascending: true });

	if (error) {
		throw error;
	}

	return data || [];
}

export async function createInterview(payload) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("interviews")
		.insert(payload)
		.select(INTERVIEW_SELECT)
		.single();

	if (error) {
		throw error;
	}

	return data;
}

export async function getInterviewsForParticipant(clerkUserId, options = {}) {
	ensureSupabaseConfigured();

	const { status = [], upcoming = false, limit } = options;

	console.log("[Repo] Building query for user:", clerkUserId, { status, upcoming, limit });

	let query = supabase
		.from("interviews")
		.select(INTERVIEW_SELECT)
		.or(`candidate_clerk_id.eq.${clerkUserId},interviewer_clerk_id.eq.${clerkUserId}`)
		.order("start_time", { ascending: true });

	if (status.length > 0) {
		query = query.in("status", status);
	}

	if (upcoming) {
		query = query.gte("end_time", new Date().toISOString());
	}

	if (Number.isFinite(limit) && limit > 0) {
		query = query.limit(limit);
	}

	const { data, error } = await query;

	if (error) {
		console.error("[Repo] Supabase error:", error);
		throw error;
	}

	console.log("[Repo] Query returned:", data?.length || 0, "interviews");
	return data || [];
}

export async function getInterviewById(interviewId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("interviews")
		.select(INTERVIEW_SELECT)
		.eq("id", interviewId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null;
		}
		throw error;
	}

	return data;
}

export async function updateInterviewById(interviewId, updates) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("interviews")
		.update(updates)
		.eq("id", interviewId)
		.select(INTERVIEW_SELECT)
		.single();

	if (error) {
		throw error;
	}

	return data;
}

export async function getInterviewCodeSubmissions(interviewId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("interview_code_submissions")
		.select(
			"id, interview_id, clerk_user_id, language, source_code, verdict, test_cases_passed, test_cases_total, test_results, created_at"
		)
		.eq("interview_id", interviewId)
		.order("created_at", { ascending: false });

	if (error) {
		throw error;
	}

	return data || [];
}

export async function createInterviewProblem(payload) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from("interview_problems")
		.insert({
			interview_id: payload.interview_id,
			problem_id: payload.problem_id,
			title: payload.title,
			description: payload.description,
			input_format: payload.input_format,
			output_format: payload.output_format,
			constraints: payload.constraints,
			hints: payload.hints,
			difficulty: payload.difficulty,
			time_limit_ms: payload.time_limit_ms,
			memory_limit_mb: payload.memory_limit_mb,
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	return data;
}
