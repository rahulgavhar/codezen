import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { FaPlay } from "react-icons/fa";
import axiosInstance from "../lib/axios";
import { useUser } from "@clerk/clerk-react";

function decodeBase64IfNeeded(data) {
  if (!data) return data;
  if (typeof data !== 'string') return data;
  
  const trimmed = data.trim();
  if (!trimmed) return data;
  
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(trimmed)) {
    return data;
  }
  
  if (trimmed.length % 4 !== 0) {
    return data;
  }
  
  try {
    const decoded = atob(trimmed);
    
    let controlCharCount = 0;
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
        controlCharCount++;
      }
      if (charCode === 0) {
        return data;
      }
    }
    
    if (controlCharCount > decoded.length * 0.1) {
      return data;
    }
    
    return decoded;
  } catch (err) {
    return data;
  }
}

const CodeEditor = ({ onClose, problemData, socket, interviewId, role }) => {
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

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(boilerplates.cpp);
  const [activeTab, setActiveTab] = useState("description");
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(role === "staff");
  const [syncStatus, setSyncStatus] = useState("");
  const [samples, setSamples] = useState([]);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const editorRef = useRef(null);
  const codeChangeTimeoutRef = useRef(null);
  const selectedLanguageMeta = languageOptions.find((l) => l.value === language) || languageOptions[0];

  // Setup Socket.IO listeners for real-time code sync
  useEffect(() => {
    if (!socket) return;

    const handleCodeChanged = (data) => {
      console.log("[CodeEditor] Received code change from:", data.from);
      if (role === "staff") {
        setCode(data.code);
        setLanguage(data.language || "cpp");
        setSyncStatus("Code updated from candidate");
        setTimeout(() => setSyncStatus(""), 2000);
      }
    };

    const handleCodeSyncRequest = (data) => {
      console.log("[CodeEditor] Received sync request");
      if (role !== "staff") {
        socket.emit("code-sync-response", {
          interviewId,
          to: data.from,
          code,
          language,
        });
      }
    };

    const handleCodeSynced = (data) => {
      console.log("[CodeEditor] Received code sync response");
      if (role === "staff") {
        setCode(data.code);
        setLanguage(data.language || "cpp");
        setSyncStatus("Code synchronized");
        setTimeout(() => setSyncStatus(""), 2000);
      }
    };

    socket.on("code-changed", handleCodeChanged);
    socket.on("code-sync-request", handleCodeSyncRequest);
    socket.on("code-synced", handleCodeSynced);

    return () => {
      socket.off("code-changed", handleCodeChanged);
      socket.off("code-sync-request", handleCodeSyncRequest);
      socket.off("code-synced", handleCodeSynced);
    };
  }, [socket, interviewId, role, code, language]);

  // Drag handler for resizable divider
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

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(boilerplates[newLang]);
  };

  const handleReset = () => {
    setCode(boilerplates[language]);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode || "");

    if (socket && !isReadOnly) {
      clearTimeout(codeChangeTimeoutRef.current);
      codeChangeTimeoutRef.current = setTimeout(() => {
        socket.emit("code-change", {
          interviewId,
          code: newCode,
          language,
        });
      }, 500);
    }
  };

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

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    if (isReadOnly) {
      editor.updateOptions({ readOnly: true });
    }
  };

  // Fetch problem samples if available
  useEffect(() => {
    if (problemData?.problem_id) {
      const fetchSamples = async () => {
        try {
          const response = await axiosInstance.get(
            `/api/problems/${problemData.problem_id}/samples`
          );
          setSamples(response.data.data || []);
        } catch (err) {
          console.error("Error fetching samples:", err);
        }
      };
      fetchSamples();
    }
  }, [problemData]);

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
    setTestResults(null);
    setActiveTab("results");

    try {
      const sample = samples[selectedSampleIndex];

      if (!sample) {
        throw new Error("Sample not found");
      }

      const response = await axiosInstance.post("/api/submissions/run-sample", {
        problem_id: problemData.problem_id,
        language,
        source_code: code,
        sample_input: sample.input || "",
      });

      const result = response.data;
      const actualOutput = decodeBase64IfNeeded(result.stdout || "").trim();
      const expectedOutput = (sample.output || "").trim();
      const passed = actualOutput === expectedOutput && result.verdict === "accepted";

      setTestResults({
        passed: passed ? 1 : 0,
        total: 1,
        cases: [
          {
            input: sample.input,
            expected: expectedOutput,
            output: actualOutput,
            passed: passed,
            verdict: result.verdict,
            runtime: result.runtime_ms,
            stderr: result.stderr,
            compile_output: result.compile_output,
          },
        ],
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
      return;
    }

    setIsSubmitting(true);
    setTestResults(null);
    setActiveTab("results");

    try {
      const response = await axiosInstance.post("/api/submissions", {
        problem_id: problemData.problem_id,
        language,
        source_code: code,
      });

      if (!response.data || !response.data.id) {
        throw new Error("Invalid submission response: no submission ID returned");
      }

      const submissionId = response.data.id;
      let submissionData = response.data;
      let lastUpdateTime = Date.now();

      let pollIntervalMs = 500;
      const maxTotalTimeoutMs = 300000;
      const maxInactivityMs = 45000;
      const startTime = Date.now();

      console.log(`Submission created: ${submissionId}, initial verdict: ${submissionData.verdict}`);

      const terminalVerdicts = ["accepted", "wrong_answer", "compilation_error", "runtime_error", "time_limit", "error", "internal_error"];

      while (!terminalVerdicts.includes(submissionData.verdict)) {
        const elapsedTime = Date.now() - startTime;
        const inactivityTime = Date.now() - lastUpdateTime;

        if (elapsedTime >= maxTotalTimeoutMs || inactivityTime >= maxInactivityMs) {
          console.warn(`Polling timed out (elapsed=${elapsedTime}ms, inactivity=${inactivityTime}ms)`);
          break;
        }

        if (elapsedTime > 30000) {
          pollIntervalMs = 2000;
        }
        if (elapsedTime > 60000) {
          pollIntervalMs = 3000;
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        try {
          const resultResponse = await axiosInstance.get(`/api/submissions/${submissionId}`);

          if (!resultResponse.data) {
            console.error("Empty response from poll");
            continue;
          }

          const newData = resultResponse.data;
          const elapsedSeconds = Math.round(elapsedTime / 1000);

          if (newData.test_cases_passed !== submissionData.test_cases_passed) {
            console.log(`[${elapsedSeconds}s] Progress: passed=${newData.test_cases_passed}/${newData.test_cases_total}`);
            submissionData = newData;
            lastUpdateTime = Date.now();
          } else if (newData.verdict !== submissionData.verdict) {
            console.log(`[${elapsedSeconds}s] Verdict changed: ${submissionData.verdict} → ${newData.verdict}`);
            submissionData = newData;
          }

          if (submissionData.test_results && typeof submissionData.test_results === "object") {
            const testCases = [];
            Object.entries(submissionData.test_results).forEach(([tcId, result]) => {
              if (!result) return;
              testCases.push({
                input_path: result.input_path || "",
                output_path: result.output_path || "",
                expected: decodeBase64IfNeeded(result.expected_output) || "",
                output: decodeBase64IfNeeded(result.actual_output) || "",
                passed: result.verdict === "accepted",
                verdict: result.verdict || "unknown",
                runtime: result.runtime_ms || null,
                stderr: result.stderr || null,
                compile_output: result.compile_output || null,
                error: result.error || null,
              });
            });

            const isStillProcessing =
              submissionData.verdict === "pending" &&
              submissionData.test_cases_passed < submissionData.test_cases_total;

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

          if (terminalVerdicts.includes(submissionData.verdict)) {
            console.log(`Final verdict received: ${submissionData.verdict}`);
            break;
          }
        } catch (pollError) {
          console.error("Polling error:", pollError.message);
        }
      }

      if (submissionData.test_results && typeof submissionData.test_results === "object") {
        const testCases = [];
        Object.entries(submissionData.test_results).forEach(([tcId, result]) => {
          if (!result) return;
          testCases.push({
            input_path: result.input_path || "",
            output_path: result.output_path || "",
            expected: decodeBase64IfNeeded(result.expected_output) || "",
            output: decodeBase64IfNeeded(result.actual_output) || "",
            passed: result.verdict === "accepted",
            verdict: result.verdict || "unknown",
            runtime: result.runtime_ms || null,
            stderr: result.stderr || null,
            compile_output: result.compile_output || null,
            error: result.error || null,
          });
        });

        setTestResults({
          passed: submissionData.test_cases_passed || 0,
          total: submissionData.test_cases_total || 0,
          cases: testCases,
          verdict: submissionData.verdict || "unknown",
          submissionId: submissionId,
          isFullSubmit: true,
          error_message: submissionData.error_message || null,
          isPartialResults: false,
        });
      }
    } catch (error) {
      console.error("Error submitting:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Unknown error";
      alert("Error submitting: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!problemData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">No problem data available</p>
      </div>
    );
  }

  const currentSample = samples[selectedSampleIndex];

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>✕</span>
              <span>Close</span>
            </button>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 font-mono text-sm text-cyan-300">
            &gt;_
          </div>
          <span className="text-sm font-semibold">Codezen</span>
          {isReadOnly && (
            <span className="ml-2 text-xs font-semibold text-amber-300 bg-amber-500/20 px-2 py-1 rounded-lg">
              Read-Only (Viewing)
            </span>
          )}
          {syncStatus && (
            <span className="ml-2 text-xs font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-lg">
              {syncStatus}
            </span>
          )}
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
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isReadOnly}
          >
            {languageOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting || isReadOnly}
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
            disabled={isSubmitting || isRunning || isReadOnly}
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
                {/* Show ONLY transformed description - no original, no AI label */}
                {problemData.gemini_description ? (
                  <div className="space-y-3 text-sm text-slate-300 prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                    <style>{'.katex-html { display: none; }'}</style>
                    <div dangerouslySetInnerHTML={{ __html: problemData.gemini_description }} />
                  </div>
                ) : problemData.description ? (
                  <div className="space-y-3 text-sm text-slate-300 prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                    <style>{'.katex-html { display: none; }'}</style>
                    <div dangerouslySetInnerHTML={{ __html: problemData.description }} />
                  </div>
                ) : (
                  <p className="text-slate-400">No problem description available</p>
                )}

                {problemData.input_format && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-100">Input Format</h3>
                    <div className="text-sm text-slate-400 prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                      <style>{'.katex-html { display: none; }'}</style>
                      <div dangerouslySetInnerHTML={{ __html: problemData.input_format }} />
                    </div>
                  </div>
                )}

                {problemData.output_format && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-100">Output Format</h3>
                    <div className="text-sm text-slate-400 prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                      <style>{'.katex-html { display: none; }'}</style>
                      <div dangerouslySetInnerHTML={{ __html: problemData.output_format }} />
                    </div>
                  </div>
                )}

                {problemData.constraints && (
                  <div className="space-y-2 border-t border-white/10 pt-6 mt-8">
                    <h3 className="font-semibold text-slate-100">Constraints</h3>
                    <div className="text-sm text-slate-400 prose prose-invert max-w-none" style={{ color: 'inherit' }}>
                      <style>{'.katex-html { display: none; }'}</style>
                      <div dangerouslySetInnerHTML={{ __html: problemData.constraints }} />
                    </div>
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
                {/* Error Banner */}
                {testResults.verdict === "error" && (
                  <div className="rounded border border-red-400/50 bg-red-400/10 p-4">
                    <p className="text-xs text-red-300 font-semibold">Submission Error</p>
                    <p className="text-sm text-red-200 mt-2">{testResults.error || testResults.error_message || "An error occurred"}</p>
                  </div>
                )}

                {/* Processing Banner */}
                {testResults.isPartialResults && testResults.verdict === "pending" && (
                  <div className="rounded border border-blue-400/50 bg-blue-400/10 p-4 animate-pulse">
                    <p className="text-xs text-blue-300 font-semibold">Live Results: Judging In Progress</p>
                    <p className="text-sm text-blue-200 mt-2">
                      Showing {testResults.passed}/{testResults.total} test cases judged so far. Updates arriving...
                    </p>
                  </div>
                )}

                {/* Results Summary Card */}
                <div
                  className={`rounded border p-4 ${
                    testResults.verdict === "accepted" || (testResults.passed === testResults.total && testResults.total > 0)
                      ? "border-emerald-400/50 bg-emerald-400/10"
                      : testResults.isPartialResults && testResults.verdict === "pending"
                      ? "border-blue-400/50 bg-blue-400/10"
                      : "border-rose-400/50 bg-rose-400/10"
                  }`}
                >
                  <p className="text-xs text-slate-400">Test Results</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">
                        {testResults.total > 0 ? `${testResults.passed}/${testResults.total} Passed` : 'No test cases'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {testResults.verdict === "accepted" || (testResults.passed === testResults.total && testResults.total > 0) ? (
                        <div className="flex items-center gap-2">
                          <div className="text-2xl text-emerald-400">✓</div>
                          <span className="text-xs font-semibold text-emerald-300">Accepted</span>
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
                          <span className="text-xs font-semibold">Case {idx + 1}</span>
                          {tc.verdict === "error" ? (
                            <span className="text-amber-400">⚠</span>
                          ) : tc.verdict === "pending" ? (
                            <span className="text-slate-400 animate-pulse">◐</span>
                          ) : tc.passed ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-rose-400">✕</span>
                          )}
                          {tc.runtime && (
                            <span className="text-xs text-slate-400 ml-auto">{tc.runtime}ms</span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs">
                          {tc.error && (
                            <div>
                              <span className="text-amber-300 font-semibold">Error: {tc.error}</span>
                            </div>
                          )}

                          {testResults.isSampleRun && tc.input && (
                            <div>
                              <span className="text-slate-400">Input: </span>
                              <pre className="mt-1 rounded bg-slate-950 p-2 text-blue-300 overflow-x-auto">
                                {tc.input}
                              </pre>
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
                                  tc.passed ? "text-emerald-300" : "text-rose-300"
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

                {(!testResults.cases || testResults.cases.length === 0) && testResults.verdict !== "error" && !(testResults.isPartialResults && testResults.verdict === "pending") && (
                  <div className="flex items-center justify-center text-slate-400 p-4">
                    <p>No test case details available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "results" && !testResults && (
              <div className="flex items-center justify-center text-slate-400 h-full">
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
            {!isReadOnly && (
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 transition hover:text-slate-200"
              >
                Reset
              </button>
            )}
          </div>

          {/* Monaco Editor */}
          <Editor
            height="100%"
            language={languageMap[language]}
            value={code}
            onChange={handleCodeChange}
            theme="codezen-dark"
            beforeMount={handleEditorWillMount}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 15,
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

export default CodeEditor;
