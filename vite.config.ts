import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env from root directory
  const env = loadEnv(mode, process.cwd(), '');

  // Get API key from either .env.local or process.env (Vercel)
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
        workbox: {
          // Import our custom push notification handler into the generated SW
          importScripts: ['/sw-push.js'],
          // Cache API responses for offline support
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Focus Hub',
          short_name: 'FocusHub',
          description: 'Centralize suas operações e impulsione o desempenho da sua equipe',
          theme_color: '#FF6B00',
          background_color: '#0E0E0E',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
