import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import axiosInstance from "../../lib/axios";

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
  const [registrants, setRegistrants] = useState([]);

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

        const [contestRes, problemsRes, submissionsRes, registrantsRes] = await Promise.all([
          axiosInstance.get(`/api/contests/${id}`),
          axiosInstance.get(`/api/contests/${id}/problems`),
          axiosInstance.get(`/api/contests/${id}/submissions`),
          axiosInstance.get(`/api/contests/${id}/registrants`, {
            params: { page: 1, limit: 50 },
          }),
        ]);

        const incomingProblems = Array.isArray(problemsRes.data) ? problemsRes.data : [];
        const mappedProblems = incomingProblems.map((problem, index) => ({
          ...problem,
          code: toProblemCode(problem.display_order, index),
        }));

        setContest(contestRes.data || null);
        setProblems(mappedProblems);
        setSubmissions(Array.isArray(submissionsRes.data) ? submissionsRes.data : []);
        setRegistrants(Array.isArray(registrantsRes.data?.data) ? registrantsRes.data.data : []);
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
        alert("Contest has ended.");
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

  const standings = useMemo(() => {
    if (!contest?.start_time || problems.length === 0) {
      return [];
    }

    const startTime = new Date(contest.start_time).getTime();
    if (Number.isNaN(startTime)) {
      return [];
    }

    const users = new Set();
    registrants.forEach((item) => users.add(item.clerk_user_id));
    submissions.forEach((item) => users.add(item.clerk_user_id));

    const submissionsAsc = [...submissions].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    const rows = Array.from(users).map((userId) => {
      const profileEntry = registrants.find((item) => item.clerk_user_id === userId);
      const handle =
        profileEntry?.username ||
        profileEntry?.display_name ||
        `${userId?.slice(0, 8) || "user"}...`;

      const perProblem = {};
      problems.forEach((problem) => {
        perProblem[problem.id] = {
          acceptedAt: null,
          wrongAttemptsBeforeAccepted: 0,
        };
      });

      submissionsAsc.forEach((entry) => {
        if (entry.clerk_user_id !== userId) return;

        const problemState = perProblem[entry.contest_problem_id];
        if (!problemState) return;

        const verdict = entry.verdict;
        if (!problemState.acceptedAt && verdict === "accepted") {
          problemState.acceptedAt = new Date(entry.submitted_at);
          return;
        }

        if (!problemState.acceptedAt && verdict && verdict !== "pending") {
          problemState.wrongAttemptsBeforeAccepted += 1;
        }
      });

      let solved = 0;
      let penalty = 0;
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

          solved += 1;
          penalty += problemPenalty;
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
        userId,
        handle,
        solved,
        penalty,
        problemResults,
      };
    });

    return rows
      .filter((row) => row.solved > 0 || Object.keys(row.problemResults).length > 0)
      .sort((a, b) => b.solved - a.solved || a.penalty - b.penalty || a.handle.localeCompare(b.handle))
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));
  }, [contest?.start_time, problems, registrants, submissions]);

  const contestStatus = useMemo(() => getContestStatus(contest), [contest, countdown]);

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
              <span className="text-xs text-slate-400">{standings.length} Participants</span>
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
                  {standings.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={problems.length + 4}>
                        No standings data available yet.
                      </td>
                    </tr>
                  )}
                  {standings.map((row) => (
                    <tr key={row.rank} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-cyan-200">{row.rank}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">{row.handle}</td>
                      {problems.map((problem) => {
                        const result = row.problemResults[problem.id];

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
