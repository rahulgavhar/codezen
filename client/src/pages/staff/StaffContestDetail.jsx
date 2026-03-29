import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axiosInstance from '../../lib/axios';

const StaffContestDetail = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  
  // Redirect non-staff users
  if (profile?.app_role !== 'staff') {
    return <Navigate to="/" />;
  }
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchContestData = async () => {
      try {
        setLoading(true);
        
        // Fetch contest
        const contestRes = await axiosInstance.get(`/api/contests/${contestId}`);
        setContest(contestRes.data);
        setFormData(contestRes.data);

        // Fetch problems in contest
        const problemsRes = await axiosInstance.get(`/api/contests/${contestId}/problems`);
        setProblems(problemsRes.data);

        // Fetch submissions
        const submissionsRes = await axiosInstance.get(`/api/contests/${contestId}/submissions`);
        setSubmissions(submissionsRes.data);
      } catch (error) {
        console.error('Error fetching contest:', error);
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchContestData();
    }
  }, [contestId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      await axiosInstance.put(`/api/contests/${contestId}`, formData);
      setContest(formData);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating contest:', error);
    }
  };

  const getContestStatus = (c) => {
    if (!c) return 'upcoming';
    const now = new Date();
    const start = new Date(c.start_time);
    const end = new Date(c.end_time);
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'live';
    return 'ended';
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

  if (!contest) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400">Contest not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const status = getContestStatus(contest);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">          {/* Breadcrumb */}
          <Link to="/staff/contests" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition">
            ← Back to Contests
          </Link>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">{contest.title}</h1>
                <span className={`rounded px-3 py-1 capitalize text-sm font-medium ${
                  status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                  status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {status}
                </span>
              </div>
              <p className="mt-1 text-slate-400">{contest.description}</p>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="rounded-lg bg-cyan-500/20 px-4 py-2 text-cyan-400 transition hover:bg-cyan-500/30"
              >
                Edit
              </button>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Edit Form */}
              {editMode && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <h2 className="mb-4 text-lg font-bold">Edit Contest</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="3"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setFormData(contest);
                        }}
                        className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Problems */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Problems ({problems.length})</h2>
                  <button className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs text-cyan-400 transition hover:bg-cyan-500/30">
                    Add Problem
                  </button>
                </div>
                {problems.length === 0 ? (
                  <p className="text-slate-400">No problems added yet</p>
                ) : (
                  <div className="space-y-2">
                    {problems.map((problem, idx) => (
                      <div key={problem.id} className="rounded border border-white/5 bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-medium text-cyan-400">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <div>
                              <p className="font-medium">{problem.problem?.title}</p>
                              <p className="text-xs text-slate-500">{problem.points} points</p>
                            </div>
                          </div>
                          <button className="text-red-400 hover:text-red-300">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Submissions */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="mb-4 text-lg font-bold">Recent Submissions ({submissions.length})</h2>
                {submissions.length === 0 ? (
                  <p className="text-slate-400">No submissions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-slate-400">User</th>
                          <th className="text-left py-2 text-slate-400">Problem</th>
                          <th className="text-left py-2 text-slate-400">Verdict</th>
                          <th className="text-left py-2 text-slate-400">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.slice(0, 10).map((sub) => (
                          <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2">{sub.clerk_user_id}</td>
                            <td className="py-2">-</td>
                            <td className="py-2">
                              <span className={`rounded px-2 py-1 text-xs ${
                                sub.verdict === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                sub.verdict === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {sub.verdict}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-slate-500">
                              {new Date(sub.submitted_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contest Info */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 font-bold">Contest Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400">Start</p>
                    <p className="font-medium">{new Date(contest.start_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">End</p>
                    <p className="font-medium">{new Date(contest.end_time).toLocaleString()}</p>
                  </div>
                  {contest.max_participants && (
                    <div>
                      <p className="text-slate-400">Max Participants</p>
                      <p className="font-medium">{contest.max_participants}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400">Rated</p>
                    <p className="font-medium">{contest.is_rated ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 font-bold">Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registrations</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Submissions</span>
                    <span className="font-medium">{submissions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Problems</span>
                    <span className="font-medium">{problems.length}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => navigate('/staff/contests')}
                className="w-full rounded-lg border border-white/10 px-4 py-2 font-medium transition hover:bg-white/5"
              >
                Back to Contests
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StaffContestDetail;
