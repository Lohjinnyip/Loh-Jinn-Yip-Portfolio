// ============================================================================
//  EDIT THIS FILE TO ADD YOUR COMPANIES + VIDEOS
// ============================================================================
//
//  1) COMPANIES — rename these to the three companies you worked for.
//     `accent` controls the neon glow color used for that company's cards/tab.
//
//  2) PROJECTS — one entry per video. Fields:
//       title       : shown under the thumbnail
//       company     : must match a company `id` below
//       category    : small label (e.g. "Trailer", "Ad", "Social")
//       year        : shown as a small tag
//       thumbnail   : (optional) image path. Put images in /public/thumbnails/
//                     and reference as "/thumbnails/myshot.jpg".
//                     If omitted, a colored gradient placeholder is shown.
//       videoSrc    : a YouTube URL, a Vimeo URL, OR a local file.
//                     For local files, put the .mp4 in /public/videos/
//                     and reference as "/videos/myclip.mp4".
//                     Tip: compress large .mov files to .mp4 before adding.
//       description : (optional) short blurb shown in the player popup.
//
// ============================================================================

export const COMPANIES = [
  { id: "company-a", name: "Crave Asia", accent: "#22d3ee" }, // cyan
  { id: "company-b", name: "Company Two", accent: "#a855f7" }, // violet
  { id: "company-c", name: "Company Three", accent: "#f472b6" }, // pink
];

export const PROJECTS = [
  {
    id: "p1",
    title: "Product Launch Trailer",
    company: "company-a",
    category: "Trailer",
    year: "2026",
    thumbnail: "",
    videoSrc: "",
    description: "Cinematic launch trailer — motion graphics, sound design and grade.",
  },
  {
    id: "p2",
    title: "Brand Story Film",
    company: "company-a",
    category: "Brand Film",
    year: "2026",
    thumbnail: "",
    videoSrc: "",
    description: "60-second brand story cut for social and web.",
  },
  {
    id: "p3",
    title: "Founder Interview",
    company: "company-a",
    category: "Interview",
    year: "2025",
    thumbnail: "",
    videoSrc: "",
    description: "Multi-cam interview edit with lower-thirds and b-roll.",
  },
  {
    id: "p4",
    title: "Kiosk Demo Reel",
    company: "company-b",
    category: "Product",
    year: "2026",
    thumbnail: "",
    videoSrc: "",
    description: "Screen-capture product walkthrough with animated callouts.",
  },
  {
    id: "p5",
    title: "Promo Campaign",
    company: "company-b",
    category: "Ad",
    year: "2025",
    thumbnail: "",
    videoSrc: "",
    description: "15s and 30s ad cutdowns for a paid campaign.",
  },
  {
    id: "p6",
    title: "Event Aftermovie",
    company: "company-b",
    category: "Event",
    year: "2025",
    thumbnail: "",
    videoSrc: "",
    description: "High-energy recap edit synced to music.",
  },
  {
    id: "p7",
    title: "Explainer Animation",
    company: "company-c",
    category: "Motion",
    year: "2026",
    thumbnail: "",
    videoSrc: "",
    description: "Animated explainer describing the product in 45 seconds.",
  },
  {
    id: "p8",
    title: "Social Series",
    company: "company-c",
    category: "Social",
    year: "2026",
    thumbnail: "",
    videoSrc: "",
    description: "Vertical short-form series for Instagram and TikTok.",
  },
  {
    id: "p9",
    title: "Case Study",
    company: "company-c",
    category: "Documentary",
    year: "2025",
    thumbnail: "",
    videoSrc: "",
    description: "Customer case-study mini documentary.",
  },
];
