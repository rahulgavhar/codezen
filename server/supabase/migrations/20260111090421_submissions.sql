--------------------------------------------------------------------------------
-- ENUMS
--------------------------------------------------------------------------------
CREATE TYPE submission_language AS ENUM (
  'javascript',
  'python',
  'cpp',
  'java'
);

CREATE TYPE submission_verdict AS ENUM (
  'pending',
  'accepted',
  'wrong_answer',
  'time_limit',
  'compilation_error',
  'runtime_error',
  'internal_error',
  'exec_format_error',
  'error'
);

--------------------------------------------------------------------------------
-- Submissions Table (Immutable Event Log)
--------------------------------------------------------------------------------
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Use Clerk ID directly (important)
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE CASCADE,

  -- Either problem_id or interview_id (mutually exclusive)
  problem_id UUID
    REFERENCES public.problems(id) ON DELETE CASCADE,

  interview_id UUID
    REFERENCES public.interviews(id) ON DELETE SET NULL,

  -- Lifecycle
  submitted_at timestamptz NOT NULL DEFAULT now(),
  judged_at timestamptz,

  -- Language & Verdict
  language submission_language NOT NULL,
  verdict submission_verdict NOT NULL DEFAULT 'pending',

  -- Execution metrics
  runtime_ms INT CHECK (runtime_ms >= 0),
  memory_kb INT CHECK (memory_kb >= 0),

  -- Test case stats
  test_cases_passed INT NOT NULL DEFAULT 0
    CHECK (test_cases_passed >= 0),

  test_cases_total INT NOT NULL DEFAULT 0
    CHECK (test_cases_total >= 0),

  -- Detailed results
  test_results JSONB,

  -- Errors
  error_message TEXT,

  -- Source code (immutable)
  source_code TEXT NOT NULL,

  -- Judge0 integration
  judge0_token TEXT,

  -- Execution I/O
  stdin TEXT,
  stdout TEXT,
  stderr TEXT,
  compile_output TEXT,

  created_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- Constraints (Correctness)
--------------------------------------------------------------------------------

-- test case consistency
ALTER TABLE public.submissions
ADD CONSTRAINT chk_testcase_counts
CHECK (test_cases_passed <= test_cases_total);

-- Either problem_id or interview_id (mutually exclusive)
ALTER TABLE public.submissions
ADD CONSTRAINT chk_problem_or_interview
CHECK (
  (problem_id IS NOT NULL AND interview_id IS NULL)
  OR (problem_id IS NULL AND interview_id IS NOT NULL)
);

--------------------------------------------------------------------------------
-- Indexes (HIGHLY IMPORTANT FOR SCALE)
--------------------------------------------------------------------------------

-- User submissions (dashboard)
CREATE INDEX idx_submissions_user_time
ON public.submissions (clerk_user_id, submitted_at DESC);

-- Problem analytics
CREATE INDEX idx_submissions_problem
ON public.submissions (problem_id);

-- Pending queue (judge worker)
CREATE INDEX idx_submissions_pending
ON public.submissions (submitted_at ASC)
WHERE verdict = 'pending';

-- Accepted lookup (leaderboard / solved check)
CREATE INDEX idx_submissions_accepted
ON public.submissions (problem_id, clerk_user_id, submitted_at DESC)
WHERE verdict = 'accepted';

-- Verdict filtering
CREATE INDEX idx_submissions_verdict
ON public.submissions (verdict);

-- Judge0 token lookup (async callback)
CREATE UNIQUE INDEX idx_submissions_judge0_token
ON public.submissions (judge0_token)
WHERE judge0_token IS NOT NULL;

-- Interview submissions filtering
CREATE INDEX idx_submissions_interview
ON public.submissions (interview_id)
WHERE interview_id IS NOT NULL;

-- Interview submission timeline
CREATE INDEX idx_submissions_interview_time
ON public.submissions (interview_id, submitted_at DESC)
WHERE interview_id IS NOT NULL;

--------------------------------------------------------------------------------
-- Column Comments
--------------------------------------------------------------------------------
COMMENT ON COLUMN public.submissions.interview_id IS
  'Reference to interview if submission was made during interview room. NULL for normal problem submissions. Mutually exclusive with problem_id.';

--------------------------------------------------------------------------------
-- Trigger: Validate execution metrics
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_submission_metrics()
RETURNS TRIGGER AS $$ 
BEGIN
  IF NEW.verdict NOT IN (
    'pending',
    'compilation_error',
    'error',
    'internal_error',
    'exec_format_error'
  ) THEN
    IF NEW.runtime_ms IS NULL OR NEW.memory_kb IS NULL THEN
      RAISE EXCEPTION
        'runtime_ms and memory_kb must be set for verdict %',
        NEW.verdict;
    END IF;

    NEW.judged_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_submission_metrics
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION validate_submission_metrics();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: user OR staff
--------------------------------------------------------------------------------
CREATE POLICY "Read own or staff submissions"
ON public.submissions
FOR SELECT
USING (
  clerk_user_id = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- INSERT: user can only insert their own
--------------------------------------------------------------------------------
CREATE POLICY "Insert own submissions"
ON public.submissions
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- UPDATE: ONLY staff (judge system)
--------------------------------------------------------------------------------
CREATE POLICY "Staff update submissions"
ON public.submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);