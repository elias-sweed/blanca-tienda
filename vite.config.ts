import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // La actualización se avisa desde la app (usePWA) y no se fuerza sola.
      registerType: 'prompt',
      // El registro lo hace usePWA; evitamos inyectarlo dos veces.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'blanca-login.jpg'],
      manifest: {
        name: 'Blanca Tienda',
        short_name: 'Blanca',
        description: 'Ventas, inventario y caja de tu tienda.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#101216',
        theme_color: '#101216',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Nunca guardar respuestas de Supabase (sesión, datos privados).
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\//i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
