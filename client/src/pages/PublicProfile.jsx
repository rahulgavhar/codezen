import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { useUser } from '@clerk/clerk-react';
import Header from '../components/Header';
import GuestHeader from '../components/GuestHeader';
import Footer from '../components/Footer';
import RatingGraph from '../components/RatingGraph';
import PageNotFound from './PageNotFound';
import axiosInstance from '../lib/axios.js';

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [userData, setUserData] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [username]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      
      // Fetch public profile from backend
      const response = await axiosInstance.get(`/api/users/public/${username}`);
      const profile = response.data;

      setUserData({
        username: profile.username,
        fullName: profile.display_name,
        avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        bio: profile.bio || 'No bio yet',
        rating: profile.rating || 0,
        maxRating: profile.max_rating || 0,
        problemsSolved: profile.problems_solved || 0,
        contestsParticipated: profile.contests_participated || 0,
        rank: getRank(profile.rating || 0),
        joinDate: profile.created_at,
        skills: profile.skills || [],
      });

      // For now, using empty activity/rating (API endpoints can be added later)
      setActivityData([]);
      setRatingData([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 404) {
        // User not found - redirect to 404
        setNotFound(true);
        setLoading(false);
        // Optionally navigate to PageNotFound
        setTimeout(() => navigate('/404'), 500);
      } else {
        setNotFound(true);
        setLoading(false);
      }
    }
  };

  const getRank = (rating) => {
    if (rating >= 2400) return 'Grandmaster';
    if (rating >= 2200) return 'Master';
    if (rating >= 2000) return 'Expert';
    if (rating >= 1800) return 'Specialist';
    if (rating >= 1600) return 'Apprentice';
    return 'Novice';
  };

  if (notFound) {
    return <PageNotFound />;
  }

  if (loading) {
    return (
      <>
        {isSignedIn ? <Header /> : <GuestHeader />}
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-300">Loading...</p>
        </div>
      </div>
        <Footer />
      </>
    );
  }

  if (!userData) {
    return <PageNotFound />;
  }

  const getHeatmapStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date;
  };

  return (
    <>
      {isSignedIn ? <Header /> : <GuestHeader />}
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
          
          {/* Hero Profile Section */}
          <div className="card bg-slate-900 shadow-2xl border border-slate-800 relative">
            {/* Expert Badge - Top Right */}
            <div className="absolute top-6 right-6">
              <span 
                className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider"
                style={{ 
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-content)'
                }}
              >
                {userData.rank}
              </span>
            </div>
            
            <div className="card-body p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                
                {/* Avatar with Glow Effect */}
                <div className="shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 accent-gradient rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <div className="avatar relative">
                      <div className="w-40 h-40 rounded-full ring-4 ring-offset-4 ring-offset-base-100" style={{ ringColor: 'var(--color-accent)' }}>
                        <img src={userData.avatar} alt={userData.username} className="rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Information */}
                <div className="flex-1 text-center lg:text-left space-y-4">
                  <div>
                    <h1 className="text-5xl font-black mb-2 bg-linear-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
                      {userData.fullName}
                    </h1>
                    <p className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-accent)' }}>
                      @{userData.username}
                    </p>
                    <p className="text-base-content/60 text-lg max-w-2xl">
                      {userData.bio}
                    </p>
                  </div>

                  {/* Skills & Badges */}
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    {userData.skills.map((skill, idx) => (
                      <span 
                        key={idx} 
                        className="px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border-2 transition-all hover:scale-105"
                        style={{ 
                          borderColor: 'var(--color-accent)',
                          color: 'white'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-base-content/60 pt-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" style={{ color: 'var(--color-info)' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>Joined {new Date(userData.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards with Enhanced Design */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Current Rating Card */}
            <div className="stat-card-hover card bg-slate-900 shadow-xl border-l-4 hover:border-l-8" style={{ borderColor: 'var(--color-info)' }}>
              <div className="card-body">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Current Rating</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-info)' }}>
                    {userData.rating}
                  </p>
                  <p className="text-xs text-slate-500">Peak: {userData.maxRating}</p>
                </div>
              </div>
            </div>

            {/* Problems Solved Card */}
            <div className="stat-card-hover card bg-slate-900 shadow-xl border-l-4 hover:border-l-8" style={{ borderColor: 'var(--color-accent)' }}>
              <div className="card-body">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Problems Solved</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-accent)' }}>
                    {userData.problemsSolved}
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
                    {userData.contestsParticipated}
                  </p>
                  <p className="text-xs text-slate-500">Participated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Progression Chart */}
          <div className="card bg-slate-900 shadow-xl border border-slate-800">
            <div className="card-body p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, var(--color-accent), var(--color-info))' }}></div>
                <h2 className="text-xl font-bold text-base-content">Rating Journey</h2>
              </div>
              <div className="w-full">
                {loading ? (
                  <div className="text-center text-sm text-base-content/70 py-6">
                    Loading rating history...
                  </div>
                ) : (
                  <>
                    <RatingGraph contestData={ratingData || []} />
                    {(!ratingData || ratingData.length === 0) && (
                      <div className="text-center text-sm text-base-content/60 py-4">
                        Participate in contests to build this user’s rating history!
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Activity Heatmap with Beautiful Header */}
          <div className="card bg-slate-900 shadow-xl border border-slate-800 max-md:hidden">
            <div className="card-body p-6 lg:p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, var(--color-accent), var(--color-info))' }}></div>
                  <h2 className="text-xl font-bold text-base-content">Contribution Activity</h2>
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
                
                <div className="w-full overflow-x-auto p-4 bg-base-200/30 rounded-xl">
                  {loading ? (
                    <div className="text-center text-sm text-base-content/70 py-6">
                      Loading activity history...
                    </div>
                  ) : (
                    <>
                      <CalendarHeatmap
                        startDate={getHeatmapStartDate()}
                        endDate={new Date()}
                        values={activityData || []}
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
                      {(!activityData || activityData.length === 0) && (
                        <div className="text-center text-sm text-base-content/60 py-4">
                          Start solving problems to build this user’s activity history!
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

export default PublicProfile;
