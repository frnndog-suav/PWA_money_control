import { describe, expect, it } from 'vitest'
import { toTagNameKey } from '@/domain/tags'
import { foldText } from '@/domain/text'
import { EMPTY_TRANSACTION_FILTERS, filterTransactions } from '@/domain/transactionFilters'
import { makeTransaction } from '@/test/factories'
import { createTestRandom } from '@/test/propertyHelpers'

// RF-04 / CA-04.2 — busca "sem diferenciar maiúsculas/minúsculas e acentos"; D-44(c) — `foldText`
// é a normalização única, usada também pela chave da tag (RF-03).

// Letras com e sem acento que aparecem em português (e algumas de outras línguas latinas).
const ALPHABET = [...'aAbBcCçÇeEéÉêÊiIíÍoOóÓôÔõÕuUúÚüÜãÃàÀâÂáÁñÑ 0123456789-./']

function randomText(seed: number): string {
  const random = createTestRandom(seed)
  const length = random.int(0, 24)
  return Array.from({ length }, () => ALPHABET[random.int(0, ALPHABET.length - 1)]).join('')
}

describe('foldText — casos de acento, caixa e espaços (CA-04.2)', () => {
  it.each([
    ['Açaí', 'acai'],
    ['ÁRVORE', 'arvore'],
    ['Pêssego', 'pessego'],
    ['Maçã Verde', 'maca verde'],
    ['Ônibus', 'onibus'],
    ['Pinguim / Pingüim', 'pinguim / pinguim'],
    ['CAFÉ COM LEITE', 'cafe com leite'],
    ['Avó e Avô', 'avo e avo'],
  ])('%j → %j', (input, expected) => {
    expect(foldText(input)).toBe(expected)
    expect(foldText(input.normalize('NFD'))).toBe(expected)
    expect(foldText(input.normalize('NFC'))).toBe(expected)
  })

  it('não remove nem junta espaços internos (nem os das pontas)', () => {
    expect(foldText('Pão   de  Queijo')).toBe('pao   de  queijo')
    expect(foldText(' a  b ')).toBe(' a  b ')
    expect(foldText('')).toBe('')
  })
})

describe('foldText — propriedades (CA-04.2)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const text = randomText(seed)
    it(`semente ${seed}: idempotente, NFC = NFD, sem marcas e sem maiúsculas`, () => {
      const folded = foldText(text)
      expect(foldText(folded)).toBe(folded)
      expect(foldText(text.normalize('NFC'))).toBe(folded)
      expect(foldText(text.normalize('NFD'))).toBe(folded)
      expect(foldText(text.toUpperCase())).toBe(folded)
      expect(/\p{M}/u.test(folded)).toBe(false)
      expect(folded).toBe(folded.toLowerCase())
      // Os espaços são preservados: só a caixa e os acentos mudam.
      expect(folded.split(' ').length).toBe(text.split(' ').length)
    })
  }
})

describe('busca por "contém" nos dois sentidos (CA-04.2)', () => {
  const search = (descriptions: string[], text: string) =>
    filterTransactions(
      descriptions.map((description) => makeTransaction({ description })),
      { ...EMPTY_TRANSACTION_FILTERS, text },
    ).map((transaction) => transaction.description)

  it('"Açaí" na descrição é achado por "acai", e "acai" na descrição por "Açaí"', () => {
    expect(search(['Açaí na tigela'], 'acai')).toEqual(['Açaí na tigela'])
    expect(search(['acai na tigela'], 'Açaí')).toEqual(['acai na tigela'])
    expect(search(['ACAÍ'], 'açai')).toEqual(['ACAÍ'])
    expect(search(['Açaí'.normalize('NFD')], 'Açaí'.normalize('NFC'))).toHaveLength(1)
    expect(search(['Açaí'.normalize('NFC')], 'Açaí'.normalize('NFD'))).toHaveLength(1)
  })

  // Roteiro da Fase 5, item 2.
  it('"merc" acha "Mercado" e "mercado do bairro" e não acha o que não contém', () => {
    expect(search(['Mercado', 'mercado do bairro', 'Padaria', 'Supermercado'], 'merc')).toEqual([
      'Mercado',
      'mercado do bairro',
      'Supermercado',
    ])
  })

  it('espaços internos da busca contam (não é busca por palavras soltas)', () => {
    expect(search(['mercado do bairro', 'bairro do mercado'], 'do bairro')).toEqual([
      'mercado do bairro',
    ])
    expect(search(['mercado do bairro'], 'mercado  do')).toEqual([])
  })

  it.each(['', ' ', '   ', '\t', ' \n '])('busca %j = sem filtro de texto', (text) => {
    const all = ['Mercado', 'Padaria', '']
    expect(search(all, text)).toEqual(all)
  })
})

// Regressão (RF-03): a chave da tag mantém o comportamento da Fase 3 (os testes de tags.test.ts
// continuam intactos); aqui só a equivalência com a normalização única da D-44(c).
describe('toTagNameKey = foldText + trim (RF-03 / D-44(c))', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const text = `  ${randomText(seed * 31)} `
    it(`semente ${seed}`, () => {
      expect(toTagNameKey(text)).toBe(foldText(text).trim())
      expect(toTagNameKey(toTagNameKey(text))).toBe(toTagNameKey(text))
    })
  }
})
