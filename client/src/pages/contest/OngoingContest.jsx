import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const sampleProblems = [
  { code: "A", title: "Warmup Arrays", submissions: 312 },
  { code: "B", title: "Two Pointers", submissions: 287 },
  { code: "C", title: "Greedy Gifts", submissions: 241 },
  { code: "D", title: "Graph Paths", submissions: 198 },
  { code: "E", title: "Segment Trees", submissions: 124 },
  { code: "F", title: "Flow Network", submissions: 86 },
];

const sampleSubmissions = [
  { title: "Warmup Arrays", time: "12:10", verdict: "Accepted", language: "C++17" },
  { title: "Two Pointers", time: "12:25", verdict: "Wrong Answer", language: "Python 3" },
  { title: "Greedy Gifts", time: "12:50", verdict: "Accepted", language: "Java 17" },
];

const sampleStandings = [
  { rank: 1, handle: "bytefox", score: 600, solved: 6, penalty: 14 },
  { rank: 2, handle: "algowiz", score: 560, solved: 5, penalty: 22 },
  { rank: 3, handle: "devkiran", score: 520, solved: 5, penalty: 35 },
  { rank: 4, handle: "theorycraft", score: 470, solved: 4, penalty: 40 },
];

const OngoingContest = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);

  // Redirect staff users to staff dashboard
  if (profile?.app_role === 'staff') {
    return navigate('/staff/dashboard');
  }

  const [selectedProblem, setSelectedProblem] = useState("A");
  const [language, setLanguage] = useState("C++17");
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [activeTab, setActiveTab] = useState("problems");

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 flex-1">
        <header className="flex flex-col gap-3">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Ongoing Contest</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Codezen Round</h1>
          <p className="text-sm text-slate-300 sm:text-base">Track problems, submit solutions, and watch the standings live.</p>
        </header>

        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-2">
          {[
            { key: "problems", label: "Problems" },
            { key: "submit", label: "Submit Code" },
            { key: "submissions", label: "My Submissions" },
            { key: "standings", label: "Standings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-cyan-600 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "problems" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Problems</h2>
              <span className="text-xs text-slate-400">A - F</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-right font-semibold">Submissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sampleProblems.map((p) => (
                    <tr
                      key={p.code}
                      className="hover:bg-white/5 cursor-pointer"
                      onClick={() => setSelectedProblem(p.code)}
                    >
                      <td className="px-4 py-3 font-semibold text-cyan-200">{p.code}</td>
                      <td className="px-4 py-3">{p.title}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{p.submissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "submit" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Submit Code</h2>
                <p className="text-xs text-slate-400">Problem {selectedProblem}</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200">Live</span>
            </div>
            <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="text-sm font-medium text-slate-200">
                Language
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>C++17</option>
                  <option>Javascript</option>
                  <option>Python3</option>
                  <option>Java 17</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-200">
                Upload file
                <div className="mt-1 flex items-center gap-3 rounded-lg border border-dashed border-white/15 bg-slate-950 px-3 py-3 text-sm">
                  <input
                    type="file"
                    className="text-xs text-slate-300"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                  />
                  {fileName && <span className="text-xs text-cyan-200">{fileName}</span>}
                </div>
              </label>

              <label className="text-sm font-medium text-slate-200">
                Or type code
                <textarea
                  className="mt-1 h-32 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
                  placeholder="// Paste your solution here"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                Submit
              </button>
            </form>
          </section>
        )}

        {activeTab === "submissions" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Submissions</h2>
              <span className="text-xs text-slate-400">Recent</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Verdict</th>
                    <th className="px-4 py-3 text-left font-semibold">Language</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sampleSubmissions.map((s, idx) => (
                    <tr key={`${s.title}-${idx}`} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-slate-100">{s.title}</td>
                      <td className="px-4 py-3 text-slate-300">{s.time}</td>
                      <td className={`px-4 py-3 font-semibold ${s.verdict === "Accepted" ? "text-emerald-400" : "text-amber-300"}`}>
                        {s.verdict}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{s.language}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "standings" && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Standings</h2>
              <span className="text-xs text-slate-400">Top 4</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Rank</th>
                    <th className="px-4 py-3 text-left font-semibold">Handle</th>
                    <th className="px-4 py-3 text-left font-semibold">Score</th>
                    <th className="px-4 py-3 text-left font-semibold">Solved</th>
                    <th className="px-4 py-3 text-left font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sampleStandings.map((row) => (
                    <tr key={row.rank} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-cyan-200">{row.rank}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">{row.handle}</td>
                      <td className="px-4 py-3 text-slate-300">{row.score}</td>
                      <td className="px-4 py-3 text-slate-300">{row.solved}</td>
                      <td className="px-4 py-3 text-slate-300">{row.penalty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default OngoingContest;
