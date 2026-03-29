import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffInterviews = () => {
  const profile = useSelector((state) => state.user?.profile);
  const navigate = useNavigate();
  
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
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ongoing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[status.toLowerCase()] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'text-emerald-400',
      medium: 'text-amber-400',
      hard: 'text-red-400',
    };
    return colors[difficulty?.toLowerCase()] || 'text-slate-400';
  };

  const getInterviewDuration = (start, end) => {
    const ms = new Date(end) - new Date(start);
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
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
                  className="group block rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 p-5 transition hover:border-cyan-400/60 hover:from-white/10 hover:to-white/5"
                >
                  <div className="space-y-4">
                    {/* Top Row: Title and Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-100 group-hover:text-cyan-300 transition truncate">
                          {interview.problem?.title || 'Interview'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400 truncate">
                          Candidate: {interview.candidate_clerk_id}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(interview.status)}`}>
                        {interview.status}
                      </span>
                    </div>

                    {/* Middle Row: Date/Time and Duration */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span>📅</span>
                        <span>{new Date(interview.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span>🕐</span>
                        <span>{new Date(interview.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <span>⏱</span>
                        <span>{getInterviewDuration(interview.start_time, interview.end_time)}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Problem Details and Actions */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {interview.problem?.difficulty && (
                          <span className="flex items-center gap-1">
                            <span>◆</span>
                            <span className={getDifficultyColor(interview.problem.difficulty)}>
                              {interview.problem.difficulty.charAt(0).toUpperCase() + interview.problem.difficulty.slice(1)}
                            </span>
                          </span>
                        )}
                        {interview.technical_score !== null && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span>⭐</span>
                            <span>{interview.technical_score}/100</span>
                          </span>
                        )}
                        {interview.room_id && (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <span>🔗</span>
                            <span className="font-mono">{interview.room_id.substring(0, 12)}...</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(interview.status === 'Scheduled' || interview.status === 'Ongoing') && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/interview/${interview.id}`);
                            }}
                            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition border border-emerald-500/30 hover:border-emerald-500/50"
                          >
                            Join Interview
                          </button>
                        )}
                        <span className="inline-block rounded bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-300 group-hover:bg-cyan-500/30 transition">
                          View Details →
                        </span>
                      </div>
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
