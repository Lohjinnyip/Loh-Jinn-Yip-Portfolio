import { useEffect, useMemo, useRef, useState } from "react";
import { COMPANIES, PROJECTS } from "../data/projects";
import VideoCard from "./VideoCard";
import VideoModal from "./VideoModal";
import { useShowreel } from "./ShowreelModal";
import { asset, posterFor } from "../utils/asset";

// Duration of the card swap animation — MUST match the CSS transition on `.grid`.
const ANIM_MS = 200;
// Cards shown per tab before "Show all". Projects marked `featured: true` in
// projects.js fill these slots first; without any, the first N in list order.
const FEATURED_COUNT = 6;

export default function Work() {
  const openShowreel = useShowreel();
  const [company, setCompany] = useState(COMPANIES[0].id); // the selected tab
  const [display, setDisplay] = useState(COMPANIES[0].id); // company whose cards render
  const [phase, setPhase] = useState("in"); // "in" | "out" | "enter"
  // index into `visible` of the open video, or -1 when the modal is closed
  const [openIndex, setOpenIndex] = useState(-1);
  // resume position (seconds) handed to the modal — only the first (previewed)
  // card carries one; navigating to another video resets it to 0.
  const [openStart, setOpenStart] = useState(0);
  // live playback time of the inline preview on the first card
  const previewTimeRef = useRef(0);

  const companyById = useMemo(
    () => Object.fromEntries(COMPANIES.map((c) => [c.id, c])),
    []
  );

  const [showAll, setShowAll] = useState(false);

  // All of this tab's projects, featured ones first. The grid renders a prefix
  // of this list, so modal prev/next can still browse every video.
  const visible = useMemo(() => {
    const all = PROJECTS.filter((p) => p.company === display);
    return [...all.filter((p) => p.featured), ...all.filter((p) => !p.featured)];
  }, [display]);

  const hasShowreel = display === COMPANIES[0].id;
  const featuredCount = Math.max(
    visible.filter((p) => p.featured).length,
    FEATURED_COUNT - (hasShowreel ? 1 : 0)
  );
  const shown = showAll ? visible : visible.slice(0, featuredCount);
  const hiddenCount = visible.length - shown.length;

  // switching tabs shows a different first video → forget the old preview time
  useEffect(() => {
    previewTimeRef.current = 0;
    setShowAll(false);
  }, [display]);

  // Prefetch the OTHER tabs' poster thumbnails while the browser is idle, one at
  // a time so we never contend with the active tab. Result: switching companies
  // shows thumbnails instantly instead of loading them on click. Posters are
  // tiny (~20 KB) static images, so this is cheap even on mobile.
  useEffect(() => {
    const urls = PROJECTS.filter((p) => p.company !== display)
      .map((p) => (p.thumbnail ? asset(p.thumbnail) : asset(posterFor(p.videoFile))))
      .filter(Boolean);
    if (!urls.length) return;
    let idx = 0;
    let cancelled = false;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const next = () => {
      if (cancelled || idx >= urls.length) return;
      const img = new Image();
      img.onload = img.onerror = () => idle(next); // chain gently, cache-warm
      img.src = urls[idx++];
    };
    idle(next);
    return () => {
      cancelled = true;
    };
  }, [display]);

  function selectCompany(id) {
    // ignore re-clicks and clicks mid-transition so animations never overlap
    if (id === company || phase !== "in") return;
    setCompany(id);
    setPhase("out"); // current cards slide down + fade out
  }

  // exit finished → swap to the new company's cards, staged above (hidden)
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => {
      setDisplay(company);
      setPhase("enter");
    }, ANIM_MS);
    return () => clearTimeout(t);
  }, [phase, company]);

  // new cards are mounted above & hidden → next frame, animate them down + in
  useEffect(() => {
    if (phase !== "enter") return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase("in"))
    );
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const openProject =
    openIndex >= 0 && openIndex < visible.length ? visible[openIndex] : null;
  const openCompany = openProject ? companyById[openProject.company] : null;
  const hasPrev = openIndex > 0;
  const hasNext = openIndex >= 0 && openIndex < visible.length - 1;

  const gridClass =
    "grid" + (phase === "out" ? " is-out" : phase === "enter" ? " is-enter" : "");

  return (
    <section id="work" className="section work">
      <div className="container">
        <div className="plate wide reveal">
        <div className="work-head">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2 className="section-title">Featured Work</h2>
          </div>

          <div className="filters">
            {COMPANIES.map((c) => (
              <button
                key={c.id}
                className={`filter${company === c.id ? " active" : ""}`}
                onClick={() => selectCompany(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className={gridClass}>
          {/* Featured showreel — first card, Crave Asia tab only. Opens the modal. */}
          {hasShowreel && (
            <button
              className="card card--showreel"
              style={{ "--card-accent": "#22d3ee" }}
              onClick={openShowreel}
              aria-label="Play 2026 Creative Showreel"
            >
              <div className="card-thumb">
                <img src={asset("/thumbnails/showreel-cover.jpg")} alt="" loading="lazy" />
              </div>
              <span className="play-btn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
              <div className="card-overlay">
                <span className="card-badge">Showreel</span>
                <span className="card-title">2026 Creative Showreel</span>
                <span className="card-meta">Video Editing · Content Creation · Motion</span>
              </div>
            </button>
          )}

          {shown.map((p, i) => (
            <VideoCard
              key={p.id}
              project={p}
              accent={companyById[p.company]?.accent}
              companyName={companyById[p.company]?.name}
              autoPreview={i === 0 && phase === "in"}
              previewPaused={openIndex >= 0}
              previewTimeRef={i === 0 ? previewTimeRef : undefined}
              onOpen={() => {
                setOpenStart(i === 0 ? previewTimeRef.current : 0);
                setOpenIndex(i);
              }}
            />
          ))}
          {visible.length === 0 && (
            <p className="empty">No videos in this category yet.</p>
          )}
        </div>

        {visible.length > featuredCount && (
          <div className="work-more">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                // collapsing from far down the list → bring the grid back into view
                if (showAll) document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
                setShowAll(!showAll);
              }}
              aria-expanded={showAll}
            >
              {showAll
                ? "Show fewer"
                : `Show all ${visible.length} videos (${hiddenCount} more)`}
            </button>
          </div>
        )}
        </div>
      </div>

      {openProject && (
        <VideoModal
          project={openProject}
          companyName={openCompany?.name}
          onClose={() => setOpenIndex(-1)}
          hasPrev={hasPrev}
          hasNext={hasNext}
          startTime={openStart}
          onPrev={() => {
            setOpenStart(0); // only the first-opened video resumes
            setOpenIndex((i) => Math.max(0, i - 1));
          }}
          onNext={() => {
            setOpenStart(0);
            setOpenIndex((i) => Math.min(visible.length - 1, i + 1));
          }}
        />
      )}
    </section>
  );
}
