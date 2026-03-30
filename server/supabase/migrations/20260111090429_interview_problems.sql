--------------------------------------------------------------------------------
-- Interview Problems
-- Problem content linked to specific interviews (snapshot of problem at interview time)
--------------------------------------------------------------------------------
CREATE TABLE public.interview_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to interview
  interview_id UUID NOT NULL
    REFERENCES public.interviews(id) ON DELETE CASCADE,

  -- Link to original problem (for reference)
  problem_id UUID
    REFERENCES public.problems(id) ON DELETE SET NULL,

  -- Problem content (snapshot)
  title TEXT NOT NULL
    CHECK (char_length(title) BETWEEN 5 AND 150),

  description TEXT NOT NULL,

  gemini_description TEXT,

  input_format TEXT,

  output_format TEXT,

  constraints TEXT,

  hints TEXT[],

  difficulty TEXT,

  -- Execution limits
  time_limit_ms INT DEFAULT 2000,

  memory_limit_mb INT DEFAULT 256,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

CREATE INDEX idx_interview_problems_interview_id
ON public.interview_problems(interview_id);

CREATE INDEX idx_interview_problems_problem_id
ON public.interview_problems(problem_id);

CREATE UNIQUE INDEX idx_interview_problems_one_per_interview
ON public.interview_problems(interview_id);

--------------------------------------------------------------------------------
-- Enable Row Level Security
--------------------------------------------------------------------------------

ALTER TABLE public.interview_problems ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: interview participants can read
--------------------------------------------------------------------------------
CREATE POLICY "Interview participants read problem"
ON public.interview_problems
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.interviews i
    WHERE i.id = interview_id
      AND (
        i.candidate_clerk_id = auth.jwt() ->> 'sub'
        OR i.interviewer_clerk_id = auth.jwt() ->> 'sub'
      )
  )
);

--------------------------------------------------------------------------------
-- INSERT: staff can create
--------------------------------------------------------------------------------
CREATE POLICY "Staff insert interview problems"
ON public.interview_problems
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- UPDATE: staff can update their own
--------------------------------------------------------------------------------
CREATE POLICY "Staff update interview problems"
ON public.interview_problems
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.interviews i
    WHERE i.id = interview_id
      AND i.interviewer_clerk_id = auth.jwt() ->> 'sub'
  )
);

--------------------------------------------------------------------------------
-- Column Comments
--------------------------------------------------------------------------------

COMMENT ON COLUMN public.interview_problems.gemini_description IS 'AI-generated description of the problem from Gemini API';
COMMENT ON TABLE public.interview_problems IS 'Snapshot of problem content for a specific interview, allowing problems to evolve over time while keeping interview context frozen';
