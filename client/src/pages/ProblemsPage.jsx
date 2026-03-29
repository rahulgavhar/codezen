import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import axios from "axios";
import ProblemsCard from "../components/problems/ProblemsCard";
import { useUser } from "@clerk/clerk-react";
import GuestHeader from "../components/GuestHeader";
import axiosInstance from "../lib/axios";
import tags from "../utils/tags.json";

// Topics are now dynamically loaded from tags.json in the component

const badgeTone = {
  Easy: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
  Medium: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  Hard: "bg-rose-400/15 text-rose-200 border-rose-400/30",
};

const statusTone = {
  Solved: "text-emerald-300",
  Attempted: "text-amber-200",
  Unsolved: "text-slate-400",
};

const ProblemsPage = () => {
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const [problems, setProblems] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get topics from tags.json
  const topicsList = tags.topics;

  // Fetch problems from API with filters
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        
        // Build query string with filters
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('limit', itemsPerPage);
        
        if (selectedTopics.length > 0) {
          params.append('topics', selectedTopics.join(','));
        }
        
        if (selectedDifficulties.length > 0) {
          params.append('difficulties', selectedDifficulties.join(','));
        }
        
        if (query.trim()) {
          params.append('search', query.trim());
        }

        const response = await axiosInstance.get(`/api/problems?${params.toString()}`);
        setProblems(response.data.data || []);
        setError("");
      } catch (err) {
        console.error("Error fetching problems:", err);
        setError("Failed to fetch problems. Please try again later.");
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [selectedTopics, selectedDifficulties, query, currentPage]);

  const handleTopicToggle = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handleDifficultyToggle = (difficulty) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty) ? prev.filter((d) => d !== difficulty) : [...prev, difficulty]
    );
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handleSearch = () => {
    // Reset to page 1 when searching
    setCurrentPage(1);
    // Scroll to results section
    const resultsSection = document.querySelector('section');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {isSignedIn ? <Header /> : <GuestHeader />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[34px_34px] opacity-25" aria-hidden />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 flex-1">
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Problem Bank</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sharpen your coding edge</h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Filter by topic and difficulty, skim acceptance and attempt counts, then dive in.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search problems by title..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>

              {/* Topics Multi-select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Topics</label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {topicsList.map((topic) => (
                    <label key={topic} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic)}
                        onChange={() => handleTopicToggle(topic)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer"
                      />
                      <span className="text-sm text-slate-300">{topic}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Difficulty Multi-select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Difficulty</label>
                <div className="flex gap-3">
                  {["Easy", "Medium", "Hard"].map((difficulty) => (
                    <label key={difficulty} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDifficulties.includes(difficulty)}
                        onChange={() => handleDifficultyToggle(difficulty)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer"
                      />
                      <span className="text-sm text-slate-300">{difficulty}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedTopics([]);
                    setSelectedDifficulties([]);
                    setQuery("");
                  }}
                  className="text-xs text-cyan-300 hover:text-cyan-200 transition hover:cursor-pointer"
                >
                  Clear filters
                </button>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-sm transition hover:cursor-pointer disabled:hover:cursor-not-allowed"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {loading ? (
            <div className="col-span-full text-center text-slate-400">Loading problems...</div>
          ) : error ? (
            <div className="col-span-full text-center text-red-400">{error}</div>
          ) : problems.length > 0 ? (
            problems.map((problem) => (
              <ProblemsCard key={problem.id} problem={problem} />
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-300">
              No problems match that filter. Try another topic or search query.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProblemsPage;
