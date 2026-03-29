import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPeopleGroup } from "react-icons/fa6";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import GuestHeader from "../../components/GuestHeader";
import { useUser } from "@clerk/clerk-react";


const sampleContests = [
  {
    id: 1,
    title: "Weekly Challenge #42",
    status: "Upcoming",
    startTime: "2026-01-15T18:00:00",
    duration: "2 hr",
    participants: 0,
    problems: 4,
  },
  {
    id: 2,
    title: "Biweekly Contest #18",
    status: "Live",
    startTime: "2026-01-08T14:00:00",
    duration: "2.5 hr",
    participants: 847,
    problems: 5,
  },
  {
    id: 3,
    title: "Monthly Marathon",
    status: "Ended",
    startTime: "2025-12-20T10:00:00",
    duration: "3 hr",
    participants: 1523,
    problems: 6,
  },
  {
    id: 4,
    title: "Algorithm Showdown",
    status: "Ended",
    startTime: "2025-12-10T16:00:00",
    duration: "2 hr",
    participants: 956,
    problems: 4,
  },
];

const statusConfig = {
  Upcoming: {
    badge: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
    icon: "🗓️",
  },
  Live: {
    badge: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    icon: (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
      </span>
    ),
  },
  Ended: {
    badge: "bg-slate-400/15 text-slate-300 border-slate-400/30",
    icon: "✓",
  },
};

const AllContests = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const { isSignedIn } = useUser();

  const filtered = sampleContests.filter((c) => {
    if (filter === "All") return true;
    return c.status === filter;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {isSignedIn ? <Header /> : <GuestHeader />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[34px_34px] opacity-25" aria-hidden />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 flex-1">
        <header className="flex flex-col gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Competitions</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">All Contests</h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Compete with developers worldwide, climb the leaderboard, and sharpen your skills.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {["All", "Upcoming", "Live", "Ended"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  filter === status
                    ? "bg-cyan-600 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((contest) => {
            const config = statusConfig[contest.status];
            return (
              <article
                key={contest.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-900/30 backdrop-blur transition hover:border-cyan-400/40 hover:shadow-cyan-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-50 group-hover:text-cyan-200">
                      {contest.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(contest.startTime)}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.badge}`}
                  >
                    <span>{config.icon}</span>
                    {contest.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-white/5 px-3 py-2 flex flex-col items-center justify-center">
                    <p className="text-slate-400">Duration</p>
                    <p className="font-semibold text-slate-100">{contest.duration}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2 flex flex-col items-center justify-center">
                    <p className="text-slate-400">Problems</p>
                    <p className="font-semibold text-slate-100">{contest.problems}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2 flex flex-col items-center justify-center">
                    <p className="text-slate-400"><FaPeopleGroup /></p>
                    <p className="font-semibold text-slate-100">{contest.participants}</p>
                  </div>
                </div>

                <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">
                  {contest.status === "Live" ? "Join Now" : contest.status === "Upcoming" ? "Register" : "View Results"}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </article>
            );
          })}

          {!filtered.length && (
            <div className="col-span-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-300">
              No contests found matching that filter.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AllContests;
