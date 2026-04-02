import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import Header from "../../components/Header";
import GuestHeader from "../../components/GuestHeader";
import Footer from "../../components/Footer";
import axiosInstance from "../../lib/axios";

const getContestStatus = (contest) => {
  const now = new Date();
  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);

  if (now < start) return "Upcoming";
  if (now >= start && now < end) return "Live";
  return "Ended";
};

const formatDateTime = (value) => {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (startTime, endTime) => {
  const diffMs = Math.max(0, new Date(endTime) - new Date(startTime));
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatCountdown = (targetDate) => {
  const diff = Math.max(0, targetDate.getTime() - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
};

const Contest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isSignedIn } = useUser();
  const previousStatusRef = useRef(null);
  const hasStartedPopupShownRef = useRef(false);
  const [countdown, setCountdown] = useState("--:--:--");
  const [countdownLabel, setCountdownLabel] = useState("Starts in");
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [registrantsTotal, setRegistrantsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContest = async () => {
      try {
        setLoading(true);
        setError("");

        const [contestRes, problemsRes, registrantsRes] = await Promise.all([
          axiosInstance.get(`/api/contests/${id}`),
          axiosInstance.get(`/api/contests/${id}/problems`),
          axiosInstance.get(`/api/contests/${id}/registrants`, {
            params: { page: 1, limit: 1 },
          }),
        ]);

        setContest(contestRes.data || null);
        setProblems(Array.isArray(problemsRes.data) ? problemsRes.data : []);
        setRegistrantsTotal(registrantsRes.data?.pagination?.total || 0);
      } catch (err) {
        console.error("Failed to load contest details:", err);
        setError(err.response?.data?.message || "Failed to load contest details");
        setContest(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchContest();
    }
  }, [id]);

  useEffect(() => {
    previousStatusRef.current = null;
    hasStartedPopupShownRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!contest) {
      return undefined;
    }

    const updateLifecycle = () => {
      const status = getContestStatus(contest);

      if (status === "Ended") {
        setCountdownLabel("Ended");
        setCountdown("00:00:00");
      } else if (status === "Live") {
        setCountdownLabel("Ends in");
        setCountdown(formatCountdown(new Date(contest.end_time)));
      } else {
        setCountdownLabel("Starts in");
        setCountdown(formatCountdown(new Date(contest.start_time)));
      }

      if (
        previousStatusRef.current === "Upcoming" &&
        status === "Live" &&
        !hasStartedPopupShownRef.current
      ) {
        hasStartedPopupShownRef.current = true;
        alert("Contest has begun. Redirecting to ongoing contest.");
        navigate(`/contest/${id}/ongoing`, { replace: true });
      }

      previousStatusRef.current = status;
    };

    updateLifecycle();
    const intervalId = setInterval(updateLifecycle, 1000);
    return () => clearInterval(intervalId);
  }, [contest, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        {isSignedIn ? <Header /> : <GuestHeader />}
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
          <p className="text-slate-400">Loading contest...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        {isSignedIn ? <Header /> : <GuestHeader />}
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
            <p className="text-red-300">{error || "Contest not found"}</p>
            <button
              onClick={() => navigate("/contests")}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Back to contests
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const status = getContestStatus(contest);

  const ctaText = status === "Live"
    ? "Join contest"
    : status === "Upcoming"
      ? "Contest not started"
      : "Contest ended";

  const ctaDisabled = status !== "Live" || !isSignedIn;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {isSignedIn ? <Header /> : <GuestHeader />}

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 flex-1">
        <header className="flex flex-col gap-3">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Contest Brief
              </p>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pr-1.5 pl-3 py-1 text-xs font-semibold text-white">
                <span className="text-slate-200">{countdownLabel}</span>
                <span className="rounded-full border border-cyan-600/80 px-2 py-0.5 text-[11px] tracking-wide">
                  {countdown}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {contest.title}
            </h1>
            <button
              disabled={ctaDisabled}
              onClick={() => navigate(`/contest/${id}/ongoing`)}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {ctaText}
            </button>
          </div>

          <p className="text-sm text-slate-300 sm:text-base">
            {contest.description || "No description provided for this contest."}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Problems</h2>
                  <p className="text-xs text-slate-400">
                    Problem set for this contest
                  </p>
                </div>
                <span className="rounded-full border border-cyan-600/80 px-3 py-1 text-xs font-semibold text-white">
                  {problems.length} problems
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {problems.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-5 text-center text-sm text-slate-300">
                    Problem list is not available yet.
                  </div>
                ) : (
                  problems.map((problem, index) => (
                    <div
                      key={problem.id}
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-4 shadow-inner shadow-slate-900/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-cyan-200">
                          {String.fromCharCode(65 + index)}. {problem.title || problem.problem?.title || "Untitled problem"}
                        </p>
                        <span className="text-xs text-slate-300">{problem.points} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Contest Details</h2>
                  <p className="text-xs text-slate-400">
                    Schedule and participation details
                  </p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200">
                  Status: {status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Starts</p>
                  <p className="mt-1 text-slate-100">{formatDateTime(contest.start_time)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Ends</p>
                  <p className="mt-1 text-slate-100">{formatDateTime(contest.end_time)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Duration</p>
                  <p className="mt-1 text-slate-100">{formatDuration(contest.start_time, contest.end_time)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Rated</p>
                  <p className="mt-1 text-slate-100">{contest.is_rated ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Registered
                  </p>
                  <p className="text-3xl font-bold">{registrantsTotal}</p>
                  <p className="text-xs text-slate-400">
                    Participants confirmed
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  status === "Live"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : status === "Upcoming"
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "bg-slate-500/15 text-slate-300"
                }`}>
                  {status}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Capacity
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {contest.max_participants === null ? "Unlimited" : contest.max_participants}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Problems
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {problems.length}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/contests")}
              className="w-full rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
            >
              Back to all contests
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contest;
