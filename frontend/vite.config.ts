import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API requests to the Rails server so the browser sees a
    // single origin. This avoids all CORS issues during development.
    proxy: {
      '/v1': 'http://localhost:3000',
      '/v2': 'http://localhost:3000',
      '/mini-profiler-resources': 'http://localhost:3000',
      '/profiler': 'http://localhost:3000',
      '/metrics': 'http://localhost:3000',
    },
  },
})
