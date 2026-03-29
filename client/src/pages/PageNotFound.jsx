import React from "react";
import { Link, useNavigate } from "react-router-dom";

const PageNotFound = () => {
  const navigate = useNavigate();
  const fauxStack = `// Route not found
const route = window.location.pathname;
const suggestion = ["/", "/problems", "/judge0-health"];
throw new Error("404: Missing route: " + route);
`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.12),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[32px_32px] opacity-30" aria-hidden />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:py-16">
        <div>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
          >
            <span aria-hidden>←</span>
            <span>Home</span>
          </button>
        </div>
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div className="inline-flex items-center justify-center sm:justify-start gap-2 self-center sm:self-start rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            404 • Route not compiling
          </div>
          <div className="flex flex-col gap-3 text-center sm:text-left">
            <p className="text-5xl font-black tracking-tight sm:text-6xl">
              Missing in action.
            </p>
            <p className="text-lg text-slate-300 sm:text-xl">
              You hit an undefined route. Try a tested path, or jump into the problem bank to keep coding.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 justify-center sm:justify-start">
            <Link
              to="/"
              className="btn bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:bg-cyan-400"
            >
              Go to dashboard
            </Link>
            <Link
              to="/problems"
              className="btn btn-ghost border border-white/10 bg-white/5 text-slate-50 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-300/60"
            >
              Open problem bank
            </Link>
            <Link
              to="/judge0-health"
              className="btn btn-ghost border border-white/10 bg-white/5 text-slate-50 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-300/60"
            >
              Check system status
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-cyan-900/30 backdrop-blur">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" aria-hidden />
            <div className="flex items-center justify-between px-5 py-4 text-xs text-slate-300/80">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>codezen://stacktrace</span>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 font-semibold text-amber-200 animate-pulse">404</span>
            </div>
            <pre className="relative z-10 overflow-auto px-5 pb-5 text-sm leading-relaxed text-slate-100 sm:text-base">
              <code>
                {fauxStack}
              </code>
            </pre>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
              <p className="text-sm font-semibold text-cyan-200">Why you are here</p>
              <p className="mt-2 text-sm text-slate-200/80">
                The URL is undefined, refactored, or requires authentication. Navigate via the dashboard or problems to stay in the happy path.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
              <p className="text-sm font-semibold text-cyan-200">Jump back into practice</p>
              <div className="mt-3 space-y-3 text-sm text-slate-100">
                {[{
                  title: "Warmup: Arrays & Strings",
                  meta: "3 quick wins · ETA 15m",
                  badge: "Beginner",
                },
                {
                  title: "Core: Graph traversals",
                  meta: "DFS/BFS · ETA 25m",
                  badge: "Intermediate",
                },
                {
                  title: "Stretch: DP patterns",
                  meta: "Tabulation · ETA 35m",
                  badge: "Advanced",
                }].map((track) => (
                  <div
                    key={track.title}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-50">{track.title}</p>
                      <p className="text-xs text-slate-400">{track.meta}</p>
                    </div>
                    <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                      {track.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PageNotFound;
