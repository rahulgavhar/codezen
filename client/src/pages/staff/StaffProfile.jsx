import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';
import { updateUserProfile } from '../../redux/slices/userSlice';

const StaffProfile = () => {
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }

  const dispatch = useDispatch();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contests, setContests] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });

      // Fetch staff's contests
      const fetchData = async () => {
        try {
          const contestsRes = await axiosInstance.get('/api/contests');
          const staffContests = contestsRes.data.filter(c => c.created_by === profile.clerk_user_id);
          setContests(staffContests);

          const interviewsRes = await axiosInstance.get('/api/interviews');
          const staffInterviews = interviewsRes.data.filter(i => i.interviewer_clerk_id === profile.clerk_user_id);
          setInterviews(staffInterviews);
        } catch (error) {
          console.error('Error fetching staff data:', error);
        }
      };

      fetchData();
    }
  }, [profile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.put('/api/users/profile', formData);
      dispatch(updateUserProfile(response.data));
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Staff Profile</h1>
            <p className="mt-1 text-slate-400">Manage your professional information</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Profile Card - Left Column */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                {/* Avatar */}
                <div className="mb-6 flex flex-col items-center">
                  <div className="h-24 w-24 rounded-full bg-linear-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-4xl font-bold text-white">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <p className="mt-3 font-medium text-emerald-400">{profile?.app_role}</p>
                </div>

                {/* Info */}
                <div className="mb-6 space-y-2 text-center">
                  <h2 className="text-2xl font-bold">{profile?.display_name}</h2>
                  {profile?.company_name && (
                    <p className="text-sm font-medium text-emerald-400">@{profile.company_name}</p>
                  )}
                  <p className="text-sm text-slate-400">{profile?.email}</p>
                  <p className="text-xs text-slate-500">
                    Member since {new Date(profile?.created_at).toLocaleDateString()}
                  </p>
                </div>

                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full rounded-lg bg-cyan-500/20 px-4 py-2 text-cyan-400 transition hover:bg-cyan-500/30"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Edit Form / Display - Right Column */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="space-y-6">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Display Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                        placeholder="Your name"
                      />
                    ) : (
                      <p className="mt-2 text-slate-50">{formData.display_name || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Bio</label>
                    {editMode ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows="4"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="mt-2 text-slate-50">{formData.bio || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {editMode && (
                    <div className="flex gap-3 pt-6">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-600"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          if (profile) {
                            setFormData({
                              display_name: profile.display_name || '',
                              bio: profile.bio || '',
                              avatar_url: profile.avatar_url || '',
                            });
                          }
                        }}
                        className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contests Section */}
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold">Contests Created ({contests.length})</h2>
            {contests.length === 0 ? (
              <p className="text-slate-400">No contests created yet</p>
            ) : (
              <div className="space-y-3">
                {contests.map((contest) => (
                  <div key={contest.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
                    <div>
                      <p className="font-medium">{contest.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(contest.start_time).toLocaleDateString()} - {new Date(contest.end_time).toLocaleDateString()}
                      </p>
                    </div>
                    <a href={`/contests/${contest.id}`} className="text-cyan-400 hover:underline">
                      View →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interviews Section */}
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold">Interviews Conducting ({interviews.length})</h2>
            {interviews.length === 0 ? (
              <p className="text-slate-400">No interviews scheduled yet</p>
            ) : (
              <div className="space-y-3">
                {interviews.slice(0, 10).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
                    <div>
                      <p className="font-medium">Interview with {interview.candidate_clerk_id}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(interview.start_time).toLocaleString()} - Status: <span className={
                          interview.status === 'Completed' ? 'text-emerald-400' :
                          interview.status === 'Ongoing' ? 'text-cyan-400' :
                          interview.status === 'Cancelled' ? 'text-red-400' :
                          'text-amber-400'
                        }>{interview.status}</span>
                      </p>
                    </div>
                    <a href={`/interview/${interview.id}`} className="text-cyan-400 hover:underline">
                      View →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold">Account Settings</h2>
            <div className="space-y-3">
              <button className="w-full rounded-lg border border-white/10 px-4 py-2 text-left transition hover:bg-white/5">
                <div className="flex justify-between">
                  <span>Email Notifications</span>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <button className="w-full rounded-lg border border-white/10 px-4 py-2 text-left transition hover:bg-white/5">
                <div className="flex justify-between">
                  <span>Privacy & Security</span>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <button className="w-full rounded-lg border border-white/10 px-4 py-2 text-left transition hover:bg-white/5">
                <div className="flex justify-between">
                  <span>Linked Accounts</span>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffProfile;
