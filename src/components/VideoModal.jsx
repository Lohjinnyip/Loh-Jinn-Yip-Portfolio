import { useEffect } from "react";

// Turns a YouTube/Vimeo URL into an embeddable URL. Returns null for direct files.
function toEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return null;
}

const FILE_RE = /\.(mp4|webm|mov|m4v|ogg)$/i;

export default function VideoModal({ project, companyName, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!project) return null;

  const embed = toEmbed(project.videoSrc);
  const isFile = project.videoSrc && FILE_RE.test(project.videoSrc);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-video">
          {embed ? (
            <iframe
              src={embed}
              title={project.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : isFile ? (
            <video src={project.videoSrc} controls autoPlay playsInline poster={project.thumbnail || undefined} />
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
