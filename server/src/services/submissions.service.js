import * as submissionsRepo from '../repositories/submissions.repo.js';
import * as judge0Service from './judge0.service.js';
import { ENV } from '../config/env.config.js';
import { supabase } from '../config/supabase.client.js';

/**
 * Get all submissions for the current user with formatted data
 * @param {string} clerkUserId - Clerk user ID
 * @returns {Promise<Array>} Formatted submissions
 */
export async function getUserSubmissions(clerkUserId) {
  const submissions = await submissionsRepo.getUserSubmissions(clerkUserId);
  
  return submissions.map(submission => ({
    id: submission.id,
    submitted_at: submission.submitted_at,
    judged_at: submission.judged_at,
    language: submission.language,
    verdict: submission.verdict,
    runtime_ms: submission.runtime_ms,
    memory_kb: submission.memory_kb,
    test_cases_passed: submission.test_cases_passed,
    test_cases_total: submission.test_cases_total,
    error_message: submission.error_message,
    problem: submission.problems ? {
      id: submission.problems.id,
      title: submission.problems.title,
      slug: submission.problems.slug,
      difficulty: submission.problems.difficulty,
    } : null,
  }));
}

/**
 * Get a specific submission by ID with authorization check
 * @param {string} submissionId - UUID of the submission
 * @param {string} clerkUserId - Clerk user ID
 * @returns {Promise<Object|null>} Submission details or null if not found
 */
export async function getSubmissionById(submissionId, clerkUserId) {
  const submission = await submissionsRepo.getSubmissionById(submissionId, clerkUserId);
  
  if (!submission) {
    return null;
  }

  const response = {
    id: submission.id,
    submitted_at: submission.submitted_at,
    judged_at: submission.judged_at,
    language: submission.language,
    verdict: submission.verdict,
    runtime_ms: submission.runtime_ms,
    memory_kb: submission.memory_kb,
    test_cases_passed: submission.test_cases_passed,
    test_cases_total: submission.test_cases_total,
    test_results: submission.test_results,
    error_message: submission.error_message,
    source_code: submission.source_code,
    stdout: submission.stdout,
    stderr: submission.stderr,
    compile_output: submission.compile_output,
    problem: submission.problems ? {
      id: submission.problems.id,
      title: submission.problems.title,
      slug: submission.problems.slug,
      difficulty: submission.problems.difficulty,
      description: submission.problems.description,
    } : null,
  };

  return response;
}

/**
 * Read test case file from Supabase Storage with timeout
 * @param {string} bucketName - Supabase Storage bucket name
 * @param {string} filePath - Path to file in bucket
 * @param {number} timeoutMs - Timeout in milliseconds (default 10000)
 * @returns {Promise<string>} File contents
 */
export async function readTestCaseFileFromStorage(bucketName, filePath, timeoutMs = 10000) {
  return Promise.race([
    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(filePath);

        if (error) {
          throw error;
        }

        // Convert blob to text
        const text = await data.text();
        return text;
      } catch (error) {
        console.error(`Error reading test case file ${filePath}:`, error.message);
        throw new Error(`Failed to read test case file: ${error.message}`);
      }
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout reading file ${filePath} after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Submit all test cases for a problem to Judge0 in parallel
 * @param {string} language - Programming language
 * @param {string} code - Source code to test
 * @param {Array} testCaseSets - Array of test case sets with input/output paths
 * @param {string} callbackUrl - URL for Judge0 webhooks
 * @returns {Promise<Object>} Test results object for storage in JSONB
 */
export async function submitTestCasesToJudge0(language, code, testCaseSets, callbackUrl) {
  const testResults = {};
  console.log(`[submitTestCasesToJudge0] Starting submission of ${testCaseSets.length} test cases`);
  const overallStartTime = Date.now();

  // Prepare promises for all test cases
  const submissionPromises = testCaseSets.map(async (testCase) => {
    const testCaseStartTime = Date.now();
    try {
      // Read input and output files from storage
      let input, expectedOutput;
      try {
        const fileReadStart = Date.now();
        input = await readTestCaseFileFromStorage(testCase.storage_bucket, testCase.input_path);
        expectedOutput = await readTestCaseFileFromStorage(testCase.storage_bucket, testCase.output_path);
        const fileReadTime = Date.now() - fileReadStart;
        console.log(`[submitTestCasesToJudge0] Test case ${testCase.id}: File read took ${fileReadTime}ms`);
      } catch (fileError) {
        console.error(`Error reading files for test case ${testCase.id}:`, fileError.message);
        // Mark this test case as having a file read error, don't throw
        testResults[testCase.id] = {
          input_path: testCase.input_path,
          output_path: testCase.output_path,
          verdict: 'error',
          error: `File read error: ${fileError.message}`,
          expected_output: null,
          actual_output: null,
        };
        return null; // Skip Judge0 submission for this test case
      }

      // Submit to Judge0 with test input
      let judge0Response;
      try {
        judge0Response = await judge0Service.createSubmissionOnJudge0({
          language,
          source_code: code,
          stdin: input,
          callback_url: callbackUrl,
        });
      } catch (judge0Error) {
        console.error(`Error submitting test case ${testCase.id} to Judge0:`, judge0Error.message);
        // Mark this test case as having a Judge0 submission error
        testResults[testCase.id] = {
          input_path: testCase.input_path,
          output_path: testCase.output_path,
          expected_output: expectedOutput?.trim() || '',
          verdict: 'error',
          error: `Judge0 submission error: ${judge0Error.message}`,
          actual_output: null,
        };
        return null; // Skip this test case
      }

      // Store result with judge0_token for webhook tracking
      // Note: We store only file paths for full submissions (not raw content)
      // to differentiate from sample runs (which store actual input content)
      testResults[testCase.id] = {
        judge0_token: judge0Response.token,
        input_path: testCase.input_path,
        output_path: testCase.output_path,
        expected_output: expectedOutput.trim(),
        verdict: 'pending',
        actual_output: null,
      };

      return {
        testCaseId: testCase.id,
        token: judge0Response.token,
      };
    } catch (error) {
      console.error(`Unexpected error in test case submission ${testCase.id}:`, error.message);
      // Fallback error handling - should rarely reach here
      testResults[testCase.id] = {
        input_path: testCase.input_path,
        output_path: testCase.output_path,
        verdict: 'error',
        error: `Unexpected error: ${error.message}`,
        expected_output: null,
        actual_output: null,
      };
      return null;
    }
  });

  // Submit all test cases in parallel with overall timeout
  // Even though each file read has a 10s timeout, we want to limit total time
  const submissionTimeoutMs = 60000; // 60 second total timeout for all submissions
  
  try {
    await Promise.race([
      Promise.all(submissionPromises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test case submission timeout: exceeded 60 seconds')), submissionTimeoutMs)
      ),
    ]);
  } catch (error) {
    console.error('Error during test case submission:', error.message);
    // Mark any still-pending test cases as having a timeout error
    for (const [tcId, result] of Object.entries(testResults)) {
      if (result.verdict === 'pending' && !result.judge0_token) {
        testResults[tcId].verdict = 'error';
        testResults[tcId].error = 'Submission timeout';
      }
    }
  }

  const overallTime = Date.now() - overallStartTime;
  const successCount = Object.values(testResults).filter(t => t.judge0_token).length;
  console.log(`[submitTestCasesToJudge0] Completed in ${overallTime}ms: ${successCount}/${testCaseSets.length} test cases submitted successfully`);

  return testResults;
}

/**
 * Create a new submission and submit all test cases to Judge0
 * @param {string} clerkUserId - Clerk user ID
 * @param {Object} submissionData - Submission data (problem_id, language, source_code, stdin)
 * @returns {Promise<Object>} Created submission with test case tokens
 */
export async function createSubmission(clerkUserId, submissionData) {
  const baseUrl = ENV.JUDGE_CALLBACK_URL || `${ENV.PUBLIC_BACKEND_URL}/api/webhooks/judge0`;

  // Create initial submission record with "pending" verdict
  const payload = {
    clerk_user_id: clerkUserId,
    ...submissionData,
    verdict: 'pending',
    submitted_at: new Date().toISOString(),
  };

  // Insert submission into DB
  const dbSubmission = await submissionsRepo.createSubmission(payload);

  try {
    // Check if this is a problem-based submission or IDE run
    if (!submissionData.problem_id) {
      // IDE mode: Submit single test to Judge0 with provided stdin
      console.log('IDE mode: Submitting code without test cases');
      
      const judge0Response = await judge0Service.createSubmissionOnJudge0({
        language: submissionData.language,
        source_code: submissionData.source_code,
        stdin: submissionData.stdin || null,
        callback_url: baseUrl,
      });

      // Store single Judge0 token (backward compatibility with old webhook handler)
      const updatedSubmission = await submissionsRepo.updateSubmissionVerdict(
        dbSubmission.id,
        {
          judge0_token: judge0Response.token,
        }
      );

      return updatedSubmission;
    }

    // Problem-based submission: Fetch all test cases
    console.log('Problem mode: Fetching test cases for problem', submissionData.problem_id);
    
    const testCaseSets = await submissionsRepo.getTestCaseSets(submissionData.problem_id);

    if (!testCaseSets || testCaseSets.length === 0) {
      throw new Error('No test cases found for this problem');
    }

    console.log(`Found ${testCaseSets.length} test cases for problem`);

    // Submit all test cases to Judge0 in parallel
    const testResults = await submitTestCasesToJudge0(
      submissionData.language,
      submissionData.source_code,
      testCaseSets,
      baseUrl
    );

    // Count how many test cases were successfully submitted
    const successCount = Object.values(testResults).filter(t => t && t.judge0_token && t.verdict === 'pending').length;

    if (successCount === 0) {
      throw new Error('Failed to submit any test cases to Judge0');
    }

    console.log(`Successfully submitted ${successCount} test cases to Judge0`);

    // Update submission with test results JSONB
    const updatedSubmission = await submissionsRepo.updateSubmissionVerdict(
      dbSubmission.id,
      {
        test_results: testResults,
        test_cases_total: testCaseSets.length,
        test_cases_passed: 0,
      }
    );

    return updatedSubmission;
  } catch (error) {
    console.error('Error setting up test cases:', error.message);
    // Update submission to mark as error
    await submissionsRepo.updateSubmissionVerdict(
      dbSubmission.id,
      {
        verdict: 'error',
        error_message: error.message,
        judged_at: new Date().toISOString(),
      }
    );
    throw error;
  }
}

/**
 * Run code against sample test cases only (for testing before submission)
 * @param {string} clerkUserId - Clerk user ID
 * @param {string} problemId - Problem ID
 * @param {string} language - Programming language
 * @param {string} code - Source code to test
 * @param {string} sampleInput - Individual sample input to test against
 * @returns {Promise<Object>} Sample test result
 */
export async function runSampleTest(clerkUserId, problemId, language, code, sampleInput) {
  try {
    console.log(`Running sample test for problem ${problemId} with language ${language}`);
    
    // Run single sample test without storing in DB
    // Note: NOT setting callback_url since we poll synchronously
    const judge0Response = await judge0Service.createSubmissionOnJudge0({
      language,
      source_code: code,
      stdin: sampleInput || '',
      // No callback_url - we handle this synchronously via polling
    });

    const judge0Token = judge0Response.token;
    let judge0Data = judge0Response;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout for polling

    console.log(`Submitted to Judge0 with token: ${judge0Token}, initial status: ${judge0Data.status?.id}`);
    console.log(`Initial response:`, JSON.stringify(judge0Data).substring(0, 200));

    // Poll for result - always poll at least once, even if status is undefined initially
    while (attempts < maxAttempts) {
      // Check if execution is complete (status 3+ means it's done)
      if (judge0Data.status && judge0Data.status.id >= 3) {
        console.log(`Execution complete with status ${judge0Data.status.id}`);
        break;
      }
      
      // If still pending (status 1-2) or no status yet, continue polling
      if (attempts > 0 && judge0Data.status && judge0Data.status.id > 2) {
        break;
      }

      // Wait before polling again (skip sleep on first attempt)
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      try {
        const resultData = await judge0Service.getSubmissionFromJudge0(judge0Token);
        judge0Data = resultData;
        console.log(`Poll attempt ${attempts + 1}: status=${judge0Data.status?.id}`);
      } catch (err) {
        console.error('Error polling Judge0:', err.message);
      }
      
      attempts++;
    }

    console.log(`Judge0 polling completed. Status: ${judge0Data.status?.id}, Attempts: ${attempts}`);

    // Decode base64 outputs
    const stdout = decodeBase64IfNeeded(judge0Data.stdout);
    const stderr = decodeBase64IfNeeded(judge0Data.stderr);
    const compileOutput = decodeBase64IfNeeded(judge0Data.compile_output);

    // Map Judge0 status to verdict
    const verdictMap = {
      1: 'pending',
      2: 'pending',
      3: 'accepted',
      4: 'wrong_answer',
      5: 'time_limit',
      6: 'compilation_error',
      7: 'runtime_error',
      8: 'runtime_error',
      9: 'runtime_error',
      10: 'runtime_error',
      11: 'runtime_error',
      12: 'runtime_error',
      13: 'internal_error',
      14: 'exec_format_error',
    };

    const verdict = verdictMap[judge0Data.status?.id] || 'pending';

    console.log(`Sample test result: verdict=${verdict}, stdout length=${stdout?.length || 0}`);

    return {
      verdict,
      stdout: stdout || '',
      stderr: stderr || null,
      compile_output: compileOutput || null,
      runtime_ms: judge0Data.time ? Math.round(judge0Data.time * 1000) : null,
      memory_kb: judge0Data.memory || null,
      status_id: judge0Data.status?.id,
    };
  } catch (error) {
    console.error('Error running sample test:', error.message);
    throw error;
  }
}

/**
 * Update submission verdict after judging
 * @param {string} submissionId - UUID of the submission
 * @param {Object} updateData - Updated submission data
 * @returns {Promise<Object>} Updated submission
 */
export async function updateSubmissionVerdict(submissionId, updateData) {
  return await submissionsRepo.updateSubmissionVerdict(submissionId, updateData);
}

/**
 * Get submission statistics for a user
 * @param {string} clerkUserId - Clerk user ID
 * @returns {Promise<Object>} Submission statistics
 */
export async function getUserSubmissionStats(clerkUserId) {
  return await submissionsRepo.getUserSubmissionStats(clerkUserId);
}

/**
 * Decode base64 string if needed (Judge0 returns base64-encoded output)
 * @param {string} data - Data that may be base64 encoded
 * @returns {string} Decoded string or original data if not base64
 */
function decodeBase64IfNeeded(data) {
  if (!data) return data;
  if (typeof data !== 'string') return data;
  
  const trimmed = data.trim();
  if (!trimmed) return data;
  
  // First check: does it look like base64?
  // Base64 strings only contain A-Z, a-z, 0-9, +, /, and = for padding
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(trimmed)) {
    // Not base64, return as-is
    return data;
  }
  
  // Second check: base64 strings should have length divisible by 4 (or account for padding)
  if (trimmed.length % 4 !== 0) {
    // Invalid base64 length, return as-is
    return data;
  }
  
  try {
    // Try to decode as base64
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    
    // Third check: verify the decoded output is valid text and looks reasonable
    // Check that decoded doesn't contain excessive control characters (except newlines/tabs/CR)
    let controlCharCount = 0;
    let nullByteFound = false;
    
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      // Count control characters (0-31) except 9 (tab), 10 (newline), 13 (carriage return)
      if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
        controlCharCount++;
      }
      // Check for null bytes (often a sign of binary data)
      if (charCode === 0) {
        nullByteFound = true;
        break;
      }
    }
    
    // If null byte found or more than 10% control characters, it's probably binary data
    if (nullByteFound || controlCharCount > decoded.length * 0.1) {
      return data;
    }
    
    return decoded;
  } catch (err) {
    // If decode fails, return original data
    console.warn(`Failed to decode base64: ${err.message}`);
    return data;
  }
}

// Serialize webhook updates per submission to avoid concurrent overwrite races.
const submissionWebhookLocks = new Map();

async function withSubmissionWebhookLock(submissionId, operation) {
  const previous = submissionWebhookLocks.get(submissionId) || Promise.resolve();
  let releaseCurrent;

  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });

  submissionWebhookLocks.set(submissionId, previous.then(() => current));
  await previous;

  try {
    return await operation();
  } finally {
    releaseCurrent();
    if (submissionWebhookLocks.get(submissionId) === current) {
      submissionWebhookLocks.delete(submissionId);
    }
  }
}

/**
 * Update submission from a single test case Judge0 webhook
 * Handles result aggregation across all test cases
 * @param {string} judge0Token - Judge0 submission token (for a test case)
 * @param {Object} judge0Data - Judge0 submission response data
 * @returns {Promise<Object|null>} Updated submission or null if not found
 */
export async function updateTestCaseResultFromJudge0(judge0Token, judge0Data) {
  let submission = null;

  try {
    // Find candidate submission that contains this Judge0 token in test_results
    submission = await submissionsRepo.getSubmissionByTestCaseTokenFallback(judge0Token);
  } catch (err) {
    console.error('Error in updateTestCaseResultFromJudge0 lookup:', err);
    return null;
  }

  if (!submission) {
    console.warn(`Submission with Judge0 token ${judge0Token} not found`);
    return null;
  }

  return await withSubmissionWebhookLock(submission.id, async () => {
    const latestSubmission = await submissionsRepo.getSubmissionForTestCaseTracking(submission.id);
    if (!latestSubmission || !latestSubmission.test_results || typeof latestSubmission.test_results !== 'object') {
      console.warn(`Submission ${submission.id} missing test_results during webhook update`);
      return null;
    }

    const testResults = { ...latestSubmission.test_results };
    let testCaseId = null;

    for (const [tcId, tcResult] of Object.entries(testResults)) {
      if (tcResult && tcResult.judge0_token === judge0Token) {
        testCaseId = tcId;
        break;
      }
    }

    if (!testCaseId) {
      console.warn(`Test case ID not found for token ${judge0Token} in submission ${submission.id}`);
      return null;
    }

    const stdout = decodeBase64IfNeeded(judge0Data.stdout);
    const stderr = decodeBase64IfNeeded(judge0Data.stderr);
    const compileOutput = decodeBase64IfNeeded(judge0Data.compile_output);

    const verdictMap = {
      1: 'pending',
      2: 'pending',
      3: 'accepted',
      4: 'wrong_answer',
      5: 'time_limit',
      6: 'compilation_error',
      7: 'runtime_error',
      8: 'runtime_error',
      9: 'runtime_error',
      10: 'runtime_error',
      11: 'runtime_error',
      12: 'runtime_error',
      13: 'internal_error',
      14: 'exec_format_error',
    };

    const testVerdict = verdictMap[judge0Data.status?.id] || 'pending';

    testResults[testCaseId] = {
      ...testResults[testCaseId],
      judge0_token: judge0Token,
      judge0_status_id: judge0Data.status?.id,
      verdict: testVerdict,
      actual_output: (stdout || '').trim(),
      expected_output: testResults[testCaseId]?.expected_output || '',
      runtime_ms: judge0Data.time ? Math.round(judge0Data.time * 1000) : null,
      memory_kb: judge0Data.memory || null,
      stderr: stderr || null,
      compile_output: compileOutput || null,
    };

    const allTestCasesJudged = Object.values(testResults).every(result => result.verdict && result.verdict !== 'pending');

    const verdictsList = Object.entries(testResults).map(([id, result]) => `${id.substring(0, 8)}: ${result.verdict}`);
    const totalTests = Object.keys(testResults).length;
    const nonPendingTests = Object.values(testResults).filter(r => r.verdict && r.verdict !== 'pending').length;

    console.log(`[updateTestCaseResultFromJudge0] Token ${judge0Token.substring(0, 8)}: allTestCasesJudged=${allTestCasesJudged}, ${nonPendingTests}/${totalTests} non-pending`);
    console.log(`  Verdicts: ${verdictsList.join(', ')}`);

    let intermediatePassedCount = 0;

    for (const [tcId, result] of Object.entries(testResults)) {
      if (!result.verdict || result.verdict === 'pending') {
        continue;
      }

      // Trust Judge0's verdict - don't re-verify output matches
      if (result.verdict === 'accepted') {
        intermediatePassedCount++;
      }
    }

    console.log(`[updateTestCaseResultFromJudge0] Current progress: ${intermediatePassedCount} passed, ${nonPendingTests} judged, ${totalTests} total`);

    if (!allTestCasesJudged) {
      console.log(`  → Updating with intermediate results (not all tests judged yet)`);

      const intermediateUpdate = await submissionsRepo.updateSubmissionVerdict(submission.id, {
        test_results: testResults,
        test_cases_passed: intermediatePassedCount,
      });

      console.log(`  → Submission updated: test results updated, passed=${intermediateUpdate.test_cases_passed}/${totalTests}`);
      return intermediateUpdate;
    }

    console.log(`[updateTestCaseResultFromJudge0] ✓ All tests judged! Aggregating results...`);

    let passedCount = 0;
    let hasCompilationError = false;
    let hasRuntimeError = false;
    let hasSubmissionError = false;

    for (const [tcId, result] of Object.entries(testResults)) {
      if (result.verdict === 'error') {
        hasSubmissionError = true;
      } else if (result.verdict === 'compilation_error') {
        hasCompilationError = true;
      } else if (result.verdict === 'runtime_error' || result.verdict === 'time_limit') {
        hasRuntimeError = true;
      } else if (result.verdict === 'accepted') {
        // Trust Judge0's verdict - don't re-verify output matches
        passedCount++;
      }
    }

    let finalVerdict = 'wrong_answer';

    if (hasSubmissionError) {
      finalVerdict = 'internal_error';
    } else if (hasCompilationError) {
      finalVerdict = 'compilation_error';
    } else if (hasRuntimeError) {
      finalVerdict = 'runtime_error';
    } else if (passedCount === latestSubmission.test_cases_total) {
      finalVerdict = 'accepted';
    }

    let maxRuntime = null;
    let maxMemory = null;

    for (const result of Object.values(testResults)) {
      if (result.runtime_ms !== null && result.runtime_ms !== undefined) {
        maxRuntime = Math.max(maxRuntime || 0, result.runtime_ms);
      }
      if (result.memory_kb !== null && result.memory_kb !== undefined) {
        maxMemory = Math.max(maxMemory || 0, result.memory_kb);
      }
    }

    const updateData = {
      test_results: testResults,
      test_cases_passed: passedCount,
      verdict: finalVerdict,
      judged_at: new Date().toISOString(),
      runtime_ms: maxRuntime,
      memory_kb: maxMemory,
    };

    if (hasSubmissionError) {
      updateData.error_message = 'Some test cases failed to execute on the server';
    }

    const finalSubmission = await submissionsRepo.updateSubmissionVerdict(submission.id, updateData);
    console.log(`[updateTestCaseResultFromJudge0] ✓ Final submission saved: verdict=${finalSubmission.verdict}`);
    return finalSubmission;
  });
}

export async function getSubmissionForTestCaseTracking(submissionId) {
  return await submissionsRepo.getSubmissionForTestCaseTracking(submissionId);
}

/**
 * Find submission by Judge0 token (for IDE submissions)
 * @param {string} judge0Token - Judge0 submission token
 * @returns {Promise<Object|null>} Submission or null if not found
 */
export async function getSubmissionByJudge0Token(judge0Token) {
  return await submissionsRepo.getSubmissionByJudge0Token(judge0Token);
}

/**
 * Update submission from single Judge0 token (IDE mode)
 * @param {string} judge0Token - Judge0 submission token
 * @param {Object} judge0Data - Judge0 submission response data
 * @returns {Promise<Object|null>} Updated submission or null if not found
 */
export async function updateSubmissionFromJudge0(judge0Token, judge0Data) {
  // Find submission by Judge0 token
  const submission = await submissionsRepo.getSubmissionByJudge0Token(judge0Token);

  if (!submission) {
    console.warn(`Submission with Judge0 token ${judge0Token} not found`);
    return null;
  }

  // Map Judge0 status to our verdict - Official codes from Judge0 API
  const verdictMap = {
    1: 'pending',                // In Queue
    2: 'pending',                // Processing
    3: 'accepted',               // Accepted
    4: 'wrong_answer',           // Wrong Answer
    5: 'time_limit',             // Time Limit Exceeded
    6: 'compilation_error',      // Compilation Error
    7: 'runtime_error',          // Runtime Error (SIGSEGV)
    8: 'runtime_error',          // Runtime Error (SIGXFSZ)
    9: 'runtime_error',          // Runtime Error (SIGFPE)
    10: 'runtime_error',         // Runtime Error (SIGABRT)
    11: 'runtime_error',         // Runtime Error (NZEC)
    12: 'runtime_error',         // Runtime Error (Other)
    13: 'internal_error',        // Internal Error
    14: 'exec_format_error',     // Exec Format Error
  };

  const verdict = verdictMap[judge0Data.status?.id] || 'pending';

  // Decode base64 outputs from Judge0
  const stdout = decodeBase64IfNeeded(judge0Data.stdout);
  const stderr = decodeBase64IfNeeded(judge0Data.stderr);
  const compileOutput = decodeBase64IfNeeded(judge0Data.compile_output);

  console.log(`[updateSubmissionFromJudge0] Decoded Judge0 results:`, {
    token: judge0Token,
    verdict,
    stdout_raw_len: judge0Data.stdout?.length,
    stdout_decoded_len: stdout?.length,
    stdout_sample: stdout?.substring(0, 50),
    stderr_raw_len: judge0Data.stderr?.length,
    stderr_decoded_len: stderr?.length,
    stderr_sample: stderr?.substring(0, 50),
    compile_raw_len: judge0Data.compile_output?.length,
    compile_decoded_len: compileOutput?.length,
    compile_sample: compileOutput?.substring(0, 50),
  });

  // Prepare update data from Judge0 response
  const updateData = {
    verdict,
    judged_at: new Date().toISOString(),
    runtime_ms: judge0Data.time ? Math.round(judge0Data.time * 1000) : null,
    memory_kb: judge0Data.memory || null,
    stdout: stdout || null,
    stderr: stderr || null,
    compile_output: compileOutput || null,
    error_message: judge0Data.message || null,
  };

  // Update submission in DB
  return await submissionsRepo.updateSubmissionVerdict(submission.id, updateData);
}

/**
 * Check for stuck test cases (pending for too long) and poll Judge0 directly
 * This is a fallback for when Judge0 webhooks don't fire
 * @param {string} submissionId - Submission ID
 * @param {Object} testResults - Current test results object
 * @param {number} testCasesTotal - Total number of test cases expected
 * @returns {Promise<Object|null>} Updated submission or null if not all stuck tests resolved
 */
export async function pollStuckTestCasesFromJudge0(submissionId, testResults, testCasesTotal) {
  if (!testResults || typeof testResults !== 'object') {
    return null;
  }

  // Find test cases still pending
  const stuckTestCases = [];
  for (const [tcId, result] of Object.entries(testResults)) {
    if (result && result.judge0_token && (result.verdict === 'pending' || !result.verdict)) {
      stuckTestCases.push({ tcId, token: result.judge0_token });
    }
  }

  if (stuckTestCases.length === 0) {
    return null; // No stuck test cases
  }

  console.log(`[pollStuckTestCasesFromJudge0] Found ${stuckTestCases.length} stuck test cases, polling Judge0...`);

  // Poll Judge0 directly for each stuck test case
  const updates = {};
  const stillPendingOnJudge0 = [];
  
  for (const { tcId, token } of stuckTestCases) {
    try {
      const judge0Data = await judge0Service.getSubmissionFromJudge0(token);
      
      // Check if this submission has completed
      if (!judge0Data.status || judge0Data.status.id < 3) {
        console.log(`  [${tcId.substring(0, 8)}] Still pending on Judge0 (status: ${judge0Data.status?.id})`);
        stillPendingOnJudge0.push(tcId);
        continue; // Still processing, not done yet
      }

      // Judge0 completed! Update with results
      console.log(`  [${tcId.substring(0, 8)}] ✓ Got result from Judge0 (status: ${judge0Data.status?.id})`);
      
      // Decode outputs
      const stdout = decodeBase64IfNeeded(judge0Data.stdout);
      const stderr = decodeBase64IfNeeded(judge0Data.stderr);
      const compileOutput = decodeBase64IfNeeded(judge0Data.compile_output);

      // Map verdict
      const verdictMap = {
        3: 'accepted',
        4: 'wrong_answer',
        5: 'time_limit',
        6: 'compilation_error',
        7: 'runtime_error',
        8: 'runtime_error',
        9: 'runtime_error',
        10: 'runtime_error',
        11: 'runtime_error',
        12: 'runtime_error',
        13: 'internal_error',
        14: 'exec_format_error',
      };

      const verdict = verdictMap[judge0Data.status.id] || 'pending';

      // Update test result
      updates[tcId] = {
        ...testResults[tcId],
        judge0_status_id: judge0Data.status.id,
        verdict: verdict,
        actual_output: (stdout || '').trim(),
        runtime_ms: judge0Data.time ? Math.round(judge0Data.time * 1000) : null,
        memory_kb: judge0Data.memory || null,
        stderr: stderr || null,
        compile_output: compileOutput || null,
      };
    } catch (err) {
      console.error(`  Error polling Judge0 for ${tcId.substring(0, 8)}: ${err.message}`);
      stillPendingOnJudge0.push(tcId);
    }
  }

  // Log what we found
  console.log(`[pollStuckTestCasesFromJudge0] Poll results: ${Object.keys(updates).length} completed, ${stillPendingOnJudge0.length} still pending`);
  if (stillPendingOnJudge0.length > 0) {
    console.log(`[pollStuckTestCasesFromJudge0] Still pending: ${stillPendingOnJudge0.map(id => id.substring(0, 8)).join(', ')}`);
  }

  // If we got any updates, apply them
  if (Object.keys(updates).length > 0) {
    const updatedTestResults = { ...testResults, ...updates };
    
    // Check if ALL are now judged
    const allJudged = Object.values(updatedTestResults).every(r => r.verdict && r.verdict !== 'pending');
    
    if (allJudged) {
      console.log(`[pollStuckTestCasesFromJudge0] ✓ All tests now have verdicts, aggregating results...`);
      
      // Aggregate verdict and results
      let passedCount = 0;
      let hasCompilationError = false;
      let hasRuntimeError = false;
      let hasSubmissionError = false;
      let maxRuntime = null;
      let maxMemory = null;
      
      for (const [tcId, result] of Object.entries(updatedTestResults)) {
        if (result.verdict === 'error') {
          hasSubmissionError = true;
        } else if (result.verdict === 'compilation_error') {
          hasCompilationError = true;
        } else if (result.verdict === 'runtime_error' || result.verdict === 'time_limit') {
          hasRuntimeError = true;
        } else if (result.verdict === 'accepted') {
          // Trust Judge0's verdict - don't re-verify output matches
          passedCount++;
        }
        
        // Aggregate runtime and memory
        if (result.runtime_ms !== null && result.runtime_ms !== undefined) {
          maxRuntime = Math.max(maxRuntime || 0, result.runtime_ms);
        }
        if (result.memory_kb !== null && result.memory_kb !== undefined) {
          maxMemory = Math.max(maxMemory || 0, result.memory_kb);
        }
      }
      
      // Determine final verdict
      let finalVerdict = 'wrong_answer';
      if (hasSubmissionError) {
        finalVerdict = 'internal_error';
      } else if (hasCompilationError) {
        finalVerdict = 'compilation_error';
      } else if (hasRuntimeError) {
        finalVerdict = 'runtime_error';
      } else if (passedCount === testCasesTotal) {
        finalVerdict = 'accepted';
      }
      
      console.log(`[pollStuckTestCasesFromJudge0] ✓ Aggregated verdict: ${finalVerdict} (${passedCount}/${testCasesTotal} passed)`);
      
      // Save final submission with aggregated results
      const updateData = {
        test_results: updatedTestResults,
        test_cases_passed: passedCount,
        verdict: finalVerdict,
        judged_at: new Date().toISOString(),
        runtime_ms: maxRuntime,
        memory_kb: maxMemory,
      };
      
      if (hasSubmissionError) {
        updateData.error_message = 'Some test cases failed to execute on the server';
      }
      
      return await submissionsRepo.updateSubmissionVerdict(submissionId, updateData);
    } else {
      // Partial update: some tests completed, some still pending
      const nonPendingCount = Object.values(updatedTestResults).filter(r => r.verdict && r.verdict !== 'pending').length;
      console.log(`[pollStuckTestCasesFromJudge0] ✓ Partial update: ${nonPendingCount}/${testCasesTotal} now have verdicts`);
      
      // Save the partial results to DB so UI can show progress
      await submissionsRepo.updateSubmissionVerdict(submissionId, {
        test_results: updatedTestResults,
        verdict: 'pending', // Still pending overall
      });
      
      // Schedule another poll in 5 seconds for the remaining tests
      console.log(`[pollStuckTestCasesFromJudge0] Scheduling retry in 5 seconds for ${stillPendingOnJudge0.length} remaining tests...`);
      setTimeout(async () => {
        try {
          await pollStuckTestCasesFromJudge0(submissionId, updatedTestResults, testCasesTotal);
        } catch (err) {
          console.error(`[pollStuckTestCasesFromJudge0] Retry failed: ${err.message}`);
        }
      }, 5000); // 5 second retry delay
      
      return updatedTestResults;
    }
  } else if (stillPendingOnJudge0.length > 0) {
    // All stuck tests are still pending on Judge0 - schedule another retry
    console.log(`[pollStuckTestCasesFromJudge0] ⏳ All ${stillPendingOnJudge0.length} stuck tests still pending on Judge0`);
    console.log(`[pollStuckTestCasesFromJudge0] Tests: ${stillPendingOnJudge0.map(id => id.substring(0, 8)).join(', ')}`);
    console.log(`[pollStuckTestCasesFromJudge0] Scheduling retry in 10 seconds...`);
    
    // Schedule another poll in 10 seconds
    setTimeout(async () => {
      try {
        await pollStuckTestCasesFromJudge0(submissionId, testResults, testCasesTotal);
      } catch (err) {
        console.error(`[pollStuckTestCasesFromJudge0] Retry failed: ${err.message}`);
      }
    }, 10000); // 10 second retry delay
    
    return null;
  }

  return null;
}
