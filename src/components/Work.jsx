import { useMemo, useState } from "react";
import { COMPANIES, PROJECTS } from "../data/projects";
import VideoCard from "./VideoCard";
import VideoModal from "./VideoModal";

export default function Work() {
  const [filter, setFilter] = useState("all");
  const [openProject, setOpenProject] = useState(null);

  const companyById = useMemo(
    () => Object.fromEntries(COMPANIES.map((c) => [c.id, c])),
    []
  );

  const visible = useMemo(
    () => (filter === "all" ? PROJECTS : PROJECTS.filter((p) => p.company === filter)),
    [filter]
  );

  const openCompany = openProject ? companyById[openProject.company] : null;

  return (
    <section id="work" className="section work">
      <div className="container">
        <div className="work-head">
          <div className="reveal">
            <p className="eyebrow">Portfolio</p>
            <h2 className="section-title">Featured Work</h2>
          </div>

          <div className="filters reveal">
            <button
              className={`filter${filter === "all" ? " active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            {COMPANIES.map((c) => (
              <button
                key={c.id}
                className={`filter${filter === c.id ? " active" : ""}`}
                onClick={() => setFilter(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid">
          {visible.map((p) => (
            <VideoCard
              key={p.id}
              project={p}
              accent={companyById[p.company]?.accent}
              companyName={companyById[p.company]?.name}
              onOpen={setOpenProject}
            />
          ))}
          {visible.length === 0 && (
            <p className="empty">No videos in this category yet.</p>
          )}
        </div>
      </div>

      {openProject && (
        <VideoModal
          project={openProject}
          companyName={openCompany?.name}
          onClose={() => setOpenProject(null)}
        />
      )}
    </section>
  );
}
