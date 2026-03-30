--------------------------------------------------------------------------------
-- Contest Leaderboard (ICPC Style)
-- Derived from contest_submissions (NO redundant state stored)
--------------------------------------------------------------------------------

CREATE MATERIALIZED VIEW public.contest_leaderboard AS

--------------------------------------------------------------------------------
-- Step 1: First Accepted Submission per user per problem
--------------------------------------------------------------------------------
WITH first_ac AS (
  SELECT
    cs.contest_id,
    cs.clerk_user_id,
    cs.contest_problem_id,
    MIN(cs.submitted_at) AS first_accepted_at
  FROM public.contest_submissions cs
  WHERE cs.verdict = 'accepted'
  GROUP BY cs.contest_id, cs.clerk_user_id, cs.contest_problem_id
),

--------------------------------------------------------------------------------
-- Step 2: Wrong attempts BEFORE first AC
--------------------------------------------------------------------------------
wrong_attempts AS (
  SELECT
    cs.contest_id,
    cs.clerk_user_id,
    cs.contest_problem_id,
    COUNT(*) AS wrong_attempts
  FROM public.contest_submissions cs
  JOIN first_ac fa
    ON cs.contest_id = fa.contest_id
    AND cs.clerk_user_id = fa.clerk_user_id
    AND cs.contest_problem_id = fa.contest_problem_id
  WHERE cs.verdict != 'accepted'
    AND cs.submitted_at < fa.first_accepted_at
  GROUP BY cs.contest_id, cs.clerk_user_id, cs.contest_problem_id
),

--------------------------------------------------------------------------------
-- Step 3: Compute penalty per problem
--------------------------------------------------------------------------------
problem_scores AS (
  SELECT
    fa.contest_id,
    fa.clerk_user_id,
    fa.contest_problem_id,
    cp.points,

    -- ICPC penalty = time + wrong_attempts * 20
    (
      EXTRACT(EPOCH FROM (fa.first_accepted_at - c.start_time)) / 60
      + COALESCE(wa.wrong_attempts, 0) * 20
    )::INT AS penalty

  FROM first_ac fa
  JOIN public.contest_problems cp
    ON cp.id = fa.contest_problem_id
  JOIN public.contests c
    ON c.id = fa.contest_id
  LEFT JOIN wrong_attempts wa
    ON wa.contest_id = fa.contest_id
    AND wa.clerk_user_id = fa.clerk_user_id
    AND wa.contest_problem_id = fa.contest_problem_id
),

--------------------------------------------------------------------------------
-- Step 4: Aggregate per user
--------------------------------------------------------------------------------
user_aggregate AS (
  SELECT
    contest_id,
    clerk_user_id,
    COUNT(*) AS solved,
    SUM(points) AS score,
    SUM(penalty) AS penalty
  FROM problem_scores
  GROUP BY contest_id, clerk_user_id
)

--------------------------------------------------------------------------------
-- Step 5: Final ranking
--------------------------------------------------------------------------------
SELECT
  ua.contest_id,
  ua.clerk_user_id,
  ua.solved,
  ua.score,
  ua.penalty,

  RANK() OVER (
    PARTITION BY ua.contest_id
    ORDER BY ua.score DESC, ua.penalty ASC
  ) AS rank

FROM user_aggregate ua

WITH NO DATA;

--------------------------------------------------------------------------------
-- Indexes (REQUIRED for performance + concurrent refresh)
--------------------------------------------------------------------------------

-- Unique identity (required for CONCURRENT refresh)
CREATE UNIQUE INDEX idx_contest_leaderboard_pk
ON public.contest_leaderboard (contest_id, clerk_user_id);

-- Ranking queries
CREATE INDEX idx_contest_leaderboard_rank
ON public.contest_leaderboard (contest_id, score DESC, penalty ASC);

--------------------------------------------------------------------------------
-- Refresh Function
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_contest_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.contest_leaderboard;
END;
$$ LANGUAGE plpgsql;