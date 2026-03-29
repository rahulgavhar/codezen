import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfile } from '../redux/slices/userSlice';
import Footer from '../components/Footer';

const Onboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const profile = useSelector((state) => state.user?.profile);

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setError(null);
    setIsLoading(true);

    try {
      // Update app_role on backend
      await dispatch(updateUserProfile({ app_role: role })).unwrap();

      // Redirect to dashboard
      navigate('/');
    } catch (err) {
      setError(err || 'Failed to complete onboarding');
      setSelectedRole(null);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-500/20 font-mono text-2xl text-cyan-300">
                &gt;_
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold">Welcome to Codezen</h1>
            <p className="text-slate-400">
              Choose your journey and let's get started
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            {/* User Role */}
            <button
              onClick={() => handleRoleSelect('user')}
              disabled={isLoading}
              className={`relative w-full overflow-hidden rounded-lg border-2 px-6 py-8 text-left transition-all ${ selectedRole === 'user' && !isLoading
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-white/10 bg-white/5 hover:border-cyan-400/60'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isLoading && selectedRole === 'user' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                </div>
              )}
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-lg">
                  💻
                </div>
                <h3 className="text-lg font-semibold">Competitive Programmer</h3>
              </div>
              <p className="ml-13 text-sm text-slate-400">
                Solve problems, compete in contests, and climb the leaderboard
              </p>
            </button>

            {/* Staff Role */}
            <button
              onClick={() => handleRoleSelect('staff')}
              disabled={isLoading}
              className={`relative w-full overflow-hidden rounded-lg border-2 px-6 py-8 text-left transition-all ${
                selectedRole === 'staff' && !isLoading
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-emerald-400/60'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isLoading && selectedRole === 'staff' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-lg">
                  👔
                </div>
                <h3 className="text-lg font-semibold">Interviewer / Staff</h3>
              </div>
              <p className="ml-13 text-sm text-slate-400">
                Conduct interviews, create problems, and manage the platform
              </p>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">
              💡 <span className="font-semibold">Tip:</span> You can't change this later, so choose wisely!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Onboarding;
