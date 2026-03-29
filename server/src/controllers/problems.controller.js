import * as problemsService from '../services/problems.service.js';

/**
 * GET /api/problems
 * Get published problems with filtering and pagination
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 10, max: 100)
 *   - topics: comma-separated tag names (e.g., "graphs,sorting")
 *   - difficulties: comma-separated difficulties (e.g., "easy,medium")
 *   - search: search text for title or problem ID (e.g., "array" or "42")
 *   - status: filter by status (only public 'published' available)
 */
export async function getProblems(req, res, next) {
  try {
    const result = await problemsService.getUserProblems(req.query);
    
    res.json({
      success: true,
      data: result.problems,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error in getProblems:', error);
    next(error);
  }
}

/**
 * GET /api/problems/:id
 * Get a single problem by ID with full details
 */
export async function getProblemDetail(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Problem ID is required',
      });
    }

    const problem = await problemsService.getSingleProblem(id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found or not published',
      });
    }

    res.json({
      success: true,
      data: problem,
    });
  } catch (error) {
    console.error('Error in getProblemDetail:', error);
    next(error);
  }
}

/**
 * GET /api/problems/:id/samples
 * Get test case samples for a problem
 */
export async function getProblemSamples(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Problem ID is required',
      });
    }

    // Verify problem exists and is published
    const problem = await problemsService.getSingleProblem(id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found or not published',
      });
    }

    const samples = await problemsService.getProblemSamples(id);

    res.json({
      success: true,
      data: samples,
    });
  } catch (error) {
    console.error('Error in getProblemSamples:', error);
    next(error);
  }
}

/**
 * GET /api/problems/tags
 * Get all available problem tags
 */
export async function getAvailableTags(req, res, next) {
  try {
    const tags = await problemsService.getAvailableTags();

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error('Error in getAvailableTags:', error);
    next(error);
  }
}
