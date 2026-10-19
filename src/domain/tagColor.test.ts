import { describe, expect, it } from 'vitest'
import { readableTextColor, relativeLuminance } from '@/domain/tagColor'

describe('relativeLuminance', () => {
  it('vai de 0 (preto) a 1 (branco)', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
  })

  it('recusa cores fora do formato #RRGGBB', () => {
    expect(() => relativeLuminance('#fff')).toThrow(RangeError)
    expect(() => relativeLuminance('red')).toThrow(RangeError)
  })
})

describe('readableTextColor', () => {
  // RF-03 / CA-03.6 — texto claro ou escuro pela luminância da cor de fundo.
  it.each([
    ['#000000', '#FFFFFF'],
    ['#FFFFFF', '#000000'],
    ['#1D4ED8', '#FFFFFF'], // azul escuro
    ['#7C3AED', '#FFFFFF'], // roxo
    ['#FACC15', '#000000'], // amarelo
    ['#22C55E', '#000000'], // verde claro
    ['#ffffff', '#000000'], // minúsculas
  ])('fundo %s → texto %s', (background, expected) => {
    expect(readableTextColor(background)).toBe(expected)
  })

  it('decide pelo maior contraste perto do limite (luminância ≈ 0,179)', () => {
    expect(readableTextColor('#757575')).toBe('#FFFFFF')
    expect(readableTextColor('#767676')).toBe('#000000')
  })
})

// ---------------------------------------------------------------------------
// Reforço da auditoria da Fase 2 (CA-03.6 / §6.5): cores limítrofes e propriedade.
// ---------------------------------------------------------------------------

/** Referência independente da fórmula da WCAG 2.x (luminância e razão de contraste). */
function wcagLuminance(hex: string): number {
  const channel = (start: number) => {
    const srgb = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

const toHex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`

describe('readableTextColor — cores limítrofes (CA-03.6)', () => {
  it.each([
    ['#FF0000', '#000000'], // vermelho puro: L ≈ 0,2126 (acima do limite ≈ 0,179)
    ['#00FF00', '#000000'], // verde puro
    ['#0000FF', '#FFFFFF'], // azul puro: L ≈ 0,0722
    ['#808080', '#000000'], // cinza médio
    ['#0A0A0A', '#FFFFFF'], // perto do trecho linear da fórmula
    ['#FF00FF', '#000000'], // magenta: L ≈ 0,285
    ['#00FFFF', '#000000'], // ciano
    ['#B91C1C', '#FFFFFF'], // vermelho escuro
  ])('fundo %s → texto %s', (background, expected) => {
    expect(readableTextColor(background)).toBe(expected)
  })

  it('a luminância calculada segue a fórmula da WCAG', () => {
    for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#767676', '#0A0A0A', '#123456']) {
      expect(relativeLuminance(hex)).toBeCloseTo(wcagLuminance(hex), 12)
    }
  })

  // Propriedade: a cor escolhida sempre tem contraste >= ao da outra opção.
  it('propriedade: escolhe sempre a opção de maior contraste (WCAG)', () => {
    for (let red = 0; red <= 255; red += 17) {
      for (let green = 0; green <= 255; green += 15) {
        for (let blue = 0; blue <= 255; blue += 51) {
          const hex = toHex(red, green, blue)
          const luminance = wcagLuminance(hex)
          const withBlack = contrast(luminance, 0)
          const withWhite = contrast(luminance, 1)
          const chosen = readableTextColor(hex)
          if (Math.abs(withBlack - withWhite) > 1e-9) {
            expect(chosen).toBe(withBlack > withWhite ? '#000000' : '#FFFFFF')
          }
          expect(Math.max(withBlack, withWhite)).toBeGreaterThanOrEqual(4.58 - 1e-9)
        }
      }
    }
  })

  // Nos cinzas, a troca de branco para preto acontece uma única vez (entre #757575 e #767676).
  it('nos 256 cinzas a troca de branco para preto acontece uma só vez', () => {
    const choices = Array.from({ length: 256 }, (_, value) =>
      readableTextColor(toHex(value, value, value)),
    )
    const firstBlack = choices.indexOf('#000000')
    expect(firstBlack).toBe(0x76)
    expect(choices.slice(0, firstBlack).every((color) => color === '#FFFFFF')).toBe(true)
    expect(choices.slice(firstBlack).every((color) => color === '#000000')).toBe(true)
  })

  it('recusa cores com caracteres não hexadecimais ou sem "#"', () => {
    expect(() => readableTextColor('#GGGGGG')).toThrow(RangeError)
    expect(() => readableTextColor('FFFFFF')).toThrow(RangeError)
    expect(() => readableTextColor('#FFFFFF00')).toThrow(RangeError)
  })
})
