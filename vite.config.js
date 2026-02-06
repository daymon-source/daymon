import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: daymon-source.github.io/daymon
// Vercel: VITE_BASE_PATH=/ 로 빌드하면 루트 기준으로 배포
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/daymon/',
  server: {
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  },
})
