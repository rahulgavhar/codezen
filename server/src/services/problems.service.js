import * as problemsRepo from '../repositories/problems.repo.js';

/**
 * Get published problems with filtering and pagination
 * @param {Object} queryParams - Query parameters from request
 * @param {number} queryParams.page - Page number (default: 1)
 * @param {number} queryParams.limit - Items per page (default: 10, max: 100)
 * @param {string} queryParams.topics - Comma-separated tags to filter by
 * @param {string} queryParams.difficulties - Comma-separated difficulties to filter by
 * @param {string} queryParams.search - Search query for title/description
 * @returns {Promise<Object>} Formatted problems response
 */
export async function getUserProblems(queryParams = {}) {
  let { page = 1, limit = 10, topics = '', difficulties = '', search = '' } = queryParams;

  // Validate and normalize pagination params
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(Math.max(1, parseInt(limit) || 10), 100); // Cap at 100

  // Parse filter arrays
  const topicsArray = topics
    ? topics.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const difficultiesArray = difficulties
    ? difficulties.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  // Fetch problems with filters
  const result = await problemsRepo.getPublishedProblems({
    page,
    limit,
    topics: topicsArray,
    difficulties: difficultiesArray,
    search: search.trim(),
  });

  return {
    problems: result.data,
    pagination: {
      page: result.page,
      limit: result.limit,
      count: result.count,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
}

/**
 * Get a single problem by ID
 * @param {string} problemId - UUID of the problem
 * @returns {Promise<Object>} Problem details
 */
export async function getSingleProblem(problemId) {
  const problem = await problemsRepo.getProblemById(problemId);
  
  if (!problem) {
    return null;
  }

  return problem;
}

/**
 * Get samples for a problem
 * @param {string} problemId - UUID of the problem
 * @returns {Promise<Array>} Problem samples
 */
export async function getProblemSamples(problemId) {
  return await problemsRepo.getProblemSamples(problemId);
}

/**
 * Get all available problem tags
 * @returns {Promise<Array>} Array of tag names
 */
export async function getAvailableTags() {
  return await problemsRepo.getAllTags();
}
