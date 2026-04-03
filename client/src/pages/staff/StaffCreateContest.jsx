import React, { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const toDateTimeLocalValue = (date = new Date()) => {
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const validateDateTimes = (data) => {
  const start = data.start_time;
  const end = data.end_time;
  const deadline = data.registration_deadline;

  if (start && end && end <= start) {
    return 'End time must be after start time';
  }

  if (deadline && start && deadline >= start) {
    return 'Registration deadline must be before start time';
  }

  return null;
};

const StaffCreateContest = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nowLocal] = useState(() => toDateTimeLocalValue(new Date()));
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    max_participants: '',
    registration_deadline: '',
    is_rated: true,
  });

  const [problemIdInput, setProblemIdInput] = useState('');
  const [problemLookupLoading, setProblemLookupLoading] = useState(false);
  const [problemLookupError, setProblemLookupError] = useState(null);
  const [problemPreview, setProblemPreview] = useState(null);
  const [transformingDescription, setTransformingDescription] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState([]);

  useEffect(() => {
    const trimmedId = problemIdInput.trim();

    if (!trimmedId) {
      setProblemLookupError(null);
      setProblemPreview(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setProblemLookupLoading(true);
        setProblemLookupError(null);

        const response = await axiosInstance.get(`/api/contests/problems/${trimmedId}`);
        const problem = response.data?.data || response.data;

        if (!problem?.id) {
          throw new Error('Invalid problem response');
        }

        setProblemPreview({
          problem_id: problem.id,
          title: problem.title,
          description: problem.description || '',
          gemini_description: problem.gemini_description || '',
          input_format: problem.input_format || '',
          output_format: problem.output_format || '',
          constraints: problem.constraints || '',
          difficulty: problem.difficulty || null,
          time_limit_ms: problem.time_limit_ms || 2000,
          memory_limit_mb: problem.memory_limit_mb || 256,
          points: 100,
        });
      } catch (err) {
        setProblemPreview(null);
        setProblemLookupError(err.response?.data?.message || 'Problem not found for this ID');
      } finally {
        setProblemLookupLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [problemIdInput]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'start_time' && next.registration_deadline && next.registration_deadline >= value) {
        next.registration_deadline = '';
      }

      if (name === 'start_time' && next.end_time && next.end_time <= value) {
        next.end_time = '';
      }

      return next;
    });
    setError(null);
  };

  const updateProblemPreview = (field, value) => {
    setProblemPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleTransformDescription = async () => {
    if (!problemPreview?.problem_id) return;

    try {
      setTransformingDescription(true);

      const response = await axiosInstance.post(
        `/api/contests/problems/${problemPreview.problem_id}/transform-description`,
        {
          title: problemPreview.title,
          description: problemPreview.description,
        }
      );

      const transformed = response.data?.data?.gemini_description || '';

      setProblemPreview((prev) => ({
        ...prev,
        gemini_description: transformed,
      }));
    } catch (err) {
      setProblemLookupError(err.response?.data?.message || 'Failed to transform description');
    } finally {
      setTransformingDescription(false);
    }
  };

  const handleAddProblem = () => {
    if (!problemPreview?.problem_id) return;

    const problemTitleLength = (problemPreview.title || '').trim().length;
    if (problemTitleLength < 5 || problemTitleLength > 150) {
      setProblemLookupError('Problem title must be between 5 and 150 characters');
      return;
    }

    const alreadyAdded = selectedProblems.some((p) => p.problem_id === problemPreview.problem_id);
    if (alreadyAdded) {
      setProblemLookupError('This problem is already added to the contest');
      return;
    }

    setSelectedProblems((prev) => [
      ...prev,
      {
        ...problemPreview,
        display_order: prev.length + 1,
      },
    ]);

    setProblemLookupError(null);
    setProblemIdInput('');
    setProblemPreview(null);
  };

  const handleRemoveProblem = (problemId) => {
    setSelectedProblems((prev) =>
      prev
        .filter((problem) => problem.problem_id !== problemId)
        .map((problem, index) => ({
          ...problem,
          display_order: index + 1,
        }))
    );
  };

  const goToStep2 = () => {
    setError(null);
    const titleLength = formData.title.trim().length;

    if (!formData.title || !formData.start_time || !formData.end_time) {
      setError('Please fill title, start time and end time before proceeding');
      return;
    }

    if (titleLength < 5 || titleLength > 150) {
      setError('Contest title must be between 5 and 150 characters');
      return;
    }

    const dateError = validateDateTimes(formData);
    if (dateError) {
      setError(dateError);
      return;
    }

    setStep(2);
  };

  const goToStep3 = () => {
    setError(null);
    if (selectedProblems.length === 0) {
      setError('Please add at least one problem to continue');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const titleLength = formData.title.trim().length;
    if (titleLength < 5 || titleLength > 150) {
      setError('Contest title must be between 5 and 150 characters');
      return;
    }

    const dateError = validateDateTimes(formData);
    if (dateError) {
      setError(dateError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submissionData = {
        ...formData,
        created_by: profile?.clerk_user_id,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        problems: selectedProblems.map((problem, index) => ({
          problem_id: problem.problem_id,
          title: problem.title,
          description: problem.description,
          gemini_description: problem.gemini_description || null,
          input_format: problem.input_format || null,
          output_format: problem.output_format || null,
          constraints: problem.constraints || null,
          difficulty: problem.difficulty || null,
          time_limit_ms: problem.time_limit_ms || 2000,
          memory_limit_mb: problem.memory_limit_mb || 256,
          display_order: index + 1,
          points: problem.points || 100,
        })),
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

          <div className="mb-6 grid grid-cols-3 gap-2 text-xs sm:text-sm">
            {[
              { id: 1, label: 'Step 1: Contest Details' },
              { id: 2, label: 'Step 2: Set Problems' },
              { id: 3, label: 'Step 3: Verification' },
            ].map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border px-3 py-2 text-center font-medium ${
                  step === item.id
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : step > item.id
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                  {error}
                </div>
              )}

              {step === 1 && (
                <>
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                    Warning: Once a contest is created, it cannot be edited.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Contest Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      minLength={5}
                      maxLength={150}
                      required
                      placeholder="e.g., Weekly Challenge #42"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">Title length: {formData.title.trim().length}/150 (min 5)</p>
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Start Time *</label>
                    <input
                      type="datetime-local"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      min={nowLocal}
                      required
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">Start time must be in the future.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">End Time *</label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      min={formData.start_time || nowLocal}
                      required
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">End time must be after start time.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Registration Deadline</label>
                    <input
                      type="datetime-local"
                      name="registration_deadline"
                      value={formData.registration_deadline}
                      onChange={handleInputChange}
                      min={nowLocal}
                      max={formData.start_time || undefined}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">Deadline must be before contest start time.</p>
                  </div>

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

                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={goToStep2}
                      className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600"
                    >
                      Next: Set Problems
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                    <label className="block text-sm font-medium text-slate-300">Problem ID *</label>
                    <input
                      type="text"
                      value={problemIdInput}
                      onChange={(e) => setProblemIdInput(e.target.value)}
                      placeholder="Paste problem UUID"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    {problemLookupLoading && <p className="mt-2 text-xs text-cyan-300">Fetching problem...</p>}
                    {problemLookupError && <p className="mt-2 text-xs text-red-400">{problemLookupError}</p>}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-200">Problem Preview</h3>
                    {!problemPreview && (
                      <p className="mt-2 text-xs text-slate-400">Paste a problem_id above to preview title and description.</p>
                    )}

                    {problemPreview && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs text-slate-400">Title</p>
                          <input
                            type="text"
                            value={problemPreview.title || ''}
                            onChange={(e) => updateProblemPreview('title', e.target.value)}
                            minLength={5}
                            maxLength={150}
                            placeholder="Edit contest problem title"
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                          />
                          <p className="mt-1 text-xs text-slate-400">
                            Title length: {(problemPreview.title || '').trim().length}/150 (min 5)
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Original Description</p>
                          <div className="mt-1 max-h-36 overflow-y-auto rounded border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                            <style>{'.katex-html { display: none; }'}</style>
                            <div dangerouslySetInnerHTML={{ __html: problemPreview.description || 'No description' }} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-amber-400">Gemini Description (editable)</p>
                          <button
                            type="button"
                            onClick={handleTransformDescription}
                            disabled={transformingDescription}
                            className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-60"
                          >
                            {transformingDescription ? 'Transforming...' : '✨ Transform Description'}
                          </button>
                        </div>

                        <textarea
                          value={problemPreview.gemini_description || ''}
                          onChange={(e) => updateProblemPreview('gemini_description', e.target.value)}
                          rows="5"
                          placeholder="AI transformed description will appear here. You can edit it manually."
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                        />

                        <div>
                          <p className="text-xs text-slate-400">Gemini Description Preview</p>
                          <div className="mt-1 max-h-36 overflow-y-auto rounded border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                            <style>{'.katex-html { display: none; }'}</style>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: problemPreview.gemini_description || 'No transformed description',
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddProblem}
                          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600"
                        >
                          Add Problem
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-200">Selected Problems ({selectedProblems.length})</h3>

                    {selectedProblems.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-400">No problems added yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedProblems.map((problem, index) => (
                          <div key={problem.problem_id} className="flex items-start justify-between rounded border border-white/10 bg-black/20 p-3">
                            <div>
                              <p className="text-sm font-medium text-slate-100">{index + 1}. {problem.title}</p>
                              <p className="text-xs text-slate-400">{problem.problem_id}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProblem(problem.problem_id)}
                              className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={goToStep3}
                      className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600"
                    >
                      Next: Verification
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-200">Verification</h3>

                    <div className="mt-3 space-y-2 text-sm">
                      <p><span className="text-slate-400">Title:</span> {formData.title || '—'}</p>
                      <p><span className="text-slate-400">Start:</span> {formData.start_time || '—'}</p>
                      <p><span className="text-slate-400">End:</span> {formData.end_time || '—'}</p>
                      <p><span className="text-slate-400">Problems:</span> {selectedProblems.length}</p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {selectedProblems.map((problem, index) => (
                        <div key={problem.problem_id} className="rounded border border-white/10 bg-black/20 p-3">
                          <p className="text-sm font-medium text-slate-100">{index + 1}. {problem.title}</p>
                          <p className="text-xs text-slate-400">{problem.problem_id}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-600"
                    >
                      {loading ? 'Creating...' : 'Create Contest'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffCreateContest;
