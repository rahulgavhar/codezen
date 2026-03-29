import { supabase } from "../config/supabase.client.js";

// Store active interview rooms and participants
const activeRooms = new Map();

function isPastEndTime(interview) {
  if (!interview?.end_time) return false;
  return Date.now() > new Date(interview.end_time).getTime();
}

function shouldBeCompleted(interview) {
  if (!interview) return false;
  if (interview.status !== "Scheduled" && interview.status !== "Ongoing") return false;
  return isPastEndTime(interview);
}

async function markCompletedIfPastEnd(interviewId) {
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, status, end_time")
    .eq("id", interviewId)
    .single();

  if (shouldBeCompleted(interview)) {
    await supabase
      .from("interviews")
      .update({ status: "Completed" })
      .eq("id", interviewId);
  }
}

export function setupInterviewSignaling(io) {
  io.on("connection", (socket) => {
    console.log(`[WebRTC] User connected: ${socket.id}`);

    // Join interview room
    socket.on("join-interview", async (data, callback) => {
      const safeCallback = typeof callback === "function" ? callback : () => {};
      try {
        const { interviewId, clerkUserId, role } = data;

        if (!interviewId || !clerkUserId) {
          return safeCallback({
            success: false,
            error: "Missing interviewId or clerkUserId",
          });
        }

        // Verify interview exists and user is participant
        const { data: interview, error } = await supabase
          .from("interviews")
          .select("id, candidate_clerk_id, interviewer_clerk_id, status, start_time, end_time, candidate_connected, interviewer_connected")
          .eq("id", interviewId)
          .single();

        if (error || !interview) {
          return safeCallback({ success: false, error: "Interview not found" });
        }

        // Verify user is a participant
        const isCandidate = interview.candidate_clerk_id === clerkUserId;
        const isInterviewer = interview.interviewer_clerk_id === clerkUserId;

        if (!isCandidate && !isInterviewer) {
          return safeCallback({
            success: false,
            error: "User is not a participant in this interview",
          });
        }

        // Completed/cancelled interviews cannot be joined again.
        if (interview.status === "Completed" || interview.status === "Cancelled") {
          return safeCallback({
            success: false,
            error: "Interview room is closed",
          });
        }

        // Check if time has passed and no one is currently connected
        const roomId = `interview_${interviewId}`;
        const isPastEndTime = Date.now() > new Date(interview.end_time).getTime();
        const anyoneConnected = interview.candidate_connected || interview.interviewer_connected;

        if (isPastEndTime && !anyoneConnected) {
          return safeCallback({
            success: false,
            error: "Interview has ended. New participants cannot join an empty room.",
          });
        }

        // If room exists with participants, or time hasn't passed, allow join
        socket.join(roomId);

        // Initialize room if first participant
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, {
            interviewId,
            participants: {},
            createdAt: Date.now(),
          });
        }

        const room = activeRooms.get(roomId);
        const userRole = isInterviewer ? "interviewer" : "candidate";

        // Store participant info
        room.participants[socket.id] = {
          clerkUserId,
          role: userRole,
          joinedAt: Date.now(),
        };

        // Mark participant as connected in database
        const updateData = userRole === "interviewer" 
          ? { interviewer_connected: true }
          : { candidate_connected: true };
        
        await supabase
          .from("interviews")
          .update(updateData)
          .eq("id", interviewId);

        // Update interview status to "Ongoing" only while still active.
        if (interview.status === "Scheduled") {
          await supabase
            .from("interviews")
            .update({ status: "Ongoing" })
            .eq("id", interviewId);
        }

        // Log event
        await supabase.from("interview_events").insert({
          interview_id: interviewId,
          clerk_user_id: clerkUserId,
          event_type: "joined_room",
          metadata: {
            socket_id: socket.id,
            user_role: userRole,
          },
        });

        // Get other participants
        const otherParticipants = Object.entries(room.participants)
          .filter(([id]) => id !== socket.id)
          .map(([id, participant]) => ({
            socketId: id,
            clerkUserId: participant.clerkUserId,
            role: participant.role,
          }));

        // Notify existing participants in room (exclude the joining socket)
        socket.to(roomId).emit("participant-joined", {
          socketId: socket.id,
          clerkUserId,
          role: userRole,
        });

        safeCallback({
          success: true,
          roomId,
          otherParticipants,
          interviewStatus: interview.status,
        });
      } catch (error) {
        console.error("[WebRTC] Error joining interview:", error);
        safeCallback({ success: false, error: error.message });
      }
    });

    // Handle WebRTC offer
    socket.on("offer", (data) => {
      const { to, offer, interviewId } = data;
      // Forward offer to specific participant
      io.to(to).emit("offer", {
        from: socket.id,
        offer,
        interviewId,
      });
    });

    // Handle WebRTC answer
    socket.on("answer", (data) => {
      const { to, answer, interviewId } = data;
      // Forward answer to specific participant
      io.to(to).emit("answer", {
        from: socket.id,
        answer,
        interviewId,
      });
    });

    // Handle ICE candidates
    socket.on("ice-candidate", (data) => {
      const { to, candidate, interviewId } = data;
      // Forward ICE candidate to specific participant
      io.to(to).emit("ice-candidate", {
        from: socket.id,
        candidate,
        interviewId,
      });
    });

    // Handle mute/unmute
    socket.on("toggle-audio", (data) => {
      const { interviewId, enabled } = data;
      const roomId = `interview_${interviewId}`;
      socket.to(roomId).emit("participant-audio-toggled", {
        from: socket.id,
        enabled,
      });
    });

    // Handle camera on/off
    socket.on("toggle-camera", (data) => {
      const { interviewId, enabled } = data;
      const roomId = `interview_${interviewId}`;
      socket.to(roomId).emit("participant-camera-toggled", {
        from: socket.id,
        enabled,
      });
    });

    // Handle screen share started
    socket.on("screen-share-started", (data) => {
      const { interviewId, clerkUserId } = data;
      const roomId = `interview_${interviewId}`;
      socket.to(roomId).emit("participant-screen-sharing", {
        from: socket.id,
        clerkUserId,
        sharing: true,
      });
      console.log(`[WebRTC] ${clerkUserId} started screen sharing in interview ${interviewId}`);
    });

    // Handle screen share stopped
    socket.on("screen-share-stopped", (data) => {
      const { interviewId, clerkUserId } = data;
      const roomId = `interview_${interviewId}`;
      socket.to(roomId).emit("participant-screen-sharing", {
        from: socket.id,
        clerkUserId,
        sharing: false,
      });
      console.log(`[WebRTC] ${clerkUserId} stopped screen sharing in interview ${interviewId}`);
    });

    // End interview call
    socket.on("end-call", async (data, callback) => {
      const safeCallback = typeof callback === "function" ? callback : () => {};
      try {
        const { interviewId, clerkUserId } = data;
        const roomId = `interview_${interviewId}`;

        // Log event
        await supabase.from("interview_events").insert({
          interview_id: interviewId,
          clerk_user_id: clerkUserId,
          event_type: "left_room",
          metadata: {
            socket_id: socket.id,
          },
        });

        // Remove participant from room and get their role
        const room = activeRooms.get(roomId);
        let userRole = null;
        if (room) {
          userRole = room.participants[socket.id]?.role;
          delete room.participants[socket.id];

          // Clean up empty rooms (don't auto-complete based on time anymore)
          if (Object.keys(room.participants).length === 0) {
            activeRooms.delete(roomId);
          }
        }

        // Mark participant as disconnected in database
        if (userRole) {
          const updateData = userRole === "interviewer" 
            ? { interviewer_connected: false }
            : { candidate_connected: false };
          
          await supabase
            .from("interviews")
            .update(updateData)
            .eq("id", interviewId);
        }

        // Notify others that user left
        io.to(roomId).emit("participant-left", {
          socketId: socket.id,
        });

        safeCallback({ success: true });
      } catch (error) {
        console.error("[WebRTC] Error ending call:", error);
        safeCallback({ success: false, error: error.message });
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`[WebRTC] User disconnected: ${socket.id}`);

      // Find which room this socket belonged to and clean up
      for (const [roomId, room] of activeRooms.entries()) {
        if (room.participants[socket.id]) {
          const participant = room.participants[socket.id];

          // Log event
          try {
            await supabase.from("interview_events").insert({
              interview_id: room.interviewId,
              clerk_user_id: participant.clerkUserId,
              event_type: "disconnected",
              metadata: {
                socket_id: socket.id,
              },
            });
          } catch (err) {
            console.error("[WebRTC] Error logging disconnect event:", err);
          }

          // Mark participant as disconnected in database
          try {
            const updateData = participant.role === "interviewer" 
              ? { interviewer_connected: false }
              : { candidate_connected: false };
            
            await supabase
              .from("interviews")
              .update(updateData)
              .eq("id", room.interviewId);
          } catch (err) {
            console.error("[WebRTC] Error updating participant connected status:", err);
          }

          delete room.participants[socket.id];

          // Clean up empty rooms (don't auto-complete based on time anymore)
          if (Object.keys(room.participants).length === 0) {
            activeRooms.delete(roomId);
          }

          // Notify remaining participants
          io.to(roomId).emit("participant-left", {
            socketId: socket.id,
          });
        }
      }
    });
  });
}

export function getActiveRooms() {
  return Object.fromEntries(activeRooms);
}
