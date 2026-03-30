import React, { useEffect } from 'react'

const SharedScreen = ({ onClose, videoRef }) => {
  // Ensure video plays when srcObject is set or changes
  useEffect(() => {
    if (videoRef?.current && videoRef.current.srcObject) {
      console.log("[SharedScreen] Attempting to play video");
      videoRef.current.play()
        .then(() => console.log("[SharedScreen] Video playing successfully"))
        .catch((err) => console.warn("[SharedScreen] Play failed:", err?.message || err));
    }
  }, [videoRef?.current?.srcObject, videoRef]);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur flex-shrink-0">
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
            📺
          </div>
          <span className="text-sm font-semibold">Screen Share</span>
        </div>
      </header>

      {/* Video Display */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            console.log("[SharedScreen] Video metadata loaded");
            if (videoRef?.current) {
              videoRef.current.play()
                .catch((err) => console.warn("[SharedScreen] Play on metadata failed:", err?.message || err));
            }
          }}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  )
}

export default SharedScreen
