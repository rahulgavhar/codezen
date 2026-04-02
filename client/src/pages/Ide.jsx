import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import axiosInstance from "../lib/axios";

const Ide = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.user?.profile);

  // Redirect staff users to staff dashboard
  if (profile?.app_role === 'staff') {
    return navigate('/staff/dashboard');
  }

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

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(boilerplates.cpp);
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [compileOutput, setCompileOutput] = useState("");
  const [showIO, setShowIO] = useState(false);
  const [executed, setExecuted] = useState(false);
  
  // Submission state
  const [submissionId, setSubmissionId] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [memory, setMemory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const languageMap = {
    javascript: "javascript",
    python: "python",
    cpp: "cpp",
    java: "java",
  };

  const SUPPORTED_LANGUAGE_IDS = {
    cpp: 54,        // C++ (GCC 9.2.0)
    java: 62,       // Java
    python: 71,     // Python 3
    javascript: 63  // Node.js
  };

  const languageOptions = [
    { value: "javascript", label: "JavaScript", icon: "/javascript.png" },
    { value: "python", label: "Python", icon: "/python.png" },
    { value: "cpp", label: "C++", icon: "/cplusplus.png" },
    { value: "java", label: "Java", icon: "/java.png" },
  ];

  const selectedLanguageMeta =
    languageOptions.find((l) => l.value === language) || languageOptions[0];

  // Match CodeEditor.jsx theme and feel
  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme("codezen-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "67e8f9" },
        { token: "string", foreground: "a5f3fc" },
        { token: "number", foreground: "fbbf24" },
        { token: "function", foreground: "34d399" },
      ],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editor.selectionBackground": "#1e293b",
        "editor.inactiveSelectionBackground": "#1e293b80",
        "editorCursor.foreground": "#06b6d4",
        "editor.lineHighlightBackground": "#1e293b80",
      },
    });
  };

  // Poll submission status from backend
  useEffect(() => {
    if (!submissionId || verdict !== "pending") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await axiosInstance.get(`/api/submissions/${submissionId}`);
        const submission = response.data;

        if (submission.verdict !== "pending") {
          console.log('[IDE Poll] Submission complete:', {
            verdict: submission.verdict,
            stdout: submission.stdout?.substring(0, 50),
            stderr: submission.stderr?.substring(0, 50),
            compile_output: submission.compile_output?.substring(0, 50),
          });
          
          setVerdict(submission.verdict);
          setRuntime(submission.runtime_ms);
          setMemory(submission.memory_kb);
          setStdout(submission.stdout || "");
          setStderr(submission.stderr || "");
          setCompileOutput(submission.compile_output || "");
          setIsLoading(false);
          clearInterval(pollInterval);
        }

        setPollCount(c => c + 1);
      } catch (err) {
        console.error("Error polling submission:", err);
        // Continue polling even on error (network issue, etc.)
      }
    }, 1500); // Poll every 1.5 seconds

    return () => clearInterval(pollInterval);
  }, [submissionId, verdict]);

  const handleRun = async () => {
    // Reset state
    setError(null);
    setExecuted(false);
    setStdout("");
    setStderr("");
    setCompileOutput("");
    setVerdict(null);
    setRuntime(null);
    setMemory(null);
    setPollCount(0);

    // Show loading UI
    setShowIO(true);
    setIsLoading(true);

    try {
      // Create submission on backend
      // Note: problem_id is null for IDE (not solving a specific problem)
      const response = await axiosInstance.post("/api/submissions", {
        problem_id: null,
        language,
        source_code: code,
        stdin: stdin || null,
      });

      console.log("Submission created:", response.data);

      const { id: newSubmissionId, verdict: initialVerdict } = response.data;

      setSubmissionId(newSubmissionId);
      setVerdict(initialVerdict || "pending");
      setExecuted(true);
    } catch (err) {
      console.error("Error creating submission:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to create submission"
      );
      setIsLoading(false);
      setExecuted(true);
    }
  };

  const handleReset = () => {
    setCode(boilerplates[language] ?? "// your code goes here");
    setStdin("");
    setStdout("");
    setStderr("");
    setCompileOutput("");
    setExecuted(false);
    setVerdict(null);
    setRuntime(null);
    setMemory(null);
    setError(null);
    setSubmissionId(null);
    setPollCount(0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: IDE (same theme/options as CodeEditor) */}
        <div className="flex w-full flex-col border-r border-white/10 lg:w-1/2">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Code</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-18 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5 max-sm:w-fit">
                <img
                  src={selectedLanguageMeta.icon}
                  alt={selectedLanguageMeta.label}
                  width={20}
                  className="object-contain"
                />
              </div>
              <select
                className="select select-sm rounded-lg border border-white/10 bg-white/5 text-xs text-slate-100 max-sm:w-fit"
                value={language}
                onChange={(e) => {
                  const next = e.target.value;
                  setLanguage(next);
                  setCode(boilerplates[next] ?? "// your code goes here");
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
                disabled={isLoading}
                className="btn btn-xs rounded-lg border border-white/10 bg-white/5 text-slate-50 transition hover:border-cyan-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Running..." : "Run"}
              </button>
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="btn btn-xs rounded-lg border border-white/10 bg-white/5 text-slate-50 transition hover:border-cyan-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="flex-1">
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
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>

        {/* Right: stdin (top) and stdout/stderr/compile (bottom) */}
        <div className="hidden w-1/2 flex-col lg:flex">
          {/* Top-right: stdin column */}
          <div className="flex flex-1 flex-col border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>stdin</span>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                className="h-full w-full resize-none rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-200 outline-none"
                placeholder="Type input for your program here..."
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
              />
            </div>
          </div>

          {/* Bottom-right: output section with verdict */}
          <div className="flex flex-1 flex-col bg-slate-900/50">
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>stdout</span>
                </div>
                {executed && (
                  <div className="flex items-center gap-2 text-xs">
                    {isLoading && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-blue-400">Judging...</span>
                      </>
                    )}
                    {!isLoading && verdict && (
                      <>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            verdict === "accepted"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span
                          className={
                            verdict === "accepted"
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {verdict}
                        </span>
                        {runtime !== null && (
                          <span className="text-slate-400">
                            • {runtime}ms
                          </span>
                        )}
                        {memory !== null && (
                          <span className="text-slate-400">
                            • {memory}KB
                          </span>
                        )}
                      </>
                    )}
                    {error && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-red-400 text-xs">{error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isLoading && (
                <pre className="text-slate-400 text-sm">
                  Waiting for Judge0... (polls: {pollCount})
                </pre>
              )}
              {error && !isLoading && (
                <pre className="text-red-400 text-sm">{error}</pre>
              )}
              {compileOutput && (
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-1">Compile Output:</div>
                  <pre className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-200 whitespace-pre-wrap wrap-break-word">
                    {compileOutput}
                  </pre>
                </div>
              )}
              {executed && !isLoading && (
                <pre className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-200 whitespace-pre-wrap wrap-break-word">
                  {(() => {
                    const outputParts = [];
                    
                    if (stdout !== null && stdout !== undefined) {
                      outputParts.push(stdout);
                    }
                    
                    if (stderr) {
                      if (outputParts.length > 0) outputParts.push('\n');
                      outputParts.push(`stderr: ${stderr}`);
                    }
                    
                    return outputParts.length > 0 
                      ? outputParts.join('') 
                      : (verdict === "compilation_error" ? "(no output)" : "Program did not output anything");
                  })()}
                </pre>
              )}
              {!executed && (
                <pre className="text-slate-400 text-sm">
                  Output will appear here after Run.
                </pre>
              )}
              {stderr && (
                <div className="mt-4">
                  <div className="text-xs text-slate-400 mb-1">Stderr:</div>
                  <pre className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm text-red-300 whitespace-pre-wrap wrap-break-word">
                    {stderr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile IO toggle button */}
        <button
          onClick={() => setShowIO(true)}
          className="fixed bottom-4 right-4 z-40 btn btn-sm rounded-full bg-cyan-500 text-slate-950 shadow-lg transition hover:bg-cyan-400 lg:hidden"
          aria-label="Open Input/Output panel"
        >
          IO
        </button>
        {/* Mobile IO overlay */}
        {showIO && (
          <div className="lg:hidden fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm">
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-slate-900/80">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div></div>
                <button
                  onClick={() => setShowIO(false)}
                  className="btn btn-xs rounded-lg border border-white/10 bg-white/5 text-slate-50 hover:border-cyan-400/60"
                  aria-label="Close Input/Output panel"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4">
                {/* stdin */}
                <div className="flex flex-col">
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>stdin</span>
                  </div>
                  <textarea
                    className="min-h-30 w-full resize-y rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-200 outline-none"
                    placeholder="Type input for your program here..."
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                  />
                </div>
                {/* stdout */}
                <div className="flex flex-col">
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Output</span>
                  </div>
                  {executed && (
                    <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      {isLoading && (
                        <>
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-blue-400">Judging...</span>
                        </>
                      )}
                      {!isLoading && verdict && (
                        <>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              verdict === "Accepted"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span
                            className={
                              verdict === "Accepted"
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {verdict}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <pre className="min-h-30 w-full overflow-auto rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-200 whitespace-pre-wrap wrap-break-word">
                    {executed ? (() => {
                      const outputParts = [];
                      
                      if (stdout !== null && stdout !== undefined) {
                        outputParts.push(stdout);
                      }
                      
                      if (stderr) {
                        if (outputParts.length > 0) outputParts.push('\n');
                        outputParts.push(`stderr: ${stderr}`);
                      }
                      
                      return outputParts.length > 0 
                        ? outputParts.join('') 
                        : "Program did not output anything";
                    })() : "Output will appear here after Run."}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Ide;
