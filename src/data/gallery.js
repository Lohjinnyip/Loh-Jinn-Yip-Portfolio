// ============================================================================
//  EDIT THIS FILE TO ADD YOUR GALLERY PICTURES
// ============================================================================
//
//  One entry per image. Fields:
//    id      : any unique string
//    src     : image path. Put files in /public/gallery/ and reference them as
//              "/gallery/myphoto.webp". You can also use a full https:// URL.
//    alt     : short description (used for accessibility + shown as caption)
//    span    : (optional) "wide" makes the tile span 2 columns, "tall" spans
//              2 rows, "big" spans both. Use sparingly for a nice mosaic look.
//    position: (optional) CSS object-position for the thumbnail crop, e.g.
//              "center" or "center 60%". Default is "center top" (keeps heads).
//
//  Tip: drop raw JPG/PNG into /public/gallery and run `npm run compress-gallery`
//  to shrink them to web-friendly .webp before committing.
//
//  NOTE: captions below are placeholders derived from the file names — rename
//  them to whatever you'd like shown under each photo.
// ============================================================================

// Ordered: biggest group photo first, then group shots by size, then the
// individual portraits alphabetically by name (each person's two shots together).
export const GALLERY = [
  { id: "g1", src: "/gallery/post-grad-2-1.webp", alt: "UCSI - Full team" },
  { id: "g2", src: "/gallery/img-3608-2.webp", alt: "UCSI - Group" },
  // people sit low in this frame → center the crop so it doesn't look too high
  { id: "g3", src: "/gallery/post-grad-1-fix-1.webp", alt: "UCSI - Group", position: "center" },
  { id: "g4", src: "/gallery/img-3592-1.webp", alt: "UCSI - Group" },
  { id: "g5", src: "/gallery/dennis-chair-1.webp", alt: "UCSI - Dennis" },
  { id: "g6", src: "/gallery/dennis-box-2.webp", alt: "UCSI - Dennis" },
  { id: "g7", src: "/gallery/kevin-chair-1.webp", alt: "UCSI - Kevin" },
  { id: "g8", src: "/gallery/kevin-box-2.webp", alt: "UCSI - Kevin" },
  { id: "g9", src: "/gallery/lucas-chair-1.webp", alt: "UCSI - Lucas" },
  { id: "g10", src: "/gallery/lucas-box-2.webp", alt: "UCSI - Lucas" },
  { id: "g11", src: "/gallery/mashita-chair-1.webp", alt: "UCSI - Mashita" },
  { id: "g12", src: "/gallery/mashita-box-2.webp", alt: "UCSI - Mashita" },
  { id: "g13", src: "/gallery/sufian-chair-1.webp", alt: "UCSI - Sufian" },
  { id: "g14", src: "/gallery/sufian-box-2.webp", alt: "UCSI - Sufian" },
];
