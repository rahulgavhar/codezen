--------------------------------------------------------------------------------
-- ENUMS (type safety)
--------------------------------------------------------------------------------
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE problem_status AS ENUM ('draft', 'published', 'archived');

--------------------------------------------------------------------------------
-- Problems
-- Core problem metadata and public content
--------------------------------------------------------------------------------
CREATE TABLE public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  title TEXT NOT NULL UNIQUE
    CHECK (char_length(title) BETWEEN 5 AND 150),

  -- URL-safe unique identifier
  slug TEXT NOT NULL UNIQUE,

  difficulty difficulty NOT NULL,

  -- Content
  description TEXT NOT NULL,
  input_format TEXT,
  output_format TEXT,
  constraints TEXT,
  hints TEXT[],

  -- Execution limits
  time_limit_ms INT NOT NULL DEFAULT 2000
    CHECK (time_limit_ms BETWEEN 500 AND 10000),

  memory_limit_mb INT NOT NULL DEFAULT 256
    CHECK (memory_limit_mb BETWEEN 64 AND 2048),

  -- Visibility
  status problem_status NOT NULL DEFAULT 'draft',

  -- Ownership (IMPORTANT: matches Clerk JWT `sub`)
  created_by TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE RESTRICT,

  -- Source
  source TEXT NOT NULL DEFAULT 'internal',

  -- Stats
  total_attempts INT NOT NULL DEFAULT 0,
  total_accepted INT NOT NULL DEFAULT 0,
  acceptance NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (acceptance BETWEEN 0 AND 100),

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------
CREATE INDEX idx_problems_public_list
ON public.problems (difficulty, acceptance DESC)
WHERE status = 'published';

CREATE UNIQUE INDEX idx_problems_slug
ON public.problems (slug);

CREATE INDEX idx_problems_created_by
ON public.problems (created_by, created_at DESC);

CREATE INDEX idx_problems_status_created
ON public.problems (status, created_at DESC);

--------------------------------------------------------------------------------
-- Trigger: updated_at
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_problems_updated_at
BEFORE UPDATE ON public.problems
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- Trigger: slug generation (basic safe version)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_problem_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug :=
      lower(regexp_replace(trim(NEW.title), '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_problem_slug
BEFORE INSERT ON public.problems
FOR EACH ROW
EXECUTE FUNCTION public.generate_problem_slug();

--------------------------------------------------------------------------------
-- Enable RLS
--------------------------------------------------------------------------------
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT Policies
--------------------------------------------------------------------------------

-- Public can read published problems
CREATE POLICY "Public read published problems"
ON public.problems
FOR SELECT
USING (status = 'published');

-- Staff (companies) can read ALL their own problems (including drafts)
CREATE POLICY "Staff read own problems"
ON public.problems
FOR SELECT
USING (
  created_by = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- INSERT Policy
--------------------------------------------------------------------------------

-- Only staff can create problems, and only for themselves
CREATE POLICY "Staff create problems"
ON public.problems
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
  AND created_by = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- UPDATE Policy
--------------------------------------------------------------------------------

-- Staff can update ONLY their own problems
CREATE POLICY "Staff update own problems"
ON public.problems
FOR UPDATE
USING (
  created_by = auth.jwt() ->> 'sub'
)
WITH CHECK (
  created_by = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- DELETE Policy
--------------------------------------------------------------------------------

-- Staff can delete ONLY their own problems
CREATE POLICY "Staff delete own problems"
ON public.problems
FOR DELETE
USING (
  created_by = auth.jwt() ->> 'sub'
);