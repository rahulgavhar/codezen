import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import axiosInstance from "../lib/axios";
import CodeEditor from "./CodeEditor";
import SharedScreen from "./SharedScreen";
import { LuCodeXml, LuScreenShareOff } from "react-icons/lu";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { FaVideo, FaVideoSlash } from "react-icons/fa6";
import { MdOutlinePersonalVideo } from "react-icons/md";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const getSocketServerUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return window.location.origin;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return window.location.origin;
  }
};



const Interview = () => {
  const navigate = useNavigate();
  const { interviewId: interviewIdParam, id } = useParams();
  const interviewId = interviewIdParam || id;
  const profile = useSelector((state) => state.user?.profile);

  const [muted, setMuted] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showRemoteScreen, setShowRemoteScreen] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [remoteParticipantScreenSharing, setRemoteParticipantScreenSharing] = useState({});
  const [interviewerSignal, setInterviewerSignal] = useState(0);
  const [mySignal, setMySignal] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [remoteParticipants, setRemoteParticipants] = useState({});
  const [permissionError, setPermissionError] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [participantCameraStatus, setParticipantCameraStatus] = useState({});
  const [problemData, setProblemData] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteScreenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const socketRef = useRef(null);
  const remoteScreenSharingRef = useRef({});  // Track screen sharing status reliably

  // Keep the left panel (remote video) reliably bound even if ontrack fires
  // before the video element is mounted in the DOM.
  useEffect(() => {
    const firstRemoteStream = Object.values(remoteParticipants)[0];
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = firstRemoteStream || null;
      if (firstRemoteStream) {
        remoteVideoRef.current.play?.().catch((err) => {
          console.warn("[WebRTC] Remote video autoplay blocked:", err?.message || err);
        });
      }
    }
  }, [remoteParticipants]);

  // Keep the screen video element in sync with the stream state
  // This ensures that when the overlay is reopened, the stream is properly connected
  useEffect(() => {
    if (remoteScreenVideoRef.current && remoteScreenStream) {
      console.log("[Interview] Syncing screen video to stream");
      remoteScreenVideoRef.current.srcObject = remoteScreenStream;
      
      // Try to play when overlay becomes visible
      if (showRemoteScreen) {
        console.log("[Interview] Overlay opened, attempting autoplay");
        remoteScreenVideoRef.current.play()
          .catch((err) => console.warn("[Interview] Screen autoplay failed:", err?.message || err));
      }
    }
  }, [remoteScreenStream, showRemoteScreen]);

  // Timer: Update remaining time every second
  useEffect(() => {
    if (!interviewData?.end_time) return;

    const updateTimer = () => {
      const now = Date.now();
      const endTime = new Date(interviewData.end_time).getTime();
      const remaining = Math.floor((endTime - now) / 1000);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [interviewData]);

  // Initialize Socket.IO and WebRTC
  useEffect(() => {
    if (!interviewId || !profile?.clerk_user_id) return;
    let isDisposed = false;

    const initializeConnection = async () => {
      try {
        console.log("[Interview] Initializing for role:", profile?.app_role);

        // Verify interview access and active status before initializing media.
        try {
          const interviewRes = await axiosInstance.get(`/api/interviews/${interviewId}`);
          const interview = interviewRes.data;
          const isParticipant =
            interview.candidate_clerk_id === profile.clerk_user_id ||
            interview.interviewer_clerk_id === profile.clerk_user_id;
          const endedByStatus = interview.status === "Completed" || interview.status === "Cancelled";

          if (!isParticipant) {
            setAccessError("You are not authorized to join this interview room.");
            setConnectionStatus("error");
            return;
          }

          // Store interview data for timer (allows joining even after end_time)
          setInterviewData({
            start_time: interview.start_time,
            end_time: interview.end_time,
            interviewer_company_name: interview.interviewer_company_name || null,
            room_id: interview.room_id || null,
          });

          // Fetch interview problem data for the code editor
          try {
            console.log("[Interview] Fetching problem data for interview:", interviewId);
            const problemRes = await axiosInstance.get(`/api/interview-problems/${interviewId}`);
            console.log("[Interview] Problem data fetched:", problemRes.data);
            if (problemRes.data) {
              setProblemData(problemRes.data);
              console.log("[Interview] Problem data set successfully");
            } else {
              console.warn("[Interview] Problem data response is empty");
            }
          } catch (problemErr) {
            console.error("[Interview] Error fetching problem data:", {
              status: problemErr?.response?.status,
              message: problemErr?.message,
              data: problemErr?.response?.data,
            });
            // Don't block interview if problem data isn't available
          }

          // Only block if status is explicitly Completed/Cancelled
          if (endedByStatus) {
            setAccessError("This interview has ended and cannot be joined.");
            setConnectionStatus("error");
            return;
          }
        } catch (accessErr) {
          if (accessErr?.response?.status === 403) {
            setAccessError("You are not authorized to join this interview room.");
          } else if (accessErr?.response?.status === 404) {
            setAccessError("Interview not found");
          } else {
            setAccessError("Unable to verify room access right now. Please try again.");
          }
          setConnectionStatus("error");
          return;
        }
        
        // Connect to Socket.IO
        socketRef.current = io(getSocketServerUrl(), {
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        // Get local media stream - no audio initially to avoid microphone 'in use' indicator
        console.log("[Interview] Creating empty media stream...");
        let stream;
        try {
          // Create empty stream first (no audio, no video)
          // Audio will be requested only when user clicks mic button
          // This prevents the microphone 'in use' indicator from showing unnecessarily
          stream = new MediaStream();

          // In React StrictMode dev, effect can run twice. If this invocation was
          // already cleaned up, nothing to clean up from empty stream.
          if (isDisposed) {
            return;
          }

          console.log("[Interview] Empty media stream created");
        } catch (mediaErr) {
          console.error("[Interview] Stream creation error:", mediaErr.message);
          setPermissionError(`Media error: ${mediaErr.message}`);
          throw mediaErr;
        }

        localStreamRef.current = stream;
        cameraTrackRef.current = null; // No camera track initially
        
        setPermissionError(null);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log("[Interview] Video element updated with stream");
        }

        // Simulate signal strength
        setMySignal(4);
        setInterviewerSignal(4);

        // Listen for socket events
        socketRef.current.on("connect", () => {
          console.log("[WebRTC] Socket connected");
          
          // Determine role based on profile
          const userRole = profile?.app_role === "staff" ? "interviewer" : "candidate";
          console.log("[Interview] Joining room with role:", userRole);
          
          // Join the interview room
          socketRef.current.emit(
            "join-interview",
            {
              interviewId,
              clerkUserId: profile.clerk_user_id,
              role: userRole,
            },
            (response) => {
              if (response.success) {
                setConnectionStatus("connected");
                console.log("[WebRTC] Joined interview room:", response.roomId);

                // Create peer connections for other participants
                response.otherParticipants.forEach((participant) => {
                  createPeerConnection(participant.socketId, participant.clerkUserId, false);
                });
              } else {
                console.error("[WebRTC] Failed to join room:", response.error);
                setAccessError(response.error || "Failed to join interview room");
                setConnectionStatus("error");
                if (localStreamRef.current) {
                  localStreamRef.current.getTracks().forEach((track) => track.stop());
                  localStreamRef.current = null;
                }
                socketRef.current.disconnect();
              }
            }
          );
        });

        socketRef.current.on("participant-joined", (data) => {
          console.log("[WebRTC] Participant joined:", data);
          if (data.socketId === socketRef.current?.id) return;
          createPeerConnection(data.socketId, data.clerkUserId, true);
        });

        socketRef.current.on("offer", async (data) => {
          try {
            let peerConnection = peerConnectionsRef.current[data.from];
            if (!peerConnection) {
              await createPeerConnection(data.from, null, false);
              peerConnection = peerConnectionsRef.current[data.from];
            }

            if (peerConnection) {
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.offer)
              );
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);

              const queuedCandidates = pendingIceCandidatesRef.current[data.from] || [];
              for (const candidate of queuedCandidates) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              }
              delete pendingIceCandidatesRef.current[data.from];

              socketRef.current.emit("answer", {
                to: data.from,
                answer,
                interviewId,
              });
            }
          } catch (error) {
            console.error("[WebRTC] Error handling offer:", error);
          }
        });

        socketRef.current.on("answer", async (data) => {
          try {
            const peerConnection = peerConnectionsRef.current[data.from];
            if (peerConnection) {
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );
            }
          } catch (error) {
            console.error("[WebRTC] Error handling answer:", error);
          }
        });

        socketRef.current.on("ice-candidate", async (data) => {
          try {
            const peerConnection = peerConnectionsRef.current[data.from];
            if (peerConnection && data.candidate) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.candidate) {
              if (!pendingIceCandidatesRef.current[data.from]) {
                pendingIceCandidatesRef.current[data.from] = [];
              }
              pendingIceCandidatesRef.current[data.from].push(data.candidate);
            }
          } catch (error) {
            console.error("[WebRTC] Error adding ICE candidate:", error);
          }
        });

        socketRef.current.on("participant-left", (data) => {
          console.log("[WebRTC] Participant left:", data.socketId);
          closePeerConnection(data.socketId);
          delete pendingIceCandidatesRef.current[data.socketId];
          setRemoteParticipants((prev) => {
            const next = { ...prev };
            delete next[data.socketId];
            return next;
          });
          setParticipantProfiles((prev) => {
            const next = { ...prev };
            delete next[data.socketId];
            return next;
          });
          setParticipantCameraStatus((prev) => {
            const next = { ...prev };
            delete next[data.socketId];
            return next;
          });
        });

        socketRef.current.on("participant-screen-sharing", (data) => {
          console.log("[WebRTC] Screen sharing status event:", data);
          console.log("[WebRTC] Event data keys:", Object.keys(data));
          
          // Try multiple ways to get socketId
          const participantSocketId = data.socketId || data.from || Object.keys(peerConnectionsRef.current)[0];
          console.log("[WebRTC] Resolved socketId:", participantSocketId);
          
          if (participantSocketId) {
            // Update ref synchronously for immediate use in ontrack
            remoteScreenSharingRef.current[participantSocketId] = data.sharing;
            console.log("[WebRTC] Updated remoteScreenSharingRef:", remoteScreenSharingRef.current);
            
            setRemoteParticipantScreenSharing((prev) => ({
              ...prev,
              [participantSocketId]: data.sharing,
            }));
          }
          
          if (data.sharing) {
            console.log("[Interview] Remote participant started screen sharing");
            setShowRemoteScreen(true);
          } else {
            console.log("[Interview] Remote participant stopped screen sharing");
            setShowRemoteScreen(false);
            setRemoteScreenStream(null);
            if (remoteScreenVideoRef.current) {
              remoteScreenVideoRef.current.srcObject = null;
            }
          }
        });

        socketRef.current.on("participant-camera-toggled", (data) => {
          console.log("[WebRTC] Participant camera toggled:", data.from, data.enabled);
          setParticipantCameraStatus((prev) => ({
            ...prev,
            [data.from]: data.enabled,
          }));
        });

        socketRef.current.on("disconnect", () => {
          console.log("[WebRTC] Socket disconnected");
          setConnectionStatus("disconnected");
        });

        // Connect only after media and listeners are ready so we never miss
        // the "connect" event and room join handshake.
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      } catch (error) {
        console.error("[WebRTC] Error initializing connection:", error);
        setConnectionStatus("error");
      }
    };

    initializeConnection();

    return () => {
      isDisposed = true;

      // Stop screen sharing if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Cleanup
      if (socketRef.current) {
        socketRef.current.emit("end-call", {
          interviewId,
          clerkUserId: profile.clerk_user_id,
        });
        socketRef.current.disconnect();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    };
  }, [interviewId, profile?.clerk_user_id]);

  const fetchParticipantProfile = async (clerkUserId, socketId) => {
    try {
      const response = await axiosInstance.get(`/api/users/profile/${clerkUserId}`);
      if (response.data) {
        setParticipantProfiles((prev) => ({
          ...prev,
          [socketId]: response.data,
        }));
      }
    } catch (error) {
      console.error("[Interview] Error fetching participant profile:", error);
    }
  };

  const createPeerConnection = async (socketId, clerkUserId, initiator) => {
    try {
      if (!socketId || socketId === socketRef.current?.id) return;
      if (peerConnectionsRef.current[socketId]) return peerConnectionsRef.current[socketId];

      // Initialize camera status as false (off) - matches actual camera state on join
      setParticipantCameraStatus((prev) => ({
        ...prev,
        [socketId]: false,
      }));

      // Set placeholder profile immediately so avatar/initials display right away
      // This allows the fallback initials avatar to render while profile data is being fetched
      if (clerkUserId) {
        setParticipantProfiles((prev) => ({
          ...prev,
          [socketId]: {
            clerk_user_id: clerkUserId,
            display_name: "Participant",
            avatar_url: null,
          },
        }));

        // Fetch actual profile data in background to update with real avatar/name
        fetchParticipantProfile(clerkUserId, socketId);
      }

      // Add placeholder to remoteParticipants so video panel renders immediately
      // This will show avatar while waiting for actual video stream
      setRemoteParticipants((prev) => ({
        ...prev,
        [socketId]: null, // Placeholder - actual stream will replace this ontrack
      }));

      const peerConnection = new RTCPeerConnection({
        iceServers: STUN_SERVERS,
      });

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind, "socketId:", socketId);
        console.log("[WebRTC] Track label:", event.track.label);
        console.log("[WebRTC] remoteScreenSharingRef state:", remoteScreenSharingRef.current);
        
        // Check both the ref AND track properties for screen detection
        let isScreenShare = remoteScreenSharingRef.current[socketId];
        console.log("[WebRTC] isScreenShare from ref:", isScreenShare);
        
        // Additional detection: check track label for "screen" or "display"
        if (!isScreenShare && event.track.kind === "video") {
          const label = event.track.label?.toLowerCase() || "";
          if (label.includes("screen") || label.includes("display") || label.includes("chrome") || label.includes("firefox")) {
            console.log("[WebRTC] Detected screen share from track label:", label);
            isScreenShare = true;
          }
        }
        
        // Fallback: Try video dimensions if available after a brief delay
        if (!isScreenShare && event.track.kind === "video") {
          // Screen shares often have larger dimensions; try to detect
          const settings = event.track.getSettings?.();
          if (settings?.width && settings?.height) {
            console.log("[WebRTC] Video dimensions - Width:", settings.width, "Height:", settings.height);
            // Most screens are 1920x1080 or larger, most cameras are 640x480 to 1280x720
            isScreenShare = settings.width > 1000;
            if (isScreenShare) {
              console.log("[WebRTC] Detected screen share by dimensions");
            }
          }
        }
        
        if (isScreenShare && event.track.kind === "video") {
          // Route screen share to screen video element
          console.log("[WebRTC] ✓✓✓ ROUTING TO SCREEN SHARE DISPLAY ✓✓✓");
          setShowRemoteScreen(true);
          setRemoteScreenStream(event.streams[0]);
          if (remoteScreenVideoRef.current && event.streams[0]) {
            remoteScreenVideoRef.current.srcObject = event.streams[0];
            remoteScreenVideoRef.current.play?.().catch((err) => {
              console.warn("[WebRTC] Remote screen play failed:", err?.message || err);
            });
          }
        } else {
          // Route camera to regular remote video
          console.log("[WebRTC] ROUTING TO CAMERA DISPLAY");
          setRemoteParticipants((prev) => ({
            ...prev,
            [socketId]: event.streams[0],
          }));

          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.play?.().catch((err) => {
              console.warn("[WebRTC] Remote video play failed:", err?.message || err);
            });
          }
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", {
            to: socketId,
            candidate: event.candidate,
            interviewId,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state:", peerConnection.connectionState);
        if (peerConnection.connectionState === "failed") {
          peerConnection.close();
          closePeerConnection(socketId);
        }
      };

      peerConnectionsRef.current[socketId] = peerConnection;

      // If initiator, create and send offer
      if (initiator) {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection.setLocalDescription(offer);
        socketRef.current.emit("offer", {
          to: socketId,
          offer,
          interviewId,
        });
      }

      return peerConnection;
    } catch (error) {
      console.error("[WebRTC] Error creating peer connection:", error);
      return null;
    }
  };

  const closePeerConnection = (socketId) => {
    const peerConnection = peerConnectionsRef.current[socketId];
    if (peerConnection) {
      peerConnection.close();
      delete peerConnectionsRef.current[socketId];
    }
  };

  const stopAndRemoveCameraTracks = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.stop();
      localStreamRef.current.removeTrack(track);
    });
    cameraTrackRef.current = null;
  };

  const replaceOutgoingVideoTrack = async (nextTrack) => {
    const peers = Object.values(peerConnectionsRef.current);
    await Promise.all(
      peers.map(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        
        if (nextTrack) {
          // Adding or replacing with a real track
          if (sender) {
            // Sender exists, replace the track
            await sender.replaceTrack(nextTrack);
          } else {
            // No sender yet, add the track for the first time
            pc.addTrack(nextTrack, localStreamRef.current);
            
            // Trigger renegotiation by creating a new offer
            try {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);
              
              // Find the socket ID for this peer connection
              const socketId = Object.entries(peerConnectionsRef.current).find(
                ([_, p]) => p === pc
              )?.[0];
              
              if (socketId && socketRef.current) {
                socketRef.current.emit("offer", {
                  to: socketId,
                  offer,
                  interviewId,
                });
                console.log("[WebRTC] Renegotiation offer sent for video track");
              }
            } catch (error) {
              console.error("[WebRTC] Error creating renegotiation offer for video:", error);
            }
          }
        } else if (sender) {
          // Removing track: remove the sender entirely instead of replacing with null
          pc.removeTrack(sender);
          
          // Trigger renegotiation to inform remote peer
          try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            
            // Find the socket ID for this peer connection
            const socketId = Object.entries(peerConnectionsRef.current).find(
              ([_, p]) => p === pc
            )?.[0];
            
            if (socketId && socketRef.current) {
              socketRef.current.emit("offer", {
                to: socketId,
                offer,
                interviewId,
              });
              console.log("[WebRTC] Renegotiation offer sent to remove video track");
            }
          } catch (error) {
            console.error("[WebRTC] Error creating renegotiation offer to remove video:", error);
          }
        }
      })
    );
  };

  const replaceOutgoingAudioTrack = async (nextTrack) => {
    const peers = Object.values(peerConnectionsRef.current);
    await Promise.all(
      peers.map(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
        
        if (nextTrack) {
          // Adding or replacing with a real track
          if (sender) {
            // Sender exists, replace the track
            await sender.replaceTrack(nextTrack);
          } else {
            // No sender yet, add the track for the first time
            pc.addTrack(nextTrack, localStreamRef.current);
            
            // Trigger renegotiation by creating a new offer
            try {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);
              
              // Find the socket ID for this peer connection
              const socketId = Object.entries(peerConnectionsRef.current).find(
                ([_, p]) => p === pc
              )?.[0];
              
              if (socketId && socketRef.current) {
                socketRef.current.emit("offer", {
                  to: socketId,
                  offer,
                  interviewId,
                });
                console.log("[WebRTC] Renegotiation offer sent for audio track");
              }
            } catch (error) {
              console.error("[WebRTC] Error creating renegotiation offer for audio:", error);
            }
          }
        } else if (sender) {
          // Removing track: remove the sender entirely instead of replacing with null
          pc.removeTrack(sender);
          
          // Trigger renegotiation to inform remote peer
          try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            
            // Find the socket ID for this peer connection
            const socketId = Object.entries(peerConnectionsRef.current).find(
              ([_, p]) => p === pc
            )?.[0];
            
            if (socketId && socketRef.current) {
              socketRef.current.emit("offer", {
                to: socketId,
                offer,
                interviewId,
              });
              console.log("[WebRTC] Renegotiation offer sent to remove audio track");
            }
          } catch (error) {
            console.error("[WebRTC] Error creating renegotiation offer to remove audio:", error);
          }
        }
      })
    );
  };

  const handleToggleMic = async () => {
    const nextMuted = !muted;
    
    if (nextMuted) {
      // Turning OFF: stop and remove audio tracks
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
      setMuted(true);
      socketRef.current.emit("toggle-audio", {
        interviewId,
        enabled: false,
      });
    } else {
      // Turning ON: request audio and add to stream and peer connections
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        
        const audioTrack = audioStream.getAudioTracks()[0];
        
        if (localStreamRef.current && audioTrack) {
          // Add audio track to local stream
          localStreamRef.current.addTrack(audioTrack);
          
          // Add audio track to all peer connections
          await replaceOutgoingAudioTrack(audioTrack);
        }
        
        setMuted(false);
        socketRef.current.emit("toggle-audio", {
          interviewId,
          enabled: true,
        });
      } catch (error) {
        console.error("[Interview] Error enabling microphone:", error);
        if (error.name === "NotAllowedError") {
          setPermissionError("Microphone permission denied. Please enable it in browser settings.");
        } else if (error.name === "NotFoundError") {
          setPermissionError("No microphone found on this device.");
        } else {
          setPermissionError(`Microphone error: ${error.message}`);
        }
      }
    }
  };

  const handleToggleCamera = () => {
    if (!localStreamRef.current) return;

    const run = async () => {
      const nextCameraOn = !cameraOn;

      if (!nextCameraOn) {
        // Turning camera OFF: stop real camera tracks so hardware light turns off.
        stopAndRemoveCameraTracks();

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenSharing ? screenStreamRef.current : null;
        }

        if (!screenSharing) {
          await replaceOutgoingVideoTrack(null);
        }
      } else {
        // Turning camera ON: request a fresh camera track and publish it.
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const camTrack = camStream.getVideoTracks()[0];

        stopAndRemoveCameraTracks();
        localStreamRef.current.addTrack(camTrack);
        cameraTrackRef.current = camTrack;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenSharing ? screenStreamRef.current : localStreamRef.current;
        }

        if (!screenSharing) {
          await replaceOutgoingVideoTrack(camTrack);
        }
      }

      setCameraOn(nextCameraOn);

      socketRef.current.emit("toggle-camera", {
        interviewId,
        enabled: nextCameraOn,
      });
    };

    run().catch((error) => {
      console.error("[Interview] Error toggling camera:", error);
      setPermissionError(`Camera error: ${error.message}`);
    });
  };

  const handleStartScreenShare = async () => {
    try {
      console.log("[Interview] Requesting screen share...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      // Notify that screen sharing started
      socketRef.current.emit("screen-share-started", {
        interviewId,
        clerkUserId: profile.clerk_user_id,
      });

      setScreenSharing(true);
      setScreenOn(true);

      // Replace video track in all peer connections
      await replaceOutgoingVideoTrack(videoTrack);

      // Handle when user stops screen share from browser UI
      videoTrack.onended = async () => {
        console.log("[Interview] Screen share stopped by user");
        await handleStopScreenShare();
      };

      console.log("[Interview] Screen sharing started");
    } catch (error) {
      if (error.name === "NotAllowedError") {
        console.log("[Interview] Screen share cancelled by user");
      } else {
        console.error("[Interview] Screen share error:", error);
        alert("Failed to share screen: " + error.message);
      }
      setScreenOn(false);
    }
  };

  const handleStopScreenShare = async () => {
    try {
      console.log("[Interview] Stopping screen share...");

      // Stop all screen tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      // Replace back with camera video only if camera is ON.
      const nextVideoTrack = cameraOn ? cameraTrackRef.current : null;

      await replaceOutgoingVideoTrack(nextVideoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraOn ? localStreamRef.current : null;
      }

      // Notify that screen sharing stopped
      socketRef.current.emit("screen-share-stopped", {
        interviewId,
        clerkUserId: profile.clerk_user_id,
      });

      setScreenSharing(false);
      setScreenOn(false);
      console.log("[Interview] Screen sharing stopped");
    } catch (error) {
      console.error("[Interview] Error stopping screen share:", error);
    }
  };

  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      await handleStopScreenShare();
    } else {
      await handleStartScreenShare();
    }
  };

  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit("end-call", {
        interviewId,
        clerkUserId: profile.clerk_user_id,
      });
      navigate("/");
    }
  };

  // Format time remaining to display
  const formatTime = (seconds) => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    const formatted = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  if (accessError) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_30%)]"
          aria-hidden
        />

        <div className="relative z-10 max-w-md mx-auto px-6 text-center">
          <div className="bg-slate-900/70 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-3 text-slate-100">Room Unavailable</h2>
            <p className="text-sm text-slate-300 mb-4">{accessError}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium text-sm"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show permission error UI if media access failed
  if (permissionError) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_30%)]"
          aria-hidden
        />
        
        <div className="relative z-10 max-w-md mx-auto px-6 text-center">
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-3 text-red-200">Permission Denied</h2>
            <p className="text-sm text-red-100 mb-4">{permissionError}</p>
            <div className="text-xs text-red-200/70 space-y-2">
              <p>📱 Enable camera & microphone for this site:</p>
              <p>1. Click the lock icon in the address bar</p>
              <p>2. Select \"Allow\" for camera and microphone</p>
              <p>3. Refresh the page</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm"
          >
            Reload Page
          </button>
          <button
            onClick={() => navigate("/")}
            className="ml-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      <div
        className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_30%)]"
        aria-hidden
      />

      <main className="relative z-10 flex min-h-screen flex-col">
        <section className="flex-1 flex flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-10">
          {/* Timer Display */}
          <div className="flex justify-center mb-2">
            <div
              className={`px-4 rounded-lg font-mono text-lg font-bold ${
                timeRemaining < 0
                  ? "bg-red-900/40 border border-red-500/60 text-red-300"
                  : timeRemaining < 300
                  ? "bg-yellow-900/40 border border-yellow-500/60 text-yellow-300"
                  : "bg-emerald-900/40 border border-emerald-500/60 text-emerald-300"
              }`}
            >
              {formatTime(timeRemaining)}
              {timeRemaining < 0 && <span className="ml-2 text-xs">OVERTIME</span>}
            </div>
          </div>

          {/* Interview Details Panel */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-6 rounded-lg border border-white/10 bg-slate-900/60 backdro-blur px-6 py-3 text-sm">
              {interviewData?.interviewer_company_name && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">🏢</span>
                  <span className="font-medium text-slate-200">
                    <span className="text-emerald-400">@{interviewData.interviewer_company_name}</span>
                  </span>
                </div>
              )}
              {interviewData?.room_id && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">🔑</span>
                  <span className="font-mono text-xs text-slate-300">
                    {interviewData.room_id.substring(0, 16)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 sm:gap-6 md:flex-row">
            {/* Interviewer Video */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-slate-900/40">
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(16,185,129,0.08),transparent_40%)]"
                aria-hidden
              />
              <div className="relative flex h-full items-center justify-center p-4">
                <div className="relative w-full rounded-xl border border-white/10 bg-black/60 p-3 aspect-video flex items-center justify-center text-slate-300 overflow-hidden">
                  {Object.values(remoteParticipants).length > 0 ? (
                    <>
                      {(() => {
                        const remoteSocketId = Object.keys(remoteParticipants)[0];
                        const cameraEnabled = participantCameraStatus[remoteSocketId] !== false;
                        return (
                          <>
                            <video
                              ref={remoteVideoRef}
                              autoPlay
                              playsInline
                              className={`w-full h-full object-cover ${
                                cameraEnabled ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {!cameraEnabled && (
                              <div className="absolute inset-0 bg-black/80" />
                            )}
                          </>
                        );
                      })()}
                      {/* Show avatar overlay when camera is off (only if avatar_url exists) */}
                      {(() => {
                        const remoteSocketId = Object.keys(remoteParticipants)[0];
                        const cameraEnabled = participantCameraStatus[remoteSocketId] !== false;
                        const remoteProfile = participantProfiles[remoteSocketId];
                        
                        if (!cameraEnabled && remoteProfile?.avatar_url) {
                          return (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                              <img
                                src={remoteProfile.avatar_url}
                                alt={remoteProfile.display_name || "Participant"}
                                className="w-40 h-40 rounded-full object-cover border-4 border-white/20"
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <span className="text-sm">
                      {connectionStatus === "connecting"
                        ? "Connecting..."
                        : `Waiting for ${profile?.app_role === "staff" ? "candidate" : "interviewer"}`}
                    </span>
                  )}

                  {/* Signal strength */}
                  <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
                    <div className="flex items-end gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`w-1 ${
                            i <= interviewerSignal ? "bg-emerald-400" : "bg-slate-600/50"
                          } rounded`}
                          style={{ height: 6 + i * 2 }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[11px] text-slate-100 font-medium">
                    Other Participant
                  </div>
                </div>
              </div>
            </div>

            {/* Your Video */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-slate-900/40">
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.1),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.08),transparent_40%)]"
                aria-hidden
              />
              <div className="relative flex h-full items-center justify-center p-4">
                <div className="relative w-full rounded-xl border border-white/10 bg-black/55 p-3 aspect-video flex items-center justify-center text-slate-300 overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      cameraOn ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {!cameraOn && <div className="absolute inset-0 bg-black/80" />}

                  {/* Show avatar overlay when camera is off (only if avatar_url exists) */}
                  {!cameraOn && profile?.avatar_url && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                      <img
                        src={profile.avatar_url}
                        alt={profile?.display_name || "You"}
                        className="w-40 h-40 rounded-full object-cover border-4 border-white/20"
                      />
                    </div>
                  )}

                  {/* Signal strength */}
                  <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
                    <div className="flex items-end gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`w-1 ${
                            i <= mySignal ? "bg-emerald-400" : "bg-slate-600/50"
                          } rounded`}
                          style={{ height: 6 + i * 2 }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[11px] text-slate-100 font-medium">
                    You
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {showCode && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm px-3 py-6 sm:px-6">
            <div className="relative h-full w-[94vw] max-w-8xl max-h-[96vh] overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-950 shadow-2xl shadow-cyan-900/40">
              <div className="h-full overflow-auto flex flex-col">
                <CodeEditor 
                  onClose={() => setShowCode(false)} 
                  problemData={problemData}
                  socket={socketRef.current}
                  interviewId={interviewId}
                  role={profile?.app_role}
                />
              </div>
            </div>
          </div>
        )}

        {showRemoteScreen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm px-2 py-4 sm:px-4">
            <div className="relative h-full w-[98vw] max-h-[96vh] overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-950 shadow-2xl shadow-cyan-900/40">
              <div className="h-full overflow-hidden">
                <SharedScreen 
                  onClose={() => setShowRemoteScreen(false)}
                  videoRef={remoteScreenVideoRef}
                />
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none relative mb-6 flex items-center justify-center">
          <div className="pointer-events-auto inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 shadow-lg shadow-slate-900/40 backdrop-blur">
            {problemData && (
              <button
                onClick={() => setShowCode((v) => !v)}
                className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20 flex items-center gap-2"
              >
                <LuCodeXml className="text-cyan-300" />
                Code
              </button>
            )}
            <button
              onClick={handleToggleMic}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                muted ? "bg-rose-500/80 text-white" : "bg-white/10 text-slate-100 hover:bg-white/20"
              }`}
            >
              {muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={handleToggleCamera}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                cameraOn
                  ? "bg-white/10 text-slate-100 hover:bg-white/20"
                  : "bg-rose-500/80 text-white"
              }`}
            >
              {cameraOn ? <FaVideo /> : <FaVideoSlash />}
              {cameraOn ? "Video On" : "Video Off"}
            </button>

            {/* Screen Share button - Only for candidates */}
            {profile?.app_role !== "staff" && (
              <button
                onClick={handleToggleScreenShare}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                  screenSharing
                    ? "bg-emerald-500/80 text-white"
                    : "bg-white/10 text-slate-100 hover:bg-white/20"
                }`}
                disabled={screenSharing === null}
              >
                {screenSharing ? <MdOutlinePersonalVideo /> : <LuScreenShareOff />}
                {screenSharing ? "Stop Sharing" : "Share Screen"}
              </button>
            )}

            {/* Show Screen button - For interviewers (always visible, disabled when no screen sharing) */}
            {profile?.app_role === "staff" && (
              <button
                onClick={() => Object.values(remoteParticipantScreenSharing).some(v => v) && setShowRemoteScreen(true)}
                disabled={!Object.values(remoteParticipantScreenSharing).some(v => v)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                  Object.values(remoteParticipantScreenSharing).some(v => v)
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 cursor-pointer"
                    : "bg-slate-800/50 text-slate-500 border border-slate-600/40 cursor-not-allowed hover:cursor-not-allowed"
                }`}
              >
                <MdOutlinePersonalVideo />
                Show Screen
              </button>
            )}
            <button
              onClick={handleEndCall}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              End Call
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Interview;
