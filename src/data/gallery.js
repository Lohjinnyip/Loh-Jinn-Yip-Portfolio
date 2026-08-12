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
// individual chair portraits alphabetically by name.
export const GALLERY = [
  { id: "g1", src: "/gallery/post-grad-2-1.webp", alt: "UCSI - Full team" },
  { id: "g2", src: "/gallery/img-3608-2.webp", alt: "UCSI - Group" },
  // people sit low in this frame → center the crop so it doesn't look too high
  { id: "g3", src: "/gallery/post-grad-1-fix-1.webp", alt: "UCSI - Group", position: "center" },
  { id: "g4", src: "/gallery/img-3592-1.webp", alt: "UCSI - Group" },
  // Individual chair portraits — arranged male → female (each group alphabetical).
  // Male:
  // Bat is framed wider than the others → center-crop so his face isn't lost under headroom
  { id: "u-bat", src: "/gallery/bat-chair-1.webp", alt: "UCSI - Bat", position: "center" },
  { id: "u-dennis", src: "/gallery/dennis-chair-1.webp", alt: "UCSI - Dennis" },
  { id: "u-ivan", src: "/gallery/ivan-chair-1.webp", alt: "UCSI - Ivan" },
  { id: "u-kevin", src: "/gallery/kevin-chair-1.webp", alt: "UCSI - Kevin" },
  { id: "u-lucas", src: "/gallery/lucas-chair-1.webp", alt: "UCSI - Lucas" },
  { id: "u-sufian", src: "/gallery/sufian-chair-1.webp", alt: "UCSI - Sufian" },
  // Female:
  { id: "u-ayunie", src: "/gallery/ayunie-chair-1.webp", alt: "UCSI - Ayunie" },
  { id: "u-drsiti", src: "/gallery/dr-siti-chair-1.webp", alt: "UCSI - Dr.Siti" },
  { id: "u-mashita", src: "/gallery/mashita-chair-1.webp", alt: "UCSI - Mashita" },
  { id: "u-perline", src: "/gallery/perline-chair-1.webp", alt: "UCSI - Perline" },
  { id: "u-shahfida", src: "/gallery/shahfida-chair-1.webp", alt: "UCSI - Shahfida" },
  // Adora Clinic — product / brand shots (below UCSI, above Personal). These are
  // tall 738x1600 product images, so center-crop (not the default "center top")
  // keeps the product/branding framed instead of cutting it off.
  { id: "ad1", src: "/gallery/adora-babo.webp", alt: "Adora - Babo", position: "center" },
  { id: "ad2", src: "/gallery/adora-clinic-spet.webp", alt: "Adora - Clinic Spet", position: "center" },
  { id: "ad3", src: "/gallery/adora-electri.webp", alt: "Adora - Electri", position: "center" },
  { id: "ad4", src: "/gallery/adora-eptq.webp", alt: "Adora - EPTQ", position: "center" },
  { id: "ad5", src: "/gallery/adora-face-mask.webp", alt: "Adora - Face Mask", position: "center" },
  { id: "ad6", src: "/gallery/adora-karisma.webp", alt: "Adora - Karisma", position: "center" },
  { id: "ad7", src: "/gallery/adora-radesese.webp", alt: "Adora - Radesese", position: "center" },
  { id: "ad8", src: "/gallery/adora-restylane.webp", alt: "Adora - Restylane", position: "center" },
  { id: "ad9", src: "/gallery/adora-sente.webp", alt: "Adora - Sente", position: "center" },
  { id: "ad10", src: "/gallery/adora-sunscreen.webp", alt: "Adora - Sunscreen", position: "center" },
  { id: "ad11", src: "/gallery/adora-teonaxe.webp", alt: "Adora - Teonaxe", position: "center" },
  { id: "ad12", src: "/gallery/adora-tranx.webp", alt: "Adora - Tranx", position: "center" },
];
