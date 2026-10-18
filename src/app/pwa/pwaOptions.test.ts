import { describe, expect, it } from 'vitest'
import { PWA_OPTIONS } from '@/app/pwa/pwaOptions'
import { THEME_COLORS } from '@/lib/theme'

// §6.9 — protege a configuração do vite-plugin-pwa usada pelo vite.config.ts.
describe('opções do PWA (§6.9)', () => {
  const { manifest, workbox } = PWA_OPTIONS
  if (!manifest || !workbox) throw new Error('manifest e workbox precisam estar configurados')

  // CA-11.3
  it('espera o usuário tocar "Atualizar" (registerType prompt)', () => {
    expect(PWA_OPTIONS.registerType).toBe('prompt')
  })

  // RF-12
  it('carrega o manifest com credenciais (Cloudflare Access)', () => {
    expect(PWA_OPTIONS.useCredentials).toBe(true)
  })

  // CA-11.2 / RNF-03
  it('abre qualquer rota offline pelo index.html do cache', () => {
    expect(workbox.navigateFallback).toBe('index.html')
    expect(workbox.globPatterns).toEqual(['**/*.{js,css,html,png,svg,ico,woff2}'])
  })

  // CA-12.3
  it('não serve as rotas /cdn-cgi/ do Cloudflare Access pelo service worker', () => {
    const denylist = workbox.navigateFallbackDenylist ?? []
    expect(denylist.map(String)).toEqual([String(/^\/cdn-cgi\//)])
    expect(denylist.some((pattern) => pattern.test('/cdn-cgi/access/login'))).toBe(true)
    expect(denylist.some((pattern) => pattern.test('/lancamentos'))).toBe(false)
  })

  // CA-11.1
  it('manifest com os campos da §6.9', () => {
    expect(manifest).toMatchObject({
      name: 'Meus Gastos',
      short_name: 'Gastos',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      lang: 'pt-BR',
      theme_color: THEME_COLORS.light,
      background_color: THEME_COLORS.light,
    })
  })

  // CA-11.1
  it('ícones 192 e 512, inclusive maskable', () => {
    expect(manifest.icons).toEqual([
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ])
  })
})
