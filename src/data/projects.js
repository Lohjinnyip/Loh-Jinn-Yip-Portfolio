// ============================================================================
//  EDIT THIS FILE TO ADD YOUR COMPANIES + VIDEOS
// ============================================================================
//
//  1) COMPANIES — rename these to the three companies you worked for.
//     `accent` controls the neon glow color used for that company's cards/tab.
//
//  2) PROJECTS — one entry per video. Fields:
//       title       : shown under the thumbnail
//       company     : must match a company `id` below (also shown as the Client)
//       category    : small label / "type of work" (e.g. "Trailer", "Ad")
//       year        : shown as a small tag
//       role        : (optional) your role on the project (shown in the modal).
//                     Defaults to "Video Editor" if omitted.
//       tools       : (optional) array of tools used, shown in the modal, e.g.
//                     ["Premiere Pro", "After Effects"].
//       thumbnail   : (optional) image path. Put images in /public/thumbnails/
//                     and reference as "/thumbnails/myshot.jpg".
//                     If omitted, a colored gradient placeholder is shown.
//       videoSrc    : a YouTube URL or a Vimeo URL (used as a FALLBACK).
//       videoFile   : (optional, RECOMMENDED) a self-hosted file, e.g.
//                     "/videos/myclip.mp4". Put the .mp4 in /public/videos/.
//       description : (optional) short blurb shown in the player popup.
//       vertical    : (optional) set `true` for portrait / 9:16 clips.
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
    role: "Editor · Colorist",
    tools: ["Premiere Pro", "DaVinci Resolve", "After Effects"],
    thumbnail: "",
    // Self-hosted 1920x1080 (16:9) file — plays directly, no YouTube.
    videoFile: "/videos/Melaka_RiverofTime_Video%20(1).mp4",
    videoSrc: "",
    description: "Cultural promo capturing Melaka's historic river — edited, graded and scored.",
  },
  // --- Crave Asia imports (rename titles/categories to the real ones anytime) ---
  {
    id: "ca-studio-app",
    title: "Studio Membership App",
    company: "company-a",
    category: "Product",
    year: "2026",
    role: "Video Editor",
    tools: ["Premiere Pro", "After Effects"],
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
    role: "Video Editor",
    tools: ["Premiere Pro", "After Effects"],
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
    role: "Video Editor",
    tools: ["Premiere Pro", "After Effects"],
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
    role: "Motion Designer",
    tools: ["After Effects"],
    thumbnail: "",
    // 1920x1080 (16:9) landscape
    videoFile: "/videos/AIG%20Intro.mp4",
    videoSrc: "",
    description: "Brand intro animation.",
  },
  {
    id: "ca-studio-intro",
    title: "Studio Intro",
    company: "company-a",
    category: "Brand Film",
    year: "2026",
    role: "Editor · Colorist",
    tools: ["Premiere Pro", "After Effects"],
    thumbnail: "",
    vertical: true, // 1080x1920 (9:16)
    videoFile: "/videos/Studio%20Intro.mp4",
    videoSrc: "",
    description: "Studio brand intro — edited and graded.",
  },
  {
    id: "ca-selfservice",
    title: "Self-Service Kiosks",
    company: "company-a",
    category: "Product",
    year: "2026",
    role: "Video Editor",
    tools: ["Premiere Pro"],
    thumbnail: "",
    vertical: true, // 1080x1920 (9:16)
    videoFile: "/videos/20260421-4SelfServices-v1-1.25xSpeed.mp4",
    videoSrc: "",
    description: "Self-service kiosk product walkthrough.",
  },
  {
    id: "ca-qbot",
    title: "Qbot Games",
    company: "company-a",
    category: "Promo",
    year: "2026",
    role: "Video Editor",
    tools: ["Premiere Pro", "After Effects"],
    thumbnail: "",
    vertical: true, // 1080x1920 (9:16)
    videoFile: "/videos/20260430-QbotGames-v2.mp4",
    videoSrc: "",
    description: "Qbot Games promo edit.",
  },
  {
    id: "ca-qr",
    title: "QR Feature",
    company: "company-a",
    category: "Product",
    year: "2026",
    role: "Video Editor",
    tools: ["Premiere Pro"],
    thumbnail: "",
    vertical: true, // 1080x1920 (9:16)
    videoFile: "/videos/Qr-v2.mp4",
    videoSrc: "",
    description: "QR code feature highlight.",
  },
  {
    id: "p4",
    title: "Prayer Bowl",
    company: "company-b",
    category: "Social",
    year: "2026",
    role: "Editor",
    tools: ["Premiere Pro", "CapCut"],
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
    role: "Motion Designer",
    tools: ["After Effects"],
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
    role: "3D Artist",
    tools: ["Blender"],
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
    role: "Motion Designer",
    tools: ["After Effects", "Blender"],
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
    role: "Motion Designer",
    tools: ["Blender", "After Effects"],
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
    role: "Editor",
    tools: ["Premiere Pro", "CapCut"],
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
    role: "Motion Designer",
    tools: ["After Effects"],
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
    role: "Editor",
    tools: ["Premiere Pro", "CapCut"],
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
    role: "Editor",
    tools: ["Premiere Pro"],
    thumbnail: "",
    videoSrc: "",
    description: "Customer case-study mini documentary.",
  },
];
