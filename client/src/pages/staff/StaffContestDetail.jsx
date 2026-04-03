import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';
import CodeReplay from '../contest/CodeReplay';

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

const INDIA_TIMEZONE = 'Asia/Kolkata';

const formatIndiaDateTime = (value) => {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleString('en-IN', {
    timeZone: INDIA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
};

const StaffContestDetail = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [registrants, setRegistrants] = useState([]);
  const [registrantsPagination, setRegistrantsPagination] = useState({
    page: 1,
    limit: 10,
    count: 0,
    total: 0,
    pages: 0,
  });
  const [registrantsLoading, setRegistrantsLoading] = useState(false);
  const [registrantsPage, setRegistrantsPage] = useState(1);
  const [loading, setLoading] = useState(true);
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
  const [leaderboardError, setLeaderboardError] = useState('');
  const [activeReplay, setActiveReplay] = useState(null);

  useEffect(() => {
    const fetchContestData = async () => {
      try {
        setLoading(true);
        
        // Fetch contest
        const contestRes = await axiosInstance.get(`/api/contests/${contestId}`);
        setContest(contestRes.data);

        // Fetch problems in contest
        const problemsRes = await axiosInstance.get(`/api/contests/${contestId}/problems`);
        setProblems(problemsRes.data);
      } catch (error) {
        console.error('Error fetching contest:', error);
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchContestData();
    }
  }, [contestId]);

  useEffect(() => {
    const fetchRegistrants = async () => {
      try {
        setRegistrantsLoading(true);
        const registrantsRes = await axiosInstance.get(`/api/contests/${contestId}/registrants`, {
          params: {
            page: registrantsPage,
            limit: 10,
          },
        });

        setRegistrants(registrantsRes.data?.data || []);
        setRegistrantsPagination(registrantsRes.data?.pagination || {
          page: registrantsPage,
          limit: 10,
          count: 0,
          total: 0,
          pages: 0,
        });
      } catch (error) {
        console.error('Error fetching contest registrants:', error);
      } finally {
        setRegistrantsLoading(false);
      }
    };

    if (contestId) {
      fetchRegistrants();
    }
  }, [contestId, registrantsPage]);

  useEffect(() => {
    setLeaderboardPage(1);
  }, [contestId]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!contestId || !contest) {
        return;
      }

      if (getContestStatus(contest) !== 'ended') {
        setLeaderboardRows([]);
        setLeaderboardError('');
        return;
      }

      try {
        setLeaderboardLoading(true);
        setLeaderboardError('');
        const response = await axiosInstance.get(`/api/contests/${contestId}/leaderboard`, {
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
      } catch (error) {
        console.error('Failed to fetch contest leaderboard:', error);
        setLeaderboardRows([]);
        setLeaderboardError(error.response?.data?.message || 'Failed to load leaderboard');
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [contest, contestId, leaderboardPage, leaderboardPagination.limit]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!contestId || !contest || getContestStatus(contest) !== 'ended') {
        setSubmissions([]);
        return;
      }

      try {
        const response = await axiosInstance.get(`/api/contests/${contestId}/submissions`);
        setSubmissions(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch contest submissions:', error);
        setSubmissions([]);
      }
    };

    fetchSubmissions();
  }, [contest, contestId]);

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

        if (!problemState.acceptedAt && entry.verdict === 'accepted') {
          problemState.acceptedAt = new Date(entry.submitted_at);
          return;
        }

        if (!problemState.acceptedAt && entry.verdict && entry.verdict !== 'pending') {
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

  const openReplay = async (row, problem, result) => {
    const acceptedSubmission = submissions
      .filter(
        (entry) =>
          entry.clerk_user_id === row.userId &&
          entry.contest_problem_id === problem.id &&
          entry.verdict === 'accepted'
      )
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())[0];

    setActiveReplay({
      rank: row.rank,
      handle: row.handle,
      problemCode: toProblemCode(problem.display_order),
      problemTitle: problem.title,
      penalty: result.penalty,
      sourceCode: acceptedSubmission?.source_code || '',
      submittedAt: acceptedSubmission?.submitted_at || null,
      events: [],
      loading: true,
    });

    try {
      const replayResponse = await axiosInstance.get(`/api/contests/${contestId}/replay`, {
        params: {
          contest_problem_id: problem.id,
          clerk_user_id: row.userId,
        },
      });

      const replayEvents = Array.isArray(replayResponse.data?.events)
        ? replayResponse.data.events
        : [];

      setActiveReplay((current) =>
        current
          ? {
              ...current,
              events: replayEvents,
              loading: false,
            }
          : current
      );
    } catch (error) {
      console.warn('Replay timeline lookup failed; using source-code fallback:', error.message);
      setActiveReplay((current) =>
        current
          ? {
              ...current,
              loading: false,
            }
          : current
      );
    }
  };

  const getContestStatus = (c) => {
    if (!c) return 'upcoming';
    const now = new Date();
    const start = new Date(c.start_time);
    const end = new Date(c.end_time);
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'live';
    return 'ended';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400">Contest not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const status = getContestStatus(contest);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">          {/* Breadcrumb */}
          <Link to="/staff/contests" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition">
            ← Back to Contests
          </Link>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">{contest.title}</h1>
                <span className={`rounded px-3 py-1 capitalize text-sm font-medium ${
                  status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                  status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {status}
                </span>
              </div>
              <p className="mt-1 text-slate-400">{contest.description}</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Problems */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Problems ({problems.length})</h2>
                </div>
                {problems.length === 0 ? (
                  <p className="text-slate-400">No problems added yet</p>
                ) : (
                  <div className="space-y-2">
                    {problems.map((problem, idx) => (
                      <div key={problem.id} className="rounded border border-white/5 bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-medium text-cyan-400">
                              {toProblemCode(problem.display_order, idx)}
                            </span>
                            <div>
                              <p className="font-medium">{problem.problem?.title}</p>
                              <p className="text-xs text-slate-500">{problem.points} points</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Registrants */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Recent Registrants ({registrantsPagination.total})</h2>
                  <p className="text-xs text-slate-400">
                    Page {registrantsPagination.page} of {registrantsPagination.pages || 1}
                  </p>
                </div>

                {registrantsLoading ? (
                  <p className="text-slate-400">Loading registrants...</p>
                ) : registrants.length === 0 ? (
                  <p className="text-slate-400">No registrants yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-slate-400">Display Name</th>
                          <th className="text-left py-2 text-slate-400">Username</th>
                          <th className="text-left py-2 text-slate-400">User ID</th>
                          <th className="text-left py-2 text-slate-400">Last Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrants.map((registrant) => (
                          <tr key={registrant.clerk_user_id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2">{registrant.display_name || '—'}</td>
                            <td className="py-2">{registrant.username || '—'}</td>
                            <td className="py-2 font-mono text-xs">{registrant.clerk_user_id}</td>
                            <td className="py-2 text-xs text-slate-500">
                              {formatIndiaDateTime(registrant.last_active_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setRegistrantsPage((prev) => Math.max(prev - 1, 1))}
                    disabled={registrantsPagination.page <= 1 || registrantsLoading}
                    className="rounded-lg border border-white/10 px-3 py-1 text-sm transition hover:bg-white/5 disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="text-xs text-slate-400">
                    Showing {registrantsPagination.count} of {registrantsPagination.total}
                  </span>

                  <button
                    onClick={() => setRegistrantsPage((prev) => prev + 1)}
                    disabled={registrantsLoading || registrantsPagination.page >= (registrantsPagination.pages || 1)}
                    className="rounded-lg border border-white/10 px-3 py-1 text-sm transition hover:bg-white/5 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contest Info */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 font-bold">Contest Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400">Start</p>
                    <p className="font-medium">{formatIndiaDateTime(contest.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">End</p>
                    <p className="font-medium">{formatIndiaDateTime(contest.end_time)}</p>
                  </div>
                  {contest.max_participants && (
                    <div>
                      <p className="text-slate-400">Max Participants</p>
                      <p className="font-medium">{contest.max_participants}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400">Rated</p>
                    <p className="font-medium">{contest.is_rated ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 font-bold">Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registrations</span>
                    <span className="font-medium">{registrantsPagination.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Page Size</span>
                    <span className="font-medium">{registrantsPagination.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Problems</span>
                    <span className="font-medium">{problems.length}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => navigate('/staff/contests')}
                className="w-full rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
              >
                Back to Contests
              </button>
            </div>
          </div>

          {status === 'ended' && (
            <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
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
        </div>
      </div>

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

export default StaffContestDetail;
