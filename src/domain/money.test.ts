import { describe, expect, it } from 'vitest'
import {
  addCents,
  digitsToCents,
  formatBRL,
  formatSignedBRL,
  MAX_AMOUNT_CENTS,
  MAX_AMOUNT_DIGITS,
} from '@/domain/money'
import { createTestRandom } from '@/test/propertyHelpers'

// O Intl separa "R$" do número com espaço não separável (U+00A0); os testes comparam o
// texto como o usuário o lê.
const normalize = (text: string) => text.replace(/ /g, ' ')

describe('formatBRL', () => {
  // RF-01 / CA-01.3
  it('formata 1999 centavos como R$ 19,99', () => {
    expect(normalize(formatBRL(1999))).toBe('R$ 19,99')
  })

  it('formata zero, centavos isolados e milhares', () => {
    expect(normalize(formatBRL(0))).toBe('R$ 0,00')
    expect(normalize(formatBRL(5))).toBe('R$ 0,05')
    expect(normalize(formatBRL(123456))).toBe('R$ 1.234,56')
  })

  // RF-01 — valor máximo (R$ 99.999.999,99, 10 dígitos), sem erro de ponto flutuante.
  it('formata o valor máximo do RF-01', () => {
    expect(normalize(formatBRL(MAX_AMOUNT_CENTS))).toBe('R$ 99.999.999,99')
  })

  it('formata somas muito grandes sem perder centavos', () => {
    expect(normalize(formatBRL(Number.MAX_SAFE_INTEGER))).toBe('R$ 90.071.992.547.409,91')
  })

  it('formata negativos com o sinal do Intl', () => {
    expect(normalize(formatBRL(-4590))).toMatch(/^-R\$ 45,90$/)
  })

  it('recusa valores que não são inteiros seguros', () => {
    expect(() => formatBRL(19.99)).toThrow(RangeError)
    expect(() => formatBRL(Number.NaN)).toThrow(RangeError)
    expect(() => formatBRL(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })
})

describe('formatSignedBRL', () => {
  // RF-02 / CA-02.1 — sinal explícito; negativo com "−" (U+2212); zero neutro.
  it('mostra +, − e zero sem sinal', () => {
    expect(normalize(formatSignedBRL(1000))).toBe('+R$ 10,00')
    expect(normalize(formatSignedBRL(-1000))).toBe('−R$ 10,00')
    expect(normalize(formatSignedBRL(0))).toBe('R$ 0,00')
  })

  // CA-02.1 — exemplos do critério.
  it('reproduz os exemplos +R$ 120,00 e −R$ 45,90', () => {
    expect(normalize(formatSignedBRL(12000))).toBe('+R$ 120,00')
    expect(normalize(formatSignedBRL(-4590))).toBe('−R$ 45,90')
  })

  it('trata -0 como zero', () => {
    expect(normalize(formatSignedBRL(-0))).toBe('R$ 0,00')
  })

  it('recusa valores fracionados', () => {
    expect(() => formatSignedBRL(0.5)).toThrow(RangeError)
  })
})

describe('digitsToCents', () => {
  // RF-01 / CA-01.3 — os dígitos entram pela direita.
  it('converte os dígitos 1, 9, 9, 9 em 1999', () => {
    expect(digitsToCents('1')).toBe(1)
    expect(digitsToCents('19')).toBe(19)
    expect(digitsToCents('199')).toBe(199)
    expect(digitsToCents('1999')).toBe(1999)
  })

  it('devolve 0 sem dígitos e ignora zeros à esquerda', () => {
    expect(digitsToCents('')).toBe(0)
    expect(digitsToCents('000123')).toBe(123)
  })

  it('aceita só dígitos', () => {
    expect(digitsToCents('R$ 19,99')).toBe(1999)
    expect(digitsToCents('abc')).toBe(0)
  })

  // §6.5 / §6.11 — limite de 11 dígitos na máscara. O teto de valor (RF-01) é validado
  // à parte, no formulário: 11 dígitos passam do máximo de R$ 99.999.999,99.
  it('aceita até 11 dígitos e descarta os excedentes', () => {
    expect(MAX_AMOUNT_DIGITS).toBe(11)
    expect(digitsToCents('9999999999')).toBe(MAX_AMOUNT_CENTS)
    expect(digitsToCents('99999999999')).toBe(99_999_999_999)
    expect(digitsToCents('123456789012')).toBe(12_345_678_901)
    expect(Number.isSafeInteger(digitsToCents('9'.repeat(30)))).toBe(true)
  })
})

describe('addCents', () => {
  it('soma inteiros', () => {
    expect(addCents(1999, 1)).toBe(2000)
    expect(addCents(MAX_AMOUNT_CENTS, MAX_AMOUNT_CENTS)).toBe(19_999_999_998)
  })

  // Princípio 1 — somas validadas com Number.isSafeInteger.
  it('falha quando a soma deixa de ser um inteiro seguro', () => {
    expect(() => addCents(Number.MAX_SAFE_INTEGER, 1)).toThrow(RangeError)
    expect(() => addCents(0.1, 0.2)).toThrow(RangeError)
    expect(() => addCents(1, 0.5)).toThrow(RangeError)
  })
})

// ---------------------------------------------------------------------------
// Reforço da auditoria da Fase 2 (§6.5 / §6.11 / D-29).
// ---------------------------------------------------------------------------

const NBSP = '\u00a0'
const MINUS = '\u2212'

/** Referência independente do Intl: "R$ 1.234,56" montado só com operações de texto. */
function expectedBRL(cents: number): string {
  const digits = String(Math.abs(cents)).padStart(3, '0')
  const integerPart = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${integerPart},${digits.slice(-2)}`
}

describe('formatBRL — texto exato (D-29)', () => {
  // D-29 — mantém o espaço não separável (U+00A0) entre "R$" e o número.
  it('usa espaço não separável depois de "R$"', () => {
    expect(formatBRL(1999)).toBe(`R$${NBSP}19,99`)
    expect(formatBRL(1999)).not.toContain(' ')
  })

  it.each([
    [1, 'R$ 0,01'],
    [10, 'R$ 0,10'],
    [100, 'R$ 1,00'],
    [99999, 'R$ 999,99'],
    [100000, 'R$ 1.000,00'],
    [100000000, 'R$ 1.000.000,00'],
    [10_000_000_000, 'R$ 100.000.000,00'],
    [99_999_999_999, 'R$ 999.999.999,99'], // 11 dígitos (limite da máscara)
  ])('%d centavos → %s', (cents, expected) => {
    expect(normalize(formatBRL(cents))).toBe(expected)
  })
})

describe('formatSignedBRL — sinal tipográfico (CA-02.1 / D-29)', () => {
  // CA-02.1 — negativo com "−" (U+2212), nunca com o hífen "-".
  it('o negativo começa com U+2212 e não contém hífen', () => {
    const text = formatSignedBRL(-4590)
    expect(text.codePointAt(0)).toBe(0x2212)
    expect(text).not.toContain('-')
    expect(text).toBe(`${MINUS}R$${NBSP}45,90`)
  })

  // CA-02.1 — zero é neutro: sem "+", sem "−".
  it('zero não tem sinal', () => {
    const text = formatSignedBRL(0)
    expect(text).not.toMatch(/[+−-]/)
    expect(text).toBe(`R$${NBSP}0,00`)
  })

  it('positivo e negativo de 1 centavo e de valores grandes', () => {
    expect(normalize(formatSignedBRL(1))).toBe('+R$ 0,01')
    expect(normalize(formatSignedBRL(-1))).toBe('−R$ 0,01')
    expect(normalize(formatSignedBRL(MAX_AMOUNT_CENTS))).toBe('+R$ 99.999.999,99')
    expect(normalize(formatSignedBRL(-MAX_AMOUNT_CENTS))).toBe('−R$ 99.999.999,99')
    expect(normalize(formatSignedBRL(-Number.MAX_SAFE_INTEGER))).toBe('−R$ 90.071.992.547.409,91')
  })

  it('positivo e negativo têm o mesmo texto depois do sinal', () => {
    for (const cents of [1, 99, 100, 4590, 123456, MAX_AMOUNT_CENTS]) {
      expect(formatSignedBRL(cents).slice(1)).toBe(formatSignedBRL(-cents).slice(1))
      expect(formatSignedBRL(cents).slice(1)).toBe(formatBRL(cents))
    }
  })
})

describe('digitsToCents — máscara do campo de valor (CA-01.3)', () => {
  // CA-01.3 — digitando 1, 9, 9, 9 o campo mostra R$ 0,01 → R$ 0,19 → R$ 1,99 → R$ 19,99.
  it('reproduz a sequência digitada do CA-01.3', () => {
    let typed = ''
    const shown: string[] = []
    for (const key of ['1', '9', '9', '9']) {
      typed += key
      shown.push(normalize(formatBRL(digitsToCents(typed))))
    }
    expect(shown).toEqual(['R$ 0,01', 'R$ 0,19', 'R$ 1,99', 'R$ 19,99'])
    expect(digitsToCents(typed)).toBe(1999)
  })

  // §6.5 / §6.11 — limite de 11 dígitos: o 12º dígito digitado não muda o valor.
  it('o 12º dígito em diante é descartado', () => {
    const elevenDigits = '12345678901'
    expect(digitsToCents(elevenDigits)).toBe(12_345_678_901)
    expect(digitsToCents(`${elevenDigits}2`)).toBe(digitsToCents(elevenDigits))
    expect(digitsToCents(`${elevenDigits}99999`)).toBe(digitsToCents(elevenDigits))
  })

  // O limite vale para os dígitos, não para os caracteres digitados (pontuação é ignorada).
  it('pontuação não conta para o limite de dígitos', () => {
    expect(digitsToCents('R$ 999.999.999,99')).toBe(99_999_999_999)
  })

  // §6.5 — "Somas sempre com inteiros; validar com Number.isSafeInteger".
  it('qualquer entrada vira um inteiro seguro e não negativo', () => {
    for (const input of ['', '-5', '1e9', '0x1F', '٣', '9'.repeat(100), '12,34', ' 7 ']) {
      const cents = digitsToCents(input)
      expect(Number.isSafeInteger(cents)).toBe(true)
      expect(cents).toBeGreaterThanOrEqual(0)
    }
    expect(digitsToCents('-5')).toBe(5)
    expect(digitsToCents('1e9')).toBe(19)
  })

  // Pendente com o dono (§8.2): o RF-01 limita o valor a 9.999.999.999 centavos
  // (10 dígitos), enquanto a §6.5 e a §6.11 falam em "limite de 11 dígitos" na máscara.
  // A D-29 registra a escolha do implementador: a máscara aceita 11 dígitos e o teto do
  // RF-01 é validado no formulário (Fase 4). Aqui só documentamos os dois números.
  it('MAX_AMOUNT_CENTS (RF-01) tem 10 dígitos; a máscara aceita 11 (§6.5)', () => {
    expect(MAX_AMOUNT_CENTS).toBe(9_999_999_999)
    expect(String(MAX_AMOUNT_CENTS)).toHaveLength(10)
    expect(MAX_AMOUNT_DIGITS).toBe(11)
    expect(Number.isSafeInteger(MAX_AMOUNT_CENTS)).toBe(true)
    // O maior valor que a máscara produz passa do teto do RF-01.
    expect(digitsToCents('9'.repeat(MAX_AMOUNT_DIGITS))).toBeGreaterThan(MAX_AMOUNT_CENTS)
  })
})

describe('propriedade: digitsToCents seguido de formatBRL (CA-01.3 / §6.5)', () => {
  it('o texto exibido corresponde aos dígitos digitados, para 1 a 11 dígitos', () => {
    const random = createTestRandom(1999)
    for (let round = 0; round < 500; round++) {
      const length = random.int(1, MAX_AMOUNT_DIGITS)
      const typed = Array.from({ length }, () => String(random.int(0, 9))).join('')
      const cents = digitsToCents(typed)

      expect(Number.isSafeInteger(cents)).toBe(true)
      expect(cents).toBe(Number(typed))
      expect(normalize(formatBRL(cents))).toBe(expectedBRL(cents))
      // Os dígitos exibidos (sem zeros à esquerda) são os digitados.
      expect(normalize(formatBRL(cents)).replace(/\D/g, '').replace(/^0+/, '')).toBe(
        typed.replace(/^0+/, ''),
      )
      // Digitar mais um dígito desloca o valor para a esquerda (entra pela direita).
      if (length < MAX_AMOUNT_DIGITS) expect(digitsToCents(`${typed}7`)).toBe(cents * 10 + 7)
    }
  })
})

describe('addCents — valores grandes (§6.11)', () => {
  it('soma até o maior inteiro seguro e falha logo depois', () => {
    expect(addCents(Number.MAX_SAFE_INTEGER - 1, 1)).toBe(Number.MAX_SAFE_INTEGER)
    expect(addCents(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toBe(0)
    expect(() => addCents(-Number.MAX_SAFE_INTEGER, -1)).toThrow(RangeError)
    expect(() => addCents(Number.NaN, 0)).toThrow(RangeError)
    expect(() => addCents(Number.POSITIVE_INFINITY, 0)).toThrow(RangeError)
  })
})
