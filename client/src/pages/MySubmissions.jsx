import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import Header from "../components/Header";
import Footer from "../components/Footer";
import axiosInstance from "../lib/axios.js";

const verdictColor = {
  "pending": "text-slate-300 bg-slate-300/10 border-slate-300/30",
  "accepted": "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "wrong_answer": "text-rose-400 bg-rose-400/10 border-rose-400/30",
  "time_limit": "text-rose-400 bg-rose-400/10 border-rose-400/30",
  "compilation_error": "text-orange-400 bg-orange-400/10 border-orange-400/30",
  "runtime_error": "text-orange-400 bg-orange-400/10 border-orange-400/30",
  "internal_error": "text-slate-400 bg-slate-400/10 border-slate-400/30",
  "exec_format_error": "text-slate-400 bg-slate-400/10 border-slate-400/30",
  "error": "text-slate-400 bg-slate-400/10 border-slate-400/30",
};

const MySubmissions = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const profile = useSelector((state) => state.user?.profile);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    // Redirect staff users to staff dashboard
    if (profile?.app_role === 'staff') {
      navigate('/staff/dashboard');
      return;
    }

    fetchSubmissions();
  }, [isSignedIn, profile?.app_role, navigate]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/api/submissions');
      
      // Map API response to table format
      const formattedSubmissions = response.data.map(submission => ({
        id: submission.id,
        time: new Date(submission.submitted_at).toLocaleString(),
        title: submission.problem?.title || '<Unknown Problem>',
        language: submission.language || '—',
        verdict: submission.verdict || 'Pending',
        runtime: submission.runtime_ms ? `${submission.runtime_ms}ms` : '—',
        memory: submission.memory_kb ? `${(submission.memory_kb / 1024).toFixed(1)}MB` : '—',
      }));
      
      setSubmissions(formattedSubmissions);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Failed to load submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Header />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[34px_34px] opacity-25" aria-hidden />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 flex-1 min-w-[85vw] md:min-w-[70vw]">
        <header className="flex flex-col gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Submissions</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Submissions</h1>
            <p className="text-sm text-slate-300 sm:text-base">View all your problem submissions and verdicts</p>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-slate-900/30 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400">
              <p>{error}</p>
              <button 
                onClick={fetchSubmissions}
                className="mt-3 px-4 py-2 rounded-lg bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm font-semibold hover:bg-rose-400/20 transition"
              >
                Retry
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-6 text-center text-slate-300">
              No submissions yet. Start solving problems to see your submissions here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left font-semibold">Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">Language</th>
                    <th className="px-4 py-3 text-left font-semibold">Verdict</th>
                    <th className="px-4 py-3 text-left font-semibold">Runtime</th>
                    <th className="px-4 py-3 text-left font-semibold">Memory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-white/5 transition cursor-pointer"
                      onClick={() => navigate(`/submissions/${submission.id}`)}
                    >
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {submission.time}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100 max-w-xs truncate">
                        {submission.title}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {submission.language}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            verdictColor[submission.verdict] || "text-slate-400 bg-slate-400/10 border-slate-400/30"
                          }`}
                        >
                          {submission.verdict}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {submission.runtime}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {submission.memory}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MySubmissions;
