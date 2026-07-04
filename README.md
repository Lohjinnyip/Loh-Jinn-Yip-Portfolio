# Loh-Jinn-Yip-Portfolio

Personal portfolio site built with React + Vite.

## Getting started

```bash
npm install     # install dependencies (first time only)
npm run dev      # start the dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Adding videos (keep them GitHub-friendly)

Drop new clips into `public/videos/`, then run:

```bash
npm run compress-videos
```

This re-encodes every video to a web-optimised H.264 MP4 (CRF 23, `+faststart`
for instant progressive playback, `yuv420p` for iOS/Safari), keeping full
resolution while cutting file size ~3×. It's safe to re-run: clips already below
~6 Mbps are detected as web-ready and skipped, so an already-compressed video is
never re-encoded (which would slowly degrade quality). Requires `ffmpeg` on PATH
(`winget install Gyan.FFmpeg` on Windows, `brew install ffmpeg` on macOS).

---

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
