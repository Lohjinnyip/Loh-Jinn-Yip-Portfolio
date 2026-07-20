// ============================================================================
//  compress-gallery.mjs — make images in /public/gallery GitHub- & web-friendly.
// ============================================================================
//
//  WHAT IT DOES
//    Re-encodes every raster image (.png/.jpg/.jpeg) in public/gallery/ to a
//    web-optimised WebP:
//      • long edge capped at MAX_EDGE (1600px) — never upscales
//      • quality Q (82) — visually clean, tiny files
//    Filenames are slugified (lowercase, no spaces) so the web paths are clean.
//    The original raster file is DELETED once its .webp exists and is smaller.
//    (.webp files and README.txt are left alone, so re-running is safe.)
//
//  Usage:  npm run compress-gallery
// ============================================================================

import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { join, extname, basename } from "node:path";

const DIR = "public/gallery";
const MAX_EDGE = 1600;
const Q = 82;

const slug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const kb = (n) => (n / 1024).toFixed(0) + " KB";
const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";

const files = readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (!files.length) {
  console.log("No .png/.jpg images to compress in", DIR);
  process.exit(0);
}

console.log(`Compressing ${files.length} image(s) → WebP (max ${MAX_EDGE}px, q${Q})\n`);

let before = 0, after = 0;
const map = [];

for (const f of files) {
  const src = join(DIR, f);
  const out = join(DIR, slug(basename(f, extname(f))) + ".webp");
  const srcSize = statSync(src).size;
  before += srcSize;

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y", "-i", src,
        // fit within MAX_EDGE × MAX_EDGE, preserve aspect, never upscale
        "-vf", `scale='min(${MAX_EDGE},iw)':'min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease`,
        "-c:v", "libwebp", "-quality", String(Q), "-compression_level", "6",
        out,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  } catch (e) {
    console.error(`  ✗ ${f} — ffmpeg failed:`, e.stderr?.toString().split("\n").slice(-3).join(" ") || e.message);
    continue;
  }

  const outSize = statSync(out).size;
  after += outSize;
  map.push({ from: f, to: basename(out) });
  console.log(`  ✓ ${f}  ${mb(srcSize)} → ${basename(out)}  ${kb(outSize)}`);

  // remove the heavy original (only after the webp exists and is smaller)
  if (existsSync(out) && outSize < srcSize) unlinkSync(src);
}

console.log(`\nTotal: ${mb(before)} → ${mb(after)}`);
console.log("\nSlug map (for gallery.js):");
map.forEach((m) => console.log(`  ${m.from}  ->  /gallery/${m.to}`));
