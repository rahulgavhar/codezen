import axios from 'axios';
import { ENV } from '../config/env.config.js';

// Map internal language names to Judge0 language IDs
const LANGUAGE_ID_MAP = {
  javascript: 63,  // Node.js
  python: 71,      // Python 3
  cpp: 54,         // C++ (GCC 9.2.0)
  java: 62,        // Java
};

/**
 * Create a submission on Judge0
 * @param {Object} params - Submission parameters
 * @param {string} params.language - Programming language (javascript, python, cpp, java)
 * @param {string} params.source_code - Source code to execute
 * @param {string} [params.stdin] - Standard input for the program
 * @param {string} [params.expected_output] - Expected output for verdict evaluation
 * @param {number} [params.cpu_time_limit] - CPU time limit in seconds (default from Judge0)
 * @param {number} [params.memory_limit] - Memory limit in KB (default from Judge0)
 * @param {string} [params.callback_url] - Callback URL for Judge0 to POST results
 * @returns {Promise<Object>} Judge0 submission response with token
 */
export async function createSubmissionOnJudge0({
  language,
  source_code,
  stdin = null,
  expected_output = null,
  cpu_time_limit = null,
  memory_limit = null,
  callback_url = null,
} = {}) {
  if (!LANGUAGE_ID_MAP[language]) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const languageId = LANGUAGE_ID_MAP[language];

  const payload = {
    source_code,
    language_id: languageId,
  };

  // Add optional fields if provided
  if (stdin) payload.stdin = stdin;
  if (expected_output !== null && expected_output !== undefined) {
    payload.expected_output = expected_output;
  }
  if (cpu_time_limit) payload.cpu_time_limit = cpu_time_limit;
  if (memory_limit) payload.memory_limit = memory_limit;
  if (callback_url) payload.callback_url = callback_url;

  try {
    const response = await axios.post(
      `${ENV.JUDGE_SERVER_URL}/submissions`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': ENV.JUDGE_AUTH_TOKEN,
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error creating Judge0 submission:', error.message);
    throw new Error(`Failed to submit to Judge0: ${error.message}`);
  }
}

/**
 * Get submission details from Judge0
 * @param {string} token - Judge0 submission token
 * @returns {Promise<Object>} Submission details from Judge0
 */
export async function getSubmissionFromJudge0(token) {
  try {
    const response = await axios.get(
      `${ENV.JUDGE_SERVER_URL}/submissions/${token}`,
      {
        headers: {
          'X-Auth-Token': ENV.JUDGE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching Judge0 submission:', error.message);
    throw new Error(`Failed to fetch from Judge0: ${error.message}`);
  }
}
