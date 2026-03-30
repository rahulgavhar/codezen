--------------------------------------------------------------------------------
-- ENUM: Contest Status (derived)
--------------------------------------------------------------------------------
CREATE TYPE contest_status AS ENUM (
  'upcoming',
  'live',
  'ended'
);

--------------------------------------------------------------------------------
-- Contests
--------------------------------------------------------------------------------
CREATE TABLE public.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  title TEXT NOT NULL
    CHECK (char_length(title) BETWEEN 5 AND 150),

  description TEXT,

  -- Timing
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,

  -- Participation
  max_participants INT
    CHECK (max_participants >= 0),

  registration_deadline timestamptz,

  -- Rating
  is_rated BOOLEAN NOT NULL DEFAULT true,

  -- Ownership (FIXED: use clerk_user_id)
  created_by TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id)
    ON DELETE CASCADE,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  --------------------------------------------------------------------------------
  -- Constraints
  --------------------------------------------------------------------------------
  CONSTRAINT check_contest_times
    CHECK (end_time > start_time),

  CONSTRAINT check_registration_deadline
    CHECK (
      registration_deadline IS NULL
      OR registration_deadline <= start_time
    )
);

--------------------------------------------------------------------------------
-- Indexes (query-driven)
--------------------------------------------------------------------------------

-- upcoming / sorting
CREATE INDEX idx_contests_start_time
ON public.contests (start_time);

-- ended / archive queries
CREATE INDEX idx_contests_end_time
ON public.contests (end_time);

-- creator dashboard
CREATE INDEX idx_contests_created_by
ON public.contests (created_by);

-- live contests query (IMPORTANT)
CREATE INDEX idx_contests_live_window
ON public.contests (start_time, end_time);

--------------------------------------------------------------------------------
-- Trigger: updated_at
--------------------------------------------------------------------------------
CREATE TRIGGER trg_contests_updated_at
BEFORE UPDATE ON public.contests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- Derived View: contest_with_status
--------------------------------------------------------------------------------
CREATE VIEW public.contest_with_status AS
SELECT
  c.*,
  CASE
    WHEN now() < c.start_time THEN 'upcoming'::contest_status
    WHEN now() >= c.start_time AND now() < c.end_time THEN 'live'::contest_status
    ELSE 'ended'::contest_status
  END AS status
FROM public.contests c;

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: public + owner + staff
--------------------------------------------------------------------------------
CREATE POLICY "Read contests"
ON public.contests
FOR SELECT
USING (
  TRUE  -- contests are public by default
);

--------------------------------------------------------------------------------
-- INSERT: only staff
--------------------------------------------------------------------------------
CREATE POLICY "Staff create contests"
ON public.contests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
  AND created_by = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- UPDATE: owner or staff
--------------------------------------------------------------------------------
CREATE POLICY "Update own or staff contests"
ON public.contests
FOR UPDATE
USING (
  created_by = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
)
WITH CHECK (
  created_by = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- DELETE: owner or staff
--------------------------------------------------------------------------------
CREATE POLICY "Delete own or staff contests"
ON public.contests
FOR DELETE
USING (
  created_by = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);