import React from "react";
import { Link } from "react-router-dom";

const badgeTone = {
  Easy: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
  Medium: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  Hard: "bg-rose-400/15 text-rose-200 border-rose-400/30",
};

const statusTone = {
  Solved: "text-emerald-300",
  Attempted: "text-amber-200",
  Unsolved: "text-slate-400",
};

export default function ProblemsCard({ problem }) {
  if (!problem) return null;
  const {
    title,
    difficulty,
    tags = [],
    acceptance,
    user_status,
  } = problem;

  const normalizedUserStatus =
    user_status === "solved"
      ? "Solved"
      : user_status === "attempted"
      ? "Attempted"
      : "Unsolved";

  const acceptanceValue = Number.isFinite(Number(acceptance))
    ? Number(acceptance).toFixed(1)
    : "0.0";

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-900/30 backdrop-blur transition hover:border-cyan-400/40 hover:shadow-cyan-500/20"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-50 group-hover:text-cyan-200">
          {title}
        </h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone[difficulty]}`}>
          {difficulty}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{Array.isArray(tags) ? tags.join(", ") : ""}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="rounded-lg bg-white/5 px-2.5 py-1">Acceptance: {acceptanceValue}%</span>
        <span className={`rounded-lg bg-white/5 px-2.5 py-1 font-semibold ${statusTone[normalizedUserStatus]}`}>
          {normalizedUserStatus}
        </span>
      </div>
      <Link 
        to={`/problem/${problem.id}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
      >
        Solve now
        <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </article>
  );
}
