// ============================================================================
//  compress-videos.mjs — make videos in /public/videos GitHub- & web-friendly.
// ============================================================================
//
//  WHAT IT DOES
//    Re-encodes every video in public/videos/ to a web-optimised H.264 MP4:
//      • CRF 23 (visually near-lossless), preset "slow" for good compression
//      • +faststart  → the moov atom sits up front so the clip starts playing
//                      before it finishes downloading (progressive streaming)
//      • yuv420p     → plays everywhere (Safari/iOS included)
//      • AAC 128k audio
//    High-bitrate source clips (phone/camera/render exports at ~10 Mbps) shrink
//    ~3× with no visible quality loss, so the repo stays light for GitHub.
//
//  SAFE TO RE-RUN ("any video I add")
//    Each file is probed first. If it is ALREADY web-friendly (bitrate below
//    SKIP_KBPS), it is left untouched — so re-running never re-compresses an
//    already-optimised clip (which would slowly degrade quality). Just drop new
//    raw videos into public/videos/ and run `npm run compress-videos` again.
//
//  Encoding goes to a temp file; the original is only replaced once the new file
//  exists AND is actually smaller. Originals are also in git history.
//
//  Usage:  npm run compress-videos
// ============================================================================

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = resolve(__dirname, "..", "public", "videos");

// Tunables --------------------------------------------------------------------
const CRF = 23;            // 18=near-lossless/big … 28=small/softer. 23 = sweet spot.
const PRESET = "slow";     // slower = smaller file at the same quality
const SKIP_KBPS = 6000;    // clips already below this are considered web-ready → skipped.
                           // Raw camera/render exports run ~10Mbps; CRF-23 output
                           // lands ~3–5Mbps, so 6000 cleanly separates the two and
                           // a re-run never re-compresses an already-optimised clip.
const MAX_HEIGHT = 1920;   // downscale only if taller (keeps aspect ratio); 1080p stays 1080p
const EXTS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);

// Locate ffmpeg / ffprobe: prefer PATH, else the winget install location -------
function findBin(name) {
  const onPath = spawnSync(name, ["-version"], { stdio: "ignore" });
  if (onPath.status === 0) return name;
  const glob = join(
    process.env.LOCALAPPDATA || "",
    "Microsoft",
    "WinGet",
    "Packages"
  );
  try {
    const stack = [glob];
    while (stack.length) {
      const dir = stack.pop();
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.name.toLowerCase() === `${name}.exe`) return full;
      }
    }
  } catch { /* fall through */ }
  return null;
}

const FFMPEG = findBin("ffmpeg");
const FFPROBE = findBin("ffprobe");
if (!FFMPEG || !FFPROBE) {
  console.error(
    "\n✖ ffmpeg/ffprobe not found. Install it, then re-run:\n" +
      "    winget install Gyan.FFmpeg      (Windows)\n" +
      "    brew install ffmpeg             (macOS)\n"
  );
  process.exit(1);
}

function probe(file) {
  const out = execFileSync(FFPROBE, [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    file,
  ]);
  const j = JSON.parse(out.toString());
  const v = j.streams.find((s) => s.codec_type === "video") || {};
  return {
    width: v.width,
    height: v.height,
    kbps: Math.round(Number(j.format.bit_rate || 0) / 1000),
    hasAudio: j.streams.some((s) => s.codec_type === "audio"),
  };
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

if (!existsSync(VIDEO_DIR)) {
  console.error(`✖ No videos directory at ${VIDEO_DIR}`);
  process.exit(1);
}

const files = readdirSync(VIDEO_DIR).filter((f) => EXTS.has(extname(f).toLowerCase()));
if (!files.length) {
  console.log("No videos found in public/videos/ — nothing to do.");
  process.exit(0);
}

console.log(`\nScanning ${files.length} video(s) in public/videos/ …\n`);
let savedTotal = 0;
let compressed = 0;

for (const name of files) {
  const src = join(VIDEO_DIR, name);
  const info = probe(src);
  const srcBytes = statSync(src).size;

  if (info.kbps && info.kbps < SKIP_KBPS) {
    console.log(`⏭  ${name}  (${info.kbps}kbps, ${mb(srcBytes)}MB) — already web-friendly, skipped`);
    continue;
  }

  const tmp = join(VIDEO_DIR, `.tmp-${name}.mp4`);
  if (existsSync(tmp)) unlinkSync(tmp);

  // Only downscale if the source is taller than MAX_HEIGHT; never upscale.
  const vf = info.height > MAX_HEIGHT ? ["-vf", `scale=-2:${MAX_HEIGHT}`] : [];
  const audio = info.hasAudio ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"];

  const args = [
    "-y", "-i", src,
    "-c:v", "libx264",
    "-crf", String(CRF),
    "-preset", PRESET,
    "-pix_fmt", "yuv420p",
    ...vf,
    ...audio,
    "-movflags", "+faststart",
    tmp,
  ];

  process.stdout.write(`⏳ ${name}  (${info.kbps}kbps, ${mb(srcBytes)}MB) → encoding … `);
  const run = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "ignore"] });
  if (run.status !== 0 || !existsSync(tmp)) {
    console.log("FAILED (left original untouched)");
    if (existsSync(tmp)) unlinkSync(tmp);
    continue;
  }

  const outBytes = statSync(tmp).size;
  if (outBytes >= srcBytes) {
    console.log(`no gain (${mb(outBytes)}MB ≥ original) — kept original`);
    unlinkSync(tmp);
    continue;
  }

  unlinkSync(src);
  renameSync(tmp, src);
  savedTotal += srcBytes - outBytes;
  compressed++;
  console.log(`${mb(outBytes)}MB  (−${mb(srcBytes - outBytes)}MB)`);
}

console.log(
  `\n✔ Done. Compressed ${compressed} file(s), saved ${mb(savedTotal)}MB total.\n`
);
