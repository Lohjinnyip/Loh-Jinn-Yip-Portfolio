// Resolve a public/ asset path (e.g. "/videos/clip.mp4", "/gallery/x.webp")
// against Vite's BASE_URL. On GitHub Pages the site is served from a subpath
// (/Loh-Jinn-Yip-Portfolio/), so a bare "/videos/…" would 404 at the domain
// root. In dev BASE_URL is "/", so paths are unchanged. External URLs
// (http(s), protocol-relative, data:, blob:) pass through untouched.
export function asset(path) {
  if (!path) return path;
  if (/^(?:[a-z]+:)?\/\//i.test(path) || /^(?:data|blob):/i.test(path)) return path;
  return import.meta.env.BASE_URL + String(path).replace(/^\/+/, "");
}

// Map a self-hosted video path to its pre-rendered poster image, e.g.
// "/videos/QIBY%20Intro.mp4" -> "/thumbnails/QIBY%20Intro.webp". These static
// posters (generated from each clip's first frame) load instantly, so cards
// never show a black box while the video itself streams in. Returns "" for
// anything that isn't a local /videos/ file. NOT base-prefixed — wrap the
// result in asset() at the point of use, same as any other public path.
export function posterFor(videoFile) {
  if (!videoFile || !/^\/videos\//.test(videoFile)) return "";
  return videoFile.replace(/^\/videos\//, "/thumbnails/").replace(/\.[^.]+$/, ".webp");
}
