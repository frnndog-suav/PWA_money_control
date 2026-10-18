import type { VitePWAOptions } from 'vite-plugin-pwa'
// Caminho relativo com extensão (e não `@/`): este módulo também é carregado pelo
// vite.config.ts, verificado pelo tsconfig.node.json, que não conhece o alias.
import { THEME_COLORS } from '../../lib/theme.ts'

/**
 * §6.9 / RF-11 — opções do vite-plugin-pwa (PWA instalável e offline). Ficam fora do
 * vite.config.ts para serem protegidas por teste (pwaOptions.test.ts).
 */
export const PWA_OPTIONS: Partial<VitePWAOptions> = {
  // CA-11.3: a versão nova espera o usuário tocar "Atualizar"; nunca recarrega sozinha.
  registerType: 'prompt',
  // O registro é feito pelo app (src/app/pwa/registerPwa.ts), não por script injetado.
  injectRegister: false,
  // Cloudflare Access (RF-12): o manifest só é entregue com o cookie da sessão,
  // então o <link rel="manifest"> precisa de crossorigin="use-credentials".
  useCredentials: true,
  // Os ícones já entram pelo globPatterns abaixo; incluí-los de novo duplicaria o precache.
  includeManifestIcons: false,
  manifest: {
    name: 'Meus Gastos',
    short_name: 'Gastos',
    lang: 'pt-BR',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    // Manifest é estático: usa o tema claro, igual à meta theme-color inicial do index.html.
    theme_color: THEME_COLORS.light,
    background_color: THEME_COLORS.light,
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    // CA-11.2 / RNF-03: precache de todo o build para abrir sem internet
    // (o manifest.webmanifest é acrescentado pelo próprio plugin).
    globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
    // SPA offline: qualquer navegação abre o index.html do cache…
    navigateFallback: 'index.html',
    // …exceto as rotas do Cloudflare Access, que precisam ir à rede para o login
    // funcionar depois que a sessão expirar (CA-12.3).
    navigateFallbackDenylist: [/^\/cdn-cgi\//],
  },
}
