import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// D-43 — uma única folha Tailwind. Uma segunda folha (ex.: própria de uma página DEV)
// redeclara as camadas e, carregada depois, faz utilitários base vencerem variantes
// `dark:` do app (bug do aviso "Lançamento salvo" ilegível no tema escuro em DEV).
//
// Lê o disco em tempo de execução (por isso este teste é tipado pelo tsconfig.node.json):
// um `import.meta.glob` seria resolvido na transformação e ficaria no cache de módulos do
// Vitest, sem perceber uma folha nova.
// No ambiente jsdom o import.meta.url não é file://; dirname é o caminho no disco.
const SRC_DIR = join(import.meta.dirname, '..')
const ENTRY_STYLESHEET = 'index.css'
const TAILWIND_IMPORT = /@import\s+['"]tailwindcss['"]/

const readStylesheet = (relativePath: string): string =>
  readFileSync(join(SRC_DIR, relativePath), 'utf8')

const listStylesheets = (): string[] =>
  readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.css'))
    .map((path) => path.replaceAll('\\', '/'))

describe('folha Tailwind única (D-43)', () => {
  it('só src/index.css importa o tailwindcss', () => {
    const importers = listStylesheets().filter((path) => TAILWIND_IMPORT.test(readStylesheet(path)))

    expect(importers).toEqual([ENTRY_STYLESHEET])
  })

  it('a folha de entrada importa as fontes trocadas pelo alias', () => {
    expect(readStylesheet(ENTRY_STYLESHEET)).toMatch(/@import\s+['"]@tailwind-sources['"]/)
  })

  // §6.12 — nada de src/dev no CSS de produção.
  it('as fontes do build excluem src/dev; as do servidor DEV não excluem nada', () => {
    expect(readStylesheet('styles/tailwind-sources.build.css')).toMatch(
      /@source\s+not\s+['"]\.\.\/dev['"]/,
    )
    expect(readStylesheet('styles/tailwind-sources.serve.css')).not.toMatch(/@source/)
  })
})
