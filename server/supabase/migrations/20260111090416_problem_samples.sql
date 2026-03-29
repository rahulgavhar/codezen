--------------------------------------------------------------------------------
-- Problem Samples
-- Stores example inputs/outputs shown on the problem page
--------------------------------------------------------------------------------
CREATE TABLE public.problem_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  problem_id UUID NOT NULL
    REFERENCES public.problems(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Order of sample (1, 2, 3...)
  sample_index INT NOT NULL
    CHECK (sample_index >= 1),

  input TEXT NOT NULL,
  output TEXT NOT NULL,

  explanation TEXT,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure stable ordering per problem
  UNIQUE (problem_id, sample_index)
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

-- Main query pattern: fetch ordered samples for a problem
CREATE INDEX idx_problem_samples_order
ON public.problem_samples (problem_id, sample_index ASC);

--------------------------------------------------------------------------------
-- Trigger: updated_at
--------------------------------------------------------------------------------
CREATE TRIGGER trg_problem_samples_updated_at
BEFORE UPDATE ON public.problem_samples
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- Enable Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.problem_samples ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT Policy
--------------------------------------------------------------------------------

CREATE POLICY "Read samples (public + owner)"
ON public.problem_samples
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.problems p
    WHERE p.id = problem_samples.problem_id
      AND (
        -- Public access
        p.status = 'published'

        -- OR owner access (staff viewing own drafts)
        OR p.created_by = auth.jwt() ->> 'sub'
      )
  )
);

--------------------------------------------------------------------------------
-- INSERT Policy
--------------------------------------------------------------------------------

CREATE POLICY "Staff create samples for own problems"
ON public.problem_samples
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = problem_samples.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);

--------------------------------------------------------------------------------
-- UPDATE Policy
--------------------------------------------------------------------------------

CREATE POLICY "Staff update samples of own problems"
ON public.problem_samples
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = problem_samples.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = problem_samples.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);

--------------------------------------------------------------------------------
-- DELETE Policy
--------------------------------------------------------------------------------

CREATE POLICY "Staff delete samples of own problems"
ON public.problem_samples
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = problem_samples.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);