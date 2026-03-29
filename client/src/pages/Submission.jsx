import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axiosInstance from '../lib/axios';

const verdictTone = {
  Accepted: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Pending: 'text-amber-300 bg-amber-300/10 border-amber-300/30',
  'Wrong Answer': 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  'Time Limit Exceeded': 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  'Memory Limit Exceeded': 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  'Runtime Error': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  'Compilation Error': 'text-orange-300 bg-orange-300/10 border-orange-300/30',
};

const Submission = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect staff users to staff dashboard
    if (profile?.app_role === 'staff') {
      navigate('/staff/dashboard');
      return;
    }

    if (!submissionId) return;
    fetchSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, profile?.app_role, navigate]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get(`/api/submissions/${submissionId}`);
      setSubmission(res.data);
    } catch (err) {
      console.error('Error fetching submission:', err);
      setError('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const formatMemory = (kb) => (kb ? `${(kb / 1024).toFixed(2)} MB` : '—');
  const formatRuntime = (ms) => (ms ? `${ms} ms` : '—');

  const pillTone = verdictTone[submission?.verdict] || 'text-slate-300 bg-slate-300/10 border-slate-300/30';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 flex-1">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="text-sm">Loading submission…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-rose-400 text-sm">{error}</p>
              <button
                onClick={fetchSubmission}
                className="btn btn-sm bg-rose-400/10 border border-rose-400/40 text-rose-200"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !submission ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-300">Submission not found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card bg-slate-900/80 border border-white/10 shadow-xl">
              <div className="card-body gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Submission</p>
                    <h1 className="text-2xl font-bold">#{submission.id}</h1>
                    <p className="text-sm text-slate-400">Submitted at {new Date(submission.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${pillTone}`}>
                      {submission.verdict}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {submission.language || '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <InfoCard label="Runtime" value={formatRuntime(submission.runtime_ms)} />
                  <InfoCard label="Memory" value={formatMemory(submission.memory_kb)} />
                  <InfoCard
                    label="Tests"
                    value={`${submission.test_cases_passed ?? 0}/${submission.test_cases_total ?? 0}`}
                  />
                  <InfoCard
                    label="Judged at"
                    value={submission.judged_at ? new Date(submission.judged_at).toLocaleString() : 'Pending'}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">Problem</h3>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-lg font-semibold text-slate-50">{submission.problem?.title || '<Unknown Problem>'}</p>
                    <p className="text-sm text-slate-400">{submission.problem?.difficulty || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">Slug: {submission.problem?.slug || '—'}</p>
                    {submission.problem?.description && (
                      <p className="text-sm text-slate-300 mt-3 line-clamp-4">
                        {submission.problem.description}
                      </p>
                    )}
                  </div>
                </div>

                {submission.error_message && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-rose-300">Error</h3>
                    <pre className="rounded-lg bg-rose-950/50 border border-rose-400/20 p-3 text-sm text-rose-200 whitespace-pre-wrap">
                      {submission.error_message}
                    </pre>
                  </div>
                )}

                {submission.test_results && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Test Results</h3>
                    <pre className="rounded-lg bg-slate-950/60 border border-white/10 p-3 text-sm text-slate-200 overflow-auto">
                      {typeof submission.test_results === 'string'
                        ? submission.test_results
                        : JSON.stringify(submission.test_results, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-200">Source Code</h3>
                  <pre className="rounded-lg bg-slate-950/60 border border-white/10 p-3 text-sm text-slate-100 overflow-auto">
                    {submission.source_code || '// no source provided'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
    <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
    <p className="text-lg font-semibold text-slate-50">{value}</p>
  </div>
);

export default Submission;
