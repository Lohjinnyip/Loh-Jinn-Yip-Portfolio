const PLACEHOLDER_GRADIENTS = {
  "company-a": "linear-gradient(140deg, #0e2a3a, #113b52 55%, #0a1a2e)",
  "company-b": "linear-gradient(140deg, #2a1247, #3d1a66 55%, #170a2e)",
  "company-c": "linear-gradient(140deg, #3a1230, #5c1a45 55%, #2a0a1f)",
};

export default function VideoCard({ project, accent, companyName, onOpen }) {
  const hasThumb = Boolean(project.thumbnail);
  const thumbStyle = hasThumb
    ? { backgroundImage: `url(${project.thumbnail})` }
    : { background: PLACEHOLDER_GRADIENTS[project.company] || PLACEHOLDER_GRADIENTS["company-a"] };

  return (
    <button
      className="card"
      style={{ "--card-accent": accent }}
      onClick={() => onOpen(project)}
      aria-label={`Play ${project.title}`}
    >
      <div
        className={`card-thumb${hasThumb ? "" : " placeholder"}`}
        style={thumbStyle}
      />

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
