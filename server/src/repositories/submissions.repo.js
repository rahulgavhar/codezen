import { supabase } from '../config/supabase.client.js';

/**
 * Get all submissions for a specific user
 * @param {string} clerkUserId - Clerk user ID
 * @returns {Promise<Array>} Array of submissions with problem details
 */
export async function getUserSubmissions(clerkUserId) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      submitted_at,
      judged_at,
      language,
      verdict,
      runtime_ms,
      memory_kb,
      test_cases_passed,
      test_cases_total,
      error_message,
      problem_id,
      problems (
        id,
        title,
        slug,
        difficulty
      )
    `)
    .eq('clerk_user_id', clerkUserId)
    .not('problem_id', 'is', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching user submissions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific submission by ID
 * @param {string} submissionId - UUID of the submission
 * @param {string} clerkUserId - Clerk user ID (for authorization)
 * @returns {Promise<Object>} Submission details with source code
 */
export async function getSubmissionById(submissionId, clerkUserId) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      submitted_at,
      judged_at,
      language,
      verdict,
      runtime_ms,
      memory_kb,
      test_cases_passed,
      test_cases_total,
      test_results,
      error_message,
      source_code,
      stdout,
      stderr,
      compile_output,
      problem_id,
      problems (
        id,
        title,
        slug,
        difficulty,
        description
      )
    `)
    .eq('id', submissionId)
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found or unauthorized
    }
    console.error('Error fetching submission by ID:', error);
    throw error;
  }

  if (data && data.verdict === 'pending' && data.test_cases_passed > 0) {
    console.log(`[getSubmissionById] Fetched ${data.id.substring(0, 8)}: test_cases_passed=${data.test_cases_passed}/${data.test_cases_total}`);
  }

  return data;
}

/**
 * Create a new submission
 * @param {Object} submissionData - Submission data (clerk_user_id, problem_id, language, source_code, judge0_token, etc.)
 * @returns {Promise<Object>} Created submission
 */
export async function createSubmission(submissionData) {
  const { data, error } = await supabase
    .from('submissions')
    .insert([submissionData])
    .select()
    .single();

  if (error) {
    console.error('Error creating submission:', error);
    throw error;
  }

  return data;
}

/**
 * Update submission verdict and metrics after judging
 * @param {string} submissionId - UUID of the submission
 * @param {Object} updateData - Updated submission data (can include verdict, runtime_ms, memory_kb, stdout, stderr, compile_output, etc.)
 * @returns {Promise<Object>} Updated submission
 */
export async function updateSubmissionVerdict(submissionId, updateData) {
  const { data, error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select('id, verdict, test_cases_passed, test_cases_total, test_results, runtime_ms, memory_kb, stdout, stderr, compile_output, error_message, judged_at')
    .single();

  if (error) {
    console.error('Error updating submission verdict:', error);
    throw error;
  }

  // Log what was updated to verify the data round-trips correctly
  if (updateData.test_cases_passed !== undefined) {
    console.log(`[updateSubmissionVerdict] Returned test_cases_passed=${data.test_cases_passed}`);
  }

  return data;
}

/**
 * Find a submission by its Judge0 token (IDE mode)
 * @param {string} judge0Token - Judge0 submission token
 * @returns {Promise<Object|null>} Submission row or null if not found
 */
export async function getSubmissionByJudge0Token(judge0Token) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, judge0_token, verdict, stdout, stderr, compile_output, language, source_code, runtime_ms, memory_kb, error_message')
    .eq('judge0_token', judge0Token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching submission by Judge0 token:', error);
    throw error;
  }

  return data;
}

/**
 * Find submission by Judge0 token within test_results JSONB
 * Uses RPC for efficient JSONB search vs full table scan
 * @param {string} judge0Token - Judge0 submission token
 * @returns {Promise<Object|null>} Submission with test_results or null
 */
export async function getSubmissionByTestCaseToken(judge0Token) {
  const { data, error } = await supabase
    .rpc('find_submission_by_judge0_token', {
      p_judge0_token: judge0Token
    });

  if (error) {
    // If RPC doesn't exist, fallback to client-side search
    console.warn('RPC not available, using fallback search:', error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Find submission by Judge0 token (client-side fallback)
 * Fetches recent submissions and searches for token in test_results
 * @param {string} judge0Token - Judge0 submission token
 * @returns {Promise<Object|null>} Submission or null
 */
export async function getSubmissionByTestCaseTokenFallback(judge0Token) {
  // Try recent submissions first (last 30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('submissions')
    .select('id, test_results, test_cases_total, verdict')
    .not('test_results', 'is', null)
    .gt('created_at', thirtyMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(100); // Limit to recent 100 instead of all

  if (error) {
    console.error('Error fetching submissions:', error.message);
    return null;
  }

  // Search for token in test_results
  for (const submission of (data || [])) {
    if (!submission.test_results) continue;
    
    for (const [tcId, tcResult] of Object.entries(submission.test_results)) {
      if (tcResult?.judge0_token === judge0Token) {
        return {
          id: submission.id,
          test_results: submission.test_results,
          test_cases_total: submission.test_cases_total,
          verdict: submission.verdict,
        };
      }
    }
  }

  return null;
}


/**
 * Get submission statistics for a user
 * @param {string} clerkUserId - Clerk user ID
 * @returns {Promise<Object>} Submission statistics
 */
export async function getUserSubmissionStats(clerkUserId) {
  // Get total submissions count
  const { count: totalSubmissions, error: countError } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_user_id', clerkUserId);

  if (countError) {
    console.error('Error fetching submission count:', countError);
    throw countError;
  }

  // Get accepted submissions count
  const { count: acceptedSubmissions, error: acceptedError } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_user_id', clerkUserId)
    .eq('verdict', 'accepted');

  if (acceptedError) {
    console.error('Error fetching accepted submissions:', acceptedError);
    throw acceptedError;
  }

  // Get verdict distribution
  const { data: verdictData, error: verdictError } = await supabase
    .from('submissions')
    .select('verdict')
    .eq('clerk_user_id', clerkUserId);

  if (verdictError) {
    console.error('Error fetching verdict distribution:', verdictError);
    throw verdictError;
  }

  // Count verdicts
  const verdictDistribution = (verdictData || []).reduce((acc, { verdict }) => {
    acc[verdict] = (acc[verdict] || 0) + 1;
    return acc;
  }, {});

  return {
    totalSubmissions: totalSubmissions || 0,
    acceptedSubmissions: acceptedSubmissions || 0,
    verdictDistribution,
  };
}

/**
 * Get all test case sets for a problem
 * @param {string} problemId - UUID of the problem
 * @returns {Promise<Array>} Array of test case sets with storage paths
 */
export async function getTestCaseSets(problemId) {
  const { data, error } = await supabase
    .from('test_case_sets')
    .select('id, storage_bucket, input_path, output_path')
    .eq('problem_id', problemId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching test case sets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get submission with test case tracking data
 * @param {string} submissionId - UUID of the submission
 * @returns {Promise<Object|null>} Submission with test case metadata
 */
export async function getSubmissionForTestCaseTracking(submissionId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, problem_id, language, source_code, verdict, test_results, test_cases_total, test_cases_passed')
    .eq('id', submissionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching submission for test case tracking:', error);
    throw error;
  }

  return data;
}
