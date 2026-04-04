import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import axiosInstance from "../../lib/axios";
import toast from "react-hot-toast";

const contestLifecycleToastStyle = {
  border: "1px solid rgba(250, 204, 21, 0.35)",
  background: "rgba(15, 23, 42, 0.96)",
  color: "#e2e8f0",
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

const formatProblemTitle = (title, displayOrder, fallbackIndex = 0) => {
  const code = toProblemCode(displayOrder, fallbackIndex);
  return `${code}. ${title || "Untitled problem"}`;
};

const formatVerdictLabel = (value) => {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const verdictTone = (verdict) => {
  if (verdict === "accepted") return "text-emerald-400";
  if (verdict === "pending") return "text-sky-300";
  return "text-amber-300";
};

const formatSubmissionTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getContestStatus = (contest) => {
  if (!contest?.start_time || !contest?.end_time) return "Upcoming";

  const now = new Date();
  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);

  if (now < start) return "Upcoming";
  if (now >= start && now < end) return "Live";
  return "Ended";
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

const LEADERBOARD_LIMIT = 25;
const LEADERBOARD_POLL_INTERVAL_MS = 60_000;

const OngoingContest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isLoaded, isSignedIn } = useUser();
  const hasEndPopupShownRef = useRef(false);
  const profile = useSelector((state) => state.user?.profile);
  const [activeTab, setActiveTab] = useState("problems");
  const [isAccessChecking, setIsAccessChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contest, setContest] = useState(null);
  const [countdownLabel, setCountdownLabel] = useState("Ends in");
  const [countdown, setCountdown] = useState("--:--:--");
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [standings, setStandings] = useState([]);
  const [leaderboardPagination, setLeaderboardPagination] = useState({
    page: 1,
    limit: LEADERBOARD_LIMIT,
    count: 0,
    total: 0,
    pages: 0,
  });
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [myStanding, setMyStanding] = useState(null);

  useEffect(() => {
    hasEndPopupShownRef.current = false;
  }, [id]);

  useEffect(() => {
    if (profile?.app_role === "staff") {
      navigate("/staff/dashboard", { replace: true });
    }
  }, [navigate, profile?.app_role]);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!id || !isLoaded) {
        return;
      }

      if (!isSignedIn) {
        alert("Please sign in to join the contest.");
        navigate("/sign-in", { replace: true });
        return;
      }

      try {
        const statusResponse = await axiosInstance.get(
          `/api/contests/${id}/registration-status`
        );

        if (!statusResponse.data?.registered) {
          alert("Only registered participants can join this contest.");
          navigate(`/contest/${id}`, { replace: true });
          return;
        }

        setIsAccessChecking(false);
      } catch (err) {
        console.error("Failed to verify contest access:", err);
        alert("Unable to verify contest registration.");
        navigate(`/contest/${id}`, { replace: true });
      }
    };

    verifyAccess();
  }, [id, isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const fetchContestData = async () => {
      try {
        setLoading(true);
        setError("");

        const [contestRes, problemsRes, submissionsRes] = await Promise.all([
          axiosInstance.get(`/api/contests/${id}`),
          axiosInstance.get(`/api/contests/${id}/problems`),
          axiosInstance.get(`/api/contests/${id}/submissions`),
        ]);

        const incomingProblems = Array.isArray(problemsRes.data) ? problemsRes.data : [];
        const mappedProblems = incomingProblems.map((problem, index) => ({
          ...problem,
          code: toProblemCode(problem.display_order, index),
        }));

        setContest(contestRes.data || null);
        setProblems(mappedProblems);
        setSubmissions(Array.isArray(submissionsRes.data) ? submissionsRes.data : []);
      } catch (err) {
        console.error("Failed to load ongoing contest data:", err);
        setError(err.response?.data?.message || "Failed to load ongoing contest data");
      } finally {
        setLoading(false);
      }
    };

    if (id && !isAccessChecking) {
      fetchContestData();
    }
  }, [id, isAccessChecking]);

  useEffect(() => {
    if (!id || isAccessChecking || !contest) {
      return undefined;
    }

    let cancelled = false;

    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true);
        setLeaderboardError("");

        const response = await axiosInstance.get(`/api/contests/${id}/leaderboard`, {
          params: {
            page: 1,
            limit: LEADERBOARD_LIMIT,
            clerk_user_id: user?.id,
          },
        });

        if (cancelled) {
          return;
        }

        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const pagination = response.data?.pagination || {
          page: 1,
          limit: LEADERBOARD_LIMIT,
          count: rows.length,
          total: rows.length,
          pages: rows.length > 0 ? 1 : 0,
        };

        setStandings(rows);
        setLeaderboardPagination(pagination);
        setMyStanding(response.data?.my_standing || null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load live leaderboard:", err);
        setStandings([]);
        setMyStanding(null);
        setLeaderboardError(err.response?.data?.message || "Failed to load live leaderboard");
      } finally {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      }
    };

    fetchLeaderboard();

    if (getContestStatus(contest) !== "Live") {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = setInterval(fetchLeaderboard, LEADERBOARD_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [contest, id, isAccessChecking, user?.id]);

  useEffect(() => {
    if (!contest?.start_time || !contest?.end_time) {
      return undefined;
    }

    const tick = () => {
      const status = getContestStatus(contest);

      if (status === "Upcoming") {
        setCountdownLabel("Starts in");
        setCountdown(formatCountdown(new Date(contest.start_time)));
        return;
      }

      if (status === "Live") {
        setCountdownLabel("Ends in");
        setCountdown(formatCountdown(new Date(contest.end_time)));
        return;
      }

      setCountdownLabel("Ended");
      setCountdown("00:00:00");

      if (!hasEndPopupShownRef.current) {
        hasEndPopupShownRef.current = true;
        toast("Contest has ended. Redirecting to contest page.", {
          id: "contest-ended-toast",
          position: "top-center",
          duration: 2800,
          style: contestLifecycleToastStyle,
        });
        navigate(`/contest/${id}/info`, { replace: true });
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [contest, id, navigate]);

  const submissionsByProblem = useMemo(() => {
    const counts = new Map();
    submissions.forEach((entry) => {
      const key = entry.contest_problem_id;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [submissions]);

  const mySubmissions = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    return submissions
      .filter((entry) => entry.clerk_user_id === user.id)
      .map((entry) => {
        const matchingProblem = problems.find((problem) => problem.id === entry.contest_problem_id);
        const rawTitle = entry.contest_problem?.title || matchingProblem?.title;
        const displayOrder = entry.contest_problem?.display_order || matchingProblem?.display_order;
        return {
          ...entry,
          title: formatProblemTitle(rawTitle, displayOrder),
        };
      });
  }, [problems, submissions, user?.id]);

  const contestStatus = useMemo(() => getContestStatus(contest), [contest, countdown]);
  const displayStandings = useMemo(
    () => standings.filter((row) => row.userId !== myStanding?.userId),
    [standings, myStanding?.userId]
  );

  if (isAccessChecking || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <Header />
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
        <Header />
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Header />

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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Ongoing Contest</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{contest.title}</h1>
          <p className="text-sm text-slate-300 sm:text-base">Track problems, submit solutions, and watch the standings live.</p>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
            <span className="text-slate-200">{countdownLabel}</span>
            <span className="rounded-full border border-cyan-600/80 px-2 py-0.5 text-[11px] tracking-wide">
              {countdown}
            </span>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-2">
          {[
            { key: "problems", label: "Problems" },
            { key: "submissions", label: "My Submissions" },
            { key: "standings", label: "Standings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-cyan-600 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "problems" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Problems</h2>
              <span className="text-xs text-slate-400">{problems.length} listed</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-right font-semibold">Submissions</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {problems.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                        No problems found for this contest.
                      </td>
                    </tr>
                  )}
                  {problems.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-cyan-200">{p.code}</td>
                      <td className="px-4 py-3">{formatProblemTitle(p.title, p.display_order)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{submissionsByProblem.get(p.id) || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/contest/${id}/problem/${p.id}`)}
                          className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                        >
                          Solve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "submissions" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Submissions</h2>
              <span className="text-xs text-slate-400">Recent</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Verdict</th>
                    <th className="px-4 py-3 text-left font-semibold">Language</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mySubmissions.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                        You have not submitted any solution in this contest yet.
                      </td>
                    </tr>
                  )}
                  {mySubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-slate-100">{s.title}</td>
                      <td className="px-4 py-3 text-slate-300">{formatSubmissionTime(s.submitted_at)}</td>
                      <td className={`px-4 py-3 font-semibold ${verdictTone(s.verdict)}`}>
                        {formatVerdictLabel(s.verdict)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{s.language || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "standings" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span>Standings</span>
                {contestStatus === "Live" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                )}
              </h2>
              <span className="text-xs text-slate-400">{leaderboardPagination.total || standings.length} Participants</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm min-w-225">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Rank</th>
                    <th className="px-4 py-3 text-left font-semibold">Handle</th>
                    {problems.map((problem) => (
                      <th key={problem.id} className="px-4 py-3 text-center font-semibold">
                        {problem.code}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold">Solved</th>
                    <th className="px-4 py-3 text-left font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboardLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={problems.length + 4}>
                        Loading live standings...
                      </td>
                    </tr>
                  ) : leaderboardError ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-rose-300" colSpan={problems.length + 4}>
                        {leaderboardError}
                      </td>
                    </tr>
                  ) : standings.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={problems.length + 4}>
                        No standings data available yet.
                      </td>
                    </tr>
                  ) : null}
                  {myStanding && (
                    <tr className="bg-cyan-500/10 hover:bg-cyan-500/15">
                      <td className="px-4 py-3 font-semibold text-cyan-200">{myStanding.rank}</td>
                      <td className="px-4 py-3 font-semibold text-cyan-100">
                        {myStanding.handle} (You)
                      </td>
                      {problems.map((problem) => {
                        const result = myStanding.problemResults?.[problem.id];

                        if (!result) {
                          return <td key={`my-${problem.id}`} className="px-4 py-3 text-center text-slate-500" />;
                        }

                        return (
                          <td key={`my-${problem.id}`} className="px-4 py-3 text-center">
                            {result.solved ? (
                              <span className="font-semibold text-emerald-400">+{result.penalty}</span>
                            ) : (
                              <span className="font-semibold text-rose-300">-{result.penalty}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 font-semibold text-cyan-100">{myStanding.solved}</td>
                      <td className="px-4 py-3 font-semibold text-cyan-100">{myStanding.penalty}</td>
                    </tr>
                  )}
                  {displayStandings.map((row) => (
                    <tr key={row.rank} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-cyan-200">{row.rank}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">{row.handle}</td>
                      {problems.map((problem) => {
                        const result = row.problemResults?.[problem.id];

                        if (!result) {
                          return <td key={`${row.rank}-${problem.id}`} className="px-4 py-3 text-center text-slate-500" />;
                        }

                        return (
                          <td key={`${row.rank}-${problem.id}`} className="px-4 py-3 text-center">
                            {result.solved ? (
                              <span className="font-semibold text-emerald-400">+{result.penalty}</span>
                            ) : (
                              <span className="font-semibold text-rose-300">-{result.penalty}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-slate-300">{row.solved}</td>
                      <td className="px-4 py-3 text-slate-300">{row.penalty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default OngoingContest;
