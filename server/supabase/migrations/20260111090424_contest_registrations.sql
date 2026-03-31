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
  contest_start timestamptz;
  reg_deadline timestamptz;
  max_participants INT;
  current_count INT;
BEGIN
  SELECT start_time, registration_deadline, max_participants
  INTO contest_start, reg_deadline, max_participants
  FROM public.contests
  WHERE id = NEW.contest_id;

  -- Contest started
  IF now() >= contest_start THEN
    RAISE EXCEPTION 'Registration closed: contest already started';
  END IF;

  -- Deadline passed
  IF reg_deadline IS NOT NULL AND now() > reg_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- Capacity check (IMPORTANT)
  IF max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM public.contest_registrations
    WHERE contest_id = NEW.contest_id;

    IF current_count >= max_participants THEN
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