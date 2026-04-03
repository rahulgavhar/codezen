import { supabase, ensureSupabaseConfigured } from '../config/supabase.client.js';

const TABLE = 'user_contest_problems';

export async function fetchReplayByTimelineId(timelineId) {
  ensureSupabaseConfigured();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('timeline_id', timelineId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function fetchReplayByUserProblem(contestId, contestProblemId, clerkUserId) {
  ensureSupabaseConfigured();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('contest_id', contestId)
    .eq('contest_problem_id', contestProblemId)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function insertReplayMetadata(payload) {
  ensureSupabaseConfigured();

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateReplayByTimelineId(timelineId, patch, options = {}) {
  ensureSupabaseConfigured();

  let query = supabase
    .from(TABLE)
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('timeline_id', timelineId);

  if (options.onlyIfNotFinalized) {
    query = query.eq('is_finalized', false);
  }

  const { data, error } = await query
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function incrementReplayPenalty(timelineId, incrementBy = 10) {
  ensureSupabaseConfigured();

  const row = await fetchReplayByTimelineId(timelineId);
  if (!row) {
    return null;
  }

  const nextPenalty = Math.max(0, Number(row.penalty || 0) + incrementBy);
  return updateReplayByTimelineId(timelineId, { penalty: nextPenalty }, { onlyIfNotFinalized: true });
}
