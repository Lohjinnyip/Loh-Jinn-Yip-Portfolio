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
//       videoSrc    : a YouTube URL or a Vimeo URL (used as a FALLBACK).
//       videoFile   : (optional, RECOMMENDED) a self-hosted file, e.g.
//                     "/videos/myclip.mp4". Put the .mp4 in /public/videos/.
//                     A self-hosted file plays at EXACTLY the resolution you
//                     export (e.g. 720p) with no quality menu / no "Auto 360p".
//                     If set, it is used instead of videoSrc; if it fails to
//                     load, playback falls back to videoSrc (YouTube/Vimeo).
//                     Tip: export/compress to 720p H.264 .mp4 before adding.
//       description : (optional) short blurb shown in the player popup.
//       vertical    : (optional) set `true` for portrait / 9:16 clips (e.g.
//                     Reels, TikTok, Shorts). The player then opens in a tall
//                     portrait frame instead of the default landscape 16:9 box.
//
// ============================================================================

export const COMPANIES = [
  { id: "company-a", name: "Crave Asia", accent: "#38bdf8" }, // sky blue
  { id: "company-b", name: "Shipped Beyond", accent: "#3b82f6" }, // blue
  { id: "company-c", name: "Company Three", accent: "#60a5fa" }, // light blue
];

export const PROJECTS = [
  {
    id: "p1",
    title: "Melaka River of Time",
    company: "company-a",
    category: "Trailer",
    year: "2025",
    thumbnail: "https://img.youtube.com/vi/g_54LYkjC0Y/hqdefault.jpg",
    // Drop a 720p export here for guaranteed 720p playback (no quality menu).
    // Until the file exists, playback falls back to the YouTube link below.
    videoFile: "/videos/melaka-river-of-time-720p.mp4",
    videoSrc: "https://youtu.be/g_54LYkjC0Y",
    description: "Cultural promo capturing Melaka's historic river — edited, graded and scored.",
  },
  // --- Crave Asia imports (rename titles/categories to the real ones anytime) ---
  {
    id: "ca-studio-app",
    title: "Studio Membership App",
    company: "company-a",
    category: "Product",
    year: "2026",
    thumbnail: "",
    vertical: true, // 720x1280 (9:16)
    videoFile: "/videos/Studio%20Membership%20App%20Gym%20BG.mp4",
    videoSrc: "",
    description: "Gym / membership app promo.",
  },
  {
    id: "ca-dualscreen",
    title: "Dual Screen POS",
    company: "company-a",
    category: "Product",
    year: "2026",
    thumbnail: "",
    vertical: true, // 1080x1920 (9:16)
    videoFile: "/videos/20260504-DualScreenPos-v1.mp4",
    videoSrc: "",
    description: "Dual-screen point-of-sale product piece.",
  },
  {
    id: "ca-promo-flash",
    title: "Promotion Flash",
    company: "company-a",
    category: "Promo",
    year: "2026",
    thumbnail: "",
    vertical: true, // 1080x1920 (9:16)
    videoFile: "/videos/20260511-VIDEO%20PROMOTION%20FLASH-v1.mp4",
    videoSrc: "",
    description: "Fast-cut promotional flash spot.",
  },
  {
    id: "ca-aig",
    title: "AIG Intro",
    company: "company-a",
    category: "Intro",
    year: "2026",
    thumbnail: "",
    // 1920x1080 (16:9) landscape
    videoFile: "/videos/AIG%20Intro.mp4",
    videoSrc: "",
    description: "Vertical brand intro animation.",
  },
  // NOTE: "Studio Intro.mp4" (1920x1080, 192 MB) and the vertical
  // "Melaka_RiverofTime_Video (1).mp4" (176 MB) are over GitHub's 100 MB
  // per-file limit, so they are NOT wired up. Compress them to ~720p (or
  // upload to YouTube and use videoSrc) and they can be added.
  {
    id: "p4",
    title: "Prayer Bowl",
    company: "company-b",
    category: "Social",
    year: "2026",
    thumbnail: "",
    // Vertical 1080x1920 (9:16) clip — `vertical: true` makes the player open
    // in a portrait frame instead of the default 16:9 box.
    vertical: true,
    videoFile: "/videos/prayer-bowl-4.mp4",
    videoSrc: "",
    description: "Vertical short-form edit (9:16) for Reels / TikTok / Shorts.",
  },
  // --- Shipped Beyond imports (all 1080x1920 / 9:16 → vertical: true) ---
  // NOTE: titles/categories/years below are placeholders derived from the file
  // names — rename them to the real project titles when you get a chance.
  {
    id: "sb-motion",
    title: "Motion Light",
    company: "company-b",
    category: "Motion",
    year: "2026",
    thumbnail: "",
    vertical: true,
    videoFile: "/videos/Motion%20light%208.mp4",
    videoSrc: "",
    description: "",
  },
  {
    id: "sb-blender",
    title: "Blender Render",
    company: "company-b",
    category: "3D",
    year: "2025",
    thumbnail: "",
    vertical: true,
    videoFile: "/videos/blender%209.mp4",
    videoSrc: "",
    description: "",
  },
  {
    id: "sb-headlight",
    title: "Headlight",
    company: "company-b",
    category: "Motion",
    year: "2026",
    thumbnail: "",
    vertical: true,
    videoFile: "/videos/headlight%206.mp4",
    videoSrc: "",
    description: "",
  },
  {
    id: "sb-toolbox",
    title: "Toolbox",
    company: "company-b",
    category: "Product",
    year: "2025",
    thumbnail: "",
    vertical: true,
    videoFile: "/videos/toolbox.mp4",
    videoSrc: "",
    description: "",
  },
  {
    id: "sb-1210",
    title: "Short Reel",
    company: "company-b",
    category: "Social",
    year: "2025",
    thumbnail: "",
    vertical: true,
    videoFile: "/videos/1210-29.mp4",
    videoSrc: "",
    description: "",
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
