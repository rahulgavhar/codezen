import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Judge0Health() {
  const [status, setStatus] = useState("checking");
  const [judgeInfo, setJudgeInfo] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const apiUrl = import.meta.env.VITE_API_URL;

    fetch(`${apiUrl}/api/judge0/health`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Judge0 not reachable");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStatus("running");
          setJudgeInfo(data[0]);
        } else if (Array.isArray(data) && data.length === 0) {
          // Server is active but no workers are running
          setStatus("active");
        } else if (!Array.isArray(data)) {
          // Response is not an array at all
          setStatus("unexpected-response");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setStatus("down");
        }
      });

    return () => controller.abort();
  }, []);

  const statusConfig = useMemo(
    () => ({
      checking: {
        label: "Checking",
        desc: "Pinging Judge0 languages endpoint...",
        tone: "bg-amber-400/15 text-amber-200 border-amber-400/30",
        dot: "bg-amber-300 animate-pulse",
      },
      running: {
        label: "Running",
        desc: "Judge0 is reachable and returned languages.",
        tone: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
        dot: "bg-emerald-300 animate-ping",
      },
      down: {
        label: "Down",
        desc: "Service unreachable or returned an error.",
        tone: "bg-rose-400/15 text-rose-200 border-rose-400/30",
        dot: "bg-rose-300",
      },
      active: {
        label: "No Workers",
        desc: "Server is active but no workers are running.",
        tone: "bg-amber-400/15 text-amber-200 border-amber-400/30",
        dot: "bg-amber-300 animate-pulse",
      },
      "unexpected-response": {
        label: "Unexpected Response",
        desc: "Response format is not an array; verify Judge0 API version or deployment.",
        tone: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
        dot: "bg-cyan-300",
      },
    }),
    []
  );

  const active = statusConfig[status] || statusConfig.checking;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_28%)]" />
      <div
        className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[36px_36px] opacity-25"
        aria-hidden
      />

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10 md:py-12">
        <header className="flex flex-col gap-2 sm:gap-3">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            System health
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Judge0 status
          </h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Live heartbeat check against the languages endpoint. If it returns a
            populated list, we&apos;re good to run code.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5 shadow-2xl shadow-cyan-900/30 backdrop-blur lg:self-stretch">
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]"
              aria-hidden
            />
            <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                  <span
                    className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${active.dot}`}
                  />
                  <span className="font-semibold">{active.label}</span>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${active.tone}`}
                >
                  {status === "checking"
                    ? "Checking"
                    : status === "running"
                    ? "Operational"
                    : status === "down"
                    ? "Outage"
                    : status === "active"
                    ? "No Workers"
                    : "Malformed Response"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200/80">
                {active.desc}
              </p>
              <div className="rounded-lg sm:rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs text-slate-300">
                <div className="break-all">
                  Endpoint:{" "}
                  <span className="font-mono text-cyan-200">
                    /api/judge0/health
                  </span>
                </div>
                <div className="mt-1">Method: GET</div>
                <div className="mt-1 wrap-break-word">
                  Last checked: {new Date().toLocaleString()}
                </div>
              </div>

              {/* Display Worker Information */}
              {judgeInfo && (
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-3">
                  {(() => {
                    const counts = {
                      available:
                        status === "down"
                          ? 0
                          : Number(judgeInfo.available ?? 5),
                      idle: status === "down" ? 0 : Number(judgeInfo.idle ?? 5),
                      working: Number(judgeInfo.working ?? 0),
                      paused: Number(judgeInfo.paused ?? 0),
                    };

                    // Determine overall state with sensible precedence:
                    // Prefer active work, then idle capacity; only show paused when exclusively paused.
                    const state =
                      counts.working > 0
                        ? "working"
                        : counts.idle > 0
                        ? "idle"
                        : counts.paused > 0 &&
                          counts.working === 0 &&
                          counts.idle === 0
                        ? "paused"
                        : counts.available > 0
                        ? "available"
                        : "unknown";

                    const map = {
                      available: {
                        label: "Available",
                        tone: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
                        dot: "bg-emerald-300 animate-pulse",
                      },
                      idle: {
                        label: "Idle",
                        tone: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
                        dot: "bg-cyan-300",
                      },
                      working: {
                        label: "Working",
                        tone: "bg-amber-400/15 text-amber-200 border-amber-400/30",
                        dot: "bg-amber-300 animate-ping",
                      },
                      paused: {
                        label: "Paused",
                        tone: "bg-rose-400/15 text-rose-200 border-rose-400/30",
                        dot: "bg-rose-300",
                      },
                      unknown: {
                        label: "Unknown",
                        tone: "bg-slate-400/10 text-slate-200 border-white/10",
                        dot: "bg-slate-400",
                      },
                    };
                    const wk = map[state];
                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                            <span
                              className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${wk.dot}`}
                            />
                            <span className="font-semibold">Judge workers</span>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${wk.tone}`}
                          >
                            {wk.label}
                          </span>
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-300/90">
                          <span className="ml-1 font-mono text-cyan-200">
                            Queue size
                          </span>
                          : {judgeInfo.size ?? 0}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                            available: {counts.available}
                          </span>
                          <span className="rounded-full border border-white/10 bg-cyan-600/20 px-2 py-0.5">
                            idle: {counts.idle}
                          </span>
                          <span className="rounded-full border border-white/10 bg-green-600/20 px-2 py-0.5">
                            working: {counts.working}
                          </span>
                          <span className="rounded-full border border-white/10 bg-red-600/20 px-2 py-0.5">
                            paused: {counts.paused}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="rounded-lg sm:rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs text-slate-300">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 text-emerald-200 text-xs sm:text-sm font-semibold">
                  <span>🔒</span>
                  <span>Security & Infrastructure</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-300">•</span>
                    <span>
                      NSG firewall rules protect the service from unauthorized
                      access.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-cyan-300">•</span>
                    <span>
                      Reverse proxy layer ensures secure routing and load
                      distribution.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-cyan-300">•</span>
                    <span>
                      All code execution is sandboxed for enterprise-grade
                      safety.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-cyan-300">•</span>
                    <span>
                      Our Judge is only reachable from{" "}
                      <Link to="/">
                        <span className="text-cyan-300">
                          https://codezen-oc74.onrender.com
                        </span>
                      </Link>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
              <p className="text-xs sm:text-sm font-semibold text-cyan-200">
                What this means
              </p>
              <ul className="mt-2 space-y-2 text-xs sm:text-sm text-slate-200/80">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Running: Judge0 responded with a language list; compile/run
                  features should work.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  Checking: We are mid-request; wait a moment for a definitive
                  status.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-300" />
                  Down: Network issue, CORS, or service outage. Retry or inspect
                  backend logs.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  No Workers: Server is active but no workers are running; check
                  Judge0 worker configuration.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  Unexpected Response: API response format changed; verify
                  Judge0 deployment or version.
                </li>
              </ul>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
              <p className="text-xs sm:text-sm font-semibold text-cyan-200">
                Next actions
              </p>
              <ul className="mt-2 space-y-2 text-xs sm:text-sm text-slate-200/80">
                <li>
                  1) Confirm the Judge0 host is reachable from this client.
                </li>
                <li>2) Verify CORS and network rules if status stays Down.</li>
                <li>
                  3) Wire retries or a manual refresh button when integrating
                  fully.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Judge0Health;
