--------------------------------------------------------------------------------
-- Tags (Minimal, canonical list)
--------------------------------------------------------------------------------
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL UNIQUE
    CHECK (
      char_length(name) BETWEEN 2 AND 100
      AND name = lower(name)
    )
);

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Public read (tags are global)
CREATE POLICY "Public read tags"
ON public.tags
FOR SELECT
USING (true);

-- Staff manage tags (rare operation)
CREATE POLICY "Staff manage tags"
ON public.tags
FOR ALL
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

--------------------------------------------------------------------------------
-- Problem ↔ Tag Mapping (many-to-many)
--------------------------------------------------------------------------------
CREATE TABLE public.problem_tags (
  problem_id UUID NOT NULL
    REFERENCES public.problems(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  tag_id UUID NOT NULL
    REFERENCES public.tags(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  PRIMARY KEY (problem_id, tag_id)
);

--------------------------------------------------------------------------------
-- Indexes (query-driven)
--------------------------------------------------------------------------------

-- Get tags for a problem
CREATE INDEX idx_problem_tags_problem
ON public.problem_tags (problem_id);

-- Get problems by tag
CREATE INDEX idx_problem_tags_tag
ON public.problem_tags (tag_id);

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.problem_tags ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT (public + owner)
--------------------------------------------------------------------------------
CREATE POLICY "Read problem tags"
ON public.problem_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.problems p
    WHERE p.id = problem_tags.problem_id
      AND (
        p.status = 'published'
        OR p.created_by = auth.jwt() ->> 'sub'
      )
  )
);

--------------------------------------------------------------------------------
-- INSERT (ownership enforced)
--------------------------------------------------------------------------------
CREATE POLICY "Staff add tags to own problems"
ON public.problem_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = problem_tags.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);

--------------------------------------------------------------------------------
-- DELETE (ownership enforced)
--------------------------------------------------------------------------------
CREATE POLICY "Staff remove tags from own problems"
ON public.problem_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.problems p ON p.id = problem_tags.problem_id
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
      AND p.created_by = up.clerk_user_id
  )
);