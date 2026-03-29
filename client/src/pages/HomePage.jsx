import { Link } from "react-router-dom";
import {
  VideoIcon,
  Code2Icon,
  ShieldCheckIcon,
  SignalIcon,
} from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import GuestHeader from "../components/GuestHeader";

const dsaTopics = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Heaps & Priority Queues",
  "Segment Trees",
];

const featureCards = [
  {
    title: "Live Interview OS",
    description:
      "Video, audio, chat, and collaborative code editor in one secure room so you never juggle tabs during high-stakes loops.",
    icon: VideoIcon,
  },
  {
    title: "Multi-language Sandbox",
    description:
      "Run candidates across popular stacks with battle-tested sandboxes for front-end, back-end, and systems prompts.",
    icon: Code2Icon,
  },
  {
    title: "Enterprise Guardrails",
    description:
      "SSO, audit-ready logging, rate limiting, and RBAC keep every interview compliant for top-tier hiring teams.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Signal-Rich Feedback",
    description:
      "Scorecards, playback, and structured rubrics surface the real signal behind every DS&A or systems session.",
    icon: SignalIcon,
  },
];

const statBlocks = [
  { label: "Interview-ready problems", value: "900+" },
  { label: "Supported languages", value: "25+" },
  { label: "Avg. session uptime", value: "99.9%" },
  { label: "Time to schedule", value: "<5 min" },
];

const HomePage = () => {
  const [charIndex, setCharIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([
    {
      rank: 1,
      name: "Alice Chen",
      score: 2850,
      status: "✓",
      color: "text-yellow-400",
    },
    {
      rank: 2,
      name: "Bob Smith",
      score: 2720,
      status: "✓",
      color: "text-gray-300",
    },
    {
      rank: 3,
      name: "Carol Davis",
      score: 2680,
      status: "✓",
      color: "text-orange-400",
    },
    {
      rank: 4,
      name: "David Wilson",
      score: 2450,
      status: "...",
      color: "text-slate-400",
    },
    {
      rank: 5,
      name: "Emma Johnson",
      score: 2380,
      status: "✓",
      color: "text-slate-400",
    },
  ]);
  const [slideInLeft, setSlideInLeft] = useState(false);
  const [slideInRight, setSlideInRight] = useState(false);

  const codeString = `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) return [seen.get(diff), i];
    seen.set(nums[i], i);
  }
  return [];
}`;

  useEffect(() => {
    setSlideInLeft(true);
    setSlideInRight(true);
  }, []);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 2);
    }, 10000);
    return () => clearInterval(slideTimer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLeaderboardData((prev) => {
        const updated = [...prev];
        const randomIdx = Math.floor(Math.random() * updated.length);
        updated[randomIdx].score =
          updated[randomIdx].score + Math.floor(Math.random() * 50);
        return updated
          .sort((a, b) => b.score - a.score)
          .map((item, idx) => ({ ...item, rank: idx + 1 }));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setCharIndex((prev) => (prev + 1) % (codeString.length + 1));
      },
      charIndex > codeString.length ? 800 : 50
    );
    return () => clearTimeout(timer);
  }, [charIndex, codeString.length]);

  const highlightCode = (code) => {
    const keywordRegex = /\b(function|const|let|for|if|return|new|in)\b/g;
    const parts = [];
    let lastIndex = 0;

    const matches = [...code.matchAll(keywordRegex)];

    matches.forEach((match) => {
      if (match.index > lastIndex) {
        parts.push({
          text: code.slice(lastIndex, match.index),
          type: "normal",
        });
      }
      parts.push({
        text: match[0],
        type: "keyword",
      });
      lastIndex = match.index + match[0].length;
    });

    if (lastIndex < code.length) {
      parts.push({
        text: code.slice(lastIndex),
        type: "normal",
      });
    }

    return parts.map((part, idx) => (
      <span
        key={idx}
        className={
          part.type === "keyword"
            ? "text-cyan-300 font-semibold"
            : "text-slate-100"
        }
      >
        {part.text}
      </span>
    ));
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-slate-900 via-slate-950 to-black" />
      <div className="absolute inset-x-0 top-0 -z-10 h-48 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.35),rgba(15,23,42,0))]" />

      <GuestHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-12 sm:pb-20 pt-8 sm:pt-12">
        <div className="relative overflow-hidden min-h-112.5 sm:min-h-150">
          {/* Slide 1: Contest Platform */}
          <div
            className={`absolute inset-0 grid gap-8 sm:gap-12 lg:grid-cols-2 items-center transition-all duration-1000 ${
              currentSlide === 0
                ? "translate-x-0 opacity-100"
                : "-translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            {/* Left: Contest description */}
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-500/30">
                Trusted by product-minded SDE hiring teams
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-slate-50">
                Scale Your Contest Platform with Real-Time Collaboration.
              </h1>
              <p className="max-w-2xl text-sm sm:text-base lg:text-lg text-slate-300">
                Host scalable coding contests with live leaderboards, instant
                feedback, multi-language support, and collaborative
                problem-solving. Track every submission, update scores in
                real-time, and showcase top performers across 900+ curated
                problems.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <SignInButton mode="modal">
                  <button className="btn btn-sm sm:btn-md rounded-full border-none bg-cyan-500 px-4 sm:px-6 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400 text-xs sm:text-sm">
                    Launch a contest
                  </button>
                </SignInButton>
                <Link
                  to="/problems"
                  className="btn btn-sm sm:btn-md rounded-full border border-white/15 bg-transparent px-4 sm:px-6 text-slate-50 hover:border-cyan-400/60 hover:bg-white/5 text-xs sm:text-sm"
                >
                  Explore problem bank
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2">
                  Live leaderboard
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2">
                  Real-time scoring
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2">
                  Multi-language
                </div>
              </div>
            </div>

            {/* Right: Leaderboard */}
            <div className="relative mt-8 lg:mt-0 max-[960px]:hidden">
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-linear-to-br from-emerald-500/30 via-cyan-400/10 to-transparent blur-3xl" />
              <div className="relative space-y-3 sm:space-y-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-emerald-500/20 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-semibold text-emerald-200">
                    Live Leaderboard
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Live Updates</span>
                  </div>
                </div>
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-slate-900 p-3 sm:p-4">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-3 sm:mb-4">
                    <span className="text-xs">Global Contest · All</span>
                    <span className="hidden sm:inline">Updated now</span>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
                    {leaderboardData.map((item) => (
                      <div
                        key={item.rank}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-2 sm:px-3 py-1.5 sm:py-2 text-xs transition-all duration-500 hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div
                            className={`font-bold w-4 sm:w-6 text-center shrink-0 ${item.color}`}
                          >
                            {item.rank === 1
                              ? "🥇"
                              : item.rank === 2
                              ? "🥈"
                              : item.rank === 3
                              ? "🥉"
                              : item.rank}
                          </div>
                          <span className="text-slate-200 font-medium truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <span className="text-cyan-200 font-semibold text-xs sm:text-sm">
                            {item.score}
                          </span>
                          <span
                            className={`text-xs ${item.status === "✓" ? "text-emerald-400" : "text-slate-500"}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 mt-3 sm:mt-4">
                  <div className="rounded-lg border border-white/10 bg-slate-950 p-2 text-center">
                    <div className="text-emerald-200 font-semibold text-xs sm:text-sm">1,250+</div>
                    <div className="text-xs">Competing</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950 p-2 text-center">
                    <div className="text-cyan-200 font-semibold text-xs sm:text-sm">45K+</div>
                    <div className="text-xs">Submissions</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950 p-2 text-center">
                    <div className="text-violet-200 font-semibold text-xs sm:text-sm">98%</div>
                    <div className="text-xs">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Interview Platform */}
          <div
            className={`absolute inset-0 grid gap-8 sm:gap-12 lg:grid-cols-2 items-center transition-all duration-1000 ${
              currentSlide === 1
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            {/* Left: Interview description */}
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-500/30">
                Trusted by product-minded SDE hiring teams
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-slate-50">
                Hire SDEs with a live interview workspace built for signal, not
                noise.
              </h1>
              <p className="max-w-2xl text-sm sm:text-base lg:text-lg text-slate-300">
                Run collaborative coding, system design, and troubleshooting
                interviews with built-in video, chat, screen share, and
                language-flexible editors. Capture real-time notes and
                structured feedback without losing focus.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <SignInButton mode="modal">
                  <button className="btn btn-sm sm:btn-md rounded-full border-none bg-cyan-500 px-4 sm:px-6 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400 text-xs sm:text-sm">
                    Launch an interview room
                  </button>
                </SignInButton>
                <Link
                  to="/problems"
                  className="btn btn-sm sm:btn-md rounded-full border border-white/15 bg-transparent px-4 sm:px-6 text-slate-50 hover:border-cyan-400/60 hover:bg-white/5 text-xs sm:text-sm"
                >
                  Explore problem bank
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2">
                  Live code + replay
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2">
                  Secure screen share
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2">
                  Structured scorecards
                </div>
              </div>
            </div>

            {/* Right: Code editor */}
            <div className="relative mt-8 lg:mt-0 max-[960px]:hidden">
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-linear-to-br from-cyan-500/30 via-emerald-400/10 to-transparent blur-3xl" />
              <div className="relative space-y-3 sm:space-y-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-cyan-500/20 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-semibold text-cyan-200">
                    Live session
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Connected
                  </div>
                </div>
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-slate-900 p-3 sm:p-4">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Candidate · JavaScript</span>
                    <span className="hidden sm:inline">Runtime: 2.1s</span>
                  </div>
                  <div className="mt-2 sm:mt-3 rounded-lg bg-slate-950 p-2 sm:p-3 font-mono text-xs sm:text-sm leading-relaxed min-h-40">
                    <div className="text-slate-400">// Arrays · Two Sum</div>
                    <div className="mt-2 whitespace-pre-wrap text-slate-100 relative">
                      {charIndex <= codeString.length ? (
                        <>
                          {highlightCode(codeString.slice(0, charIndex))}
                          <span className="animate-pulse">|</span>
                        </>
                      ) : (
                        <span className="text-slate-500 animate-pulse">
                          ...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-200">
                  <div className="rounded-lg sm:rounded-xl border border-white/10 bg-slate-900 p-3 sm:p-4">
                    <div className="text-xs text-slate-400">Collaboration</div>
                    <div className="mt-2 sm:mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Live chat</span>
                        <span className="badge border-none bg-emerald-400/20 text-emerald-100 text-xs">
                          on
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Screen share</span>
                        <span className="badge border-none bg-emerald-400/20 text-emerald-100 text-xs">
                          on
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg sm:rounded-xl border border-white/10 bg-slate-900 p-3 sm:p-4">
                    <div className="text-xs text-slate-400">Evaluation</div>
                    <div className="mt-2 sm:mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Problem type</span>
                        <span className="badge border-none bg-cyan-400/20 text-cyan-100 text-xs">
                          DSA
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Signal score</span>
                        <span className="text-emerald-300">High</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            <button
              onClick={() => setCurrentSlide(0)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === 0
                  ? "w-8 bg-cyan-400"
                  : "w-2 bg-slate-600 hover:bg-slate-500"
              }`}
              aria-label="Slide 1"
            />
            <button
              onClick={() => setCurrentSlide(1)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === 1
                  ? "w-8 bg-cyan-400"
                  : "w-2 bg-slate-600 hover:bg-slate-500"
              }`}
              aria-label="Slide 2"
            />
          </div>
        </div>

        <section className="mt-12 sm:mt-16 grid gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {statBlocks.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg sm:rounded-xl border border-white/5 bg-slate-900/60 p-3 sm:p-4 text-center shadow-inner shadow-black/20"
            >
              <div className="text-lg sm:text-2xl font-semibold text-cyan-200">
                {stat.value}
              </div>
              <div className="mt-1 text-xs sm:text-sm text-slate-300">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-12 sm:mt-16 space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                Built for deep technical signals
              </h2>
              <p className="text-xs sm:text-base text-slate-300 mt-1 sm:mt-2">
                Flexible rooms for algorithms, systems, debugging, and
                pair-programming—without leaving the browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <div className="rounded-full bg-emerald-400/20 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-emerald-100">
                Live chat
              </div>
              <div className="rounded-full bg-cyan-400/20 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-cyan-100">
                Video & screen share
              </div>
              <div className="rounded-full bg-violet-400/20 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-violet-100">
                Playback
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {featureCards.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 shadow-lg shadow-black/30"
              >
                <div
                  className="absolute inset-0 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                >
                  <div className="h-full w-full bg-linear-to-br from-cyan-500/15 via-emerald-400/10 to-transparent" />
                </div>
                <div className="relative flex items-start gap-3 sm:gap-4">
                  <span className="rounded-lg sm:rounded-xl bg-white/5 p-2 sm:p-3 text-cyan-200 ring-1 ring-cyan-500/30 shrink-0">
                    <Icon size={18} className="sm:w-5 sm:h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-50">
                      {title}
                    </h3>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-300">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 sm:mt-16 rounded-xl sm:rounded-2xl border border-white/10 bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-4 sm:p-8 shadow-2xl">
          <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2 sm:space-y-3">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                Cover the core DS&A spectrum
              </h2>
              <p className="text-xs sm:text-base text-slate-300">
                Calibrated prompts across multiple difficulty levels, with
                templates tuned for SDE I, SDE II, senior, and staff loops.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {dsaTopics.map((topic) => (
                <div
                  key={topic}
                  className="rounded-full border border-white/10 bg-white/5 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-slate-100 shadow-sm"
                >
                  {topic}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 sm:mt-16 lg:mt-20 grid gap-6 sm:gap-8 lg:grid-cols-2">
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg shadow-black/30">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-50">
              Interview flow that respects your process
            </h3>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-300">
              <li>
                • Schedule, host, and score in the same workspace—no add-ons
                required.
              </li>
              <li>
                • Swap between coding, system design boards, and debugging views
                seamlessly.
              </li>
              <li>
                • Preload prompts, hints, and solution checkpoints for
                consistent interviews.
              </li>
              <li>• Export structured feedback to your ATS with one click.</li>
            </ul>
            <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
              <Link
                to="/problems"
                className="btn btn-xs sm:btn-sm rounded-full border-none bg-emerald-400/80 px-3 sm:px-6 text-slate-900 hover:bg-emerald-300 text-xs"
              >
                Browse templates
              </Link>
              <SignInButton mode="modal">
                <button className="btn btn-xs sm:btn-sm rounded-full border border-white/15 bg-transparent px-3 sm:px-6 text-slate-50 hover:border-cyan-300/60 hover:bg-white/5 text-xs">
                  See it live
                </button>
              </SignInButton>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(74,222,128,0.2),transparent_30%)]" />
            <div className="relative space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-200">
                <span>Session timeline</span>
                <span className="text-xs text-slate-400">Playback ready</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {[
                  "Warm-up & rapport",
                  "Data structures round",
                  "Debugging deep dive",
                  "Decision & notes",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-100"
                  >
                    <div className="flex h-7 sm:h-9 w-7 sm:w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-cyan-200 shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item}</div>
                      <div className="text-xs text-slate-400 hidden sm:block">
                        Auto-captured timestamps + notes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 sm:mt-20 border-t border-white/10 bg-slate-950/50 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-4 md:gap-10 lg:gap-12">
            <div>
              <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                <span className="grid h-7 sm:h-8 w-7 sm:w-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs">
                  &gt;_
                </span>
                <span>Codezen</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Interview platform built for modern SDE hiring.
              </p>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-100">Product</h4>
              <ul className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm text-slate-400">
                <li>
                  <Link to="/" className="transition hover:text-slate-200">
                    Platform
                  </Link>
                </li>
                <li>
                  <Link
                    to="/problems"
                    className="transition hover:text-slate-200"
                  >
                    Problem Bank
                  </Link>
                </li>
                <li>
                  <Link to="/" className="transition hover:text-slate-200">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-100">Company</h4>
              <ul className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm text-slate-400">
                <li>
                  <a href="#" className="transition hover:text-slate-200">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-slate-200">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-slate-200">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-100">Legal</h4>
              <ul className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm text-slate-400">
                <li>
                  <a href="#" className="transition hover:text-slate-200">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-slate-200">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-slate-200">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 border-t border-white/10 pt-6 sm:pt-8 text-center text-xs text-slate-400">
            <p>&copy; 2026 Codezen. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
