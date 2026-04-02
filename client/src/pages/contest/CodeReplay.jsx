import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";

const getReplayFrames = (sourceCode) => {
  const normalized =
    sourceCode && sourceCode.trim().length > 0
      ? sourceCode
      : "// Replay data not available for this submission yet.\n";

  const maxFrames = 120;
  const minFrames = 12;
  const desiredFrames = Math.min(maxFrames, Math.max(minFrames, Math.ceil(normalized.length / 8)));
  const step = Math.max(1, Math.ceil(normalized.length / desiredFrames));

  const frames = [""];
  for (let i = step; i < normalized.length; i += step) {
    frames.push(normalized.slice(0, i));
  }
  frames.push(normalized);

  return frames;
};

const formatTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CodeReplay = ({ replay }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [frameIndex, setFrameIndex] = useState(0);

  const frames = useMemo(() => getReplayFrames(replay?.sourceCode || ""), [replay?.sourceCode]);
  const maxFrame = Math.max(0, frames.length - 1);

  useEffect(() => {
    setFrameIndex(0);
    setIsPlaying(false);
  }, [replay?.sourceCode]);

  useEffect(() => {
    if (!isPlaying || maxFrame === 0) {
      return undefined;
    }

    const intervalMs = Math.max(40, Math.floor(180 / speed));
    const intervalId = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= maxFrame) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [isPlaying, maxFrame, speed]);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme("codezen-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "comment.block", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "6feaf9" },
        { token: "keyword.control", foreground: "6feaf9" },
        { token: "string", foreground: "aceffd" },
        { token: "string.escape", foreground: "aceffd" },
        { token: "number", foreground: "fbbf24" },
        { token: "type", foreground: "38d7a0" },
        { token: "type.identifier", foreground: "38d7a0" },
        { token: "function", foreground: "38d7a0" },
        { token: "variable", foreground: "e2e8f0" },
      ],
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#98a7bc",
        "editor.selectionBackground": "#223047",
        "editorCursor.foreground": "#0bb9d7",
        "editor.whitespace": "#334155",
        "editorBracketMatch.border": "#475569",
        "editorBracketMatch.background": "#1e293b",
      },
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/10 bg-slate-950/95">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-900/70 px-3 py-2">
        <div className="min-w-40 flex-1">
          <p className="text-xs font-semibold text-cyan-200">
            {replay?.problemCode || "P?"} • {replay?.problemTitle || "Untitled problem"}
          </p>
          <p className="text-[11px] text-slate-400">
            #{replay?.rank || "-"} {replay?.handle || "Unknown"} • +{replay?.penalty ?? 0} • {formatTime(replay?.submittedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (frameIndex >= maxFrame) setFrameIndex(0);
            setIsPlaying((prev) => !prev);
          }}
          className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            setFrameIndex(0);
          }}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Reset
        </button>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <span>Speed</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-100"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>
      </div>

      <div className="border-b border-white/10 bg-slate-900/50 px-3 py-2">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={frameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setFrameIndex(Number(e.target.value));
            }}
            className="range range-xs range-info w-full"
          />
          <span className="w-20 text-right text-[11px] text-slate-300">
            {frameIndex}/{maxFrame}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="cpp"
          value={frames[frameIndex] || ""}
          beforeMount={handleEditorWillMount}
          theme="codezen-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            renderWhitespace: "selection",
          }}
        />
      </div>
    </div>
  );
};

export default CodeReplay;
