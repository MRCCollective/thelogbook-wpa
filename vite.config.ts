import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => {
  const base = command === 'serve' ? '/' : '/thelogbook-wpa/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'thelogbook-logo.svg', 'fonts/*.woff2'],
        manifest: {
          name: 'The Logbook',
          short_name: 'Logbook',
          description: 'Aktiviteter och kalender i ett enklare format.',
          theme_color: '#151b1e',
          background_color: '#151b1e',
          display: 'standalone',
          start_url: base,
          scope: base,
          lang: 'sv',
          icons: [
            { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
  }
})
