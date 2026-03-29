import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import Editor from "@monaco-editor/react";
import axiosInstance from "../lib/axios";
import { FaPlay } from "react-icons/fa";

const ProblemDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isSignedIn } = useUser();

  const boilerplates = {
    javascript: `function solve() {
    // your code goes here
}

solve();
`,
    python: `def solve():
    # your code goes here
    pass


if __name__ == "__main__":
    solve()
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // your code goes here

    return 0;
}
`,
    java: `import java.io.*;
import java.util.*;

class Main {
    public static void main(String[] args) throws Exception {
        // your code goes here
    }
}
`,
  };

  const [problem, setProblem] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState(boilerplates.cpp);
  const [language, setLanguage] = useState("cpp");
  const [activeTab, setActiveTab] = useState("description");
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const languageMap = {
    javascript: "javascript",
    python: "python",
    cpp: "cpp",
    java: "java",
  };

  const languageOptions = [
    { value: "javascript", label: "JavaScript", icon: "/javascript.png" },
    { value: "python", label: "Python", icon: "/python.png" },
    { value: "cpp", label: "C++", icon: "/cplusplus.png" },
    { value: "java", label: "Java", icon: "/java.png" },
  ];

  const selectedLanguageMeta =
    languageOptions.find((l) => l.value === language) || languageOptions[0];

  // Fetch problem details
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/api/problems/${id}`);
        setProblem(response.data.data);

        // Fetch problem samples
        const samplesResponse = await axiosInstance.get(
          `/api/problems/${id}/samples`
        );
        setSamples(samplesResponse.data.data || []);

        setError("");
      } catch (err) {
        console.error("Error fetching problem:", err);
        setError("Failed to load problem details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProblem();
    }
  }, [id]);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme("codezen-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "comment.block", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "67e8f9" },
        { token: "keyword.control", foreground: "67e8f9" },
        { token: "string", foreground: "a5f3fc" },
        { token: "string.escape", foreground: "a5f3fc" },
        { token: "number", foreground: "fbbf24" },
        { token: "type", foreground: "34d399" },
        { token: "type.identifier", foreground: "34d399" },
        { token: "function", foreground: "34d399" },
        { token: "variable", foreground: "e2e8f0" },
      ],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editor.selectionBackground": "#1e293b",
        "editorCursor.foreground": "#06b6d4",
        "editor.whitespace": "#334155",
        "editorBracketMatch.border": "#475569",
        "editorBracketMatch.background": "#1e293b",
      },
    });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(boilerplates[newLang]);
  };

  const handleReset = () => {
    setCode(boilerplates[language]);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const container = document.getElementById("main-content");
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      
      // Constrain between 30% and 70%
      if (newPosition > 30 && newPosition < 70) {
        setSplitPosition(Math.round(newPosition * 10) / 10); // Round to 1 decimal
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    };
  }, [isDragging]);

  const handleRun = async () => {
    if (!code.trim()) {
      alert("Please write some code first");
      return;
    }

    if (samples.length === 0) {
      alert("No sample test cases available");
      return;
    }

    setIsRunning(true);
    setTestResults(null);  // Clear previous results
    setActiveTab("results");

    try {
      // Run code against selected sample only (NOT all test cases)
      const sample = samples[selectedSampleIndex];
      
      if (!sample) {
        throw new Error("Sample not found");
      }

      console.log("Running sample test:", {
        problemId: id,
        sampleIndex: selectedSampleIndex,
        sampleInput: sample.input?.substring(0, 50),
        sampleOutput: sample.output?.substring(0, 50),
      });

      const response = await axiosInstance.post("/api/submissions/run-sample", {
        problem_id: id,
        language,
        source_code: code,
        sample_input: sample.input || "",
      });

      const result = response.data;
      
      console.log("Run result:", {
        verdict: result.verdict,
        stdout: result.stdout?.substring(0, 100),
        statusId: result.status_id,
      });

      // Compare output
      const actualOutput = (result.stdout || "").trim();
      const expectedOutput = (sample.output || "").trim();
      const passed = actualOutput === expectedOutput && result.verdict === "accepted";

      console.log("Output comparison:", {
        actualLength: actualOutput.length,
        expectedLength: expectedOutput.length,
        match: actualOutput === expectedOutput,
        verdict: result.verdict,
        passed,
      });

      setTestResults({
        passed: passed ? 1 : 0,
        total: 1,
        cases: [{
          input: sample.input,
          expected: sample.output,
          output: actualOutput,
          passed: passed,
          verdict: result.verdict,
          runtime: result.runtime_ms,
          stderr: result.stderr,
          compile_output: result.compile_output,
        }],
        isSampleRun: true,
      });
    } catch (error) {
      console.error("Error running sample:", error);
      alert("Error running sample: " + (error.response?.data?.message || error.message));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert("Please write some code first");
      return;
    }

    if (!isSignedIn) {
      alert("Please sign in to submit");
      navigate("/sign-in");
      return;
    }

    setIsSubmitting(true);
    setTestResults(null);
    setActiveTab("results");

    try {
      // Create submission for all test cases
      console.log("Creating submission...");
      const response = await axiosInstance.post("/api/submissions", {
        problem_id: id,
        language,
        source_code: code,
      });

      if (!response.data || !response.data.id) {
        throw new Error("Invalid submission response: no submission ID returned");
      }

      const submissionId = response.data.id;
      let submissionData = response.data;
      let lastUpdateTime = Date.now();
      
      // Adaptive polling: start fast, then back off
      let pollIntervalMs = 500; // Start with 500ms
      const maxTotalTimeoutMs = 300000; // 5 minute hard cap
      const maxInactivityMs = 45000; // 45 seconds without progress => timeout
      const startTime = Date.now();

      console.log(`Submission created: ${submissionId}, initial verdict: ${submissionData.verdict}`);

      // Terminal verdicts that stop the loop
      const terminalVerdicts = ["accepted", "wrong_answer", "compilation_error", "runtime_error", "time_limit", "error"];
      // Continue polling while verdict is "pending" (results are still arriving via webhooks)

      // Poll for final verdict with adaptive backoff
      while (!terminalVerdicts.includes(submissionData.verdict)) {
        const elapsedTime = Date.now() - startTime;
        const inactivityTime = Date.now() - lastUpdateTime;

        if (elapsedTime >= maxTotalTimeoutMs || inactivityTime >= maxInactivityMs) {
          console.warn(`Polling timed out (elapsed=${elapsedTime}ms, inactivity=${inactivityTime}ms)`);
          break;
        }

        // Adaptive polling: increase interval after 30 seconds
        if (elapsedTime > 30000) {
          pollIntervalMs = 2000; // 2 seconds after 30s
        }
        if (elapsedTime > 60000) {
          pollIntervalMs = 3000; // 3 seconds after 60s
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        
        try {
          const resultResponse = await axiosInstance.get(`/api/submissions/${submissionId}`);
          
          // Verify response has data
          if (!resultResponse.data) {
            console.error("Empty response from poll");
            continue;
          }

          const newData = resultResponse.data;
          const elapsedSeconds = Math.round(elapsedTime / 1000);
          
          // Log progress updates (only when passed count changes)
          if (newData.test_cases_passed !== submissionData.test_cases_passed) {
            console.log(`[${elapsedSeconds}s] Progress: passed=${newData.test_cases_passed}/${newData.test_cases_total}`);
            submissionData = newData;
            lastUpdateTime = Date.now();
          } else if (newData.verdict !== submissionData.verdict) {
            console.log(`[${elapsedSeconds}s] Verdict changed: ${submissionData.verdict} → ${newData.verdict}`);
            submissionData = newData;
          } else {
            // No change, log less frequently
            if (elapsedTime % 10000 < pollIntervalMs) {
              console.log(`Polling... (${elapsedSeconds}s), passed: ${submissionData.test_cases_passed}/${submissionData.test_cases_total}`);
            }
          }
          
          // Show intermediate results even if still processing
          if (submissionData.test_results && typeof submissionData.test_results === 'object') {
            const testCases = [];
            Object.entries(submissionData.test_results).forEach(([tcId, result]) => {
              if (!result) return;
              testCases.push({
                input_path: result.input_path || "",
                output_path: result.output_path || "",
                expected: result.expected_output || "",
                output: result.actual_output || "",
                passed: result.verdict === "accepted",
                verdict: result.verdict || "unknown",
                runtime: result.runtime_ms || null,
                stderr: result.stderr || null,
                compile_output: result.compile_output || null,
                error: result.error || null,
              });
            });

            // Update UI with partial results - show as "processing" while verdict is still pending
            const isStillProcessing = submissionData.verdict === "pending" && submissionData.test_cases_passed < submissionData.test_cases_total;
            
            setTestResults({
              passed: submissionData.test_cases_passed || 0,
              total: submissionData.test_cases_total || 0,
              cases: testCases,
              verdict: submissionData.verdict || "pending",
              submissionId: submissionId,
              isFullSubmit: true,
              error_message: submissionData.error_message || null,
              isPartialResults: isStillProcessing,
            });
          }
          
          // Break if we got a terminal verdict
          if (terminalVerdicts.includes(submissionData.verdict)) {
            console.log(`Final verdict received: ${submissionData.verdict}`);
            break;
          }
        } catch (err) {
          const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
          
          if (err.response?.status === 404) {
            console.error("Submission not found (404)");
            throw new Error("Submission not found. It may have been deleted.");
          }
          
          // Log network errors but continue polling
          console.warn(`Poll failed after ${elapsedSeconds}s: ${err.message}`);
        }
      }

      // Check if we timed out while still processing
      if (!terminalVerdicts.includes(submissionData.verdict)) {
        console.warn("Polling timed out - verdict still pending");

        const partialCases = [];
        if (submissionData.test_results && typeof submissionData.test_results === 'object') {
          Object.entries(submissionData.test_results).forEach(([tcId, result]) => {
            if (!result) return;
            partialCases.push({
              input_path: result.input_path || "",
              output_path: result.output_path || "",
              expected: result.expected_output || "",
              output: result.actual_output || "",
              passed: result.verdict === "accepted",
              verdict: result.verdict || "unknown",
              runtime: result.runtime_ms || null,
              stderr: result.stderr || null,
              compile_output: result.compile_output || null,
              error: result.error || null,
            });
          });
        }

        setTestResults({
          passed: submissionData.test_cases_passed || 0,
          total: submissionData.test_cases_total || 0,
          cases: partialCases,
          verdict: "timeout",
          submissionId: submissionId,
          isFullSubmit: true,
          isPartialResults: true,
          error: "Judging is taking longer than expected. Your submission is still being processed. Please check back later.",
        });
        setIsSubmitting(false);
        return;
      }

      // Convert test_results JSONB to display format
      const testCases = [];
      if (submissionData.test_results && typeof submissionData.test_results === 'object') {
        Object.entries(submissionData.test_results).forEach(([tcId, result]) => {
          if (!result) return; // Skip null/undefined results
          
          testCases.push({
            input_path: result.input_path || "",
            output_path: result.output_path || "",
            expected: result.expected_output || "",
            output: result.actual_output || "",
            passed: result.verdict === "accepted",
            verdict: result.verdict || "unknown",
            runtime: result.runtime_ms || null,
            stderr: result.stderr || null,
            compile_output: result.compile_output || null,
            error: result.error || null,
          });
        });
      }

      // Ensure test cases count matches
      if (submissionData.test_cases_total && testCases.length === 0 && submissionData.verdict === "pending") {
        console.warn("No test cases returned but verdict is still pending");
      }

      console.log(`Submission complete: verdict=${submissionData.verdict}, passed=${submissionData.test_cases_passed}/${submissionData.test_cases_total}`);

      setTestResults({
        passed: submissionData.test_cases_passed || 0,
        total: submissionData.test_cases_total || 0,
        cases: testCases,
        verdict: submissionData.verdict || "unknown",
        submissionId: submissionId,
        isFullSubmit: true,
        error_message: submissionData.error_message || null,
      });
    } catch (error) {
      console.error("Error submitting:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      setTestResults({
        verdict: "error",
        error: errorMessage,
        cases: [],
        passed: 0,
        total: 0,
        isFullSubmit: true,
      });
      alert("Error submitting: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading problem...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="mb-4 text-lg text-red-400">
            {error || "Problem not found"}
          </p>
          <button
            onClick={() => navigate("/problems")}
            className="rounded-lg border border-cyan-400 bg-cyan-600 px-4 py-2 text-white transition hover:bg-cyan-700"
          >
            Back to Problems
          </button>
        </div>
      </div>
    );
  }

  const currentSample = samples[selectedSampleIndex];
  const difficultyColor = {
    easy: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    medium: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    hard: "bg-rose-400/15 text-rose-200 border-rose-400/30",
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 font-mono text-sm text-cyan-300">
            &gt;_
          </div>
          <span className="text-sm font-semibold">Codezen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-18 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
            <img
              src={selectedLanguageMeta.icon}
              alt={selectedLanguageMeta.label}
              width={20}
              className="object-contain"
            />
          </div>
          <select
            className="select select-sm rounded-lg border border-white/10 bg-white/5 text-xs text-slate-100"
            value={language}
            onChange={(e) => {
              const next = e.target.value;
              handleLanguageChange(next);
            }}
          >
            {languageOptions.map((lang) => (
              <option
                key={lang.value}
                value={lang.value}
                style={{
                  backgroundImage: `url(${lang.icon})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "8px center",
                  backgroundSize: "16px 16px",
                  paddingLeft: "28px",
                }}
              >
                {lang.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="btn btn-sm rounded-lg border border-white/10 bg-white/5 text-slate-50 transition hover:border-cyan-400/60 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isRunning ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Running
              </>
            ) : (
              <span className="flex items-center gap-2">
                <FaPlay className="text-[10px]" />
                Run
              </span>
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isRunning}
            className="btn btn-sm rounded-lg border-none bg-emerald-500 text-slate-950 shadow-lg transition hover:bg-emerald-400 disabled:bg-emerald-600 disabled:text-slate-900"
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Submitting
              </>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden" id="main-content">
        {/* Left Panel - Problem Description */}
        <div
          className="flex flex-col border-r border-white/10 overflow-hidden select-none"
          style={{ width: `${splitPosition}%`, minWidth: "30%", maxWidth: "70%", flex: `0 0 ${splitPosition}%` }}
        >
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-slate-900/50">
            {["description", "examples", "results"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 border-b-2 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider transition ${
                  activeTab === tab
                    ? "border-emerald-400 text-emerald-200"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "description" && (
              <div className="space-y-6">
                <div>
                  <h1 className="mb-3 text-2xl font-bold">{problem.title}</h1>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        difficultyColor[problem.difficulty?.toLowerCase() || "easy"]
                      }`}
                    >
                      {problem.difficulty || "Easy"}
                    </span>
                    <span className="text-xs text-slate-400">
                      Acceptance: {problem.acceptance?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3 whitespace-pre-wrap text-sm text-slate-300">
                  {problem.description}
                </div>

                {problem.input_format && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-100">
                      Input Format
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-slate-400">
                      {problem.input_format}
                    </p>
                  </div>
                )}

                {problem.output_format && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-100">
                      Output Format
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-slate-400">
                      {problem.output_format}
                    </p>
                  </div>
                )}

                {problem.hints && problem.hints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-100">Hints</h3>
                    <ul className="space-y-1">
                      {problem.hints.map((hint, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-emerald-400">•</span>
                          <span className="text-sm text-slate-400">{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {problem.constraints && (
                  <div className="space-y-2 border-t border-white/10 pt-6 mt-8">
                    <h3 className="font-semibold text-slate-100">Constraints</h3>
                    <p className="whitespace-pre-wrap text-sm text-slate-400">
                      {problem.constraints}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "examples" && samples.length > 0 && (
              <div className="space-y-4">
                {/* Sample Tabs */}
                <div className="flex gap-2 border-b border-white/10 pb-3">
                  {samples.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSampleIndex(idx)}
                      className={`rounded px-3 py-1 text-xs font-semibold transition ${
                        selectedSampleIndex === idx
                          ? "border border-emerald-400 bg-emerald-400/20 text-emerald-200"
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      Example {idx + 1}
                    </button>
                  ))}
                </div>

                {currentSample && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Input
                      </h4>
                      <pre className="rounded border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300 overflow-x-auto">
                        {currentSample.input}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Output
                      </h4>
                      <pre className="rounded border border-white/10 bg-slate-900/50 p-3 text-xs text-emerald-300 overflow-x-auto">
                        {currentSample.output}
                      </pre>
                    </div>

                    {currentSample.explanation && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Explanation
                        </h4>
                        <p className="whitespace-pre-wrap text-xs text-slate-300">
                          {currentSample.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "results" && testResults && (
              <div className="space-y-4">
                {/* Error Banner - Submission Error */}
                {testResults.verdict === "error" && (
                  <div className="rounded border border-red-400/50 bg-red-400/10 p-4">
                    <p className="text-xs text-red-300 font-semibold">Submission Error</p>
                    <p className="text-sm text-red-200 mt-2">{testResults.error || "An error occurred during submission"}</p>
                  </div>
                )}

                {/* Error Banner - Timeout */}
                {testResults.verdict === "timeout" && (
                  <div className="rounded border border-amber-400/50 bg-amber-400/10 p-4">
                    <p className="text-xs text-amber-300 font-semibold">Judging Timeout</p>
                    <p className="text-sm text-amber-200 mt-2">{testResults.error || "Judging is taking longer than expected. Please check back later."}</p>
                  </div>
                )}

                {/* Processing Banner - Partial Results */}
                {testResults.isPartialResults && testResults.verdict === "pending" && (
                  <div className="rounded border border-blue-400/50 bg-blue-400/10 p-4 animate-pulse">
                    <p className="text-xs text-blue-300 font-semibold">Live Results: Judging In Progress</p>
                    <p className="text-sm text-blue-200 mt-2">
                      Showing {testResults.passed}/{testResults.total} test cases judged so far. Updates arriving...
                    </p>
                  </div>
                )}

                {/* Results Summary Card */}
                <div className={`rounded border p-4 ${
                  testResults.verdict === "accepted" || (testResults.passed === testResults.total && testResults.total > 0)
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : testResults.verdict === "error" || testResults.verdict === "timeout"
                    ? "border-amber-400/50 bg-amber-400/10"
                    : testResults.isPartialResults && testResults.verdict === "pending"
                    ? "border-blue-400/50 bg-blue-400/10"
                    : "border-rose-400/50 bg-rose-400/10"
                }`}>
                  <p className="text-xs text-slate-400">Test Results</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">
                        {testResults.total > 0 ? `${testResults.passed}/${testResults.total} Passed` : 'No test cases'}
                      </p>
                      {testResults.isPartialResults && (
                        <p className="text-xs text-slate-400 mt-1">
                          Waiting for remaining test cases...
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {testResults.verdict === "accepted" || (testResults.passed === testResults.total && testResults.total > 0) ? (
                        <div className="flex items-center gap-2">
                          <div className="text-2xl text-emerald-400">✓</div>
                          <span className="text-xs font-semibold text-emerald-300">Accepted</span>
                        </div>
                      ) : testResults.verdict === "error" || testResults.verdict === "timeout" ? (
                        <div className="flex items-center gap-2">
                          <div className="text-2xl text-amber-400">⚠</div>
                          <span className="text-xs font-semibold text-amber-300">
                            {testResults.verdict === "timeout" ? "Timeout" : "Error"}
                          </span>
                        </div>
                      ) : testResults.isPartialResults && testResults.verdict === "pending" ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin text-2xl text-blue-400">⟳</div>
                          <span className="text-xs font-semibold text-blue-300">Processing</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-2xl text-rose-400">✕</div>
                          <span className="text-xs font-semibold text-rose-300">
                            {testResults.verdict ? testResults.verdict.replace('_', ' ') : 'Wrong Answer'}
                          </span>
                        </div>
                      )}
                      {testResults.submissionId && (
                        <span className="text-xs text-slate-400">ID: {testResults.submissionId.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Test Cases Details */}
                {testResults.cases && testResults.cases.length > 0 && (
                  <>
                    <div className="text-xs text-slate-400 mb-2">
                      Showing {testResults.cases.length} of {testResults.total} test cases
                    </div>
                    {testResults.cases.map((tc, idx) => (
                      <div
                        key={idx}
                        className={`rounded border p-3 ${
                          tc.verdict === "error"
                            ? "border-amber-400/30 bg-amber-400/10"
                            : tc.verdict === "pending"
                            ? "border-slate-400/30 bg-slate-400/10"
                            : tc.passed
                            ? "border-emerald-400/30 bg-emerald-400/10"
                            : "border-rose-400/30 bg-rose-400/10"
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            Case {idx + 1}
                          </span>
                          {tc.verdict === "error" ? (
                            <span className="text-amber-400">⚠</span>
                          ) : tc.verdict === "pending" ? (
                            <span className="text-slate-400 animate-pulse">◐</span>
                          ) : tc.passed ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-rose-400">✕</span>
                          )}
                          {tc.verdict && tc.verdict !== 'accepted' && tc.verdict !== 'error' && tc.verdict !== 'pending' && !tc.passed && (
                            <span className="text-xs text-rose-300">({tc.verdict.replace('_', ' ')})</span>
                          )}
                          {tc.runtime && (
                            <span className="text-xs text-slate-400 ml-auto">{tc.runtime}ms</span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Show error message if test case had an error */}
                          {tc.error && (
                            <div>
                              <span className="text-amber-300 font-semibold">Error: {tc.error}</span>
                            </div>
                          )}

                          {/* If still pending, show loading state */}
                          {tc.verdict === "pending" && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <span className="animate-spin">⟳</span>
                              <span>Awaiting result from judge server...</span>
                            </div>
                          )}

                          {/* Show Input Content for Sample Runs */}
                          {testResults.isSampleRun && tc.input && (
                            <div>
                              <span className="text-slate-400">Input: </span>
                              <pre className="mt-1 rounded bg-slate-950 p-2 text-blue-300 overflow-x-auto">
                                {tc.input}
                              </pre>
                            </div>
                          )}

                          {/* Show File Paths for Full Submissions */}
                          {testResults.isFullSubmit && (tc.input_path || tc.output_path) && (
                            <div className="space-y-1">
                              {tc.input_path && (
                                <div>
                                  <span className="text-slate-400">Input File: </span>
                                  <span className="text-blue-300">{tc.input_path}</span>
                                </div>
                              )}
                              {tc.output_path && (
                                <div>
                                  <span className="text-slate-400">Output File: </span>
                                  <span className="text-blue-300">{tc.output_path}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {tc.expected && tc.verdict !== "pending" && (
                            <div>
                              <span className="text-slate-400">Expected: </span>
                              <pre className="mt-1 rounded bg-slate-950 p-2 text-emerald-300 overflow-x-auto">
                                {tc.expected}
                              </pre>
                            </div>
                          )}
                          {tc.output && tc.verdict !== "pending" && (
                            <div>
                              <span className="text-slate-400">Output: </span>
                              <pre
                                className={`mt-1 rounded bg-slate-950 p-2 overflow-x-auto ${
                                  tc.passed
                                    ? "text-emerald-300"
                                    : "text-rose-300"
                                }`}
                              >
                                {tc.output}
                              </pre>
                            </div>
                          )}
                          {tc.stderr && tc.verdict !== "pending" && (
                            <div>
                              <span className="text-slate-400">StdErr: </span>
                              <pre className="mt-1 rounded bg-slate-950 p-2 text-amber-300 overflow-x-auto text-xs">
                                {tc.stderr}
                              </pre>
                            </div>
                          )}
                          {tc.compile_output && tc.verdict !== "pending" && (
                            <div>
                              <span className="text-slate-400">Compile Output: </span>
                              <pre className="mt-1 rounded bg-slate-950 p-2 text-rose-300 overflow-x-auto text-xs">
                                {tc.compile_output}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* No test cases message */}
                {(!testResults.cases || testResults.cases.length === 0) && testResults.verdict !== "error" && testResults.verdict !== "timeout" && !(testResults.isPartialResults && testResults.verdict === "pending") && (
                  <div className="flex items-center justify-center text-slate-400 p-4">
                    <p>No test case details available</p>
                  </div>
                )}

                {/* Still waiting for results */}
                {testResults.isPartialResults && testResults.verdict === "pending" && (!testResults.cases || testResults.cases.length === 0) && (
                  <div className="flex items-center justify-center text-slate-400 p-6">
                    <div className="text-center">
                      <div className="animate-spin text-3xl text-blue-400 mb-2">⟳</div>
                      <p>Waiting for test case results...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "results" && !testResults && (
              <div className="flex items-center justify-center text-slate-400">
                Run your code to see test results
              </div>
            )}
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-1.5 cursor-col-resize border-l border-white/20 bg-linear-to-r from-white/5 to-white/10 transition-all hover:bg-linear-to-r hover:from-emerald-500/40 hover:to-emerald-500/20 hover:border-emerald-500/80 select-none z-50 shrink-0 ${
            isDragging ? "bg-linear-to-r from-emerald-500/60 to-emerald-500/40 border-emerald-500/80" : ""
          }`}
          style={{ userSelect: "none", cursor: isDragging ? "col-resize" : "col-resize" }}
        />

        {/* Right Panel - Code Editor */}
        <div
          className="flex flex-col border-l border-white/10 overflow-hidden"
          style={{ width: `${100 - splitPosition}%`, minWidth: "30%", maxWidth: "70%", flex: `0 0 ${100 - splitPosition}%` }}
        >
          {/* Editor Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Code</span>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 transition hover:text-slate-200"
            >
              Reset
            </button>
          </div>

          {/* Monaco Editor */}
          <Editor
            height="100%"
            language={languageMap[language]}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="codezen-dark"
            beforeMount={handleEditorWillMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontWeight: "500",
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              formatOnPaste: true,
              formatOnType: true,
              renderWhitespace: "selection",
              "editor.renderIndentGuides": true,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;
