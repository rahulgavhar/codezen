import express from 'express';
const router = express.Router();

import * as submissionsService from '../services/submissions.service.js';

// Map to track submissions waiting for stuck test polling
// Key: submissionId, Value: { testCasesTotal, lastPollTime }
const stuckTestPollers = new Map();

/**
 * Judge0 Webhook: Accept PUT request when code execution is complete
 * @route PUT /api/webhooks/judge0
 * @body {Object} Judge0 submission object with token and results
 */
router.put('/judge0', async (req, res) => {
  try {
    const judge0Data = req.body;

    // Validate that Judge0 payload contains token
    if (!judge0Data || !judge0Data.token) {
      console.warn('Webhook received without token:', judge0Data);
      return res.status(400).json({ error: 'Missing Judge0 token in payload' });
    }

    console.log(`Webhook received for Judge0 token: ${judge0Data.token}`);

    // First, try to find as a test case result (problem-based submissions)
    let updatedSubmission = await submissionsService.updateTestCaseResultFromJudge0(
      judge0Data.token,
      judge0Data
    );

    // If not found as test case, it might be an IDE submission with single judge0_token
    if (!updatedSubmission) {
      console.log('Token not found in test cases, trying single judge0_token lookup');
      
      // Try to find by single judge0_token (IDE mode)
      const submission = await submissionsService.getSubmissionByJudge0Token(judge0Data.token);
      if (submission) {
        // Update submission with Judge0 results (old flow for IDE)
        updatedSubmission = await submissionsService.updateSubmissionFromJudge0(
          judge0Data.token,
          judge0Data
        );
      }
    }

    if (!updatedSubmission) {
      console.warn(`Submission not found for Judge0 token: ${judge0Data.token}`);
      // Return 200 anyway so Judge0 doesn't retry
      return res.status(200).json({ message: 'Token not found, but webhook processed' });
    }

    console.log(`Submission ${updatedSubmission.id} updated with verdict: ${updatedSubmission.verdict}`);

    // If submission is still pending, schedule a stuck test poller
    if (updatedSubmission.verdict === 'pending' && updatedSubmission.test_results && updatedSubmission.test_cases_total > 0) {
      const submissionId = updatedSubmission.id;
      
      // Check if we already have a poller scheduled for this submission
      if (!stuckTestPollers.has(submissionId)) {
        console.log(`[Stuck Test Poller] Scheduling poller for submission ${submissionId.substring(0, 8)} in 15 seconds...`);
        
        stuckTestPollers.set(submissionId, {
          testCasesTotal: updatedSubmission.test_cases_total,
          lastPollTime: Date.now(),
        });

        // Schedule stuck test polling after 15 seconds
        setTimeout(async () => {
          try {
            console.log(`[Stuck Test Poller] Checking submission ${submissionId.substring(0, 8)} for stuck tests...`);
            
            // Fetch current submission without user scoping (internal webhook flow)
            const submission = await submissionsService.getSubmissionForTestCaseTracking(submissionId);
            
            if (!submission) {
              stuckTestPollers.delete(submissionId);
              return;
            }

            // If still pending, poll Judge0 for stuck tests
            if (submission.verdict === 'pending') {
              await submissionsService.pollStuckTestCasesFromJudge0(
                submissionId,
                submission.test_results,
                submission.test_cases_total
              );
            }

            stuckTestPollers.delete(submissionId);
          } catch (err) {
            console.error(`[Stuck Test Poller] Error processing submission ${submissionId.substring(0, 8)}:`, err.message);
            stuckTestPollers.delete(submissionId);
          }
        }, 15000); // 15 second delay
      }
    }

    res.status(200).json({
      success: true,
      message: 'Test case result processed successfully',
      submission_id: updatedSubmission.id,
      verdict: updatedSubmission.verdict,
      test_cases_passed: updatedSubmission.test_cases_passed,
      test_cases_total: updatedSubmission.test_cases_total,
    });
  } catch (error) {
    console.error('Error processing Judge0 webhook:', error);
    // Return 200 to avoid Judge0 retrying, but log the error for debugging
    res.status(200).json({
      error: 'Internal error processing webhook',
      message: error.message,
    });
  }
});

export default router;
