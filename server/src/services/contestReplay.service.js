import { randomUUID } from 'crypto';
import { supabase, ensureSupabaseConfigured } from '../config/supabase.client.js';
import { ENV } from '../config/env.config.js';
import * as contestsRepo from '../repositories/contests.repo.js';
import * as contestReplayRepo from '../repositories/contestReplay.repo.js';

const REPLAY_STORAGE_BUCKET = ENV.REPLAY_STORAGE_BUCKET || 'contest_submission_events';
const REPLAY_FLUSH_INTERVAL_MS = Number(ENV.REPLAY_FLUSH_INTERVAL_MS || 2000);
const REPLAY_FLUSH_EVENT_THRESHOLD = Number(ENV.REPLAY_FLUSH_EVENT_THRESHOLD || 500);
const REPLAY_FLUSH_MAX_EVENTS = Number(ENV.REPLAY_FLUSH_MAX_EVENTS || 500);

const replayBuffers = new Map();
const replayFlushLocks = new Map();
let replayFlushTimer = null;

function buildHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeReplayPath(contestId, timelineId) {
  return `contest/${contestId}/timeline/${timelineId}/`;
}

function isContestEnded(contest) {
  if (!contest?.end_time) return false;
  const endTime = new Date(contest.end_time).getTime();
  if (Number.isNaN(endTime)) return false;
  return Date.now() >= endTime;
}

function isContestNotStarted(contest) {
  if (!contest?.start_time) return false;
  const startTime = new Date(contest.start_time).getTime();
  if (Number.isNaN(startTime)) return false;
  return Date.now() < startTime;
}

function getReplayBuffer(timelineId) {
  if (!replayBuffers.has(timelineId)) {
    replayBuffers.set(timelineId, {
      eventsBySeq: new Map(),
      updatedAt: Date.now(),
    });
  }

  return replayBuffers.get(timelineId);
}

function cleanupReplayBufferIfEmpty(timelineId) {
  const buffer = replayBuffers.get(timelineId);
  if (!buffer) return;

  if (buffer.eventsBySeq.size === 0) {
    replayBuffers.delete(timelineId);
  }
}

function sanitizeAndValidateBatchEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    throw buildHttpError('events must be a non-empty array', 400);
  }

  const sanitized = events.map((event, index) => {
    const seq = Number(event?.seq);
    if (!Number.isInteger(seq) || seq < 1) {
      throw buildHttpError(`events[${index}].seq must be a positive integer`, 400);
    }

    const tsRaw = event?.ts ?? Date.now();
    const ts = Number(tsRaw);

    return {
      ...event,
      seq,
      ts: Number.isFinite(ts) ? ts : Date.now(),
    };
  });

  for (let index = 1; index < sanitized.length; index += 1) {
    if (sanitized[index].seq <= sanitized[index - 1].seq) {
      throw buildHttpError('events must be strictly increasing by seq within a batch', 400);
    }
  }

  return sanitized;
}

function isStorageAlreadyExistsError(error) {
  const statusCode = Number(error?.statusCode || error?.status || 0);
  if (statusCode === 409) return true;

  const message = String(error?.message || '').toLowerCase();
  return message.includes('already exists') || message.includes('duplicate');
}

async function uploadReplayChunk(replayMeta, chunkEvents) {
  ensureSupabaseConfigured();

  const startSeq = chunkEvents[0].seq;
  const endSeq = chunkEvents[chunkEvents.length - 1].seq;
  const chunkFileName = `chunk_${String(startSeq).padStart(12, '0')}_${String(endSeq).padStart(12, '0')}.json`;
  const objectPath = `${replayMeta.replay_path}${chunkFileName}`;

  const payload = JSON.stringify({
    timeline_id: replayMeta.timeline_id,
    contest_id: replayMeta.contest_id,
    contest_problem_id: replayMeta.contest_problem_id,
    clerk_user_id: replayMeta.clerk_user_id,
    start_seq: startSeq,
    end_seq: endSeq,
    event_count: chunkEvents.length,
    events: chunkEvents,
  });

  const { error } = await supabase.storage
    .from(REPLAY_STORAGE_BUCKET)
    .upload(objectPath, payload, {
      contentType: 'application/json',
      upsert: false,
    });

  if (error && !isStorageAlreadyExistsError(error)) {
    throw error;
  }

  return {
    startSeq,
    endSeq,
    count: chunkEvents.length,
    objectPath,
  };
}

async function withReplayFlushLock(timelineId, operation) {
  const previous = replayFlushLocks.get(timelineId) || Promise.resolve();
  let release;

  const current = new Promise((resolve) => {
    release = resolve;
  });

  replayFlushLocks.set(timelineId, previous.then(() => current));
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (replayFlushLocks.get(timelineId) === current) {
      replayFlushLocks.delete(timelineId);
    }
  }
}

export async function flushTimelineBuffer(timelineId) {
  return withReplayFlushLock(timelineId, async () => {
    const buffer = replayBuffers.get(timelineId);
    if (!buffer || buffer.eventsBySeq.size === 0) {
      return {
        flushedEvents: 0,
        lastEventSeq: null,
      };
    }

    const replayMeta = await contestReplayRepo.fetchReplayByTimelineId(timelineId);
    if (!replayMeta) {
      replayBuffers.delete(timelineId);
      return {
        flushedEvents: 0,
        lastEventSeq: null,
      };
    }

    if (replayMeta.is_finalized) {
      replayBuffers.delete(timelineId);
      return {
        flushedEvents: 0,
        lastEventSeq: replayMeta.last_event_seq,
      };
    }

    const pendingEvents = [...buffer.eventsBySeq.values()]
      .filter((event) => event.seq > Number(replayMeta.last_event_seq || 0))
      .sort((a, b) => a.seq - b.seq);

    if (pendingEvents.length === 0) {
      cleanupReplayBufferIfEmpty(timelineId);
      return {
        flushedEvents: 0,
        lastEventSeq: replayMeta.last_event_seq,
      };
    }

    let flushedEvents = 0;
    let maxFlushedSeq = Number(replayMeta.last_event_seq || 0);

    for (let index = 0; index < pendingEvents.length; index += REPLAY_FLUSH_MAX_EVENTS) {
      const chunk = pendingEvents.slice(index, index + REPLAY_FLUSH_MAX_EVENTS);
      const uploaded = await uploadReplayChunk(replayMeta, chunk);
      flushedEvents += uploaded.count;
      maxFlushedSeq = Math.max(maxFlushedSeq, uploaded.endSeq);
    }

    if (flushedEvents > 0) {
      const nextEventCount = Number(replayMeta.event_count || 0) + flushedEvents;
      await contestReplayRepo.updateReplayByTimelineId(
        timelineId,
        {
          event_count: nextEventCount,
          last_event_seq: maxFlushedSeq,
          is_active: true,
        },
        { onlyIfNotFinalized: true }
      );
    }

    for (const seq of buffer.eventsBySeq.keys()) {
      if (seq <= maxFlushedSeq) {
        buffer.eventsBySeq.delete(seq);
      }
    }

    buffer.updatedAt = Date.now();
    cleanupReplayBufferIfEmpty(timelineId);

    return {
      flushedEvents,
      lastEventSeq: maxFlushedSeq,
    };
  });
}

function assertReplayWriteAllowed(contest) {
  if (isContestNotStarted(contest)) {
    throw buildHttpError('Replay capture is unavailable before contest starts', 400);
  }

  if (isContestEnded(contest)) {
    throw buildHttpError('Replay capture is closed because contest has ended', 409);
  }
}

async function assertContestReplayAccess(contestId, contestProblemId, clerkUserId) {
  const [contest, contestProblem, registration] = await Promise.all([
    contestsRepo.fetchContestById(contestId),
    contestsRepo.fetchContestProblemById(contestId, contestProblemId),
    contestsRepo.fetchContestRegistrant(contestId, clerkUserId),
  ]);

  if (!contest) {
    throw buildHttpError('Contest not found', 404);
  }

  if (!contestProblem) {
    throw buildHttpError('Contest problem not found', 404);
  }

  if (!registration) {
    throw buildHttpError('Only registered participants can create or write replays', 403);
  }

  return {
    contest,
    contestProblem,
  };
}

export async function initContestReplayTimeline(contestId, contestProblemId, clerkUserId) {
  if (!contestId || !contestProblemId) {
    throw buildHttpError('contestId and contestProblemId are required', 400);
  }

  const { contest } = await assertContestReplayAccess(contestId, contestProblemId, clerkUserId);
  assertReplayWriteAllowed(contest);

  const existing = await contestReplayRepo.fetchReplayByUserProblem(contestId, contestProblemId, clerkUserId);
  if (existing) {
    return {
      ...existing,
      initialized: false,
    };
  }

  const timelineId = randomUUID();
  const replayPath = normalizeReplayPath(contestId, timelineId);

  const inserted = await contestReplayRepo.insertReplayMetadata({
    contest_id: contestId,
    contest_problem_id: contestProblemId,
    clerk_user_id: clerkUserId,
    timeline_id: timelineId,
    replay_path: replayPath,
    event_count: 0,
    last_event_seq: 0,
    is_active: true,
    is_finalized: false,
    penalty: 0,
  });

  return {
    ...inserted,
    initialized: true,
  };
}

export async function appendContestReplayEvents(contestId, timelineId, clerkUserId, payload = {}) {
  if (!contestId || !timelineId) {
    throw buildHttpError('contestId and timelineId are required', 400);
  }

  const replay = await contestReplayRepo.fetchReplayByTimelineId(timelineId);
  if (!replay) {
    throw buildHttpError('Replay timeline not found', 404);
  }

  if (replay.contest_id !== contestId) {
    throw buildHttpError('Replay timeline does not belong to this contest', 400);
  }

  if (replay.clerk_user_id !== clerkUserId) {
    throw buildHttpError('You cannot write events to another user timeline', 403);
  }

  if (replay.is_finalized) {
    throw buildHttpError('Replay timeline is finalized and immutable', 409);
  }

  const contest = await contestsRepo.fetchContestById(contestId);
  if (!contest) {
    throw buildHttpError('Contest not found', 404);
  }

  if (isContestEnded(contest)) {
    await finalizeContestReplayTimeline(contestId, timelineId, clerkUserId, {
      reason: 'contest_ended',
    });
    throw buildHttpError('Replay timeline has been finalized because contest ended', 409);
  }

  const events = sanitizeAndValidateBatchEvents(payload.events);
  const buffer = getReplayBuffer(timelineId);
  const dbLastEventSeq = Number(replay.last_event_seq || 0);

  let acceptedCount = 0;
  let duplicateCount = 0;

  for (const event of events) {
    if (event.seq <= dbLastEventSeq) {
      duplicateCount += 1;
      continue;
    }

    if (buffer.eventsBySeq.has(event.seq)) {
      duplicateCount += 1;
      continue;
    }

    buffer.eventsBySeq.set(event.seq, event);
    acceptedCount += 1;
  }

  buffer.updatedAt = Date.now();

  return {
    timeline_id: timelineId,
    accepted_events: acceptedCount,
    duplicate_events: duplicateCount,
    pending_events: buffer.eventsBySeq.size,
  };
}

export async function finalizeContestReplayTimeline(contestId, timelineId, clerkUserId, options = {}) {
  if (!contestId || !timelineId) {
    throw buildHttpError('contestId and timelineId are required', 400);
  }

  const replay = await contestReplayRepo.fetchReplayByTimelineId(timelineId);
  if (!replay) {
    throw buildHttpError('Replay timeline not found', 404);
  }

  if (replay.contest_id !== contestId) {
    throw buildHttpError('Replay timeline does not belong to this contest', 400);
  }

  const userRole = await contestsRepo.getUserRole(clerkUserId);
  const isOwner = replay.clerk_user_id === clerkUserId;
  const isStaff = userRole === 'staff';

  if (!isOwner && !isStaff) {
    throw buildHttpError('Forbidden', 403);
  }

  await flushTimelineBuffer(timelineId);

  const updated = await contestReplayRepo.updateReplayByTimelineId(
    timelineId,
    {
      is_active: false,
      is_finalized: true,
    },
    { onlyIfNotFinalized: true }
  );

  replayBuffers.delete(timelineId);

  if (!updated) {
    const latest = await contestReplayRepo.fetchReplayByTimelineId(timelineId);
    return latest;
  }

  return updated;
}

export async function finalizeReplayForAcceptedSubmission(contestId, contestProblemId, clerkUserId) {
  const replay = await contestReplayRepo.fetchReplayByUserProblem(
    contestId,
    contestProblemId,
    clerkUserId
  );

  if (!replay || replay.is_finalized) {
    return replay;
  }

  await flushTimelineBuffer(replay.timeline_id);

  const updated = await contestReplayRepo.updateReplayByTimelineId(
    replay.timeline_id,
    {
      is_active: false,
      is_finalized: true,
    },
    { onlyIfNotFinalized: true }
  );

  replayBuffers.delete(replay.timeline_id);

  return updated || replay;
}

async function listReplayChunkFiles(replayPath) {
  const { data, error } = await supabase.storage
    .from(REPLAY_STORAGE_BUCKET)
    .list(replayPath, {
      limit: 1000,
      sortBy: {
        column: 'name',
        order: 'asc',
      },
    });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((entry) => entry?.name && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function downloadReplayChunk(replayPath, fileName) {
  const objectPath = `${replayPath}${fileName}`;
  const { data, error } = await supabase.storage
    .from(REPLAY_STORAGE_BUCKET)
    .download(objectPath);

  if (error) {
    throw error;
  }

  const text = await data.text();
  return JSON.parse(text);
}

async function buildReplayPayloadFromRow(replay) {
  const files = await listReplayChunkFiles(replay.replay_path);
  const allEvents = [];

  for (const file of files) {
    try {
      const chunk = await downloadReplayChunk(replay.replay_path, file.name);
      if (Array.isArray(chunk?.events)) {
        allEvents.push(...chunk.events);
      }
    } catch (error) {
      console.warn(`Skipping replay chunk ${file.name}:`, error.message);
    }
  }

  allEvents.sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));

  const latest = await contestReplayRepo.fetchReplayByTimelineId(replay.timeline_id);

  return {
    timeline: latest || replay,
    events: allEvents,
    storage_bucket: REPLAY_STORAGE_BUCKET,
    chunks: files.map((file) => file.name),
  };
}

export async function getContestReplayByUserProblem(contestId, contestProblemId, replayOwnerClerkUserId) {
  if (!contestId || !contestProblemId || !replayOwnerClerkUserId) {
    throw buildHttpError('contestId, contestProblemId and replayOwnerClerkUserId are required', 400);
  }

  const replay = await contestReplayRepo.fetchReplayByUserProblem(
    contestId,
    contestProblemId,
    replayOwnerClerkUserId
  );

  if (!replay) {
    throw buildHttpError('Replay timeline not found', 404);
  }

  await flushTimelineBuffer(replay.timeline_id);
  return buildReplayPayloadFromRow(replay);
}

export async function getContestReplayTimeline(contestId, timelineId, clerkUserId) {
  if (!contestId || !timelineId) {
    throw buildHttpError('contestId and timelineId are required', 400);
  }

  const replay = await contestReplayRepo.fetchReplayByTimelineId(timelineId);
  if (!replay) {
    throw buildHttpError('Replay timeline not found', 404);
  }

  if (replay.contest_id !== contestId) {
    throw buildHttpError('Replay timeline does not belong to this contest', 400);
  }

  if (!clerkUserId) {
    throw buildHttpError('Unauthorized', 401);
  }

  await flushTimelineBuffer(timelineId);
  return buildReplayPayloadFromRow(replay);
}

async function flushReplayBuffersTick() {
  const now = Date.now();
  const flushTargets = [];

  for (const [timelineId, buffer] of replayBuffers.entries()) {
    const pendingCount = buffer.eventsBySeq.size;
    if (pendingCount === 0) continue;

    const staleMs = now - buffer.updatedAt;
    if (pendingCount >= REPLAY_FLUSH_EVENT_THRESHOLD || staleMs >= REPLAY_FLUSH_INTERVAL_MS) {
      flushTargets.push(timelineId);
    }
  }

  await Promise.all(
    flushTargets.map(async (timelineId) => {
      try {
        await flushTimelineBuffer(timelineId);
      } catch (error) {
        console.error(`Replay flush failed for timeline ${timelineId}:`, error.message);
      }
    })
  );
}

export function startContestReplayWorker() {
  if (replayFlushTimer) {
    return;
  }

  replayFlushTimer = setInterval(() => {
    flushReplayBuffersTick().catch((error) => {
      console.error('Replay flush worker tick failed:', error.message);
    });
  }, REPLAY_FLUSH_INTERVAL_MS);

  if (typeof replayFlushTimer.unref === 'function') {
    replayFlushTimer.unref();
  }
}

export async function stopContestReplayWorker() {
  if (replayFlushTimer) {
    clearInterval(replayFlushTimer);
    replayFlushTimer = null;
  }

  const timelineIds = Array.from(replayBuffers.keys());
  await Promise.all(
    timelineIds.map(async (timelineId) => {
      try {
        await flushTimelineBuffer(timelineId);
      } catch (error) {
        console.error(`Replay final flush failed for timeline ${timelineId}:`, error.message);
      }
    })
  );
}
