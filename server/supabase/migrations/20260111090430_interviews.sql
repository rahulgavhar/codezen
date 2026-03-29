--------------------------------------------------------------------------------
-- Interviews
--------------------------------------------------------------------------------
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FIXED: use clerk_user_id (TEXT)
  candidate_clerk_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE CASCADE,

  interviewer_clerk_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id) ON DELETE CASCADE,

  -- Optional problem
  problem_id UUID
    REFERENCES public.problems(id) ON DELETE SET NULL,

  -- Virtual room
  room_id TEXT NOT NULL UNIQUE
    CHECK (char_length(room_id) > 0),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'Scheduled'
    CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Cancelled')),

  -- Timing
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  actual_duration INTERVAL
    CHECK (actual_duration >= interval '0 seconds'),

  -- Evaluation
  feedback TEXT CHECK (char_length(feedback) <= 2000),
  candidate_rating INT CHECK (candidate_rating BETWEEN 1 AND 5),
  technical_score INT CHECK (technical_score BETWEEN 0 AND 100),

  -- Recording
  recording_url TEXT CHECK (char_length(recording_url) <= 500),

  -- Participant connection status
  candidate_connected BOOLEAN DEFAULT FALSE,
  interviewer_connected BOOLEAN DEFAULT FALSE,

  created_at timestamptz NOT NULL DEFAULT now(),

  ----------------------------------------------------------------------
  -- Constraints
  ----------------------------------------------------------------------

  CONSTRAINT check_interview_times
    CHECK (end_time > start_time),

  CONSTRAINT check_different_participants
    CHECK (candidate_clerk_id <> interviewer_clerk_id)
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

CREATE INDEX idx_interviews_candidate
ON public.interviews(candidate_clerk_id);

CREATE INDEX idx_interviews_interviewer
ON public.interviews(interviewer_clerk_id);

CREATE INDEX idx_interviews_status
ON public.interviews(status);

CREATE INDEX idx_interviews_start_time
ON public.interviews(start_time ASC);

CREATE INDEX idx_interviews_candidate_connected
ON public.interviews(candidate_connected);

CREATE INDEX idx_interviews_interviewer_connected
ON public.interviews(interviewer_connected);

--------------------------------------------------------------------------------
-- Validation: lifecycle + feedback rules
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_interview_state()
RETURNS TRIGGER AS $$
BEGIN
  -- Feedback only after completion
  IF NEW.status <> 'Completed' AND (
       NEW.feedback IS NOT NULL
    OR NEW.candidate_rating IS NOT NULL
    OR NEW.technical_score IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Feedback allowed only after completion';
  END IF;

  -- Lock terminal states
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('Completed', 'Cancelled')
       AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Finalized interviews cannot change state';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_interview_state
BEFORE INSERT OR UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.validate_interview_state();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: candidate OR interviewer OR staff
--------------------------------------------------------------------------------
CREATE POLICY "Read own or assigned interviews"
ON public.interviews
FOR SELECT
USING (
  candidate_clerk_id = auth.jwt() ->> 'sub'
  OR interviewer_clerk_id = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- INSERT: staff only
--------------------------------------------------------------------------------
CREATE POLICY "Staff create interviews"
ON public.interviews
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
-- UPDATE: interviewer can only submit feedback
--------------------------------------------------------------------------------
CREATE POLICY "Interviewer update feedback"
ON public.interviews
FOR UPDATE
USING (
  interviewer_clerk_id = auth.jwt() ->> 'sub'
)
WITH CHECK (
  interviewer_clerk_id = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- UPDATE: staff full control
--------------------------------------------------------------------------------
CREATE POLICY "Staff update interviews"
ON public.interviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);

--------------------------------------------------------------------------------
-- DELETE: disabled (audit safety)
--------------------------------------------------------------------------------
CREATE POLICY "No interview deletes"
ON public.interviews
FOR DELETE
USING (false);

--------------------------------------------------------------------------------
-- Column comments
--------------------------------------------------------------------------------

COMMENT ON COLUMN public.interviews.candidate_connected IS 'Tracks if candidate is currently connected to the interview room';
COMMENT ON COLUMN public.interviews.interviewer_connected IS 'Tracks if interviewer is currently connected to the interview room';