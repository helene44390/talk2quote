import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    middlewareMode: false,
  },
  preview: {
    host: true,
  },
  appType: 'spa'
})