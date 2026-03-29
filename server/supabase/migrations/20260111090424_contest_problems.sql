--------------------------------------------------------------------------------
-- Contest Problems
--------------------------------------------------------------------------------
CREATE TABLE public.contest_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  contest_id UUID NOT NULL
    REFERENCES public.contests(id)
    ON DELETE CASCADE,

  problem_id UUID NOT NULL
    REFERENCES public.problems(id)
    ON DELETE CASCADE,

  -- Problem code (A, B, C...)
  code TEXT NOT NULL
    CHECK (char_length(code) BETWEEN 1 AND 5),

  -- Order in contest
  display_order INT NOT NULL
    CHECK (display_order >= 1),

  -- Scoring
  points INT NOT NULL DEFAULT 100
    CHECK (points >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE (contest_id, code),
  UNIQUE (contest_id, display_order),
  UNIQUE (contest_id, problem_id)
);

--------------------------------------------------------------------------------
-- Indexes (query-driven)
--------------------------------------------------------------------------------

-- Fetch problems for contest
CREATE INDEX idx_contest_problems_contest
ON public.contest_problems (contest_id);

-- Ordered listing
CREATE INDEX idx_contest_problems_order
ON public.contest_problems (contest_id, display_order);

-- Scoring queries
CREATE INDEX idx_contest_problems_points
ON public.contest_problems (contest_id, points DESC);

--------------------------------------------------------------------------------
-- Validation: prevent modification after contest ends
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_contest_problem_mutation()
RETURNS TRIGGER AS $$
DECLARE
  contest_end timestamptz;
BEGIN
  SELECT end_time
  INTO contest_end
  FROM public.contests
  WHERE id = NEW.contest_id;

  IF now() >= contest_end THEN
    RAISE EXCEPTION 'Cannot modify problems for an ended contest';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contest_problem_insert
BEFORE INSERT ON public.contest_problems
FOR EACH ROW
EXECUTE FUNCTION validate_contest_problem_mutation();

CREATE TRIGGER trg_contest_problem_update
BEFORE UPDATE ON public.contest_problems
FOR EACH ROW
EXECUTE FUNCTION validate_contest_problem_mutation();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.contest_problems ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: Only registered users AFTER contest start
--------------------------------------------------------------------------------
CREATE POLICY "Read contest problems (registered users only)"
ON public.contest_problems
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.contests c
    JOIN public.contest_registrations cr
      ON cr.contest_id = c.id
    WHERE c.id = contest_problems.contest_id
      AND now() >= c.start_time
      AND cr.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

--------------------------------------------------------------------------------
-- STAFF / OWNER MANAGEMENT
--------------------------------------------------------------------------------

CREATE POLICY "Staff or owner manage contest problems"
ON public.contest_problems
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.contests c
    JOIN public.user_profiles up
      ON up.clerk_user_id = auth.jwt() ->> 'sub'
    WHERE c.id = contest_problems.contest_id
      AND (
        up.app_role = 'staff'
        OR c.created_by = up.clerk_user_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contests c
    JOIN public.user_profiles up
      ON up.clerk_user_id = auth.jwt() ->> 'sub'
    WHERE c.id = contest_problems.contest_id
      AND (
        up.app_role = 'staff'
        OR c.created_by = up.clerk_user_id
      )
  )
);