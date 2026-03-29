import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffContests = () => {
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, live, ended

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/api/contests');
        const staffContests = res.data.filter(c => c.created_by === profile?.clerk_user_id);
        setContests(staffContests);
      } catch (error) {
        console.error('Error fetching contests:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.clerk_user_id) {
      fetchContests();
    }
  }, [profile?.clerk_user_id]);

  const getContestStatus = (contest) => {
    const now = new Date();
    const start = new Date(contest.start_time);
    const end = new Date(contest.end_time);
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'live';
    return 'ended';
  };

  const filteredContests = contests.filter((contest) => {
    if (filter === 'all') return true;
    return getContestStatus(contest) === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: 'bg-blue-500/20 text-blue-400',
      live: 'bg-emerald-500/20 text-emerald-400',
      ended: 'bg-slate-500/20 text-slate-400',
    };
    return styles[status] || 'bg-slate-500/20 text-slate-400';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/staff/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Manage Contests</h1>
                <p className="mt-1 text-slate-400">Create and manage your contests</p>
              </div>
              <Link
                to="/staff/contests/create"
                className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600"
              >
                + New Contest
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-3">
            {['all', 'upcoming', 'live', 'ended'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 font-medium capitalize transition ${
                  filter === f
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Contests Grid */}
          {loading ? (
            <div className="text-center text-slate-400">Loading contests...</div>
          ) : filteredContests.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-slate-400">No contests found</p>
              <Link
                to="/staff/contests/create"
                className="mt-4 inline-block rounded-lg bg-cyan-500 px-6 py-2 font-medium text-white transition hover:bg-cyan-600"
              >
                Create Your First Contest
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContests.map((contest) => {
                const status = getContestStatus(contest);
                return (
                  <Link
                    key={contest.id}
                    to={`/staff/contests/${contest.id}`}
                    className="group rounded-lg border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/60 hover:bg-white/10"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <h3 className="font-semibold text-cyan-400 group-hover:text-cyan-300">
                        {contest.title}
                      </h3>
                      <span className={`rounded px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(status)}`}>
                        {status}
                      </span>
                    </div>
                    <p className="mb-4 line-clamp-2 text-sm text-slate-300">
                      {contest.description || 'No description'}
                    </p>
                    <div className="space-y-2 text-xs text-slate-400">
                      <p>
                        <span className="font-medium">Start:</span> {formatDate(contest.start_time)}
                      </p>
                      <p>
                        <span className="font-medium">End:</span> {formatDate(contest.end_time)}
                      </p>
                      {contest.max_participants && (
                        <p>
                          <span className="font-medium">Max:</span> {contest.max_participants} participants
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffContests;
