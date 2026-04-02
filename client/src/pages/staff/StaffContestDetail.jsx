import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

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
                              {String.fromCharCode(65 + idx)}
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
                              {registrant.last_active_at ? new Date(registrant.last_active_at).toLocaleString() : '—'}
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
                    <p className="font-medium">{new Date(contest.start_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">End</p>
                    <p className="font-medium">{new Date(contest.end_time).toLocaleString()}</p>
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
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffContestDetail;
