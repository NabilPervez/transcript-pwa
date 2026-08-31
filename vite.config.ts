import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The ONNX model weights (75-150MB) are cached separately in IndexedDB by
// lib/model-cache.ts, so the service worker only needs to own the app shell
// (JS/CSS/HTML/fonts) — that split keeps `workbox` precache manifests small
// and avoids ever re-downloading the model on a shell update.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        id: '/',
        name: 'Murmur — Private Voice Transcription',
        short_name: 'Murmur',
        description:
          'Record voice memos and transcribe them entirely on-device. Nothing you say ever leaves your browser.',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell + the onnxruntime-web WASM runtime (needed to boot the
        // WASM inference backend offline). Whisper's own model weights are
        // intentionally excluded from Workbox precaching — see
        // lib/model-cache.ts — since they're an order of magnitude larger
        // and already handled by their own IndexedDB cache.
        globPatterns: ['**/*.{js,css,html,svg,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Google Fonts, if ever loaded at runtime instead of self-hosted.
            urlPattern: ({ url }: { url: URL }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  worker: {
    format: 'es'
  },
  build: {
    target: 'esnext'
  }
});
