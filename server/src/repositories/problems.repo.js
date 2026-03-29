import { supabase } from '../config/supabase.client.js';

/**
 * Get published problems with filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {Array<string>} options.topics - Filter by topics/tags
 * @param {Array<string>} options.difficulties - Filter by difficulty
 * @param {string} options.search - Search in title or description
 * @returns {Promise<{data: Array, count: number, total: number}>} Problems with pagination info
 */
export async function getPublishedProblems(options = {}) {
  const {
    page = 1,
    limit = 10,
    topics = [],
    difficulties = [],
    search = '',
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

  // Apply search filter in memory
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    problems = problems.filter(problem =>
      problem.title.toLowerCase().includes(searchLower) ||
      problem.description.toLowerCase().includes(searchLower)
    );
  }

  // Format response data
  const formattedProblems = problems.map(problem => ({
    id: problem.id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    description: problem.description,
    acceptance: problem.acceptance,
    total_attempts: problem.total_attempts,
    total_accepted: problem.total_accepted,
    tags: problem.problem_tags
      .map(pt => pt.tags.name)
      .filter(Boolean),
    created_at: problem.created_at,
  }));

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
    acceptance: problem.acceptance,
    total_attempts: problem.total_attempts,
    total_accepted: problem.total_accepted,
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
