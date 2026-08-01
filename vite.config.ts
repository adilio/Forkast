import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase-auth',
              test: /node_modules\/@firebase\/(?:auth|auth-compat)/,
            },
            {
              name: 'firebase-firestore',
              test: /node_modules\/@firebase\/firestore/,
            },
            {
              name: 'firebase-core',
              test: /node_modules\/(?:@firebase|firebase)\//,
            },
            {
              name: 'react-vendor',
              test: /node_modules\/(?:react|react-dom|wouter)\//,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['forkast-mark.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Forkast',
        short_name: 'Forkast',
        description: 'Household recipes and store-aware shopping lists.',
        theme_color: '#f4f3ee',
        background_color: '#f4f3ee',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['food', 'lifestyle', 'utilities'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/\.netlify\//, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'recipe-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
