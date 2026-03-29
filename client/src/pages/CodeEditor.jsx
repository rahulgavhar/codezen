import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { FaPlay } from "react-icons/fa";

const CodeEditor = ({ onClose }) => {
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
  const [activeTab, setActiveTab] = useState("description");
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

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

  const handleReset = () => {
    setCode(boilerplates[language] ?? "// your code goes here");
  };

  const handleRun = () => {
    setIsRunning(true);
    setActiveTab("result");
    setTimeout(() => {
      setTestResults({
        passed: 2,
        total: 3,
        cases: [
          {
            input: "[2,7,11,15], 9",
            expected: "[0,1]",
            output: "[0,1]",
            passed: true,
          },
          {
            input: "[3,2,4], 6",
            expected: "[1,2]",
            output: "[1,2]",
            passed: true,
          },
          { input: "[3,3], 6", expected: "[0,1]", output: "[]", passed: false },
        ],
      });
      setIsRunning(false);
    }, 1200);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          {onClose ? (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60"
            >
              <span aria-hidden>✕</span>
              <span>Close</span>
            </button>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 font-mono text-sm text-cyan-300">
                &gt;_
              </div>
              <span className="text-sm font-semibold">Codezen</span>
            </>
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
            disabled={isRunning}
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
          <button className="btn btn-sm rounded-lg border-none bg-emerald-500 text-slate-950 shadow-lg transition hover:bg-emerald-400">
            Submit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="flex w-full flex-col border-r border-white/10 lg:w-1/2">
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-slate-900/50">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "description"
                  ? "border-b-2 border-cyan-400 text-cyan-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("solutions")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "solutions"
                  ? "border-b-2 border-cyan-400 text-cyan-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Solutions
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "submissions"
                  ? "border-b-2 border-cyan-400 text-cyan-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Submissions
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === "description" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold sm:text-2xl">1. Two Sum</h1>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                      Easy
                    </span>
                    <span className="text-xs text-slate-400">
                      Acceptance: 49.2%
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <p>
                    Given an array of integers{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                      nums
                    </code>{" "}
                    and an integer{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                      target
                    </code>
                    , return indices of the two numbers such that they add up to{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                      target
                    </code>
                    .
                  </p>
                  <p>
                    You may assume that each input would have exactly one
                    solution, and you may not use the same element twice.
                  </p>
                  <p>You can return the answer in any order.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-100">Example 1:</h3>
                  <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm">
                    <div className="space-y-1 font-mono text-xs">
                      <div>
                        <span className="text-slate-400">Input:</span>{" "}
                        <span className="text-cyan-300">
                          nums = [2,7,11,15], target = 9
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Output:</span>{" "}
                        <span className="text-emerald-300">[0,1]</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Explanation:</span>{" "}
                        <span className="text-slate-300">
                          Because nums[0] + nums[1] == 9, we return [0, 1].
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-100">Example 2:</h3>
                  <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm">
                    <div className="space-y-1 font-mono text-xs">
                      <div>
                        <span className="text-slate-400">Input:</span>{" "}
                        <span className="text-cyan-300">
                          nums = [3,2,4], target = 6
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Output:</span>{" "}
                        <span className="text-emerald-300">[1,2]</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-100">Constraints:</h3>
                  <ul className="space-y-1 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-cyan-300">•</span>
                      <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                        2 &lt;= nums.length &lt;= 10⁴
                      </code>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-cyan-300">•</span>
                      <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                        -10⁹ &lt;= nums[i] &lt;= 10⁹
                      </code>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-cyan-300">•</span>
                      <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                        -10⁹ &lt;= target &lt;= 10⁹
                      </code>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-cyan-300">•</span>
                      <span>Only one valid answer exists.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "result" && testResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Test Results</h2>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        testResults.passed === testResults.total
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      {testResults.passed}/{testResults.total} Passed
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {testResults.cases.map((testCase, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${
                        testCase.passed
                          ? "border-emerald-400/30 bg-emerald-400/5"
                          : "border-rose-400/30 bg-rose-400/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-200">
                          Case {idx + 1}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            testCase.passed
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }`}
                        >
                          {testCase.passed ? "✓ Passed" : "✗ Failed"}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="text-slate-400">
                          Input:{" "}
                          <span className="text-cyan-300">
                            {testCase.input}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Expected:{" "}
                          <span className="text-slate-200">
                            {testCase.expected}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Output:{" "}
                          <span
                            className={
                              testCase.passed
                                ? "text-emerald-300"
                                : "text-rose-300"
                            }
                          >
                            {testCase.output}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "solutions" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Solutions</h2>
                <p className="text-sm text-slate-400">
                  Community solutions will appear here after you solve the
                  problem.
                </p>
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Submissions</h2>
                <p className="text-sm text-slate-400">
                  Your submission history will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="hidden w-1/2 flex-col lg:flex">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Code</span>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 transition hover:text-slate-200"
            >
              Reset
            </button>
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
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
