--------------------------------------------------------------------------------
-- VMS (AUTHORITATIVE VM STATE)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Azure identity (single VM record expected)
  vm_name TEXT NOT NULL CHECK (char_length(vm_name) BETWEEN 1 AND 100),
  resource_group TEXT NOT NULL CHECK (char_length(resource_group) BETWEEN 1 AND 100),
  subscription_id TEXT NOT NULL CHECK (char_length(subscription_id) BETWEEN 1 AND 100),

  -- Power state (single source of truth)
  power_state TEXT NOT NULL
    CHECK (power_state IN (
      'Starting',
      'Running',
      'Stopping',
      'Stopped',
      'Deallocated'
    )),

  -- Last user activity (publicly readable)
  last_active_at timestamptz NOT NULL DEFAULT now(),

  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vms_power_state
ON public.vms(power_state);

-- Partial unique index to enforce only one VM record exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_vms_one_only
ON public.vms ((1));


--------------------------------------------------------------------------------
-- RLS POLICIES FOR VMS
--------------------------------------------------------------------------------

ALTER TABLE public.vms ENABLE ROW LEVEL SECURITY;

-- Allow public read access to VM state and activity
CREATE POLICY "Allow public read access to vms"
  ON public.vms
  FOR SELECT
  USING (true);

-- Allow any authenticated user or service_role to update VM state
CREATE POLICY "Allow authenticated update to vms"
  ON public.vms
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow service role to insert VM record
CREATE POLICY "Allow service role insert to vms"
  ON public.vms
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


--------------------------------------------------------------------------------
-- SEED VM RECORD
--------------------------------------------------------------------------------


INSERT INTO public.vms (vm_name, resource_group, subscription_id, power_state)
VALUES (
  'judge0-codezen',
  'judge0-rg',
  'bb0d708e-ac4d-4147-8222-a0e4f4881b27',
  'Deallocated'
);


--------------------------------------------------------------------------------
-- VM ACTIONS (INTENT + EXECUTION LOG)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vm_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  vm_id UUID NOT NULL
    REFERENCES public.vms(id) ON DELETE CASCADE,

  action TEXT NOT NULL
    CHECK (action IN ('start', 'stop', 'deallocate')),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failure')),

  error_message TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vm_actions_vm
ON public.vm_actions(vm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vm_actions_status
ON public.vm_actions(status);


--------------------------------------------------------------------------------
-- RLS POLICIES FOR VM_ACTIONS
--------------------------------------------------------------------------------

ALTER TABLE public.vm_actions ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user or service_role to read actions
CREATE POLICY "Allow authenticated read vm_actions"
  ON public.vm_actions
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow service role to insert actions
CREATE POLICY "Allow service role write vm_actions"
  ON public.vm_actions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow service role to update actions
CREATE POLICY "Allow service role update vm_actions"
  ON public.vm_actions
  FOR UPDATE
  USING (auth.role() = 'service_role');


--------------------------------------------------------------------------------
-- SEED VM_ACTIONS
--------------------------------------------------------------------------------


INSERT INTO public.vm_actions (vm_id, action, status, executed_at)
SELECT id, 'deallocate', 'success', now()
FROM public.vms
LIMIT 1;


--------------------------------------------------------------------------------
-- REALTIME ENABLEMENT
--------------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime
ADD TABLE public.vms;