import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: daymon-source.github.io/daymon
// Vercel: 루트(/) 기준으로 배포
export default defineConfig({
  plugins: [react()],
  base: '/',
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
