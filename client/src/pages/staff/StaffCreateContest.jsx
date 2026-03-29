import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffCreateContest = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    max_participants: '',
    registration_deadline: '',
    is_rated: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const submissionData = {
        ...formData,
        created_by: profile?.clerk_user_id,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      };

      const response = await axiosInstance.post('/api/contests', submissionData);
      navigate(`/staff/contests/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create contest');
      console.error('Error creating contest:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Breadcrumb */}
          <Link to="/staff/contests" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition">
            ← Back to Contests
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Create New Contest</h1>
            <p className="mt-1 text-slate-400">Set up a new competitive programming contest</p>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Contest Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Weekly Challenge #42"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Describe the contest..."
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Start Time *</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-slate-300">End Time *</label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Registration Deadline */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Registration Deadline</label>
                <input
                  type="datetime-local"
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Max Participants (Optional)</label>
                <input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="Leave empty for unlimited"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Is Rated */}
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_rated"
                    checked={formData.is_rated}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-cyan-500"
                  />
                  <span className="text-sm font-medium text-slate-300">This is a rated contest</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-600"
                >
                  {loading ? 'Creating...' : 'Create Contest'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffCreateContest;
