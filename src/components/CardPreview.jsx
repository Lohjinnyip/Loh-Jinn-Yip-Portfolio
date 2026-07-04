import { useEffect, useRef, useState } from "react";
import { youTubeId, loadYouTubeApi } from "../utils/youtube";

const FILE_RE = /\.(mp4|webm|mov|m4v|ogg)$/i;

// Inline, MUTED auto-play preview for the first card of a tab. Reports its
// current playback position into `timeRef` so the modal can resume from it.
// `active` = the card is in view AND no modal is open → should be playing.
export default function CardPreview({ project, active, timeRef }) {
  const [fileFailed, setFileFailed] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const localFile =
    project.videoFile ||
    (project.videoSrc && FILE_RE.test(project.videoSrc) ? project.videoSrc : null);
  const useLocal = localFile && !fileFailed;
  const ytId = useLocal ? null : youTubeId(project.videoSrc);

  const videoRef = useRef(null);
  const holderRef = useRef(null);
  const playerRef = useRef(null);

  // --- Local file: play/pause on `active`, report currentTime ---
  useEffect(() => {
    if (!useLocal) return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (timeRef) timeRef.current = v.currentTime;
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [useLocal, timeRef]);

  useEffect(() => {
    if (!useLocal) return;
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play?.().catch(() => {});
    else v.pause?.();
  }, [active, useLocal]);

  // --- YouTube: build a muted, chrome-less player ---
  useEffect(() => {
    if (useLocal || !ytId) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !holderRef.current) return;
      playerRef.current = new YT.Player(holderRef.current, {
        host: "https://www.youtube.com",
        videoId: ytId,
        playerVars: {
          controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
          disablekb: 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            e.target.mute();
            if (!cancelled) setYtReady(true);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      setYtReady(false);
      const p = playerRef.current;
      playerRef.current = null;
      if (p?.destroy) p.destroy();
    };
  }, [useLocal, ytId]);

  // YouTube: play/pause on `active` + poll currentTime while playing
  useEffect(() => {
    if (useLocal || !ytId || !ytReady) return;
    const p = playerRef.current;
    if (!p) return;
    let interval;
    try {
      p.mute();
      if (active) p.playVideo?.();
      else p.pauseVideo?.();
    } catch (_) { /* player not ready yet */ }
    if (active) {
      interval = setInterval(() => {
        try {
          if (timeRef && p.getCurrentTime) timeRef.current = p.getCurrentTime();
        } catch (_) { /* ignore */ }
      }, 500);
    }
    return () => interval && clearInterval(interval);
  }, [active, ytReady, useLocal, ytId, timeRef]);

  if (useLocal) {
    return (
      <video
        ref={videoRef}
        className="card-thumb card-thumb--video card-preview"
        src={localFile}
        muted
        playsInline
        preload="auto"
        poster={project.thumbnail || undefined}
        onError={() => setFileFailed(true)}
        tabIndex={-1}
      />
    );
  }

  if (ytId) {
    return (
      <div className="card-thumb card-yt card-preview">
        <div ref={holderRef} />
      </div>
    );
  }

  // Nothing previewable → let VideoCard fall back to its normal thumbnail.
  return null;
}
