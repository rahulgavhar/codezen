import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffInterviewDetail = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [interview, setInterview] = useState(null);
  const [problemData, setProblemData] = useState(null);
  const [codeSubmissions, setCodeSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transforming, setTransforming] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    feedback: '',
    candidate_rating: '',
    technical_score: '',
  });

  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        setLoading(true);

        // Fetch interview
        const interviewRes = await axiosInstance.get(`/api/interviews/${interviewId}`);
        setInterview(interviewRes.data);
        setFormData({
          feedback: interviewRes.data.feedback || '',
          candidate_rating: interviewRes.data.candidate_rating || '',
          technical_score: interviewRes.data.technical_score || '',
        });

        // Fetch problem data for this interview
        try {
          const problemRes = await axiosInstance.get(`/api/interview-problems/${interviewId}`);
          setProblemData(problemRes.data);
        } catch (error) {
          console.error('Error fetching problem data:', error);
          // Continue without problem data
        }

        // Fetch code submissions from this interview
        const submissionsRes = await axiosInstance.get(`/api/interviews/${interviewId}/code-submissions`);
        setCodeSubmissions(submissionsRes.data);
      } catch (error) {
        console.error('Error fetching interview:', error);
        if (error?.response?.status === 403) {
          setAccessDenied(true);
        }
      } finally {
        setLoading(false);
      }
    };

    if (interviewId) {
      fetchInterviewData();
    }
  }, [interviewId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await axiosInstance.put(`/api/interviews/${interviewId}`, formData);
      setInterview({ ...interview, ...formData });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating interview:', error);
    }
  };

  const handleTransformProblem = async () => {
    if (!problemData) {
      console.error('Problem data not loaded');
      return;
    }

    try {
      setTransforming(true);
      const response = await axiosInstance.post(`/api/interview-problems/${interviewId}/transform`);
      
      // Update local problemData with the transformed description
      setProblemData({
        ...problemData,
        gemini_description: response.data.gemini_description,
      });
      
      // Show success toast
      console.log('Problem description transformed successfully');
    } catch (error) {
      console.error('Error transforming problem description:', error);
      // Show error toast - you can integrate a toast library here
    } finally {
      setTransforming(false);
    }
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  if (!interview) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400">{accessDenied ? 'You are not allowed to access this interview.' : 'Interview not found'}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-500/20 text-blue-400',
      ongoing: 'bg-cyan-500/20 text-cyan-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return styles[status.toLowerCase()] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">Interview Details</h1>
                <span className={`rounded px-3 py-1 capitalize text-sm font-medium ${getStatusBadge(interview.status)}`}>
                  {interview.status}
                </span>
              </div>
              <p className="mt-1 text-slate-400">
                Candidate: <span className="font-medium text-cyan-400">{interview.candidate_clerk_id}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/interview/${interviewId}`)}
                className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-white transition hover:bg-emerald-600"
              >
                Join Interview
              </button>
              {problemData && !problemData.gemini_description && (
                <button
                  onClick={handleTransformProblem}
                  disabled={transforming}
                  className="rounded-lg bg-amber-500/20 px-4 py-2 text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transforming ? 'Transforming...' : '✨ Transform Problem'}
                </button>
              )}
              {interview.status !== 'Completed' && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="rounded-lg bg-cyan-500/20 px-4 py-2 text-cyan-400 transition hover:bg-cyan-500/30"
                >
                  Add Feedback
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Problem Details */}
              {problemData && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <h2 className="mb-4 text-lg font-bold">Problem</h2>
                  
                  {/* Problem Title */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-300">Title</h3>
                    <p className="mt-1 text-slate-50">{problemData.title || 'N/A'}</p>
                  </div>

                  {/* Original Description */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-300">Original Description</h3>
                    <div className="mt-1 rounded border border-slate-700 bg-slate-800/50 p-3 text-slate-50 max-h-48 overflow-y-auto prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                      {problemData.description ? (
                        <div dangerouslySetInnerHTML={{ __html: problemData.description }} />
                      ) : (
                        'No description provided'
                      )}
                    </div>
                  </div>

                  {/* AI-Transformed Description */}
                  {problemData.gemini_description && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-amber-400">✨ AI-Transformed Description</h3>
                      <div className="mt-1 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-slate-50 max-h-48 overflow-y-auto prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                        <div dangerouslySetInnerHTML={{ __html: problemData.gemini_description }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Form */}
              {editMode && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <h2 className="mb-4 text-lg font-bold">Interview Feedback</h2>
                  <div className="space-y-4">
                    {/* Technical Score */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Technical Score (0-100)</label>
                      <input
                        type="number"
                        name="technical_score"
                        value={formData.technical_score}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Rating (1-5)</label>
                      <select
                        name="candidate_rating"
                        value={formData.candidate_rating}
                        onChange={handleInputChange}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="">Select rating...</option>
                        <option value="1">1 - Poor</option>
                        <option value="2">2 - Fair</option>
                        <option value="3">3 - Good</option>
                        <option value="4">4 - Very Good</option>
                        <option value="5">5 - Excellent</option>
                      </select>
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Feedback</label>
                      <textarea
                        name="feedback"
                        value={formData.feedback}
                        onChange={handleInputChange}
                        rows="4"
                        placeholder="Provide detailed feedback..."
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600"
                      >
                        Save Feedback
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Display */}
              {interview.feedback && !editMode && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <h2 className="mb-4 text-lg font-bold">Feedback</h2>
                  <div className="space-y-4 text-sm">
                    {interview.technical_score && (
                      <div>
                        <p className="text-slate-400">Technical Score</p>
                        <p className="mt-1 text-2xl font-bold text-cyan-400">{interview.technical_score}/100</p>
                      </div>
                    )}
                    {interview.candidate_rating && (
                      <div>
                        <p className="text-slate-400">Rating</p>
                        <p className="mt-1 text-lg">{'⭐'.repeat(interview.candidate_rating)}</p>
                      </div>
                    )}
                    {interview.feedback && (
                      <div>
                        <p className="text-slate-400">Notes</p>
                        <p className="mt-1 text-slate-50">{interview.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Code Submissions */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="mb-4 text-lg font-bold">Code Submissions ({codeSubmissions.length})</h2>
                {codeSubmissions.length === 0 ? (
                  <p className="text-slate-400">No code submitted</p>
                ) : (
                  <div className="space-y-3">
                    {codeSubmissions.map((submission, idx) => (
                      <div key={submission.id} className="rounded border border-white/5 bg-white/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="font-medium">Submission #{idx + 1}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(submission.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-cyan-500/20 px-2 py-1 text-xs text-cyan-400">
                              {submission.language}
                            </span>
                            {submission.verdict && (
                              <span className={`rounded-full px-2 py-1 text-xs ${
                                submission.verdict === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                submission.verdict === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {submission.verdict}
                              </span>
                            )}
                          </div>
                        </div>
                        <pre className="overflow-x-auto rounded bg-black/30 p-2 text-xs text-slate-300">
                          {submission.source_code?.substring(0, 200)}...
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Interview Info */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 font-bold">Interview Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400">Start Time</p>
                    <p className="font-medium">{formatDateTime(interview.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">End Time</p>
                    <p className="font-medium">{formatDateTime(interview.end_time)}</p>
                  </div>
                  {interview.actual_duration && (
                    <div>
                      <p className="text-slate-400">Duration</p>
                      <p className="font-medium">{interview.actual_duration}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400">Room ID</p>
                    <p className="font-mono text-xs">{interview.room_id}</p>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 font-bold">Participants</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400">Candidate</p>
                    <p className="font-medium text-cyan-400">{interview.candidate_clerk_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Interviewer</p>
                    <p className="font-medium text-emerald-400">{interview.interviewer_clerk_id}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => navigate('/staff/interviews')}
                className="w-full rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
              >
                Back to Interviews
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffInterviewDetail;
