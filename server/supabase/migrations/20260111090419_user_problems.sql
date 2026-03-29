--------------------------------------------------------------------------------
-- ENUM: User Problem Status
--------------------------------------------------------------------------------
CREATE TYPE problem_status_user AS ENUM (
  'unsolved',
  'attempted',
  'solved'
);

--------------------------------------------------------------------------------
-- User ↔ Problem Progress Table
--------------------------------------------------------------------------------
CREATE TABLE public.user_problems (
  -- Use Clerk ID directly (avoids joins in RLS)
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE CASCADE,

  problem_id UUID NOT NULL
    REFERENCES public.problems(id) ON DELETE CASCADE,

  -- Progress state
  status problem_status_user NOT NULL DEFAULT 'unsolved',

  -- Number of submissions
  attempts INT NOT NULL DEFAULT 0
    CHECK (attempts >= 0),

  -- Last submission timestamp
  last_submission_at timestamptz,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (clerk_user_id, problem_id)
);

--------------------------------------------------------------------------------
-- Consistency Constraint (IMPORTANT)
--------------------------------------------------------------------------------
ALTER TABLE public.user_problems
ADD CONSTRAINT chk_attempts_status
CHECK (
  (status = 'unsolved' AND attempts = 0)
  OR (status = 'attempted' AND attempts > 0)
  OR (status = 'solved' AND attempts > 0)
);

--------------------------------------------------------------------------------
-- Indexes (query-driven)
--------------------------------------------------------------------------------

-- User dashboard queries
CREATE INDEX idx_user_problems_user
ON public.user_problems (clerk_user_id);

-- Problem analytics
CREATE INDEX idx_user_problems_problem
ON public.user_problems (problem_id);

-- Status filtering (very common)
CREATE INDEX idx_user_problems_user_status
ON public.user_problems (clerk_user_id, status);

--------------------------------------------------------------------------------
-- Trigger: updated_at
--------------------------------------------------------------------------------
CREATE TRIGGER trg_user_problems_updated_at
BEFORE UPDATE ON public.user_problems
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.user_problems ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: User can read own, staff can read all
--------------------------------------------------------------------------------
CREATE POLICY "Read own or staff"
ON public.user_problems
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
-- INSERT: Only user can create their own row
--------------------------------------------------------------------------------
CREATE POLICY "Insert own progress"
ON public.user_problems
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- UPDATE: User or staff
--------------------------------------------------------------------------------
CREATE POLICY "Update own or staff"
ON public.user_problems
FOR UPDATE
USING (
  clerk_user_id = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
)
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);