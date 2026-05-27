import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PR 5: minimal PWA config for installable offline app shell (manifest + auto SW)
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Fishmap',
        short_name: 'Fishmap',
        description: 'Shore & Dock Fishing Map for the Grand Rapids, MI area',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          // Placeholder using existing asset (real 192/512 pngs + maskable in PR6/7 polish per DESIGN).
          // Addresses Issue 7: ensures usable icons for install prompts on Android/iOS.
          {
            src: "/vite.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        // Cache app shell + small assets for offline launch; PMTiles region handled separately via OPFS lib
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
        runtimeCaching: [
          // Protomaps glyphs/fonts (best-effort; full offline glyphs benefit from local assets in prod)
          {
            urlPattern: /^https:\/\/cdn\.protomaps\.com\/fonts\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'protomaps-glyphs',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // allow SW in dev for easier testing of PWA flows
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
