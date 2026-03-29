--------------------------------------------------------------------------------
-- Test Case Sets
-- Represents grouped judge inputs/outputs stored in object storage
-- NEVER exposed to end users
--------------------------------------------------------------------------------
CREATE TABLE public.test_case_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning problem
  problem_id UUID NOT NULL
    REFERENCES public.problems(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Storage reference (Supabase Storage / S3 / GCS)
  storage_bucket TEXT NOT NULL,
  input_path TEXT NOT NULL,
  output_path TEXT NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate storage references per problem
  UNIQUE (problem_id, input_path, output_path)
);

--------------------------------------------------------------------------------
-- Indexes (query-driven)
--------------------------------------------------------------------------------

-- Fetch all test case sets for a problem (judge pipeline)
CREATE INDEX idx_test_case_sets_problem
ON public.test_case_sets (problem_id);

-- Storage lookup (optional debugging / admin tools)
CREATE INDEX idx_test_case_sets_storage
ON public.test_case_sets (storage_bucket, input_path);

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.test_case_sets ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT (STRICT: only owner staff)
--------------------------------------------------------------------------------
CREATE POLICY "Staff read own test case sets"
ON public.test_case_sets
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = test_case_sets.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);

--------------------------------------------------------------------------------
-- INSERT (ownership enforced)
--------------------------------------------------------------------------------
CREATE POLICY "Staff create test case sets for own problems"
ON public.test_case_sets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = test_case_sets.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);

--------------------------------------------------------------------------------
-- UPDATE (ownership enforced)
--------------------------------------------------------------------------------
CREATE POLICY "Staff update test case sets for own problems"
ON public.test_case_sets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = test_case_sets.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = test_case_sets.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);

--------------------------------------------------------------------------------
-- DELETE (ownership enforced)
--------------------------------------------------------------------------------
CREATE POLICY "Staff delete test case sets for own problems"
ON public.test_case_sets
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = test_case_sets.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);