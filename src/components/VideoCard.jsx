import { useEffect, useRef, useState } from "react";
import CardPreview from "./CardPreview";
import { asset, posterFor } from "../utils/asset";

const PLACEHOLDER_GRADIENTS = {
  "company-a": "linear-gradient(140deg, #0e2a3a, #113b52 55%, #0a1a2e)",
  "company-b": "linear-gradient(140deg, #2a1247, #3d1a66 55%, #170a2e)",
  "company-c": "linear-gradient(140deg, #3a1230, #5c1a45 55%, #2a0a1f)",
};

export default function VideoCard({
  project,
  accent,
  companyName,
  onOpen,
  autoPreview = false, // first card of a tab → inline muted auto-play
  previewPaused = false, // a modal is open → pause the preview
  previewTimeRef, // ref the preview writes its currentTime into
}) {
  const cardRef = useRef(null);
  const [inView, setInView] = useState(false);

  const hasThumb = Boolean(project.thumbnail);
  // Prefer an explicit thumbnail; otherwise use the video's pre-rendered static
  // poster (loads instantly, no black box). Gradient sits underneath as the
  // never-black fallback if a poster is ever missing.
  const poster = hasThumb
    ? asset(project.thumbnail)
    : asset(posterFor(project.videoFile));
  const gradient =
    PLACEHOLDER_GRADIENTS[project.company] || PLACEHOLDER_GRADIENTS["company-a"];

  // Only the auto-preview card watches whether it is scrolled into view.
  useEffect(() => {
    if (!autoPreview) return;
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPreview]);

  const previewActive = autoPreview && inView && !previewPaused;

  return (
    <button
      ref={cardRef}
      className="card"
      style={{ "--card-accent": accent }}
      onClick={() => onOpen(project)}
      aria-label={`Play ${project.title}`}
    >
      {/* base thumbnail layer: gradient placeholder + instant static poster.
          A preview (first card of a tab) overlays this once it starts playing. */}
      <div className="card-thumb placeholder" style={{ background: gradient }}>
        {poster && (
          <img
            className="card-thumb--img"
            src={poster}
            alt=""
            loading="lazy"
            draggable={false}
            onLoad={(e) => e.currentTarget.classList.add("loaded")}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      {/* inline muted auto-play preview; overlays the base when it has media */}
      {autoPreview && (
        <CardPreview
          project={project}
          active={previewActive}
          timeRef={previewTimeRef}
        />
      )}

      <span className="play-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>

      <div className="card-overlay">
        <span className="card-badge">{companyName}</span>
        <span className="card-title">{project.title}</span>
        <span className="card-meta">
          {project.category} · {project.year}
        </span>
      </div>
    </button>
  );
}
