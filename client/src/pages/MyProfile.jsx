import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RatingGraph from '../components/RatingGraph';
import { useUserData } from '../redux/hooks/useUserData.js';
import { updateUserProfile } from '../redux/slices/userSlice.js';

const MyProfile = () => {
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get data from Redux
  const {
    profile,
    activity,
    ratingHistory,
    loading,
    activityLoading,
    ratingHistoryLoading,
    error,
    refetchUserData,
    refetchActivity,
    refetchRatingHistory,
  } = useUserData();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Redirect if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      navigate('/sign-in');
    }
  }, [isSignedIn, navigate]);

  // Initialize edit data when profile loads
  useEffect(() => {
    if (profile) {
      setEditData({
        username: profile.username || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await dispatch(updateUserProfile(editData)).unwrap();
      setIsEditing(false);
      refetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getHeatmapStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date;
  };

  if (!isSignedIn) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
        <Footer />
      </>
    );
  }

  if (loading || !profile) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen flex-col gap-4">
          <div className="text-error text-xl">Error loading profile</div>
          <button className="btn btn-primary" onClick={refetchUserData}>
            Retry
          </button>
        </div>
        <Footer />
      </>
    );
  }

  // Prepare display data with fallbacks
  const displayData = {
    username: profile.username || user?.username || 'user',
    display_name: profile.display_name || user?.fullName || 'User',
    avatar_url: profile.avatar_url || user?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
    bio: profile.bio || 'No bio yet',
    rating: profile.rating || 1200,
    max_rating: profile.max_rating || profile.rating || 1200,
    problems_solved: profile.problems_solved || 0,
    contests_participated: profile.contests_participated || 0,
    email: profile.email || user?.emailAddresses?.[0]?.emailAddress || '',
    created_at: profile.created_at,
    app_role: profile.app_role || 'user',
  };

  // Calculate rank based on rating
  const getRank = (rating) => {
    if (rating >= 2400) return 'Grandmaster';
    if (rating >= 2200) return 'Master';
    if (rating >= 2000) return 'Expert';
    if (rating >= 1800) return 'Specialist';
    if (rating >= 1600) return 'Apprentice';
    return 'Novice';
  };

  return (
    <>
      <Header />
      <style>{`
        :root {
          --color-accent: oklch(77% 0.152 181.912);
          --color-accent-content: oklch(38% 0.063 188.416);
          --color-info: oklch(74% 0.16 232.661);
        }
        .stat-card-hover {
          transition: all 0.3s ease;
        }
        .stat-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .accent-gradient {
          background: linear-gradient(135deg, var(--color-accent), var(--color-info));
        }
        .avatar-glow {
          box-shadow: 0 0 30px var(--color-accent);
        }
      `}</style>
      <div className="min-h-screen bg-slate-950 text-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Profile Header Card with Edit Toggle */}
          <div className="card bg-slate-900 shadow-2xl border border-slate-800 relative">
            {/* Edit Button - Top Right */}
            <div className="absolute top-6 right-6 z-10">
              <button
                onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  color: 'var(--color-accent)'
                }}
              >
                {isEditing ? '' : '✎ Edit'}
              </button>
            </div>

            <div className="card-body p-8 lg:p-12">
              {isEditing ? (
                // Edit Mode
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="shrink-0 flex justify-center">
                    <div className="avatar">
                      <div className="w-40 h-40 rounded-full ring-4 ring-offset-4" style={{ ringColor: 'var(--color-accent)', ringOffsetColor: '#0f172a' }}>
                        <img src={editData.avatar_url || displayData.avatar_url} alt={editData.username} className="rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-slate-300">Display Name</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered bg-slate-800 border-slate-700 text-slate-100 ml-10"
                        value={editData.display_name}
                        onChange={(e) => handleEditChange('display_name', e.target.value)}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-slate-300">Username</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered bg-slate-800 border-slate-700 text-slate-400 ml-10"
                        value={editData.username}
                        disabled
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-slate-300">Bio</span>
                      </label>
                      <textarea
                        className="textarea textarea-bordered h-24 bg-slate-800 border-slate-700 text-slate-100 ml-10"
                        value={editData.bio}
                        onChange={(e) => handleEditChange('bio', e.target.value)}
                      ></textarea>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-slate-300">Avatar URL</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered bg-slate-800 border-slate-700 text-slate-100 ml-10"
                        value={editData.avatar_url}
                        onChange={(e) => handleEditChange('avatar_url', e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        className="px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-accent-content)' }}
                        onClick={handleSave}
                      >
                        Save Changes
                      </button>
                      <button 
                        className="px-6 py-2 rounded-lg font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                  
                  {/* Avatar with Glow Effect */}
                  <div className="shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 accent-gradient rounded-full blur-2xl opacity-30 animate-pulse"></div>
                      <div className="avatar relative">
                        <div className="w-40 h-40 rounded-full ring-4 ring-offset-4" style={{ ringColor: 'var(--color-accent)', ringOffsetColor: '#0f172a' }}>
                          <img src={displayData.avatar_url} alt={displayData.username} className="rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="flex-1 text-center lg:text-left space-y-4">
                    <div>
                      <h1 className="text-5xl font-black mb-2 text-slate-50">
                        {displayData.display_name}
                      </h1>
                      <p className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-accent)' }}>
                        @{displayData.username}
                      </p>
                      <p className="text-slate-400 text-lg max-w-2xl mb-2">
                        {displayData.bio}
                      </p>
                      <p className="text-sm text-slate-500">{displayData.email}</p>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-slate-400 pt-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" style={{ color: 'var(--color-info)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>Joined {displayData.created_at ? new Date(displayData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Recently'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-3 py-1 rounded-lg text-xs font-bold uppercase"
                          style={{ 
                            background: 'var(--color-accent)',
                            color: 'var(--color-accent-content)'
                          }}
                        >
                          {getRank(displayData.rating)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Current Rating Card */}
            <div className="stat-card-hover card bg-slate-900 shadow-xl border-l-4 hover:border-l-8" style={{ borderColor: 'var(--color-info)' }}>
              <div className="card-body">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Current Rating</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-info)' }}>
                    {displayData.rating}
                  </p>
                  <p className="text-xs text-slate-500">Peak: {displayData.max_rating}</p>
                </div>
              </div>
            </div>

            {/* Problems Solved Card */}
            <div className="stat-card-hover card bg-slate-900 shadow-xl border-l-4 hover:border-l-8" style={{ borderColor: 'var(--color-accent)' }}>
              <div className="card-body">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Problems Solved</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-accent)' }}>
                    {displayData.problems_solved}
                  </p>
                  <p className="text-xs text-slate-500">Keep solving!</p>
                </div>
              </div>
            </div>

            {/* Contests Card */}
            <div className="stat-card-hover card bg-slate-900 shadow-xl border-l-4 hover:border-l-8" style={{ borderColor: 'var(--color-info)' }}>
              <div className="card-body">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Contests</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-info)' }}>
                    {displayData.contests_participated}
                  </p>
                  <p className="text-xs text-slate-500">Participated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Progression */}
          <div className="card bg-slate-900 shadow-xl border border-slate-800">
            <div className="card-body p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, var(--color-accent), var(--color-info))' }}></div>
                <h2 className="text-xl font-bold text-slate-50">Rating Journey</h2>
              </div>
              <div className="w-full">
                {ratingHistoryLoading ? (
                  <div className="text-center text-sm text-slate-400 py-6">
                    Loading rating history...
                  </div>
                ) : (
                  <>
                    <RatingGraph data={ratingHistory || []} />
                    {(!ratingHistory || ratingHistory.length === 0) && (
                      <div className="text-center text-sm text-slate-400 py-4">
                        Participate in contests to build your rating history!
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="card bg-slate-900 shadow-xl border border-slate-800 max-md:hidden">
            <div className="card-body p-6 lg:p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, var(--color-accent), var(--color-info))' }}></div>
                  <h2 className="text-xl font-bold text-slate-50">Contribution Activity</h2>
                </div>
                
                <style>{`
                  .react-calendar-heatmap .color-empty { 
                    fill: hsl(var(--b3) / 0.3); 
                    rx: 2;
                  }
                  .react-calendar-heatmap .color-scale-1 { 
                    fill: var(--color-accent);
                    opacity: 0.3;
                    rx: 2;
                  }
                  .react-calendar-heatmap .color-scale-2 { 
                    fill: var(--color-accent);
                    opacity: 0.5;
                    rx: 2;
                  }
                  .react-calendar-heatmap .color-scale-3 { 
                    fill: var(--color-accent);
                    opacity: 0.75;
                    rx: 2;
                  }
                  .react-calendar-heatmap .color-scale-4 { 
                    fill: var(--color-accent);
                    rx: 2;
                  }
                  .react-calendar-heatmap rect {
                    transition: all 0.2s ease;
                  }
                  .react-calendar-heatmap rect:hover { 
                    stroke: var(--color-info);
                    stroke-width: 0.5;
                  }
                  .react-calendar-heatmap .react-calendar-heatmap-month-label { 
                    fill: var(--color-gray-500);
                    font-size: 10px;
                    font-weight: 600;
                  }
                  .react-calendar-heatmap .react-calendar-heatmap-weekday-label { 
                    fill: hsl(var(--bc) / 0.6); 
                    font-size: 12px;
                    font-weight: 500;
                  }
                `}</style>
                
                <div className="w-full overflow-x-auto p-4 bg-slate-800/30 rounded-xl">
                  {activityLoading ? (
                    <div className="text-center text-sm text-slate-400 py-6">
                      Loading activity history...
                    </div>
                  ) : (
                    <>
                      <CalendarHeatmap
                        startDate={getHeatmapStartDate()}
                        endDate={new Date()}
                        values={activity || []}
                        classForValue={(value) => {
                          if (!value) return 'color-empty';
                          if (value.count < 3) return 'color-scale-1';
                          if (value.count < 6) return 'color-scale-2';
                          if (value.count < 9) return 'color-scale-3';
                          return 'color-scale-4';
                        }}
                        tooltipDataAttrs={(value) => ({
                          'data-tip': value?.date
                            ? `${value.count || 0} problems solved on ${value.date}`
                            : 'No activity',
                        })}
                      />
                      {(!activity || activity.length === 0) && (
                        <div className="text-center text-sm text-slate-400 py-4">
                          Start solving problems to build your activity history!
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default MyProfile;
