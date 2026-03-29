import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffInterviews = () => {
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, ongoing, completed, cancelled

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/api/interviews');
        const staffInterviews = res.data.filter(i => i.interviewer_clerk_id === profile?.clerk_user_id);
        setInterviews(staffInterviews);
      } catch (error) {
        console.error('Error fetching interviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.clerk_user_id) {
      fetchInterviews();
    }
  }, [profile?.clerk_user_id]);

  const filteredInterviews = interviews.filter((interview) => {
    if (filter === 'all') return true;
    return interview.status.toLowerCase() === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-500/20 text-blue-400',
      ongoing: 'bg-cyan-500/20 text-cyan-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return styles[status.toLowerCase()] || 'bg-slate-500/20 text-slate-400';
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
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
                <h1 className="text-3xl font-bold">Manage Interviews</h1>
                <p className="mt-1 text-slate-400">Schedule and manage your interviews</p>
              </div>
              <Link
                to="/staff/interviews/schedule"
                className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600"
              >
                + Schedule Interview
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-3 overflow-x-auto">
            {['all', 'scheduled', 'ongoing', 'completed', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 font-medium capitalize whitespace-nowrap transition ${
                  filter === f
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Interviews List */}
          {loading ? (
            <div className="text-center text-slate-400">Loading interviews...</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-slate-400">No interviews found</p>
              <Link
                to="/staff/interviews/schedule"
                className="mt-4 inline-block rounded-lg bg-cyan-500 px-6 py-2 font-medium text-white transition hover:bg-cyan-600"
              >
                Schedule Your First Interview
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterviews.map((interview) => (
                <Link
                  key={interview.id}
                  to={`/staff/interviews/${interview.id}`}
                  className="group rounded-lg border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/60 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="font-semibold text-cyan-400 group-hover:text-cyan-300">
                          Interview with {interview.candidate_clerk_id}
                        </h3>
                        <span className={`rounded px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(interview.status)}`}>
                          {interview.status}
                        </span>
                      </div>
                      <p className="mb-3 text-sm text-slate-400">
                        {formatDateTime(interview.start_time)} - {formatDateTime(interview.end_time)}
                      </p>
                      <div className="flex gap-4 text-xs text-slate-500">
                        {interview.room_id && (
                          <span>
                            <span className="font-medium">Room:</span> {interview.room_id}
                          </span>
                        )}
                        {interview.problem_id && (
                          <span>
                            <span className="font-medium">Problem:</span> {interview.problem_id}
                          </span>
                        )}
                        {interview.technical_score && (
                          <span>
                            <span className="font-medium">Score:</span> {interview.technical_score}/100
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffInterviews;
