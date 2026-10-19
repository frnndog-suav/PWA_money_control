import { describe, expect, it } from 'vitest'
import indexHtml from '../../../index.html?raw'
import { getThemeColor, resolveTheme, THEME_COLORS, THEME_STORAGE_KEY } from '@/lib/theme'
import { setSystemPrefersDark } from '@/test/matchMedia'
import { parseStoredThemePreference } from '@/test/themeReference'
import { addThemeColorMeta } from '@/test/renderApp'

// CA-09.3 — o script inline do index.html duplica regras de src/lib/theme.ts (ele roda
// antes do bundle). Estes testes falham se as duas cópias divergirem.

const INLINE_SCRIPT_PATTERN = /<script>([\s\S]*?)<\/script>/g

const inlineScripts = [...indexHtml.matchAll(INLINE_SCRIPT_PATTERN)].map((match) => match[1])
const inlineScript = inlineScripts[0] ?? ''

function runInlineScript() {
  new Function(inlineScript)()
}

describe('script de tema do index.html', () => {
  it('existe um único script inline', () => {
    expect(inlineScripts).toHaveLength(1)
  })

  it('usa a mesma chave e as mesmas cores de src/lib/theme.ts', () => {
    expect(inlineScript).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`)
    expect(inlineScript).toContain(`'${THEME_COLORS.dark}'`)
    expect(inlineScript).toContain(`'${THEME_COLORS.light}'`)
  })

  it('a meta theme-color inicial é a do tema claro e vem antes do script', () => {
    const metaIndex = indexHtml.indexOf(`<meta name="theme-color" content="${THEME_COLORS.light}"`)
    expect(metaIndex).toBeGreaterThan(-1)
    expect(metaIndex).toBeLessThan(indexHtml.indexOf('<script>'))
  })

  it('declara pt-BR, viewport-fit=cover e o título do app', () => {
    expect(indexHtml).toContain('<html lang="pt-BR">')
    expect(indexHtml).toContain('viewport-fit=cover')
    expect(indexHtml).toContain('<title>Meus Gastos</title>')
  })

  it.each([
    [null, false],
    [null, true],
    ['system', false],
    ['system', true],
    ['light', true],
    ['dark', false],
    ['invalido', true],
  ])(
    'salvo=%s, sistema escuro=%s: aplica o mesmo tema que resolveTheme',
    (stored, systemPrefersDark) => {
      const meta = addThemeColorMeta('')
      if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored)
      setSystemPrefersDark(systemPrefersDark)

      runInlineScript()

      const expected = resolveTheme(parseStoredThemePreference(stored), systemPrefersDark)
      expect(document.documentElement.classList.contains('dark')).toBe(expected === 'dark')
      expect(meta.content).toBe(getThemeColor(expected))
    },
  )
})
