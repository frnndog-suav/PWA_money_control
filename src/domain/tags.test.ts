import { describe, expect, it } from 'vitest'
import { readableTextColor, relativeLuminance } from '@/domain/tagColor'
import {
  findSuggestedTagColor,
  isTagInUse,
  sortByTagName,
  SUGGESTED_TAG_COLORS,
  toTagNameKey,
} from '@/domain/tags'
import { tagInputSchema } from '@/domain/tagSchema'
import { makeTag } from '@/test/factories'

const AA_TEXT_CONTRAST = 4.5

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('toTagNameKey (§6.3)', () => {
  // RF-03 — único sem diferenciar maiúsculas/minúsculas e acentos.
  it('"Mercado" = "mercado" = " Mércado "', () => {
    expect(toTagNameKey('Mercado')).toBe('mercado')
    expect(toTagNameKey('mercado')).toBe('mercado')
    expect(toTagNameKey(' Mércado ')).toBe('mercado')
    expect(toTagNameKey('MERCADO')).toBe('mercado')
  })

  it('remove acentos e cedilha de todas as letras do português', () => {
    expect(toTagNameKey('Salário')).toBe('salario')
    expect(toTagNameKey('Saúde')).toBe('saude')
    expect(toTagNameKey('Ação Ônibus Pão Àvó')).toBe('acao onibus pao avo')
  })

  it('aceita o nome já decomposto (NFD) e mantém os espaços do meio', () => {
    expect(toTagNameKey('Saúde')).toBe('saude')
    expect(toTagNameKey('  Casa  e  Lar ')).toBe('casa  e  lar')
  })
})

describe('SUGGESTED_TAG_COLORS (RF-03 / D-32)', () => {
  it('tem 12 cores #RRGGBB em maiúsculas, sem repetir cor nem nome', () => {
    expect(SUGGESTED_TAG_COLORS).toHaveLength(12)
    for (const { hex } of SUGGESTED_TAG_COLORS) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
    expect(new Set(SUGGESTED_TAG_COLORS.map((color) => color.hex)).size).toBe(12)
    expect(new Set(SUGGESTED_TAG_COLORS.map((color) => color.label)).size).toBe(12)
  })

  // CA-03.6 / RNF-06 — o texto do chip fica legível (contraste AA) em todas.
  it.each(SUGGESTED_TAG_COLORS)('$label: texto do chip com contraste ≥ 4,5:1', ({ hex }) => {
    expect(contrastRatio(hex, readableTextColor(hex))).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST)
  })

  it('inclui verde, azul e roxo (roteiro de teste da Fase 3)', () => {
    const labels = SUGGESTED_TAG_COLORS.map((color) => color.label)
    expect(labels).toEqual(expect.arrayContaining(['Verde', 'Azul', 'Roxo']))
  })

  it('findSuggestedTagColor acha a cor sem diferenciar maiúsculas', () => {
    expect(findSuggestedTagColor('#16a34a')?.label).toBe('Verde')
    expect(findSuggestedTagColor('#123456')).toBeUndefined()
  })
})

describe('sortByTagName (CA-03.5)', () => {
  it('ordena em pt-BR sem diferenciar maiúsculas e acentos e não altera a original', () => {
    const tags = ['banco', 'Água', 'Lazer', 'academia', 'Ônibus', 'Zoo'].map((name) =>
      makeTag({ name }),
    )
    const sorted = sortByTagName(tags, (tag) => tag)
    expect(sorted.map((tag) => tag.name)).toEqual([
      'academia',
      'Água',
      'banco',
      'Lazer',
      'Ônibus',
      'Zoo',
    ])
    expect(tags[0].name).toBe('banco')
  })

  it('números em ordem numérica', () => {
    const tags = ['Item 10', 'Item 2'].map((name) => makeTag({ name }))
    expect(sortByTagName(tags, (tag) => tag).map((tag) => tag.name)).toEqual(['Item 2', 'Item 10'])
  })
})

describe('isTagInUse (D-02)', () => {
  it.each([
    [{ transactions: 0, recurrings: 0, installmentGroups: 0 }, false],
    [{ transactions: 1, recurrings: 0, installmentGroups: 0 }, true],
    [{ transactions: 0, recurrings: 1, installmentGroups: 0 }, true],
    [{ transactions: 0, recurrings: 0, installmentGroups: 1 }, true],
  ])('%o → %s', (usage, expected) => {
    expect(isTagInUse(usage)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// Auditoria da Fase 3 — casos adicionais escritos a partir da spec (RF-03, §6.3, D-32).
// ---------------------------------------------------------------------------

describe('toTagNameKey — normalização (RF-03 / §6.3 / CA-03.4)', () => {
  it.each([
    ['á à â ã ä', 'a a a a a'],
    ['Á À Â Ã Ä', 'a a a a a'],
    ['ç Ç', 'c c'],
    ['é ê É Ê', 'e e e e'],
    ['í Í', 'i i'],
    ['ó ô õ Ó Ô Õ', 'o o o o o o'],
    ['ú ü Ú Ü', 'u u u u'],
    ['Alimentação', 'alimentacao'],
    ['Pensão Alimentícia', 'pensao alimenticia'],
    ['Lingüiça', 'linguica'],
  ])('%j → %j', (name, key) => {
    expect(toTagNameKey(name)).toBe(key)
  })

  it('remove espaços (e tabulações/quebras) só nas pontas; os do meio ficam', () => {
    expect(toTagNameKey('   Casa e Lar   ')).toBe('casa e lar')
    expect(toTagNameKey('\t Casa   e   Lar \n')).toBe('casa   e   lar')
    expect(toTagNameKey('Casa e Lar')).not.toBe(toTagNameKey('Casa  e Lar'))
  })

  it('a mesma palavra composta (NFC) e decomposta (NFD) gera o mesmo nameKey', () => {
    const words = ['Saúde', 'Ação', 'Ônibus', 'Pão', 'Àvó', 'Lingüiça', 'Café', 'Crédito']
    for (const word of words) {
      const nfc = word.normalize('NFC')
      const nfd = word.normalize('NFD')
      expect(nfc).not.toBe(nfd) // garante que o caso compara formas diferentes
      expect(toTagNameKey(nfd)).toBe(toTagNameKey(nfc))
      expect(toTagNameKey(nfc)).toBe(toTagNameKey(word.toUpperCase().normalize('NFD')))
    }
  })

  it('o nameKey não tem maiúsculas nem marcas combinantes', () => {
    const key = toTagNameKey('ÁÉÍÓÚ ÂÊÔ ÃÕ Ç Ü'.normalize('NFD'))
    expect(key).toBe(key.toLowerCase())
    expect(key).not.toMatch(/\p{M}/u)
    expect(key).toBe('aeiou aeo ao c u')
  })

  // Propriedade: aplicar duas vezes = aplicar uma vez (amostra determinística de nomes).
  it('é idempotente para nomes com acentos, caixa e espaços variados', () => {
    const pieces = ['Á', 'à', 'â', 'Ã', 'ä', 'Ç', 'é', 'Ê', 'í', 'Ó', 'ô', 'õ', 'Ú', 'ü']
    pieces.push('a', 'Z', ' ', '  ', '1')
    let seed = 42
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed
    }
    for (let sample = 0; sample < 500; sample += 1) {
      const length = 1 + (next() % 12)
      let name = ''
      for (let index = 0; index < length; index += 1) name += pieces[next() % pieces.length]
      const form = next() % 2 === 0 ? 'NFC' : 'NFD'
      const key = toTagNameKey(name.normalize(form))
      expect(toTagNameKey(key)).toBe(key)
    }
  })

  // §6.3 — nameKey "sem espaços nas pontas" e idempotente: o trim vem depois de remover as
  // marcas, então uma marca solta depois de um espaço na ponta não deixa o espaço.
  it('marca combinante solta na ponta não deixa espaço no nameKey (§6.3)', () => {
    expect(toTagNameKey('Mercado ́')).toBe('mercado')
    expect(toTagNameKey('́ Mercado')).toBe('mercado')
    const key = toTagNameKey('a ́')
    expect(toTagNameKey(key)).toBe(key)
  })

  // RF-03 — só acentos de letra (marcas combinantes, `\p{M}`) são ignorados; sinais avulsos
  // (^, crase avulsa, ´, ¨, ·) continuam no nameKey: "C^" e "C" são tags diferentes.
  it('sinais avulsos (^ ´ ¨ ·) não são acentos e continuam no nameKey', () => {
    expect(toTagNameKey('C^')).not.toBe(toTagNameKey('C'))
    expect(toTagNameKey('a`b')).not.toBe(toTagNameKey('ab'))
    expect(toTagNameKey('Cel·la')).not.toBe(toTagNameKey('Cella'))
  })
})

// Cálculo WCAG 2.x independente do código de produção (não usa `relativeLuminance`).
function wcagLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function wcagContrast(a: string, b: string): number {
  const la = wcagLuminance(a)
  const lb = wcagLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

describe('SUGGESTED_TAG_COLORS — contraste conferido de forma independente (D-32 / CA-03.6 / RNF-06)', () => {
  it('o cálculo independente bate com valores conhecidos da WCAG', () => {
    expect(wcagContrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(wcagContrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
  })

  it('são exatamente as 12 cores da D-32, na ordem registrada', () => {
    expect(SUGGESTED_TAG_COLORS.map(({ label, hex }) => `${label} ${hex}`)).toEqual([
      'Vermelho #DC2626',
      'Laranja #EA580C',
      'Amarelo #CA8A04',
      'Verde-limão #65A30D',
      'Verde #16A34A',
      'Verde-água #0D9488',
      'Ciano #0891B2',
      'Azul #2563EB',
      'Anil #4F46E5',
      'Roxo #9333EA',
      'Rosa #DB2777',
      'Cinza #64748B',
    ])
  })

  it('todas passam no próprio tagInputSchema sem mudar de grafia', () => {
    for (const { hex } of SUGGESTED_TAG_COLORS) {
      expect(tagInputSchema.parse({ name: 'X', color: hex }).color).toBe(hex)
    }
  })

  it.each(SUGGESTED_TAG_COLORS)(
    '$label ($hex): contraste com o texto de readableTextColor ≥ 4,5:1 (WCAG independente)',
    ({ hex }) => {
      const text = readableTextColor(hex)
      expect(wcagContrast(hex, text)).toBeGreaterThanOrEqual(4.5)
      // CA-03.6 — readableTextColor escolhe o melhor dos dois.
      const other = text === '#000000' ? '#FFFFFF' : '#000000'
      expect(wcagContrast(hex, text)).toBeGreaterThanOrEqual(wcagContrast(hex, other))
    },
  )

  it('findSuggestedTagColor acha cada cor da paleta em qualquer caixa', () => {
    for (const color of SUGGESTED_TAG_COLORS) {
      expect(findSuggestedTagColor(color.hex.toLowerCase())).toBe(color)
      expect(findSuggestedTagColor(color.hex)).toBe(color)
    }
  })
})

describe('sortByTagName — ordem pt-BR e estabilidade (CA-03.5)', () => {
  const names = (items: { name: string }[]) => items.map((item) => item.name)

  it('"Água", "Alimentação", "Ônibus", "Outros" em ordem alfabética do português', () => {
    const tags = ['Outros', 'Ônibus', 'alimentação', 'ÁGUA', 'Banco', 'outros 2'].map((name) =>
      makeTag({ name }),
    )
    expect(names(sortByTagName(tags, (tag) => tag))).toEqual([
      'ÁGUA',
      'alimentação',
      'Banco',
      'Ônibus',
      'Outros',
      'outros 2',
    ])
  })

  it('não diferencia maiúsculas: a mesma lista em caixa alta sai na mesma ordem', () => {
    const lower = ['zeta', 'água', 'beta', 'ônibus'].map((name) => makeTag({ name }))
    const upper = ['ZETA', 'ÁGUA', 'BETA', 'ÔNIBUS'].map((name) => makeTag({ name }))
    const order = (tags: ReturnType<typeof makeTag>[]) =>
      names(sortByTagName(tags, (tag) => tag)).map((name) => name.toLowerCase())
    expect(order(lower)).toEqual(['água', 'beta', 'ônibus', 'zeta'])
    expect(order(upper)).toEqual(order(lower))
  })

  it('é estável: nomes equivalentes mantêm a ordem de entrada', () => {
    const tags = [
      makeTag({ id: 'b1', name: 'Mercado' }),
      makeTag({ id: 'a', name: 'Água' }),
      makeTag({ id: 'b2', name: 'mercado' }),
      makeTag({ id: 'b3', name: 'MÉRCADO' }),
      makeTag({ id: 'b4', name: 'Mercado' }),
    ]
    expect(sortByTagName(tags, (tag) => tag).map((tag) => tag.id)).toEqual([
      'a',
      'b1',
      'b2',
      'b3',
      'b4',
    ])
    expect(sortByTagName(tags.toReversed(), (tag) => tag).map((tag) => tag.id)).toEqual([
      'a',
      'b4',
      'b3',
      'b2',
      'b1',
    ])
  })

  it('funciona com itens que embrulham a tag (lista com contagem)', () => {
    const items = ['Ônibus', 'Água'].map((name) => ({ tag: makeTag({ name }), count: 1 }))
    expect(sortByTagName(items, (item) => item.tag).map((item) => item.tag.name)).toEqual([
      'Água',
      'Ônibus',
    ])
  })

  it('lista vazia → nova lista vazia', () => {
    const empty: ReturnType<typeof makeTag>[] = []
    const sorted = sortByTagName(empty, (tag) => tag)
    expect(sorted).toEqual([])
    expect(sorted).not.toBe(empty)
  })
})

describe('isTagInUse — combinações (D-02 / CA-03.2)', () => {
  it.each([
    [{ transactions: 2, recurrings: 1, installmentGroups: 0 }],
    [{ transactions: 0, recurrings: 3, installmentGroups: 2 }],
    [{ transactions: 1, recurrings: 0, installmentGroups: 1 }],
    [{ transactions: 5000, recurrings: 4, installmentGroups: 3 }],
  ])('%o → em uso', (usage) => {
    expect(isTagInUse(usage)).toBe(true)
  })
})
