import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { youTubeId, loadYouTubeApi } from "../utils/youtube";

// Turn a Vimeo URL into an embeddable URL. Returns null otherwise.
function vimeoEmbed(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null;
}

const FILE_RE = /\.(mp4|webm|mov|m4v|ogg)$/i;

// --- remembered volume/mute (persists across videos AND page reloads) ---
const VOL_KEY = "vm-volume";
function loadVolume() {
  try {
    const v = JSON.parse(localStorage.getItem(VOL_KEY));
    if (v && typeof v.volume === "number") {
      return { volume: Math.min(1, Math.max(0, v.volume)), muted: !!v.muted };
    }
  } catch (_) { /* ignore */ }
  return { volume: 1, muted: false };
}
function saveVolume(volume, muted) {
  try {
    localStorage.setItem(VOL_KEY, JSON.stringify({ volume, muted }));
  } catch (_) { /* ignore */ }
}

// YouTube fallback — asks for 720p (best-effort; YouTube may still override).
// `start` (seconds) resumes from where the inline card preview left off.
function YouTubePlayer({ id, title, start = 0 }) {
  const holderRef = useRef(null);

  useEffect(() => {
    let player;
    let cancelled = false;
    const force720 = (p) => {
      try {
        p.setPlaybackQuality("hd720");
      } catch (_) {
        /* deprecated on some clients — ignore */
      }
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !holderRef.current) return;
      player = new YT.Player(holderRef.current, {
        host: "https://www.youtube.com",
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            e.target.loadVideoById({
              videoId: id,
              startSeconds: start > 0 ? start : undefined,
              suggestedQuality: "hd720",
            });
            force720(e.target);
          },
          onPlaybackQualityChange: (e) => force720(e.target),
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) force720(e.target);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (player && player.destroy) player.destroy();
    };
    // `start` intentionally omitted: only the initial mount should seek.
  }, [id]);

  return (
    <div className="yt-holder">
      <div ref={holderRef} title={title} />
    </div>
  );
}

export default function VideoModal({
  project,
  companyName,
  onClose,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  startTime = 0, // resume position handed over from the inline card preview
}) {
  // If the self-hosted file is missing/broken, fall back to the YouTube embed.
  const [fileFailed, setFileFailed] = useState(false);
  // Slide transition: null | "out-left" | "out-right" | "in-right" | "in-left".
  const [slide, setSlide] = useState(null);
  const busy = useRef(false); // ignore new clicks while a transition is running
  // Browse hint: stays fully visible on the first video, then is removed the
  // moment you navigate — at the swap point (opacity 0), so there's no snap.
  // "show" → visible, "hiding" → fading out, "gone" → unmounted
  const [hint, setHint] = useState("show");

  // Body lock + hide top bar (mount/unmount only).
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open"); // hides the top bar while open
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, []);

  // Start a directional swap: the current card slides out AGAINST the arrow and
  // fades; when it finishes (onAnimationEnd) we swap the project and the new
  // card slides in FROM the arrow's direction.
  const navigate = useCallback(
    (dir) => {
      if (busy.current) return;
      if (dir === "next" && !hasNext) return;
      if (dir === "prev" && !hasPrev) return;
      // respect reduced-motion: swap instantly, no slide (drop the hint too)
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        dir === "next" ? onNext?.() : onPrev?.();
        setHint("gone");
        return;
      }
      busy.current = true;
      setSlide(dir === "next" ? "out-left" : "out-right");
    },
    [hasNext, hasPrev, onNext, onPrev]
  );

  const onAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !slide) return;
    if (slide === "out-left") {
      onNext?.();
      setHint("gone"); // remove hint here — masked while the card is at opacity 0
      setSlide("in-right"); // new video enters from the right (next arrow →)
    } else if (slide === "out-right") {
      onPrev?.();
      setHint("gone");
      setSlide("in-left"); // new video enters from the left (prev arrow ←)
    } else {
      setSlide(null); // enter finished → settle
      busy.current = false;
    }
  };

  // Keyboard: Esc closes, ← / → step between videos (re-bound as handlers change).
  // Use the CAPTURE phase so we run BEFORE the focused <video> controls — once
  // you click the volume/scrubber the video takes keyboard focus and would
  // otherwise swallow the arrows (seeking instead of navigating). preventDefault
  // stops the native seek so the arrows always browse videos.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate("prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate("next");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, navigate]);

  // reset the fallback state whenever a different project opens
  useEffect(() => setFileFailed(false), [project?.id]);

  if (!project) return null;

  // A self-hosted file plays at exactly the resolution you upload — no quality
  // menu, no "Auto 360p". Prefer it; fall back to YouTube/Vimeo if absent.
  const localFile =
    project.videoFile ||
    (project.videoSrc && FILE_RE.test(project.videoSrc) ? project.videoSrc : null);
  const useLocal = localFile && !fileFailed;

  const ytId = useLocal ? null : youTubeId(project.videoSrc);
  const vimeo = useLocal || ytId ? null : vimeoEmbed(project.videoSrc);

  // Portrait (9:16) clips open in a tall frame instead of the landscape box.
  const isPortrait = Boolean(project.vertical);

  // Portal to <body> so the overlay escapes the Work section's stacking context
  // (otherwise later sections like Gallery/About paint over it once scrolled).
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      {/* The stage shrink-wraps the modal so the arrows anchor to the video
          frame's edges — they snap tighter for a portrait clip, wider for a
          landscape one. Prev starts hidden on the first video and fades in once
          you move off it (same for next on the last). */}
      <div className="modal-stage">
      <button
        className={`modal-nav prev${hasPrev ? "" : " hidden"}`}
        onClick={(e) => {
          e.stopPropagation();
          navigate("prev");
        }}
        aria-label="Previous video"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        className={`modal-nav next${hasNext ? "" : " hidden"}`}
        onClick={(e) => {
          e.stopPropagation();
          navigate("next");
        }}
        aria-label="Next video"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div
        className={`modal${isPortrait ? " modal--portrait" : ""}${slide ? ` slide-${slide}` : ""}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onAnimEnd}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className={`modal-video${isPortrait ? " portrait" : ""}`}>
          {useLocal ? (
            <video
              src={localFile}
              controls
              autoPlay
              playsInline
              poster={project.thumbnail || undefined}
              // hide the "⋮" menu (Download / Playback speed / PiP) so the file
              // can't be grabbed from the player; also block right-click save.
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                const { volume, muted } = loadVolume(); // apply remembered level
                vid.volume = volume;
                vid.muted = muted;
                if (startTime > 0) vid.currentTime = startTime;
              }}
              onVolumeChange={(e) =>
                saveVolume(e.currentTarget.volume, e.currentTarget.muted)
              }
              onError={() => setFileFailed(true)}
            />
          ) : ytId ? (
            <YouTubePlayer id={ytId} title={project.title} start={startTime} />
          ) : vimeo ? (
            <iframe
              src={vimeo}
              title={project.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="modal-novideo">
              No video linked yet — add a YouTube/Vimeo URL or a file path in{" "}
              <br />
              <code>src/data/projects.js</code>
            </div>
          )}
        </div>

        <div className="modal-body">
          <h3>{project.title}</h3>
          <div className="meta">
            {companyName} · {project.category} · {project.year}
          </div>
          {project.description && <p>{project.description}</p>}
        </div>

        {(hasPrev || hasNext) && hint !== "gone" && (
          <div className={`modal-hint${hint === "hiding" ? " hiding" : ""}`}>
            <kbd>←</kbd>
            <kbd>→</kbd>
            <span>Use the arrow keys or the buttons to browse</span>
          </div>
        )}
      </div>
      </div>
    </div>,
    document.body
  );
}
