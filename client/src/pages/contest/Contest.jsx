import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const Contest = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState("--:--:--");

  useEffect(() => {
    const target = new Date(Date.now() + 3 * 60 * 60 * 1000); // default: starts in 3h

    const update = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(
        [hours, minutes, seconds]
          .map((v) => String(v).padStart(2, "0"))
          .join(":")
      );
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const prizes = [
    { place: "1st", reward: "$800", extras: "Trophy + Swag Kit" },
    { place: "2nd", reward: "$400", extras: "Premium Hoodie" },
    { place: "3rd", reward: "$200", extras: "Mechanical Keyboard" },
  ];

  const rules = [
    "You must code solo. No team submissions allowed.",
    "One account per participant; sharing is strictly prohibited.",
    "Problems are unlocked at start; clarifications via announcements only.",
    "Plagiarism or code sharing results in immediate disqualification.",
    "Tie-breaker: total penalty time, then earliest final submission.",
    "Use only allowed languages (C++17, Python3, Java 17, Javascript).",
  ];

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Contest Brief
              </p>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pr-1.5 pl-3 py-1 text-xs font-semibold text-white">
                <span className="text-slate-200">Starts in</span>
                <span className="rounded-full border border-cyan-600/80 px-2 py-0.5 text-[11px] tracking-wide">
                  {countdown}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Codezen Challenge
            </h1>
            <button className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500">
              Register now
            </button>
          </div>

          <p className="text-sm text-slate-300 sm:text-base">
            Final prep before the clock starts—review prizes, sponsors, timing,
            penalties, and rules.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Prizes</h2>
                  <p className="text-xs text-slate-400">
                    Top performers take home cash and gear
                  </p>
                </div>
                <span className="rounded-full border border-cyan-600/80 px-3 py-1 text-xs font-semibold text-white">
                  Total pool: $1,400
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {prizes.map((item) => (
                  <div
                    key={item.place}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-5 text-center shadow-inner shadow-slate-900/50"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                      {item.place}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {item.reward}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">{item.extras}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Rules & Regulations</h2>
                  <p className="text-xs text-slate-400">
                    Stay compliant to keep your rank intact
                  </p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200">
                  Read before you start
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {rules.map((rule, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"
                  >
                    <span
                      className="mt-0.5 h-2 w-2 rounded-full bg-cyan-400"
                      aria-hidden
                    />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl shadow-slate-900/30">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Sponsored by
              </p>
              <h3 className="mt-1 text-2xl font-semibold">Algoworks Labs</h3>
              <p className="mt-2 text-sm text-slate-300">
                Building next-gen tooling for competitive programmers. Winners
                get fast-track internship interviews.
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                <p className="font-semibold text-cyan-100">
                  Perks from sponsor
                </p>
                <ul className="mt-2 space-y-1 text-slate-200">
                  <li>• Cloud credits for top 10</li>
                  <li>• Exclusive workshop invites</li>
                  <li>• Hiring referrals for finalists</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/30 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Registered
                  </p>
                  <p className="text-3xl font-bold">1,248</p>
                  <p className="text-xs text-slate-400">
                    Participants confirmed
                  </p>
                </div>
                <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Seats open
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Duration
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    2h 30m
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Start Time
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    18:00 IST
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Penalty
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    +10 min on wrong submission
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Scoring
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    ICPC style; ties by penalty
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contest;
