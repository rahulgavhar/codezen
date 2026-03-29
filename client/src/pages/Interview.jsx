import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import CodeEditor from "./CodeEditor";
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

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [interviewerSignal, setInterviewerSignal] = useState(0);
  const [mySignal, setMySignal] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [remoteParticipants, setRemoteParticipants] = useState({});
  const [permissionError, setPermissionError] = useState(null);
  const [mediaError, setMediaError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const socketRef = useRef(null);

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

  // Initialize Socket.IO and WebRTC
  useEffect(() => {
    if (!interviewId || !profile?.clerk_user_id) return;
    let isDisposed = false;

    const initializeConnection = async () => {
      try {
        console.log("[Interview] Initializing for role:", profile?.app_role);
        
        // Connect to Socket.IO
        socketRef.current = io(getSocketServerUrl(), {
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        // Get local media stream
        console.log("[Interview] Requesting media permissions...");
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });

          // In React StrictMode dev, effect can run twice. If this invocation was
          // already cleaned up, immediately release devices to avoid camera LED leaks.
          if (isDisposed) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          console.log("[Interview] Media stream acquired:", stream.getTracks());
        } catch (mediaErr) {
          console.error("[Interview] getUserMedia error:", mediaErr.name, mediaErr.message);
          if (mediaErr.name === "NotAllowedError") {
            setPermissionError("Camera and microphone permissions denied. Please enable them in browser settings.");
            setMediaError("permission-denied");
          } else if (mediaErr.name === "NotFoundError") {
            setMediaError("no-device");
            setPermissionError("No camera or microphone found on this device.");
          } else {
            setMediaError("unknown");
            setPermissionError(`Media error: ${mediaErr.message}`);
          }
          throw mediaErr;
        }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
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
                setConnectionStatus("error");
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
        });

        socketRef.current.on("participant-screen-sharing", (data) => {
          console.log("[WebRTC] Screen sharing status:", data);
          if (data.sharing) {
            console.log("[Interview] Remote participant started screen sharing");
          } else {
            console.log("[Interview] Remote participant stopped screen sharing");
          }
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

  const createPeerConnection = async (socketId, clerkUserId, initiator) => {
    try {
      if (!socketId || socketId === socketRef.current?.id) return;
      if (peerConnectionsRef.current[socketId]) return peerConnectionsRef.current[socketId];

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
        console.log("[WebRTC] Received remote track:", event.track.kind);
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
        if (sender) {
          await sender.replaceTrack(nextTrack);
        }
      })
    );
  };

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextMuted = !muted;
      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
      setMuted(nextMuted);

      socketRef.current.emit("toggle-audio", {
        interviewId,
        enabled: !nextMuted,
      });
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
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">
                      {connectionStatus === "connecting"
                        ? "Connecting..."
                        : `Waiting for ${profile?.app_role === "staff" ? "candidate" : "interviewer"}`}
                    </span>
                  )}

                  {/* Signal strength */}
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
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

                  <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
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
                    className="w-full h-full object-cover"
                  />

                  {/* Signal strength */}
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
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

                  <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
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
              <div className="h-full overflow-hidden">
                <CodeEditor onClose={() => setShowCode(false)} />
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none relative mb-6 flex items-center justify-center">
          <div className="pointer-events-auto inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 shadow-lg shadow-slate-900/40 backdrop-blur">
            <button
              onClick={() => setShowCode((v) => !v)}
              className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20 flex items-center gap-2"
            >
              <LuCodeXml className="text-cyan-300" />
              Code
            </button>
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
