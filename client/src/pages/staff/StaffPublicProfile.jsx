import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffPublicProfile = () => {
  const { staffId, username } = useParams();
  const [staffProfile, setStaffProfile] = useState(null);
  const [contests, setContests] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [resolvedStaffId, setResolvedStaffId] = useState(null);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);
        let staffIdToUse = staffId;

        // If username is provided (from /profile/:username route), fetch profile first
        if (username && !staffId) {
          const profileRes = await axiosInstance.get(`/api/users/public/${username}`);
          staffIdToUse = profileRes.data.clerk_user_id;
          setStaffProfile(profileRes.data);
          setResolvedStaffId(staffIdToUse);
        } else if (staffId) {
          // If staffId is provided (from /staff/:staffId route)
          const profileRes = await axiosInstance.get(`/api/users/${staffId}/profile`);
          setStaffProfile(profileRes.data);
          setResolvedStaffId(staffId);
        }

        if (!staffIdToUse) {
          throw new Error('Unable to resolve staff ID');
        }

        // TODO: Fetch contests created by this staff (endpoint not yet implemented)
        // const contestsRes = await axiosInstance.get('/api/contests');
        // const staffContests = contestsRes.data.filter(c => c.created_by === staffIdToUse);
        // setContests(staffContests);

        // Fetch interviews where this staff is interviewer
        const interviewsRes = await axiosInstance.get('/api/interviews');
        const staffInterviews = interviewsRes.data.filter(i => i.interviewer_clerk_id === staffIdToUse);
        setInterviews(staffInterviews);
      } catch (err) {
        setError('Failed to load staff profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (staffId || username) {
      fetchStaffData();
    }
  }, [staffId, username]);

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

  if (error || !staffProfile) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400">{error || 'Staff member not found'}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const completedInterviews = interviews.filter(i => i.status === 'Completed');
  const upcomingInterviews = interviews.filter(i => i.status === 'Scheduled');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'Scheduled':
        return 'bg-amber-500/20 text-amber-400';
      case 'Ongoing':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'Cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyStaffId = async () => {
    try {
      const idToCopy = resolvedStaffId || staffProfile?.clerk_user_id;
      if (!idToCopy) {
        console.error('No staff ID available to copy');
        return;
      }
      await navigator.clipboard.writeText(idToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Profile Banner */}
          <div className="mb-8 rounded-lg border border-white/10 bg-linear-to-r from-cyan-500/10 to-emerald-500/10 p-8 backdrop-blur">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="h-24 w-24 rounded-full bg-linear-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-4xl font-bold text-white">
                  {staffProfile.display_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-1 justify-center sm:justify-start">
                  <h1 className="text-3xl font-bold">{staffProfile.display_name}</h1>
                  <button
                    onClick={handleCopyStaffId}
                    className="inline-flex items-center justify-center p-1 rounded hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 shrink-0"
                    title={`Copy user ID: ${resolvedStaffId || staffId}`}
                  >
                    {!isCopied ? (
                      <svg className="w-5 h-5 text-slate-400 hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
                {staffProfile.company_name && (
                  <p className="mt-1 text-lg font-medium text-emerald-400">@{staffProfile.company_name}</p>
                )}
                <p className="mt-2 text-slate-400">{staffProfile.bio || 'No bio provided'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Member since {new Date(staffProfile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Contests Section - Hidden until API endpoint is implemented */}
          {/* <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold">Contests Created ({contests.length})</h2>
            {contests.length === 0 ? (
              <p className="text-slate-400">No contests created</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {contests.slice(0, 6).map((contest) => {
                  const now = new Date();
                  const start = new Date(contest.start_time);
                  const end = new Date(contest.end_time);
                  let status = 'Upcoming';
                  if (now >= start && now < end) status = 'Live';
                  if (now >= end) status = 'Ended';

                  return (
                    <a
                      key={contest.id}
                      href={`/contests/${contest.id}`}
                      className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold text-cyan-400">{contest.title}</h3>
                        <span className={`rounded px-2 py-1 text-xs font-medium ${
                          status === 'Live' ? 'bg-emerald-500/20 text-emerald-400' :
                          status === 'Upcoming' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{contest.description?.slice(0, 60)}...</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(contest.start_time).toLocaleDateString()}
                      </p>
                    </a>
                  );
                })}
              </div>
            )}
          </div> */}

          {/* Upcoming Interviews */}
          {upcomingInterviews.length > 0 && (
            <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-bold">Upcoming Interviews ({upcomingInterviews.length})</h2>
              <div className="space-y-3">
                {upcomingInterviews.slice(0, 5).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
                    <div>
                      <p className="font-medium">Interview scheduled</p>
                      <p className="text-xs text-slate-400">{formatDateTime(interview.start_time)}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(interview.status)}`}>
                      {interview.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Interviews & Experience */}
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold">Experience</h2>
            <div className="grid gap-4 sm:grid-cols-1">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Interviews Conducted</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{completedInterviews.length}</p>
                <p className="mt-1 text-xs text-slate-500">Completed interviews</p>
              </div>
              {/* Contests section hidden until API endpoint is implemented */}
              {/* <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Contests Created</p>
                <p className="mt-2 text-3xl font-bold text-cyan-400">{contests.length}</p>
                <p className="mt-1 text-xs text-slate-500">Total contests</p>
              </div> */}
            </div>
          </div>

          {/* Availability Section */}
          {upcomingInterviews.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-bold">Availability</h2>
              <div className="text-sm text-slate-400">
                <p>{upcomingInterviews.length} interview slot(s) available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffPublicProfile;
