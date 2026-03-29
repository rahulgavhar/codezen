import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../components/Header";
import Footer from "../components/Footer";
import axiosInstance from "../lib/axios";

const statusTone = {
  Scheduled: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
  Ongoing: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
  Completed: "bg-slate-300/15 text-slate-200 border-slate-300/30",
  Cancelled: "bg-rose-400/15 text-rose-200 border-rose-400/30",
};

const AllInterviews = () => {
  const profile = useSelector((state) => state.user?.profile);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axiosInstance.get("/api/interviews");
        setInterviews(response.data || []);
      } catch (err) {
        console.error("Error loading interviews:", err);
        setError("Failed to load interviews");
      } finally {
        setLoading(false);
      }
    };

    if (profile?.app_role !== "staff") {
      fetchInterviews();
    }
  }, [profile?.app_role]);

  if (profile?.app_role === "staff") {
    return <Navigate to="/staff/interviews" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Interviews</p>
            <h1 className="text-3xl font-bold tracking-tight">My Interviews</h1>
            <p className="text-sm text-slate-300">All your scheduled one-to-one interviews.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/60"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-slate-900/30">
          {loading ? (
            <div className="p-6 text-center text-slate-300">Loading interviews...</div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400">{error}</div>
          ) : interviews.length === 0 ? (
            <div className="p-6 text-center text-slate-300">
              No interviews found. Once a staff interviewer schedules one using your user ID, it will appear here.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {interviews.map((interview) => (
                <article key={interview.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        Interview with {interview.interviewer_clerk_id}
                      </h2>
                      <p className="text-sm text-slate-400">{interview.problem?.title || "General technical interview"}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {new Date(interview.start_time).toLocaleString()} - {new Date(interview.end_time).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Room: {interview.room_id}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[interview.status] || "text-slate-300 bg-slate-300/10 border-slate-300/30"}`}
                      >
                        {interview.status}
                      </span>

                      <Link
                        to={`/interview/${interview.id}`}
                        className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AllInterviews;
