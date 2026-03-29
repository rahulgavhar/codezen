import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffScheduleInterview = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    candidate_clerk_id: '',
    problem_id: '',
    room_id: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    // Fetch problems
    const fetchData = async () => {
      try {
        const problemsRes = await axiosInstance.get('/api/problems?page=1&limit=100');
        setProblems(problemsRes.data?.data || []);
      } catch (error) {
        console.error('Error fetching problems:', error);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateRoomId = () => {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setFormData((prev) => ({
      ...prev,
      room_id: roomId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.candidate_clerk_id.trim()) {
        setError('Candidate Clerk ID is required');
        setLoading(false);
        return;
      }

      if (!formData.start_time || !formData.end_time) {
        setError('Start time and end time are required');
        setLoading(false);
        return;
      }

      // Convert datetime-local format to ISO string
      // datetime-local returns format like "2026-03-29T14:00" in local time
      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setError('Invalid start or end time format');
        setLoading(false);
        return;
      }

      if (endDate <= startDate) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      const finalRoomId = formData.room_id || `room_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      const submissionData = {
        candidate_clerk_id: formData.candidate_clerk_id.trim(),
        problem_id: formData.problem_id || null,
        room_id: finalRoomId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      };

      console.log('Submitting interview data:', submissionData);
      const response = await axiosInstance.post('/api/interviews', submissionData);
      navigate(`/staff/interviews/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to schedule interview');
      console.error('Error scheduling interview:', err);
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
          <Link to="/staff/interviews" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition">
            ← Back to Interviews
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Schedule Interview</h1>
            <p className="mt-1 text-slate-400">Set up a new interview session</p>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                  {error}
                </div>
              )}

              {/* Candidate */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Candidate ID *</label>
                <input
                  type="text"
                  placeholder="e.g., user_3BZL4z0thn"
                  value={formData.candidate_clerk_id}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    candidate_clerk_id: e.target.value,
                  }))}
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">Enter the candidate's Clerk User ID</p>
              </div>

              {/* Problem (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Problem (Optional)</label>
                <select
                  name="problem_id"
                  value={formData.problem_id}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Select a problem...</option>
                  {problems.map((problem) => (
                    <option key={problem.id} value={problem.id}>
                      {problem.title}
                    </option>
                  ))}
                </select>
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

              {/* Room ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Virtual Room *</label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    name="room_id"
                    value={formData.room_id}
                    onChange={handleInputChange}
                    placeholder="Auto-generated room ID"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={generateRoomId}
                    className="rounded-lg bg-white/10 px-4 py-2 font-medium transition hover:bg-white/20"
                  >
                    Generate
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">A unique room ID for the interview session</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-600"
                >
                  {loading ? 'Scheduling...' : 'Schedule Interview'}
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

export default StaffScheduleInterview;
