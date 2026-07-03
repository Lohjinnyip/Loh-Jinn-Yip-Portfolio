import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// - `npm run dev`   -> base "/"  (clean http://localhost:5173/)
// - `npm run build` -> base "/Loh-Jinn-Yip-Portfolio/" (for GitHub Pages project site)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Loh-Jinn-Yip-Portfolio/' : '/',
  plugins: [react()],
}))
