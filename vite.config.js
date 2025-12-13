import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    proxy: {
      '/api': {
        target: 'https://backend.cabifyit.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
