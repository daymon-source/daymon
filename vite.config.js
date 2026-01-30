import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: daymon-source.github.io/daymon
export default defineConfig({
  plugins: [react()],
  base: '/daymon/',
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
