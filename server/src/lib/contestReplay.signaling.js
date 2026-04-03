import {
  appendContestReplayEvents,
  finalizeContestReplayTimeline,
  flushTimelineBuffer,
  initContestReplayTimeline,
} from '../services/contestReplay.service.js';

function safeAck(callback, payload) {
  if (typeof callback === 'function') {
    callback(payload);
  }
}

function asTrimmedString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

export function setupContestReplaySignaling(io) {
  io.on('connection', (socket) => {
    socket.on('replay:init', async (data, callback) => {
      const contestId = asTrimmedString(data?.contestId);
      const contestProblemId = asTrimmedString(data?.contestProblemId);
      const clerkUserId = asTrimmedString(data?.clerkUserId);

      if (!contestId || !contestProblemId || !clerkUserId) {
        return safeAck(callback, {
          success: false,
          error: 'contestId, contestProblemId and clerkUserId are required',
        });
      }

      try {
        const replay = await initContestReplayTimeline(contestId, contestProblemId, clerkUserId);
        const roomId = `contest_replay_${replay.timeline_id}`;

        socket.join(roomId);

        return safeAck(callback, {
          success: true,
          replay,
        });
      } catch (error) {
        return safeAck(callback, {
          success: false,
          error: error.message || 'Failed to initialize replay timeline',
          statusCode: error.statusCode || 500,
        });
      }
    });

    socket.on('replay:events', async (data, callback) => {
      const contestId = asTrimmedString(data?.contestId);
      const timelineId = asTrimmedString(data?.timelineId);
      const clerkUserId = asTrimmedString(data?.clerkUserId);
      const events = Array.isArray(data?.events) ? data.events : [];

      if (!contestId || !timelineId || !clerkUserId) {
        return safeAck(callback, {
          success: false,
          error: 'contestId, timelineId and clerkUserId are required',
        });
      }

      if (events.length === 0) {
        return safeAck(callback, {
          success: true,
          accepted_events: 0,
          duplicate_events: 0,
          pending_events: 0,
        });
      }

      try {
        const result = await appendContestReplayEvents(
          contestId,
          timelineId,
          clerkUserId,
          { events }
        );

        return safeAck(callback, {
          success: true,
          ...result,
        });
      } catch (error) {
        return safeAck(callback, {
          success: false,
          error: error.message || 'Failed to ingest replay events',
          statusCode: error.statusCode || 500,
        });
      }
    });

    socket.on('replay:flush', async (data, callback) => {
      const timelineId = asTrimmedString(data?.timelineId);

      if (!timelineId) {
        return safeAck(callback, {
          success: false,
          error: 'timelineId is required',
        });
      }

      try {
        const flushed = await flushTimelineBuffer(timelineId);
        return safeAck(callback, {
          success: true,
          ...flushed,
        });
      } catch (error) {
        return safeAck(callback, {
          success: false,
          error: error.message || 'Failed to flush replay buffer',
          statusCode: error.statusCode || 500,
        });
      }
    });

    socket.on('replay:finalize', async (data, callback) => {
      const contestId = asTrimmedString(data?.contestId);
      const timelineId = asTrimmedString(data?.timelineId);
      const clerkUserId = asTrimmedString(data?.clerkUserId);
      const reason = asTrimmedString(data?.reason || '');

      if (!contestId || !timelineId || !clerkUserId) {
        return safeAck(callback, {
          success: false,
          error: 'contestId, timelineId and clerkUserId are required',
        });
      }

      try {
        const replay = await finalizeContestReplayTimeline(contestId, timelineId, clerkUserId, {
          reason,
        });

        return safeAck(callback, {
          success: true,
          replay,
        });
      } catch (error) {
        return safeAck(callback, {
          success: false,
          error: error.message || 'Failed to finalize replay timeline',
          statusCode: error.statusCode || 500,
        });
      }
    });
  });
}
