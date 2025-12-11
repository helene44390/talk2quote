import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}']
      },
      includeAssets: ['*.png', '*.jpg', '*.svg', '*.ico'],
      manifest: {
        name: 'Talk2Quote',
        short_name: 'Talk2Quote',
        description: 'Voice-to-Quote App',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    middlewareMode: false,
  },
  preview: {
    host: true,
  },
  appType: 'spa'
})