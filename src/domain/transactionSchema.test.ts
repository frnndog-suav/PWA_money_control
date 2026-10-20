import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import { DESCRIPTION_MAX_LENGTH, transactionInputSchema } from '@/domain/transactionSchema'

// RF-01 — validação do formulário e do repositório de lançamentos.

const VALID = {
  type: 'expense',
  amountCents: 1999,
  date: '2026-10-20',
  tagId: 'tag-1',
  description: 'Mercado',
} as const

function messagesFor(input: Record<string, unknown>): string[] {
  const result = transactionInputSchema.safeParse({ ...VALID, ...input })
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe('transactionInputSchema (RF-01)', () => {
  it('aceita um lançamento válido e tira os espaços das pontas da descrição', () => {
    expect(transactionInputSchema.parse({ ...VALID, description: '  Mercado  ' })).toEqual(VALID)
  })

  it.each(['income', 'expense'])('tipo %s é válido', (type) => {
    expect(transactionInputSchema.safeParse({ ...VALID, type }).success).toBe(true)
  })

  it('tipo desconhecido é recusado', () => {
    expect(messagesFor({ type: 'transfer' })).toEqual(['Escolha Saída ou Entrada'])
  })

  // RF-01 — valor > 0 e ≤ 9.999.999.999 centavos.
  it.each([
    [0, false],
    [1, true],
    [MAX_AMOUNT_CENTS, true],
    [MAX_AMOUNT_CENTS + 1, false],
    [10.5, false],
    [-100, false],
  ])('valor %d → válido: %s', (amountCents, isValid) => {
    expect(transactionInputSchema.safeParse({ ...VALID, amountCents }).success).toBe(isValid)
  })

  it('mensagens de valor em pt-BR', () => {
    expect(messagesFor({ amountCents: 0 })).toEqual(['Informe um valor maior que zero'])
    expect(messagesFor({ amountCents: MAX_AMOUNT_CENTS + 1 })).toEqual([
      'O valor máximo é R$ 99.999.999,99',
    ])
    expect(messagesFor({ amountCents: 1.5 })).toEqual(['Informe o valor'])
    expect(messagesFor({ amountCents: 'abc' })).toEqual(['Informe o valor'])
  })

  // RF-01 — data passada ou futura, sempre YYYY-MM-DD existente.
  it.each([
    ['2020-01-01', true],
    ['2099-12-31', true],
    ['2028-02-29', true],
    ['', false],
    ['2026-02-30', false],
    ['20/10/2026', false],
  ])('data %j → válida: %s', (date, isValid) => {
    expect(transactionInputSchema.safeParse({ ...VALID, date }).success).toBe(isValid)
  })

  it('mensagem de data em pt-BR', () => {
    expect(messagesFor({ date: '' })).toEqual(['Informe a data'])
  })

  // D-01 — exatamente uma tag.
  it('tag obrigatória', () => {
    expect(messagesFor({ tagId: '' })).toEqual(['Escolha uma tag'])
  })

  // D-10 — 1 a 100 caracteres depois de tirar os espaços das pontas.
  it.each([
    ['', false],
    ['   ', false],
    ['a', true],
    ['a'.repeat(DESCRIPTION_MAX_LENGTH), true],
    [`  ${'a'.repeat(DESCRIPTION_MAX_LENGTH)}  `, true],
    ['a'.repeat(DESCRIPTION_MAX_LENGTH + 1), false],
  ])('descrição %j → válida: %s', (description, isValid) => {
    expect(transactionInputSchema.safeParse({ ...VALID, description }).success).toBe(isValid)
  })

  it('mensagens de descrição em pt-BR', () => {
    expect(messagesFor({ description: ' ' })).toEqual(['Informe a descrição'])
    expect(messagesFor({ description: 'a'.repeat(101) })).toEqual([
      'A descrição pode ter no máximo 100 caracteres',
    ])
  })
})

// Auditoria da Fase 4 — casos-limite do RF-01 que faltavam, com as mensagens exatas.
describe('transactionInputSchema — casos-limite (RF-01 / D-10)', () => {
  // RF-01 — "Padrão: Saída" é do formulário (HomePage.test.tsx); no schema o tipo é obrigatório.
  it('tipo ausente é recusado com a mensagem do tipo', () => {
    expect(messagesFor({ type: undefined })).toEqual(['Escolha Saída ou Entrada'])
  })

  // RF-01 — valor > 0, inteiro, ≤ 9.999.999.999.
  it.each([
    [-1, 'Informe um valor maior que zero'],
    [-MAX_AMOUNT_CENTS, 'Informe um valor maior que zero'],
    [0.5, 'Informe o valor'],
    [MAX_AMOUNT_CENTS + 0.5, 'Informe o valor'],
    [Number.NaN, 'Informe o valor'],
    [Number.POSITIVE_INFINITY, 'Informe o valor'],
  ])('valor %d → mensagem %j', (amountCents, message) => {
    expect(messagesFor({ amountCents })[0]).toBe(message)
  })

  it('valor ausente → "Informe o valor"', () => {
    expect(messagesFor({ amountCents: undefined })).toEqual(['Informe o valor'])
  })

  it('valores aceitos são inteiros seguros (princípio 1)', () => {
    for (const amountCents of [1, 1999, MAX_AMOUNT_CENTS]) {
      const parsed = transactionInputSchema.parse({ ...VALID, amountCents })
      expect(Number.isSafeInteger(parsed.amountCents)).toBe(true)
      expect(parsed.amountCents).toBe(amountCents)
    }
  })

  // RF-01 — data YYYY-MM-DD que existe no calendário.
  it.each([
    ['2026-02-30', 'Informe a data'],
    ['2026-13-01', 'Informe a data'],
    ['2026-02-29', 'Informe a data'],
    ['2026-00-10', 'Informe a data'],
    ['2026-10-32', 'Informe a data'],
    ['2026-10-00', 'Informe a data'],
    ['2026-10-20T00:00', 'Informe a data'],
    [' 2026-10-20', 'Informe a data'],
  ])('data inválida %j → %j', (date, message) => {
    expect(messagesFor({ date })).toEqual([message])
  })

  it.each(['2028-02-29', '2024-02-29', '2000-02-29', '2026-12-31', '2027-01-01'])(
    'data %s (bissexto / virada de ano) é válida',
    (date) => {
      expect(transactionInputSchema.parse({ ...VALID, date }).date).toBe(date)
    },
  )

  it('data ausente é recusada', () => {
    expect(transactionInputSchema.safeParse({ ...VALID, date: undefined }).success).toBe(false)
  })

  // D-01 — exatamente uma tag.
  it('tag ausente é recusada', () => {
    expect(transactionInputSchema.safeParse({ ...VALID, tagId: undefined }).success).toBe(false)
  })

  // D-10 — 0, 1, 100 e 101 caracteres depois do trim.
  it.each([
    ['  a  ', 'a'],
    [`\t${'b'.repeat(100)}\n`, 'b'.repeat(100)],
    ['  Mercado  do  bairro ', 'Mercado  do  bairro'],
  ])('descrição %j é gravada como %j', (description, stored) => {
    expect(transactionInputSchema.parse({ ...VALID, description }).description).toBe(stored)
  })

  it.each([
    ['', 'Informe a descrição'],
    ['     ', 'Informe a descrição'],
    ['\t\n ', 'Informe a descrição'],
    [`  ${'c'.repeat(101)}  `, 'A descrição pode ter no máximo 100 caracteres'],
  ])('descrição %j → %j', (description, message) => {
    expect(messagesFor({ description })).toEqual([message])
  })

  it('vários campos inválidos → uma mensagem por campo, na ordem do formulário', () => {
    const result = transactionInputSchema.safeParse({
      type: 'x',
      amountCents: 0,
      date: '2026-02-30',
      tagId: '',
      description: ' ',
    })
    expect(result.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['type', 'Escolha Saída ou Entrada'],
      ['amountCents', 'Informe um valor maior que zero'],
      ['date', 'Informe a data'],
      ['tagId', 'Escolha uma tag'],
      ['description', 'Informe a descrição'],
    ])
  })
})
