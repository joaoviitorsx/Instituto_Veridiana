import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    /* Rotas por arquivo em src/routes. Cada seção vira um pedaço separado
       do pacote: quem escaneia o QR para fazer chamada não baixa gestão,
       caixa nem agenda (o mesmo que o modulo() do app HTML fazia). */
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      /* Service worker escrito à mão (src/sw.ts): além do cache do app,
         ele envia a fila de chamadas pelo Background Sync. */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      /* Nunca atualiza sozinho: recarregar no meio de uma chamada apaga
         as marcações. A tela avisa e a pessoa toca quando quiser. */
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'icones/icon-180.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,ico,svg}'],
      },
      manifest: {
        name: 'Chamada — Instituto Veridiana',
        short_name: 'Veridiana',
        description: 'Registro de frequência e gestão do Instituto Veridiana.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#4A1D6E',
        theme_color: '#4A1D6E',
        icons: [
          { src: '/icones/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icones/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icones/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
