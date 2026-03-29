import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffDashboard = () => {
  const profile = useSelector((state) => state.user?.profile);
  const navigate = useNavigate();
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }

  const [contests, setContests] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);
        
        // Fetch contests created by this staff member
        const contestsRes = await axiosInstance.get('/api/contests');
        const staffContests = contestsRes.data.filter(c => c.created_by === profile?.clerk_user_id);
        setContests(staffContests);

        // Fetch interviews where this staff is the interviewer
        const interviewsRes = await axiosInstance.get('/api/interviews');
        const staffInterviews = interviewsRes.data.filter(i => i.interviewer_clerk_id === profile?.clerk_user_id);
        setInterviews(staffInterviews);
      } catch (err) {
        console.error('Error fetching staff data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (profile?.clerk_user_id) {
      fetchStaffData();
    }
  }, [profile?.clerk_user_id]);

  const upcomingInterviews = interviews.filter(i => i.status === 'Scheduled');
  const liveContests = contests.filter(c => {
    const now = new Date();
    const start = new Date(c.start_time);
    const end = new Date(c.end_time);
    return now >= start && now < end;
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      time: 'short',
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="mt-1 text-slate-400">
              Welcome, <span className="font-semibold text-cyan-400">{profile?.display_name}</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/staff/contests/create" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10">
                <span className="text-2xl">🎮</span>
                <div className="text-left">
                  <p className="font-semibold">Create Contest</p>
                  <p className="text-xs text-slate-400">Host new contest</p>
                </div>
              </Link>

              <Link to="/staff/interviews/schedule" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10">
                <span className="text-2xl">📹</span>
                <div className="text-left">
                  <p className="font-semibold">Schedule Interview</p>
                  <p className="text-xs text-slate-400">Book new interview</p>
                </div>
              </Link>

              <Link to="/staff/contests" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10">
                <span className="text-2xl">🏆</span>
                <div className="text-left">
                  <p className="font-semibold">My Contests</p>
                  <p className="text-xs text-slate-400">View all contests</p>
                </div>
              </Link>

              <Link to="/staff/interviews" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10">
                <span className="text-2xl">👥</span>
                <div className="text-left">
                  <p className="font-semibold">My Interviews</p>
                  <p className="text-xs text-slate-400">Manage interviews</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Live Contests */}
          {liveContests.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-bold">🔴 Live Contests ({liveContests.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {liveContests.map((contest) => (
                  <Link key={contest.id} to={`/staff/contests/${contest.id}`} className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-cyan-400">{contest.title}</h3>
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <p className="text-sm text-slate-400">{contest.description?.slice(0, 60)}...</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Ends: {formatDateTime(contest.end_time)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Interviews */}
          {upcomingInterviews.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-bold">📅 Upcoming Interviews ({upcomingInterviews.length})</h2>
              <div className="grid gap-4">
                {upcomingInterviews.slice(0, 5).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                    <div>
                      <p className="font-semibold">Interview with {interview.candidate_clerk_id}</p>
                      <p className="text-sm text-slate-400">Status: <span className="text-amber-400">{interview.status}</span></p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(interview.start_time)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(interview.status === 'Scheduled' || interview.status === 'Ongoing') && (
                        <button
                          onClick={() => navigate(`/interview/${interview.id}`)}
                          className="rounded-lg bg-emerald-500/20 px-4 py-2 text-emerald-400 transition hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50"
                        >
                          Join
                        </button>
                      )}
                      <Link to={`/staff/interviews/${interview.id}`} className="rounded-lg bg-cyan-500/20 px-4 py-2 text-cyan-400 transition hover:bg-cyan-500/30">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Contests */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold">Your Contests</h2>
            {contests.length === 0 ? (
              <p className="text-slate-400">No contests created yet</p>
            ) : (
              <div className="space-y-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-slate-400">Title</th>
                      <th className="text-left py-2 text-slate-400">Start Date</th>
                      <th className="text-left py-2 text-slate-400">Participants</th>
                      <th className="text-left py-2 text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contests.slice(0, 5).map((contest) => {
                      const now = new Date();
                      const start = new Date(contest.start_time);
                      const end = new Date(contest.end_time);
                      let status = 'Upcoming';
                      if (now >= start && now < end) status = 'Live';
                      if (now >= end) status = 'Ended';

                      return (
                        <tr key={contest.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3">{contest.title}</td>
                          <td className="py-3 text-slate-400">{formatDate(contest.start_time)}</td>
                          <td className="py-3 text-slate-400">-</td>
                          <td className="py-3">
                            <span className={`rounded px-2 py-1 text-xs font-medium ${
                              status === 'Live' ? 'bg-emerald-500/20 text-emerald-400' :
                              status === 'Upcoming' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffDashboard;
