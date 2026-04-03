import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import Header from "../../components/Header";
import GuestHeader from "../../components/GuestHeader";
import Footer from "../../components/Footer";
import CodeReplay from "./CodeReplay";
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

const toProblemCode = (displayOrder, fallbackIndex = 0) => {
  const normalizedOrder =
    Number.isInteger(displayOrder) && displayOrder >= 1
      ? displayOrder
      : fallbackIndex + 1;

  if (normalizedOrder <= 26) {
    return String.fromCharCode(64 + normalizedOrder);
  }

  return `P${normalizedOrder}`;
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
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardPagination, setLeaderboardPagination] = useState({
    page: 1,
    limit: 10,
    count: 0,
    total: 0,
    pages: 0,
  });
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [activeReplay, setActiveReplay] = useState(null);
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
    setLeaderboardPage(1);
  }, [id]);

  useEffect(() => {
    const fetchRegistrationStatus = async () => {
      if (!id || !isSignedIn) {
        setIsRegistered(false);
        return;
      }

      try {
        setIsCheckingRegistration(true);
        const response = await axiosInstance.get(`/api/contests/${id}/registration-status`);
        setIsRegistered(Boolean(response.data?.registered));
      } catch (err) {
        console.error("Failed to fetch registration status:", err);
        setIsRegistered(false);
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    fetchRegistrationStatus();
  }, [id, isSignedIn]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!id || !contest) {
        return;
      }

      if (getContestStatus(contest) !== "Ended") {
        setLeaderboardRows([]);
        setLeaderboardError("");
        return;
      }

      try {
        setLeaderboardLoading(true);
        setLeaderboardError("");
        const response = await axiosInstance.get(`/api/contests/${id}/leaderboard`, {
          params: {
            page: leaderboardPage,
            limit: leaderboardPagination.limit,
          },
        });

        const data = Array.isArray(response.data?.data) ? response.data.data : [];
        const pagination = response.data?.pagination || {
          page: leaderboardPage,
          limit: leaderboardPagination.limit,
          count: data.length,
          total: data.length,
          pages: data.length > 0 ? 1 : 0,
        };

        setLeaderboardRows(data);
        setLeaderboardPagination(pagination);
      } catch (err) {
        console.error("Failed to fetch contest leaderboard:", err);
        setLeaderboardRows([]);
        setLeaderboardError(
          err.response?.data?.message || "Failed to load leaderboard"
        );
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [contest, id, leaderboardPage, leaderboardPagination.limit]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!id || !contest || getContestStatus(contest) !== "Ended") {
        setSubmissions([]);
        return;
      }

      try {
        const response = await axiosInstance.get(`/api/contests/${id}/submissions`);
        setSubmissions(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to fetch contest submissions:", err);
        setSubmissions([]);
      }
    };

    fetchSubmissions();
  }, [contest, id]);

  const postContestStandings = useMemo(() => {
    if (!contest?.start_time || !Array.isArray(leaderboardRows) || leaderboardRows.length === 0) {
      return [];
    }

    const startTime = new Date(contest.start_time).getTime();
    if (Number.isNaN(startTime)) {
      return [];
    }

    const submissionsAsc = [...submissions].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    return leaderboardRows.map((row) => {
      const perProblem = {};

      problems.forEach((problem) => {
        perProblem[problem.id] = {
          acceptedAt: null,
          wrongAttemptsBeforeAccepted: 0,
        };
      });

      submissionsAsc.forEach((entry) => {
        if (entry.clerk_user_id !== row.userId) return;

        const problemState = perProblem[entry.contest_problem_id];
        if (!problemState) return;

        if (!problemState.acceptedAt && entry.verdict === "accepted") {
          problemState.acceptedAt = new Date(entry.submitted_at);
          return;
        }

        if (!problemState.acceptedAt && entry.verdict && entry.verdict !== "pending") {
          problemState.wrongAttemptsBeforeAccepted += 1;
        }
      });

      const problemResults = {};

      problems.forEach((problem) => {
        const problemState = perProblem[problem.id];
        if (!problemState) return;

        if (problemState.acceptedAt) {
          const diffMinutes = Math.max(
            0,
            Math.floor((problemState.acceptedAt.getTime() - startTime) / (1000 * 60))
          );
          const problemPenalty = diffMinutes + problemState.wrongAttemptsBeforeAccepted * 20;

          problemResults[problem.id] = {
            solved: true,
            penalty: problemPenalty,
            wrongAttempts: problemState.wrongAttemptsBeforeAccepted,
          };
          return;
        }

        if (problemState.wrongAttemptsBeforeAccepted > 0) {
          problemResults[problem.id] = {
            solved: false,
            penalty: problemState.wrongAttemptsBeforeAccepted * 20,
            wrongAttempts: problemState.wrongAttemptsBeforeAccepted,
          };
        }
      });

      return {
        ...row,
        problemResults,
      };
    });
  }, [contest?.start_time, leaderboardRows, problems, submissions]);

  const openReplay = (row, problem, result) => {
    const acceptedSubmission = submissions
      .filter(
        (entry) =>
          entry.clerk_user_id === row.userId &&
          entry.contest_problem_id === problem.id &&
          entry.verdict === "accepted"
      )
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())[0];

    setActiveReplay({
      rank: row.rank,
      handle: row.handle,
      problemCode: toProblemCode(problem.display_order),
      problemTitle: problem.title,
      penalty: result.penalty,
      sourceCode: acceptedSubmission?.source_code || "",
      submittedAt: acceptedSubmission?.submitted_at || null,
    });
  };

  const handleRegister = async () => {
    if (!isSignedIn) {
      navigate("/sign-in");
      return;
    }

    try {
      setIsRegistering(true);
      const response = await axiosInstance.post(`/api/contests/${id}/register`);
      const alreadyRegistered = Boolean(response.data?.alreadyRegistered);

      if (!alreadyRegistered) {
        setRegistrantsTotal((current) => current + 1);
      }

      setIsRegistered(true);
      alert(alreadyRegistered ? "You are already registered." : "Registered successfully.");
    } catch (err) {
      console.error("Failed to register for contest:", err);
      alert(err.response?.data?.message || "Failed to register for contest.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleContestAction = async (status) => {
    if (status === "Live") {
      if (!isSignedIn) {
        navigate("/sign-in");
        return;
      }

      if (!isRegistered) {
        alert("Only registered participants can join this contest.");
        return;
      }

      navigate(`/contest/${id}/ongoing`);
      return;
    }

    if (status === "Upcoming") {
      await handleRegister();
    }
  };

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
        isSignedIn &&
        isRegistered &&
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
  }, [contest, id, isRegistered, isSignedIn, navigate]);

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
    ? !isSignedIn
      ? "Sign in to join"
      : isCheckingRegistration
        ? "Checking registration..."
        : isRegistered
          ? "Join contest"
          : "Only registrants can join"
    : status === "Upcoming"
      ? isRegistered
        ? "Registered"
        : "Register"
      : "Contest ended";

  const ctaDisabled =
    status === "Ended" ||
    (status === "Live" && isSignedIn && (isCheckingRegistration || !isRegistered)) ||
    (status === "Upcoming" && (isRegistering || isCheckingRegistration || isRegistered));

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
              onClick={() => handleContestAction(status)}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {isRegistering ? "Registering..." : ctaText}
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
                          {toProblemCode(problem.display_order, index)}. {problem.title || problem.problem?.title || "Untitled problem"}
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

        {status === "Ended" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Post Contest Leaderboard</h2>
                <p className="text-xs text-slate-400">Final rankings after contest end</p>
              </div>
              <span className="rounded-full border border-cyan-600/80 px-3 py-1 text-xs font-semibold text-white">
                {leaderboardPagination.total} ranked
              </span>
            </div>

            {leaderboardLoading ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-300">
                Loading leaderboard...
              </div>
            ) : leaderboardError ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-6 text-sm text-rose-200">
                {leaderboardError}
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-white/5">
                  <table className="w-full min-w-225 text-sm">
                    <thead className="bg-white/5 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Rank</th>
                        <th className="px-4 py-3 text-left font-semibold">Handle</th>
                        {problems.map((problem, index) => (
                          <th key={problem.id} className="px-4 py-3 text-center font-semibold">
                            {toProblemCode(problem.display_order, index)}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left font-semibold">Solved</th>
                        <th className="px-4 py-3 text-left font-semibold">Penalty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {postContestStandings.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-slate-400" colSpan={problems.length + 4}>
                            No leaderboard data available.
                          </td>
                        </tr>
                      ) : (
                        postContestStandings.map((row) => (
                          <tr key={row.userId} className="hover:bg-white/5">
                            <td className="px-4 py-3 font-semibold text-cyan-200">{row.rank}</td>
                            <td className="px-4 py-3 font-medium text-slate-100">{row.handle}</td>
                            {problems.map((problem) => {
                              const result = row.problemResults?.[problem.id];

                              if (!result) {
                                return <td key={`${row.rank}-${problem.id}`} className="px-4 py-3 text-center text-slate-500" />;
                              }

                              return (
                                <td key={`${row.rank}-${problem.id}`} className="group relative px-4 py-3 text-center">
                                  {result.solved ? (
                                    <>
                                      <span className="block font-semibold text-emerald-400 transition-opacity duration-150 group-hover:opacity-0">
                                        +{result.penalty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openReplay(row, problem, result)}
                                        className="pointer-events-none absolute inset-0 z-10 m-auto h-fit w-fit rounded-md border border-cyan-400/50 bg-cyan-500/15 px-2 py-1 text-[11px] font-semibold text-cyan-200 opacity-0 shadow-lg shadow-cyan-900/30 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-cyan-500/25"
                                      >
                                        Play
                                      </button>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-rose-300">-{result.penalty}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-slate-300">{row.solved}</td>
                            <td className="px-4 py-3 text-slate-300">{row.penalty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {leaderboardPagination.pages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300">
                    <button
                      type="button"
                      onClick={() => setLeaderboardPage((current) => Math.max(1, current - 1))}
                      disabled={leaderboardPagination.page <= 1}
                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>
                      Page {leaderboardPagination.page} of {leaderboardPagination.pages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLeaderboardPage((current) =>
                          Math.min(leaderboardPagination.pages, current + 1)
                        )
                      }
                      disabled={leaderboardPagination.page >= leaderboardPagination.pages}
                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {activeReplay && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-2 py-4 backdrop-blur-sm sm:px-4">
          <div className="relative h-full w-[98vw] max-h-[96vh] overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-950 shadow-2xl shadow-cyan-900/40">
            <button
              type="button"
              onClick={() => setActiveReplay(null)}
              className="absolute top-3 right-3 z-20 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-cyan-400/60"
            >
              Close
            </button>
            <div className="h-full overflow-hidden p-2 sm:p-3">
              <CodeReplay replay={activeReplay} />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Contest;
