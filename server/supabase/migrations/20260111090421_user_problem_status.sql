--------------------------------------------------------------------------------
-- Materialized View: user_problem_status
-- Derived aggregation from submissions
-- Only includes user-problem pairs with at least one submission
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.user_problem_status AS
SELECT
  s.clerk_user_id,
  s.problem_id,

  CASE
    WHEN COUNT(*) FILTER (WHERE s.verdict = 'accepted') > 0
      THEN 'solved'::problem_status_user
    ELSE 'attempted'::problem_status_user
  END AS status,

  COUNT(*) AS attempts,
  MAX(s.submitted_at) AS last_submission_at

FROM public.submissions s
GROUP BY s.clerk_user_id, s.problem_id
WITH NO DATA;

--------------------------------------------------------------------------------
-- Indexes (required for CONCURRENT refresh)
--------------------------------------------------------------------------------

-- Primary key equivalent
CREATE UNIQUE INDEX idx_user_problem_status_pk
ON public.user_problem_status (clerk_user_id, problem_id);

-- User dashboard queries
CREATE INDEX idx_user_problem_status_user
ON public.user_problem_status (clerk_user_id, last_submission_at DESC);

-- Problem analytics
CREATE INDEX idx_user_problem_status_problem
ON public.user_problem_status (problem_id);

-- Status filtering
CREATE INDEX idx_user_problem_status_user_status
ON public.user_problem_status (clerk_user_id, status);

--------------------------------------------------------------------------------
-- Refresh function
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_user_problem_status()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_problem_status;
END;
$$ LANGUAGE plpgsql;