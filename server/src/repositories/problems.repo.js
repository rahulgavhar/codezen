import { supabase } from '../config/supabase.client.js';

/**
 * Get published problems with filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {Array<string>} options.topics - Filter by topics/tags
 * @param {Array<string>} options.difficulties - Filter by difficulty
 * @param {string} options.search - Search in title or match problem ID
 * @returns {Promise<{data: Array, count: number, total: number}>} Problems with pagination info
 */
export async function getPublishedProblems(options = {}) {
  const {
    page = 1,
    limit = 10,
    topics = [],
    difficulties = [],
    search = '',
    clerkUserId = null,
    progressStatus = '',
  } = options;

  const offset = (page - 1) * limit;

  // Start with base query for published problems
  let query = supabase
    .from('problems')
    .select(
      `
      id,
      title,
      slug,
      difficulty,
      description,
      acceptance,
      total_attempts,
      total_accepted,
      created_at,
      problem_tags (
        tags (
          id,
          name
        )
      )
      `,
      { count: 'exact' }
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply difficulty filter if provided
  if (difficulties.length > 0) {
    query = query.in('difficulty', difficulties.map(d => d.toLowerCase()));
  }

  // Execute base query first
  let { data: problems, error: baseError, count: totalCount } = await query;

  if (baseError) {
    console.error('Error fetching problems:', baseError);
    throw baseError;
  }

  // Apply topic filter in memory (post-fetch) since we need to join through tags
  if (topics.length > 0) {
    problems = problems.filter(problem => {
      const problemTags = problem.problem_tags
        .map(pt => pt.tags.name)
        .filter(Boolean);
      return topics.some(topic => 
        problemTags.some(tag => 
          tag.toLowerCase() === topic.toLowerCase()
        )
      );
    });
  }

  // Apply search filter in title or ID (both checked)
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    problems = problems.filter(problem => {
      // Check if search matches title
      const matchesTitle = problem.title.toLowerCase().includes(searchLower);
      // Check if search matches problem ID
      const matchesId = problem.id === search || problem.id.toLowerCase() === searchLower;
      return matchesTitle || matchesId;
    });
  }

  // Format response data
  const problemIds = problems.map((problem) => problem.id);
  let userProgressByProblemId = new Map();

  if (clerkUserId && problemIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabase
      .from('user_problems')
      .select('problem_id, status, attempts')
      .eq('clerk_user_id', clerkUserId)
      .in('problem_id', problemIds);

    if (progressError) {
      console.error('Error fetching user problem progress:', progressError);
    } else {
      userProgressByProblemId = new Map(
        (progressRows || []).map((row) => [row.problem_id, row])
      );
    }
  }

  const normalizedProgressStatus = String(progressStatus || '').toLowerCase();

  let formattedProblems = problems.map(problem => {
    const progress = userProgressByProblemId.get(problem.id);
    const statusValue = progress?.status || 'unsolved';

    const parsedAcceptance = Number.parseFloat(problem.acceptance);
    const acceptanceFromColumns = Number.isFinite(parsedAcceptance)
      ? parsedAcceptance
      : null;
    const attemptsValue = Number(problem.total_attempts || 0);
    const acceptedValue = Number(problem.total_accepted || 0);
    const acceptanceDerived =
      attemptsValue > 0 ? (acceptedValue / attemptsValue) * 100 : 0;

    const normalizedAcceptance = Number(
      (acceptanceFromColumns ?? acceptanceDerived).toFixed(1)
    );

    return {
    id: problem.id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    description: problem.description,
    acceptance: normalizedAcceptance,
    total_attempts: problem.total_attempts,
    total_accepted: problem.total_accepted,
    user_status: statusValue,
    user_attempts: Number(progress?.attempts || 0),
    tags: problem.problem_tags
      .map(pt => pt.tags.name)
      .filter(Boolean),
    created_at: problem.created_at,
    };
  });

  if (normalizedProgressStatus === 'attempted' || normalizedProgressStatus === 'solved') {
    formattedProblems = formattedProblems.filter(
      (problem) => problem.user_status === normalizedProgressStatus
    );
  }

  // Get total count for pagination (accounting for filters)
  const filteredTotal = formattedProblems.length;

  return {
    data: formattedProblems.slice(0, limit), // Apply pagination to filtered results
    count: formattedProblems.slice(0, limit).length, // Current page count
    total: totalCount, // Total published problems
    page,
    limit,
  };
}

/**
 * Get a single problem by ID with full details
 * @param {string} problemId - UUID of the problem
 * @returns {Promise<Object>} Problem details
 */
export async function getProblemById(problemId) {
  return await getProblemByIdForUser(problemId, null);
}

/**
 * Get a single problem by ID with user progress details
 * @param {string} problemId - UUID of the problem
 * @param {string|null} clerkUserId - Clerk user id for personalized status
 * @returns {Promise<Object>} Problem details
 */
export async function getProblemByIdForUser(problemId, clerkUserId = null) {
  const { data: problem, error } = await supabase
    .from('problems')
    .select(`
      id,
      title,
      slug,
      difficulty,
      description,
      input_format,
      output_format,
      constraints,
      hints,
      time_limit_ms,
      memory_limit_mb,
      acceptance,
      total_attempts,
      total_accepted,
      created_at,
      problem_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('id', problemId)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching problem:', error);
    throw error;
  }

  let userStatus = 'unsolved';
  let userAttempts = 0;

  if (clerkUserId) {
    const { data: progress, error: progressError } = await supabase
      .from('user_problems')
      .select('status, attempts')
      .eq('clerk_user_id', clerkUserId)
      .eq('problem_id', problemId)
      .maybeSingle();

    if (progressError) {
      console.error('Error fetching user problem status for detail:', progressError);
    } else if (progress) {
      userStatus = progress.status || 'unsolved';
      userAttempts = Number(progress.attempts || 0);
    }
  }

  const parsedAcceptance = Number.parseFloat(problem.acceptance);
  const acceptanceFromColumns = Number.isFinite(parsedAcceptance)
    ? parsedAcceptance
    : null;
  const attemptsValue = Number(problem.total_attempts || 0);
  const acceptedValue = Number(problem.total_accepted || 0);
  const acceptanceDerived = attemptsValue > 0 ? (acceptedValue / attemptsValue) * 100 : 0;

  return {
    id: problem.id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    description: problem.description,
    input_format: problem.input_format,
    output_format: problem.output_format,
    constraints: problem.constraints,
    hints: problem.hints || [],
    time_limit_ms: problem.time_limit_ms,
    memory_limit_mb: problem.memory_limit_mb,
    acceptance: Number((acceptanceFromColumns ?? acceptanceDerived).toFixed(1)),
    total_attempts: problem.total_attempts,
    total_accepted: problem.total_accepted,
    user_status: userStatus,
    user_attempts: userAttempts,
    tags: problem.problem_tags
      .map(pt => pt.tags.name)
      .filter(Boolean),
    created_at: problem.created_at,
  };
}

/**
 * Get samples for a specific problem ordered by index
 * @param {string} problemId - UUID of the problem
 * @returns {Promise<Array>} Array of problem samples
 */
export async function getProblemSamples(problemId) {
  const { data: samples, error } = await supabase
    .from('problem_samples')
    .select('id, sample_index, input, output, explanation, created_at')
    .eq('problem_id', problemId)
    .order('sample_index', { ascending: true });

  if (error) {
    console.error('Error fetching problem samples:', error);
    throw error;
  }

  return samples || [];
}

/**
 * Get all available tags
 * @returns {Promise<Array>} Array of tags
 */
export async function getAllTags() {
  const { data: tags, error } = await supabase
    .from('tags')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }

  return (tags || []).map(tag => tag.name);
}
