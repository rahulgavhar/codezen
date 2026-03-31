CREATE TABLE public.user_contest_problems (
  -- Primary identifier for this replay metadata row
  -- Not used in runtime flow; mainly for DB integrity and referencing
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifies which contest this replay belongs to
  -- Required for scoping queries and enforcing contest-level isolation
  contest_id UUID NOT NULL
    REFERENCES public.contests(id)
    ON DELETE CASCADE,

  -- Identifies the specific problem inside the contest
  -- Needed because replay is per problem, not per contest
  contest_problem_id UUID NOT NULL
    REFERENCES public.contest_problems(id)
    ON DELETE CASCADE,

  -- Identifies the user who owns this timeline
  -- Used for access control, fetching replay, and uniqueness constraint
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id)
    ON DELETE CASCADE,

  -- 🔴 CORE FIELD
  -- Unique identifier for the entire editor timeline
  -- This is the KEY used across:
  --   - WebSocket events
  --   - Redis stream grouping
  --   - Storage directory structure
  --   - Linking submissions to replay
  -- Must remain stable once created
  timeline_id UUID NOT NULL UNIQUE,

  -- 🔴 STORAGE POINTER
  -- Base path in Supabase storage where replay event files are stored
  -- Example:
  --   contest/{contest_id}/timeline/{timeline_id}/
  -- Backend uses this to fetch and reconstruct replay
  replay_path TEXT NOT NULL,

  -- 🔴 METADATA OPTIMIZATION
  -- Total number of events recorded in this timeline
  -- Avoids reading storage just to show replay length/progress
  event_count INT NOT NULL DEFAULT 0,

  -- 🔴 ORDERING CONTROL
  -- Last sequence number written for this timeline
  -- Ensures:
  --   - correct ordering
  --   - no duplicate/missing events
  --   - safe batching in workers
  last_event_seq BIGINT NOT NULL DEFAULT 0,

  -- 🔴 SESSION STATE
  -- TRUE → user is still actively editing (events expected)
  -- FALSE → no more incoming events (either submitted or inactive)
  -- Useful for:
  --   - cleanup jobs
  --   - UI indicators
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- 🔴 FINALIZATION FLAG
  -- TRUE → timeline is complete and immutable
  -- Set when:
  --   - contest ends OR
  --   - problem solved (AC) and editing is locked
  -- Prevents further writes and ensures replay consistency
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,

  -- Penalty points for wrong submissions (in multiples of 10)
  -- Typically incremented for each wrong attempt
  penalty INT NOT NULL DEFAULT 0
    CHECK (penalty >= 0 AND penalty % 10 = 0),

  -- Timestamp when replay entry was created
  -- Typically corresponds to first edit event
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Updated whenever:
  --   - new events are flushed
  --   - event_count / last_event_seq changes
  --   - status flags change
  -- Used for:
  --   - cleanup (TTL logic)
  --   - detecting stale sessions
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensures ONE timeline per user per problem per contest
  -- Prevents duplicate replay sessions and enforces your design constraint
  CONSTRAINT user_contest_problems_unique_user_problem
  UNIQUE (contest_id, contest_problem_id, clerk_user_id),

  -- Enforces immutable state: cannot be both active AND finalized
  CONSTRAINT chk_replay_state
  CHECK (
    NOT (is_finalized = TRUE AND is_active = TRUE)
  )
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

-- Fast lookup for user inside a contest
CREATE INDEX idx_replays_user_contest
ON public.user_contest_problems (clerk_user_id, contest_id);

-- Fast lookup for problem inside contest
CREATE INDEX idx_replays_problem
ON public.user_contest_problems (contest_problem_id);

-- Timeline lookup (explicit for clarity + future flexibility)
CREATE UNIQUE INDEX idx_replays_timeline
ON public.user_contest_problems (timeline_id);

-- Useful for cleanup / stale sessions
CREATE INDEX idx_replays_updated_at
ON public.user_contest_problems (updated_at DESC);

--------------------------------------------------------------------------------
-- Trigger: Auto-update updated_at
--------------------------------------------------------------------------------

CREATE TRIGGER trg_user_contest_problems_updated_at
BEFORE UPDATE ON public.user_contest_problems
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- Validation: ensure contest_problem belongs to contest
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_contest_replay_problem_match()
RETURNS TRIGGER AS $$
DECLARE
  actual_contest UUID;
BEGIN
  SELECT contest_id
  INTO actual_contest
  FROM public.contest_problems
  WHERE id = NEW.contest_problem_id;

  IF actual_contest IS NULL OR actual_contest <> NEW.contest_id THEN
    RAISE EXCEPTION 'contest_problem_id does not belong to contest_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_contest_replay_problem_match
BEFORE INSERT ON public.user_contest_problems
FOR EACH ROW
EXECUTE FUNCTION validate_contest_replay_problem_match();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------

ALTER TABLE public.user_contest_problems ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: Any authenticated user can read replays
--------------------------------------------------------------------------------

CREATE POLICY "Read contest replays"
ON public.user_contest_problems
FOR SELECT
USING (
  auth.jwt() ->> 'sub' IS NOT NULL
);

--------------------------------------------------------------------------------
-- INSERT: User can create their own replay
--------------------------------------------------------------------------------

CREATE POLICY "Insert own replay"
ON public.user_contest_problems
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- UPDATE: User can update own, staff can update any
--------------------------------------------------------------------------------

CREATE POLICY "Update own or staff replay"
ON public.user_contest_problems
FOR UPDATE
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
-- DELETE: Staff only
--------------------------------------------------------------------------------

CREATE POLICY "Delete staff only"
ON public.user_contest_problems
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);