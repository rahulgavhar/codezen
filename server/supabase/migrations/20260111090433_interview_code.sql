--------------------------------------------------------------------------------
-- Interview Code Submissions
--------------------------------------------------------------------------------

CREATE TABLE public.interview_code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Interview reference
  interview_id UUID NOT NULL
    REFERENCES public.interviews(id) ON DELETE CASCADE,

  -- Author (Clerk ID for consistency with interviews table)
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE CASCADE,

  -- Language (standardized)
  language submission_language NOT NULL,

  -- Source code (immutable)
  source_code TEXT NOT NULL,

  -- Verdict (standardized across platform)
  verdict submission_verdict,

  -- Execution stats
  test_cases_passed INT NOT NULL DEFAULT 0
    CHECK (test_cases_passed >= 0),

  test_cases_total INT NOT NULL DEFAULT 0
    CHECK (test_cases_total >= 0),

  -- Optional detailed results
  test_results JSONB,

  created_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- INDEXES
--------------------------------------------------------------------------------

-- Timeline per interview
CREATE INDEX idx_interview_code_submissions_interview_time
ON public.interview_code_submissions(interview_id, created_at ASC);

-- User history
CREATE INDEX idx_interview_code_submissions_user_time
ON public.interview_code_submissions(clerk_user_id, created_at DESC);

-- Verdict filtering
CREATE INDEX idx_interview_code_submissions_verdict
ON public.interview_code_submissions(verdict);

--------------------------------------------------------------------------------
-- VALIDATION: AUTHOR MUST BE INTERVIEW PARTICIPANT
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_interview_code_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.interviews i
    WHERE i.id = NEW.interview_id
      AND (
        i.candidate_clerk_id = NEW.clerk_user_id
        OR i.interviewer_clerk_id = NEW.clerk_user_id
      )
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this interview';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_interview_code_author
BEFORE INSERT ON public.interview_code_submissions
FOR EACH ROW
EXECUTE FUNCTION validate_interview_code_author();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------------------------------------

ALTER TABLE public.interview_code_submissions ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- POLICIES
--------------------------------------------------------------------------------

-- Participants can read submissions of interviews they belong to
CREATE POLICY "Participants read interview code submissions"
ON public.interview_code_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.interviews i
    WHERE i.id = interview_code_submissions.interview_id
      AND (
        i.candidate_clerk_id = auth.jwt() ->> 'sub'
        OR i.interviewer_clerk_id = auth.jwt() ->> 'sub'
      )
  )
);

-- Participants can insert only their own submissions
CREATE POLICY "Participants submit interview code"
ON public.interview_code_submissions
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
  AND EXISTS (
    SELECT 1
    FROM public.interviews i
    WHERE i.id = interview_code_submissions.interview_id
      AND (
        i.candidate_clerk_id = auth.jwt() ->> 'sub'
        OR i.interviewer_clerk_id = auth.jwt() ->> 'sub'
      )
  )
);

-- Staff can read all submissions
CREATE POLICY "Staff read all interview code submissions"
ON public.interview_code_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

-- Staff can update verdicts
CREATE POLICY "Staff update interview code verdicts"
ON public.interview_code_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

-- Immutable: no deletes
CREATE POLICY "No interview code submission deletes"
ON public.interview_code_submissions
FOR DELETE
USING (false);