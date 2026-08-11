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
