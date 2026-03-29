import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import CodeEditor from "./CodeEditor";
import { LuCodeXml, LuScreenShareOff } from "react-icons/lu";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { FaVideo, FaVideoSlash } from "react-icons/fa6";
import { MdOutlinePersonalVideo } from "react-icons/md";

const Interview = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);

  // Redirect staff users to staff dashboard
  if (profile?.app_role === 'staff') {
    return navigate('/staff/dashboard');
  }

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [interviewerSignal, setInterviewerSignal] = useState(4);
  const [mySignal, setMySignal] = useState(3);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_30%)]" aria-hidden />

      <main className="relative z-10 flex min-h-screen flex-col">
        <section className="flex-1 flex flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-10">
          <div className="flex flex-1 flex-col gap-4 sm:gap-6 md:flex-row">
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-slate-900/40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(16,185,129,0.08),transparent_40%)]" aria-hidden />
              <div className="relative flex h-full items-center justify-center p-4">
                  <div className="relative w-full rounded-xl border border-white/10 bg-black/60 p-3 aspect-video flex items-center justify-center text-slate-300">
                    {/* Connection strength overlay */}
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
                      <div className="flex items-end gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <span key={i} className={`w-1 ${i<=interviewerSignal? 'bg-emerald-400' : 'bg-slate-600/50'} rounded`} style={{height: 6 + i * 2}} />
                        ))}
                      </div>
                    </div>
                  <span className="text-sm">Interviewer video</span>
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-slate-900/40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.1),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.08),transparent_40%)]" aria-hidden />
              <div className="relative flex h-full items-center justify-center p-4">
                <div className="relative w-full rounded-xl border border-white/10 bg-black/55 p-3 aspect-video flex items-center justify-center text-slate-300">
                  {/* Connection strength overlay */}
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200">
                    <div className="flex items-end gap-0.5">
                      {[1,2,3,4,5].map((i) => (
                        <span key={i} className={`w-1 ${i<=mySignal? 'bg-emerald-400' : 'bg-slate-600/50'} rounded`} style={{height: 6 + i * 2}} />
                      ))}
                    </div>
                  </div>
                  <span className="text-sm">Your video</span>
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
              onClick={() => setMuted((v) => !v)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                muted ? "bg-rose-500/80 text-white" : "bg-white/10 text-slate-100 hover:bg-white/20"
              }`}
            >
              {muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={() => setCameraOn((v) => !v)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                cameraOn ? "bg-white/10 text-slate-100 hover:bg-white/20" : "bg-rose-500/80 text-white"
              }`}
            >
              {cameraOn ? <FaVideo /> : <FaVideoSlash />}
              {cameraOn ? "Video On" : "Video Off"}
            </button>
            <button
              onClick={() => setScreenOn((v) => !v)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                screenOn ? "bg-emerald-500/80 text-white" : "bg-white/10 text-slate-100 hover:bg-white/20"
              }`}
            >
              {screenOn ? <MdOutlinePersonalVideo /> : <LuScreenShareOff />}
              {screenOn ? "Sharing" : "Share Screen"}
            </button>
            <button
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
