import { describe, expect, it } from 'vitest'
import indexHtml from '../../../index.html?raw'

// §6.9 / CA-11.1 — metatags do iPhone. O <link rel="manifest" crossorigin="use-credentials">
// é injetado no build pelo vite-plugin-pwa (opção useCredentials), por isso não fica aqui.
describe('metatags do PWA no index.html', () => {
  it.each([
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  ])('contém %s', (tag) => {
    expect(indexHtml).toContain(tag)
  })

  it('não declara o manifest à mão (evitaria um link duplicado sem credenciais)', () => {
    expect(indexHtml).not.toContain('rel="manifest"')
  })
})
