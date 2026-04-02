import { supabase, ensureSupabaseConfigured } from '../config/supabase.client.js';

export async function getUserRole(clerkUserId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('user_profiles')
		.select('app_role')
		.eq('clerk_user_id', clerkUserId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		throw error;
	}

	return data?.app_role || null;
}

export async function insertContest(payload) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contests')
		.insert(payload)
		.select('*')
		.single();

	if (error) {
		throw error;
	}

	return data;
}

export async function insertContestProblems(contestId, problems) {
	ensureSupabaseConfigured();

	const rows = (problems || []).map((problem) => ({
		contest_id: contestId,
		problem_id: problem.problem_id,
		title: problem.title,
		description: problem.description,
		gemini_description: problem.gemini_description || null,
		input_format: problem.input_format || null,
		output_format: problem.output_format || null,
		constraints: problem.constraints || null,
		time_limit_ms: problem.time_limit_ms || 2000,
		memory_limit_mb: problem.memory_limit_mb || 256,
		display_order: problem.display_order,
		points: problem.points,
	}));

	if (rows.length === 0) {
		return [];
	}

	const { data, error } = await supabase
		.from('contest_problems')
		.insert(rows)
		.select('*')
		.order('display_order', { ascending: true });

	if (error) {
		throw error;
	}

	return data || [];
}

export async function deleteContestById(contestId) {
	ensureSupabaseConfigured();

	const { error } = await supabase
		.from('contests')
		.delete()
		.eq('id', contestId);

	if (error) {
		throw error;
	}
}

export async function fetchContests() {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contests')
		.select('*')
		.order('start_time', { ascending: false });

	if (error) {
		throw error;
	}

	return data || [];
}

export async function fetchContestById(contestId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contests')
		.select('*')
		.eq('id', contestId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		throw error;
	}

	return data;
}

export async function fetchContestProblems(contestId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contest_problems')
		.select(`
			id,
			contest_id,
			problem_id,
			title,
			description,
			gemini_description,
			input_format,
			output_format,
			constraints,
			time_limit_ms,
			memory_limit_mb,
			display_order,
			points,
			created_at,
			problems (
				id,
				title,
				difficulty
			)
		`)
		.eq('contest_id', contestId)
		.order('display_order', { ascending: true });

	if (error) {
		throw error;
	}

	return (data || []).map((row) => ({
		...row,
		problem: row.problems || null,
	}));
}

export async function fetchContestProblemById(contestId, contestProblemId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contest_problems')
		.select('id, contest_id, problem_id, title')
		.eq('contest_id', contestId)
		.eq('id', contestProblemId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		throw error;
	}

	return data;
}

export async function fetchContestSubmissions(contestId) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contest_submissions')
		.select(`
			id,
			contest_id,
			contest_problem_id,
			clerk_user_id,
			submitted_at,
			verdict,
			language,
			runtime_ms,
			memory_kb,
			test_cases_passed,
			test_cases_total,
			source_code,
			contest_problems (
				id,
				title,
				display_order,
				points
			)
		`)
		.eq('contest_id', contestId)
		.order('submitted_at', { ascending: false })
		.limit(500);

	if (error) {
		throw error;
	}

	return (data || []).map((row) => ({
		...row,
		contest_problem: row.contest_problems || null,
	}));
}

export async function fetchContestSubmissionByFingerprint({ contestId, contestProblemId, clerkUserId, submittedAt }) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contest_submissions')
		.select('id, contest_id, contest_problem_id, clerk_user_id, submitted_at, verdict, language, runtime_ms, memory_kb, test_cases_passed, test_cases_total, source_code, error_message')
		.eq('contest_id', contestId)
		.eq('contest_problem_id', contestProblemId)
		.eq('clerk_user_id', clerkUserId)
		.eq('submitted_at', submittedAt)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data || null;
}

export async function insertContestSubmission(payload) {
	ensureSupabaseConfigured();

	const { data, error } = await supabase
		.from('contest_submissions')
		.insert(payload)
		.select('id, contest_id, contest_problem_id, clerk_user_id, submitted_at, verdict, language, runtime_ms, memory_kb, test_cases_passed, test_cases_total, source_code, error_message')
		.single();

	if (error) {
		throw error;
	}

	return data;
}

export async function fetchBaseSubmissionsForContestWindow(problemIds, startTime, endTime) {
	ensureSupabaseConfigured();

	if (!Array.isArray(problemIds) || problemIds.length === 0) {
		return [];
	}

	const { data, error } = await supabase
		.from('submissions')
		.select('id, clerk_user_id, problem_id, submitted_at, language, verdict, runtime_ms, memory_kb, test_cases_passed, test_cases_total, source_code, error_message')
		.in('problem_id', problemIds)
		.gte('submitted_at', startTime)
		.lte('submitted_at', endTime)
		.order('submitted_at', { ascending: false })
		.limit(2000);

	if (error) {
		throw error;
	}

	return data || [];
}

export async function fetchContestRegistrants(contestId, options = {}) {
	ensureSupabaseConfigured();
	const page = options.page || 1;
	const limit = options.limit || 10;
	const from = (page - 1) * limit;
	const to = from + limit - 1;

	const { data, error, count } = await supabase
		.from('contest_registrations')
		.select(`
			contest_id,
			clerk_user_id,
			user_profiles (
				username,
				display_name,
				avatar_url,
				last_active_at
			)
		`, { count: 'exact' })
		.eq('contest_id', contestId)
		.order('last_active_at', { ascending: false, foreignTable: 'user_profiles' })
		.order('clerk_user_id', { ascending: false })
		.range(from, to);

	if (error) {
		throw error;
	}

	const total = count || 0;
	const pages = total === 0 ? 0 : Math.ceil(total / limit);

	const registrants = (data || []).map((item) => {
		const profile = Array.isArray(item.user_profiles)
			? item.user_profiles[0]
			: item.user_profiles;

		return {
			clerk_user_id: item.clerk_user_id,
			username: profile?.username || null,
			display_name: profile?.display_name || null,
			avatar_url: profile?.avatar_url || null,
			last_active_at: profile?.last_active_at || null,
		};
	});

	return {
		data: registrants,
		pagination: {
			page,
			limit,
			count: registrants.length,
			total,
			pages,
		},
	};
}
