--------------------------------------------------------------------------------
-- Rating History (Immutable)
--------------------------------------------------------------------------------
CREATE TABLE public.rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FIXED: use clerk_user_id
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id)
    ON DELETE CASCADE,

  contest_id UUID NOT NULL
    REFERENCES public.contests(id)
    ON DELETE CASCADE,

  old_rating INT NOT NULL CHECK (old_rating >= 0),
  new_rating INT NOT NULL CHECK (new_rating >= 0),

  -- Derived
  rating_change INT
    GENERATED ALWAYS AS (new_rating - old_rating) STORED,

  -- Snapshot from leaderboard
  rank INT CHECK (rank >= 1),
  problems_solved INT NOT NULL DEFAULT 0 CHECK (problems_solved >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),

  -- One entry per contest per user
  CONSTRAINT unique_user_contest_rating
    UNIQUE (clerk_user_id, contest_id)
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

CREATE INDEX idx_rating_history_user
ON public.rating_history(clerk_user_id, created_at DESC);

CREATE INDEX idx_rating_history_contest
ON public.rating_history(contest_id);

CREATE INDEX idx_rating_history_change
ON public.rating_history(rating_change DESC);

--------------------------------------------------------------------------------
-- Trigger: Sync rating to user_profiles
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    rating = NEW.new_rating,
    max_rating = GREATEST(max_rating, NEW.new_rating)
  WHERE clerk_user_id = NEW.clerk_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_user_rating
AFTER INSERT ON public.rating_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_rating();

--------------------------------------------------------------------------------
-- Validation: only rated contests
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_rated_contest()
RETURNS TRIGGER AS $$
DECLARE
  rated BOOLEAN;
BEGIN
  SELECT is_rated INTO rated
  FROM public.contests
  WHERE id = NEW.contest_id;

  IF rated IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot assign rating for unrated contest';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_rated_contest
BEFORE INSERT ON public.rating_history
FOR EACH ROW
EXECUTE FUNCTION validate_rated_contest();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: own or staff
--------------------------------------------------------------------------------
CREATE POLICY "Read own or staff rating history"
ON public.rating_history
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
-- INSERT: ONLY staff / backend
--------------------------------------------------------------------------------
CREATE POLICY "Staff insert rating history"
ON public.rating_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- Immutable: no updates
--------------------------------------------------------------------------------
CREATE POLICY "No update rating history"
ON public.rating_history
FOR UPDATE
USING (false);

--------------------------------------------------------------------------------
-- Immutable: no deletes
--------------------------------------------------------------------------------
CREATE POLICY "No delete rating history"
ON public.rating_history
FOR DELETE
USING (false);