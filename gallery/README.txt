GALLERY IMAGES
==============

Drop your picture files in THIS folder (public/gallery/), then list them in:
    src/data/gallery.js

Example:
  1. Copy "my-photo.jpg" into public/gallery/
  2. Add an entry in src/data/gallery.js:
        { id: "g7", src: "/gallery/my-photo.jpg", alt: "My photo" }

Notes:
- The path in gallery.js always starts with "/gallery/..." (no "public").
- JPG or WEBP around 1600px on the long edge looks crisp and stays small.
- Add "span": "wide" | "tall" | "big" to an entry for a larger mosaic tile.
