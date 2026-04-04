import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../components/Header";
import Footer from "../components/Footer";
import axiosInstance from "../lib/axios";

const JobRecommendations = () => {
  const [topN, setTopN] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsCount, setRecommendationsCount] = useState(0);
  const [skills, setSkills] = useState([]);
  const [skillsCount, setSkillsCount] = useState(0);
  const currentUsername = useSelector((state) => state.user?.profile?.username);

  const loadRecommendations = async (limit = 20) => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get("/api/users/recommendations", {
        params: {
          top_n: limit,
        },
      });

      const rows = Array.isArray(response?.data?.recommendations)
        ? response.data.recommendations
        : [];

      setRecommendations(rows);
      setRecommendationsCount(Number(response?.data?.recommendations_count || rows.length));
      setSkills(Array.isArray(response?.data?.extracted_skills) ? response.data.extracted_skills : []);
      setSkillsCount(Number(response?.data?.skills_count || 0));
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setError(err?.response?.data?.error || "Failed to load recommendations");
      setRecommendations([]);
      setRecommendationsCount(0);
      setSkills([]);
      setSkillsCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations(topN);
  }, []);

  const groupedBySource = useMemo(() => {
    return recommendations.reduce((acc, item) => {
      const source = item?.source || "Unknown";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
  }, [recommendations]);

  const isMissingResumeMessage = error === "Upload Resume in Your Profile";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12 space-y-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Career Match</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Recommended Jobs</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-300">
            Recommendations are generated from your resume skills using upload, analyze, and recommendation endpoints.
          </p>

          <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center">
            <select
              className="select select-bordered bg-slate-800 border-slate-700 max-w-xs"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value) || 20)}
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={30}>Top 30</option>
              <option value={40}>Top 40</option>
              <option value={50}>Top 50</option>
            </select>
            <button
              className="px-5 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition"
              onClick={() => loadRecommendations(topN)}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Jobs"}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Recommendations</p>
              <p className="mt-1 text-2xl font-black text-cyan-100">{recommendationsCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Extracted Skills</p>
              <p className="mt-1 text-2xl font-black text-emerald-100">{skillsCount}</p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-violet-200">Sources</p>
              <p className="mt-1 text-2xl font-black text-violet-100">{Object.keys(groupedBySource).length}</p>
            </div>
          </div>

          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.slice(0, 18).map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold border border-cyan-500/30 text-cyan-200 bg-cyan-500/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Loading recommendations...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center text-rose-200">
              <p>{error}</p>
              {isMissingResumeMessage && (
                <Link
                  to={currentUsername ? `/profile/${currentUsername}` : "/"}
                  className="mt-4 inline-flex px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition"
                >
                  Go to Profile
                </Link>
              )}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              No recommendations available yet. Upload your resume from your profile and try again.
            </div>
          ) : (
            recommendations.map((job, index) => (
              <article
                key={`${job?.url || job?.title || "job"}-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2 max-w-4xl">
                    <h2 className="text-xl font-bold text-slate-100">{job?.title || job?.position || "Untitled Role"}</h2>
                    <p className="text-sm text-slate-300">{job?.company || "Unknown company"} • {job?.location || "Unknown location"}</p>
                    <p className="text-xs text-slate-500">
                      {job?.work_type || "N/A"} • {job?.experience_level || "N/A"} • {job?.source || "Unknown source"}
                    </p>
                    {job?.description && (
                      <p className="text-sm text-slate-400 line-clamp-4">{job.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 space-y-2">
                    <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border border-cyan-500/40 text-cyan-200 bg-cyan-500/10">
                      Match: {job?.match_score ?? "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">Matched skills: {job?.matched_skills_count ?? 0}</div>
                    {job?.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition"
                      >
                        Open Listing
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JobRecommendations;
