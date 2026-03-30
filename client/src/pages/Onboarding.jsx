import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfile } from '../redux/slices/userSlice';
import Footer from '../components/Footer';

const Onboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedRole, setSelectedRole] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const profile = useSelector((state) => state.user?.profile);

  // Validator for company name - only lowercase a-z, no spaces or special chars
  const validateCompanyNameFormat = (name) => {
    const regex = /^[a-z]+$/;
    return regex.test(name);
  };

  // Step 1: User clicks role card - just set role, show company name input if staff
  const handleRoleSelect = (role) => {
    setError(null);
    setSelectedRole(role);
  };

  // Step 2: User confirms role (clicks Confirm button) - make API call
  const handleConfirmRole = async () => {
    setError(null);

    // Validation for staff role
    if (selectedRole === 'staff') {
      if (!companyName.trim()) {
        setError('Company name is required for staff');
        return;
      }
      if (companyName.trim().length < 2) {
        setError('Company name must be at least 2 characters');
        return;
      }
      if (!validateCompanyNameFormat(companyName.trim())) {
        setError('Company name can only contain lowercase letters (a-z), no spaces or special characters');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Update app_role and company_name on backend
      const updateData = { app_role: selectedRole };
      if (selectedRole === 'staff') {
        updateData.company_name = companyName.trim();
      }
      
      await dispatch(updateUserProfile(updateData)).unwrap();

      // Redirect to dashboard
      navigate('/');
    } catch (err) {
      // Handle specific error messages from backend
      const errorMessage = err?.message || err || 'Failed to complete onboarding';
      
      // Check for company already exists error
      if (errorMessage.includes('duplicate') || errorMessage.includes('already') || errorMessage.includes('unique')) {
        setError('Company already exists. Please choose a different company name.');
      } else {
        setError(errorMessage);
      }
      setIsLoading(false);
    }
  };

  // Reset role selection
  const handleRoleChange = () => {
    setSelectedRole(null);
    setCompanyName('');
    setError(null);
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
            {/* Company Name Input (only for staff) */}
            {selectedRole === 'staff' && (
              <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    // Only allow lowercase a-z letters, filter out anything else
                    const filtered = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
                    setCompanyName(filtered);
                  }}
                  placeholder="e.g., google, microsoft, amazon"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-emerald-400 focus:outline-none transition"
                  disabled={isLoading}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Lowercase letters only (a-z). Must be unique and cannot be changed later.
                </p>
              </div>
            )}

            {/* Show role cards only if no role selected */}
            {!selectedRole && (
              <>
                {/* User Role */}
                <button
                  onClick={() => handleRoleSelect('user')}
                  disabled={isLoading}
                  className={`relative w-full overflow-hidden rounded-lg border-2 px-6 py-8 text-left transition-all ${
                    'border-white/10 bg-white/5 hover:border-cyan-400/60'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
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
                    'border-white/10 bg-white/5 hover:border-emerald-400/60'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
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
              </>
            )}

            {/* Show confirmation buttons when role is selected */}
            {selectedRole && (
              <div className="space-y-3">
                <button
                  onClick={handleConfirmRole}
                  disabled={isLoading}
                  className="relative w-full overflow-hidden rounded-lg border-2 border-emerald-400 bg-emerald-500/20 px-6 py-3 font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    </div>
                  )}
                  {isLoading ? 'Setting up your account...' : 'Confirm & Continue'}
                </button>

                <button
                  onClick={handleRoleChange}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-6 py-3 font-semibold text-slate-400 transition-all hover:border-slate-500 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Change Role
                </button>
              </div>
            )}
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
              💡 <span className="font-semibold">Tip:</span> WARNING: You CAN'T change this later, so choose WISELY!!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Onboarding;
