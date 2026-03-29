--------------------------------------------------------------------------------
-- Interview Events (Immutable Event Stream)
--------------------------------------------------------------------------------
CREATE TABLE public.interview_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Interview reference
  interview_id UUID NOT NULL
    REFERENCES public.interviews(id) ON DELETE CASCADE,

  -- FIXED: use clerk_user_id
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE CASCADE,

  -- Event type (extensible)
  event_type TEXT NOT NULL,

  -- Optional structured payload (WebRTC / analytics / signals)
  metadata JSONB,

  -- Signal quality snapshot (optional)
  signal_strength INT CHECK (signal_strength BETWEEN 1 AND 5),

  created_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

-- Timeline per interview (critical for replay)
CREATE INDEX idx_interview_events_interview_time
ON public.interview_events(interview_id, created_at ASC);

-- User analytics
CREATE INDEX idx_interview_events_user_time
ON public.interview_events(clerk_user_id, created_at ASC);

-- Event type filtering
CREATE INDEX idx_interview_events_type
ON public.interview_events(event_type);

-- JSON queries (optional but powerful)
CREATE INDEX idx_interview_events_metadata
ON public.interview_events USING GIN (metadata);

--------------------------------------------------------------------------------
-- Validation: ensure actor belongs to interview
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_interview_event_actor()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.interviews i
    WHERE i.id = NEW.interview_id
      AND (
        i.candidate_clerk_id = NEW.clerk_user_id
        OR i.interviewer_clerk_id = NEW.clerk_user_id
      )
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this interview';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_interview_event_actor
BEFORE INSERT ON public.interview_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_interview_event_actor();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------

ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: participants or staff
--------------------------------------------------------------------------------
CREATE POLICY "Read interview events"
ON public.interview_events
FOR SELECT
USING (
  clerk_user_id = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.interviews i
    WHERE i.id = interview_events.interview_id
      AND (
        i.candidate_clerk_id = auth.jwt() ->> 'sub'
        OR i.interviewer_clerk_id = auth.jwt() ->> 'sub'
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- INSERT: participant only (own events)
--------------------------------------------------------------------------------
CREATE POLICY "Insert own interview events"
ON public.interview_events
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
  AND EXISTS (
    SELECT 1
    FROM public.interviews i
    WHERE i.id = interview_events.interview_id
      AND (
        i.candidate_clerk_id = auth.jwt() ->> 'sub'
        OR i.interviewer_clerk_id = auth.jwt() ->> 'sub'
      )
  )
);

--------------------------------------------------------------------------------
-- Immutable event log
--------------------------------------------------------------------------------
CREATE POLICY "No updates on interview events"
ON public.interview_events
FOR UPDATE
USING (false);

CREATE POLICY "No deletes on interview events"
ON public.interview_events
FOR DELETE
USING (false);