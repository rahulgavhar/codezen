import * as submissionsService from '../services/submissions.service.js';

/**
 * Get all submissions for the current user
 * @route GET /api/submissions
 */
export async function getUserSubmissions(req, res) {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const submissions = await submissionsService.getUserSubmissions(clerkUserId);
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error in getUserSubmissions controller:', error);
    res.status(500).json({ 
      error: 'Failed to fetch submissions',
      message: error.message 
    });
  }
}

/**
 * Get a specific submission by ID
 * @route GET /api/submissions/:submissionId
 */
export async function getSubmissionById(req, res) {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { submissionId } = req.params;

    if (!submissionId) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    const submission = await submissionsService.getSubmissionById(submissionId, clerkUserId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found or unauthorized' });
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error('Error in getSubmissionById controller:', error);
    res.status(500).json({ 
      error: 'Failed to fetch submission',
      message: error.message 
    });
  }
}

/**
 * Create a new submission
 * @route POST /api/submissions
 */
export async function createSubmission(req, res) {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { problem_id, language, source_code, stdin } = req.body;

    // Validate required fields (problem_id is optional for IDE)
    if (!language || !source_code) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['language', 'source_code']
      });
    }

    // Validate language
    const validLanguages = ['javascript', 'python', 'cpp', 'java'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ 
        error: 'Invalid language',
        validLanguages 
      });
    }

    const submissionData = {
      problem_id,
      language,
      source_code,
      stdin: stdin || null,
      verdict: 'pending',
      test_cases_passed: 0,
      test_cases_total: 0,
    };

    console.log(`[createSubmission] Starting submission for user ${clerkUserId}, problem: ${problem_id}, language: ${language}`);
    const startTime = Date.now();
    
    const submission = await submissionsService.createSubmission(clerkUserId, submissionData);
    
    const elapsedTime = Date.now() - startTime;
    console.log(`[createSubmission] Submission created in ${elapsedTime}ms, ID: ${submission.id}, verdict: ${submission.verdict}`);

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error in createSubmission controller:', error);
    
    // Return appropriate HTTP status code
    const statusCode = error.message?.includes('timeout') ? 504 : 500;
    
    res.status(statusCode).json({ 
      error: 'Failed to create submission',
      message: error.message,
      code: statusCode === 504 ? 'GATEWAY_TIMEOUT' : 'INTERNAL_ERROR',
    });
  }
}

/**
 * Run code against a sample test case
 * @route POST /api/submissions/run-sample
 */
export async function runSampleTest(req, res) {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { problem_id, language, source_code, sample_input } = req.body;

    // Validate required fields
    if (!problem_id || !language || !source_code) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['problem_id', 'language', 'source_code']
      });
    }

    // Validate language
    const validLanguages = ['javascript', 'python', 'cpp', 'java'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ 
        error: 'Invalid language',
        validLanguages 
      });
    }

    const result = await submissionsService.runSampleTest(
      clerkUserId,
      problem_id,
      language,
      source_code,
      sample_input || ''
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in runSampleTest controller:', error);
    res.status(500).json({ 
      error: 'Failed to run sample test',
      message: error.message 
    });
  }
}

/**
 * Get submission statistics for the current user
 * @route GET /api/submissions/stats
 */
export async function getUserSubmissionStats(req, res) {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await submissionsService.getUserSubmissionStats(clerkUserId);
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error in getUserSubmissionStats controller:', error);
    res.status(500).json({ 
      error: 'Failed to fetch submission statistics',
      message: error.message 
    });
  }
}
