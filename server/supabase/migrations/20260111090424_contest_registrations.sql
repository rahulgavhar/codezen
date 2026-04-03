--------------------------------------------------------------------------------
-- Contest Registrations
--------------------------------------------------------------------------------
CREATE TABLE public.contest_registrations (
  contest_id UUID NOT NULL
    REFERENCES public.contests(id)
    ON DELETE CASCADE,

  -- FIXED: use clerk_user_id
  clerk_user_id TEXT NOT NULL
    REFERENCES public.user_profiles(clerk_user_id)
    ON DELETE CASCADE,

  PRIMARY KEY (contest_id, clerk_user_id)
);

--------------------------------------------------------------------------------
-- Indexes (query-driven)
--------------------------------------------------------------------------------

-- Contest participants
CREATE INDEX idx_contest_registrations_contest
ON public.contest_registrations (contest_id);

-- User's contests
CREATE INDEX idx_contest_registrations_user
ON public.contest_registrations (clerk_user_id);

--------------------------------------------------------------------------------
-- Validation: timing + capacity
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_contest_registration()
RETURNS TRIGGER AS $$ 
DECLARE
  v_contest_start timestamptz;
  v_reg_deadline timestamptz;
  v_max_participants INT;
  v_current_count INT;
BEGIN
  SELECT c.start_time, c.registration_deadline, c.max_participants
  INTO v_contest_start, v_reg_deadline, v_max_participants
  FROM public.contests c
  WHERE c.id = NEW.contest_id;

  IF v_contest_start IS NULL THEN
    RAISE EXCEPTION 'Contest not found';
  END IF;

  -- Contest started
  IF now() >= v_contest_start THEN
    RAISE EXCEPTION 'Registration closed: contest already started';
  END IF;

  -- Deadline passed
  IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- Capacity check (IMPORTANT)
  IF v_max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.contest_registrations cr
    WHERE cr.contest_id = NEW.contest_id;

    IF v_current_count >= v_max_participants THEN
      RAISE EXCEPTION 'Contest is full';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_registration
BEFORE INSERT ON public.contest_registrations
FOR EACH ROW
EXECUTE FUNCTION validate_contest_registration();

--------------------------------------------------------------------------------
-- Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.contest_registrations ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT: user sees own + staff sees all
--------------------------------------------------------------------------------
CREATE POLICY "Read own or staff registrations"
ON public.contest_registrations
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
-- INSERT: user registers themselves
--------------------------------------------------------------------------------
CREATE POLICY "User register self"
ON public.contest_registrations
FOR INSERT
WITH CHECK (
  clerk_user_id = auth.jwt() ->> 'sub'
);

--------------------------------------------------------------------------------
-- DELETE: user unregister self or staff
--------------------------------------------------------------------------------
CREATE POLICY "User unregister self or staff"
ON public.contest_registrations
FOR DELETE
USING (
  clerk_user_id = auth.jwt() ->> 'sub'
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.clerk_user_id = auth.jwt() ->> 'sub'
      AND up.app_role = 'staff'
  )
);