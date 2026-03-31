--------------------------------------------------------------------------------
-- Contest Submissions
--------------------------------------------------------------------------------
CREATE TABLE public.contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  contest_id UUID NOT NULL
    REFERENCES public.contests(id)
    ON DELETE CASCADE,

  contest_problem_id UUID NOT NULL
    REFERENCES public.contest_problems(id)
    ON DELETE CASCADE,

  -- FIXED: use clerk_user_id
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id)
    ON DELETE CASCADE,

  submitted_at timestamptz NOT NULL DEFAULT now(),

  language submission_language NOT NULL,

  verdict submission_verdict NOT NULL DEFAULT 'pending',

  runtime_ms INT CHECK (runtime_ms >= 0),
  memory_kb INT CHECK (memory_kb >= 0),

  test_cases_passed INT NOT NULL DEFAULT 0
    CHECK (test_cases_passed >= 0),

  test_cases_total INT NOT NULL DEFAULT 0
    CHECK (test_cases_total >= 0),

  source_code TEXT NOT NULL,
  error_message TEXT,

  created_at timestamptz NOT NULL DEFAULT now(),
  
  leaderboard_processed BOOLEAN NOT NULL DEFAULT FALSE
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

CREATE INDEX idx_cs_contest_user
ON public.contest_submissions (contest_id, clerk_user_id);

CREATE INDEX idx_cs_problem
ON public.contest_submissions (contest_problem_id);

CREATE INDEX idx_cs_user_verdict
ON public.contest_submissions (clerk_user_id, verdict);

CREATE INDEX idx_cs_recent
ON public.contest_submissions (contest_problem_id, submitted_at DESC);

CREATE INDEX idx_cs_pending
ON public.contest_submissions (submitted_at ASC)
WHERE verdict = 'pending';

CREATE INDEX idx_cs_accepted
ON public.contest_submissions (contest_id, submitted_at DESC)
WHERE verdict = 'accepted';

CREATE INDEX idx_cs_leaderboard_unprocessed
ON public.contest_submissions (contest_id, submitted_at DESC)
WHERE leaderboard_processed = FALSE;

CREATE INDEX idx_cs_created_at
ON public.contest_submissions (created_at DESC);

--------------------------------------------------------------------------------
-- Validation: contest timing
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_contest_submission_time()
RETURNS TRIGGER AS $$
DECLARE
  contest_start timestamptz;
  contest_end timestamptz;
BEGIN
  SELECT start_time, end_time
  INTO contest_start, contest_end
  FROM public.contests
  WHERE id = NEW.contest_id;

  IF NEW.submitted_at < contest_start THEN
    RAISE EXCEPTION 'Cannot submit before contest starts';
  END IF;

  IF NEW.submitted_at > contest_end THEN
    RAISE EXCEPTION 'Cannot submit after contest ends';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_contest_submission_time
BEFORE INSERT ON public.contest_submissions
FOR EACH ROW
EXECUTE FUNCTION validate_contest_submission_time();

--------------------------------------------------------------------------------
-- Validation: ensure contest_problem belongs to contest
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_contest_problem_match()
RETURNS TRIGGER AS $$
DECLARE
  actual_contest UUID;
BEGIN
  SELECT contest_id
  INTO actual_contest
  FROM public.contest_problems
  WHERE id = NEW.contest_problem_id;

  IF actual_contest IS NULL OR actual_contest <> NEW.contest_id THEN
    RAISE EXCEPTION 'contest_problem_id does not belong to contest_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_contest_problem_match
BEFORE INSERT ON public.contest_submissions
FOR EACH ROW
EXECUTE FUNCTION validate_contest_problem_match();

--------------------------------------------------------------------------------
-- Validation: execution metrics
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_contest_submission_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verdict NOT IN ('pending', 'compilation_error') THEN
    IF NEW.runtime_ms IS NULL OR NEW.memory_kb IS NULL THEN
      RAISE EXCEPTION 'runtime_ms and memory_kb must be set after judging';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_contest_submission_metrics
BEFORE INSERT OR UPDATE ON public.contest_submissions
FOR EACH ROW
EXECUTE FUNCTION validate_contest_submission_metrics();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: own submissions or staff
--------------------------------------------------------------------------------
CREATE POLICY "Read own or staff submissions"
ON public.contest_submissions
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
-- INSERT: user must be registered
--------------------------------------------------------------------------------
CREATE POLICY "Submit if registered"
ON public.contest_submissions
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
  AND EXISTS (
    SELECT 1
    FROM public.contest_registrations cr
    WHERE cr.contest_id = contest_submissions.contest_id
      AND cr.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

--------------------------------------------------------------------------------
-- UPDATE: staff only (judge system)
--------------------------------------------------------------------------------
CREATE POLICY "Staff update submissions"
ON public.contest_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);