import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RatingGraph from "../components/RatingGraph";

const upcomingContests = [
  {
    id: "001",
    title: "Weekly Coding Sprint #42",
    date: "Jan 12, 2026",
    time: "10:00 AM PST",
    participants: 1240,
    difficulty: "Mixed",
    status: "Open",
  },
  {
    id: "002",
    title: "Advanced Algorithms Challenge",
    date: "Jan 15, 2026",
    time: "2:00 PM PST",
    participants: 856,
    difficulty: "Hard",
    status: "Registration",
  },
  {
    id: "003",
    title: "Beginner Friendly Bootcamp",
    date: "Jan 18, 2026",
    time: "9:00 AM PST",
    participants: 2103,
    difficulty: "Easy",
    status: "Open",
  },
];

const scheduledInterviews = [
  {
    id: "001",
    candidate: "Sarah Chen",
    position: "Senior SDE",
    date: "Jan 9, 2026",
    time: "3:00 PM",
    type: "System Design",
    status: "Confirmed",
  },
  {
    id: "002",
    candidate: "Michael Torres",
    position: "SDE II",
    date: "Jan 10, 2026",
    time: "11:00 AM",
    type: "Coding + Behavioral",
    status: "Pending",
  },
  {
    id: "003",
    candidate: "Emily Watson",
    position: "Junior SDE",
    date: "Jan 11, 2026",
    time: "1:30 PM",
    type: "DSA Focus",
    status: "Confirmed",
  },
];

const Dashboard = () => {
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect staff users to staff dashboard
  if (profile?.app_role === 'staff') {
    return <Navigate to="/staff/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[34px_34px] opacity-25" aria-hidden />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Dashboard
            </p>
            <Link
              to="/my-submissions"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60"
            >
              <span>My Submissions</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 shadow-xl shadow-slate-900/30 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, var(--color-accent), var(--color-info))' }}></div>
                <h2 className="text-xl font-bold text-slate-50">Rating Journey</h2>
              </div>
            <RatingGraph />
          </div>
        </section>

        {/* Upcoming Contests */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-50 sm:text-2xl">
              Upcoming contests
            </h2>
            <Link to='/contests' className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingContests.map((contest) => (
              <article
                key={contest.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-900/30 backdrop-blur transition hover:border-cyan-400/40 hover:shadow-cyan-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-50 group-hover:text-cyan-200">
                    {contest.title}
                  </h3>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                    {contest.status}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">📅</span>
                    <span>{contest.date} at {contest.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">👥</span>
                    <span>{contest.participants} participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">⚡</span>
                    <span>Difficulty: {contest.difficulty}</span>
                  </div>
                </div>
                <Link
                  to={`/contest/${contest.id}/info`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                >
                  Register now
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Scheduled Interviews */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-50 sm:text-2xl">
              Scheduled interviews
            </h2>
            <Link to='/my-interviews' className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {scheduledInterviews.map((interview) => (
              <article
                key={interview.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-900/30 backdrop-blur transition hover:border-cyan-400/40 hover:shadow-cyan-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50 group-hover:text-cyan-200">
                      {interview.candidate}
                    </h3>
                    <p className="text-sm text-slate-400">{interview.position}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                      interview.status === "Confirmed"
                        ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
                        : "bg-amber-400/15 text-amber-200 border-amber-400/30"
                    }`}
                  >
                    {interview.status}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">📅</span>
                    <span>{interview.date} at {interview.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">💼</span>
                    <span>{interview.type}</span>
                  </div>
                </div>
                <Link
                  to={`/interview/${interview.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                >
                  Join interview room
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;
