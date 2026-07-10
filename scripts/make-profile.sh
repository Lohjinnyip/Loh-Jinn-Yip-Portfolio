#!/usr/bin/env bash
# ============================================================================
#  Compress a source photo into a git-friendly public/profile.jpg
# ============================================================================
#  Usage:
#     npm run profile -- /path/to/your-photo.jpg
#     # or directly:
#     bash scripts/make-profile.sh ~/Desktop/portrait.jpg
#
#  Resizes the longest edge to 1400px and re-encodes as JPEG @ quality 80,
#  which keeps a portrait well under ~250 KB — small enough to commit.
# ============================================================================
set -euo pipefail

SRC="${1:-}"
DEST="public/profile.jpg"

if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "✗ Give a path to your photo:  npm run profile -- /path/to/photo.jpg"
  exit 1
fi

mkdir -p public
sips -Z 1400 -s format jpeg -s formatOptions 80 "$SRC" --out "$DEST" >/dev/null

SIZE=$(du -h "$DEST" | cut -f1)
DIMS=$(sips -g pixelWidth -g pixelHeight "$DEST" | awk '/pixel/{print $2}' | paste -sd'x' -)
echo "✓ Wrote $DEST  ($DIMS, $SIZE)"
