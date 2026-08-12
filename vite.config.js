import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// - `npm run dev`   -> base "/"  (clean http://localhost:5173/)
// - `npm run build` -> base "/Loh-Jinn-Yip-Portfolio/" (for GitHub Pages project site)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Loh-Jinn-Yip-Portfolio/' : '/',
  plugins: [react()],
  build: {
    // Split the heavy, rarely-changing vendors into their own chunks. Vite emits
    // <link rel="modulepreload"> for these, so they still load EAGERLY (in
    // parallel, alongside the app) — no lazy delay — but they cache separately:
    // a code change only re-downloads the small app chunk, not all of three.js.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // three + react-three renderer/helpers → one big cached chunk
          if (id.includes('/three/') || id.includes('@react-three')) return 'three'
          if (id.includes('framer-motion') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react'
        },
      },
    },
    // three.js is legitimately ~900KB; it's an intentional, separately-cached
    // vendor chunk, so lift the warning threshold above it.
    chunkSizeWarningLimit: 1100,
  },
}))
