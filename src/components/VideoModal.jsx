import { useEffect, useRef, useState } from "react";

// Extract a YouTube video id from any common URL form.
function youTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  return m ? m[1] : null;
}

// Turn a Vimeo URL into an embeddable URL. Returns null otherwise.
function vimeoEmbed(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null;
}

const FILE_RE = /\.(mp4|webm|mov|m4v|ogg)$/i;

// Load the YouTube IFrame Player API once, resolve when ready.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
  });
  return ytApiPromise;
}

// YouTube fallback — asks for 720p (best-effort; YouTube may still override).
function YouTubePlayer({ id, title }) {
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
            e.target.loadVideoById({ videoId: id, suggestedQuality: "hd720" });
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
  }, [id]);

  return (
    <div className="yt-holder">
      <div ref={holderRef} title={title} />
    </div>
  );
}

export default function VideoModal({ project, companyName, onClose }) {
  // If the self-hosted file is missing/broken, fall back to the YouTube embed.
  const [fileFailed, setFileFailed] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-video">
          {useLocal ? (
            <video
              src={localFile}
              controls
              autoPlay
              playsInline
              poster={project.thumbnail || undefined}
              onError={() => setFileFailed(true)}
            />
          ) : ytId ? (
            <YouTubePlayer id={ytId} title={project.title} />
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
      </div>
    </div>
  );
}
