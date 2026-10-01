import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Kefas Barber Shop',
        short_name: 'Kefas POS',
        description: 'Professional Barber POS System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'landscape',
        icons: [
          {
            src: '/logo_kefas.PNG',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/logo_kefas.PNG',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: '/logo_kefas.PNG',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 7781,
    allowedHosts: [
      'pos.kefasbarbershop',
      'localhost',
      '.nicola.id',
      'kefasbarbershop.id',
      'unpinioned-nonceremoniously-lezlie.ngrok-free.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3881',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3881',
        changeOrigin: true,
      },
    },
  },
})
