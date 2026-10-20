import { describe, expect, it } from 'vitest'
import { tagInputSchema } from '@/domain/tagSchema'
import { TAG_NAME_MAX_LENGTH } from '@/domain/tags'

// RF-03 — validação do formulário e do repositório de tags.

describe('tagInputSchema (RF-03)', () => {
  const validColor = '#16A34A'

  it.each([
    ['', false],
    ['   ', false],
    ['a', true],
    ['a'.repeat(TAG_NAME_MAX_LENGTH), true],
    ['a'.repeat(TAG_NAME_MAX_LENGTH + 1), false],
  ])('nome com %j → válido: %s (limites 0, 1, 30 e 31)', (name, isValid) => {
    expect(tagInputSchema.safeParse({ name, color: validColor }).success).toBe(isValid)
  })

  it('conta o tamanho depois de remover os espaços das pontas', () => {
    const name = `  ${'a'.repeat(TAG_NAME_MAX_LENGTH)}  `
    const result = tagInputSchema.parse({ name, color: validColor })
    expect(result.name).toBe('a'.repeat(TAG_NAME_MAX_LENGTH))
  })

  it('mensagens de erro em pt-BR', () => {
    const empty = tagInputSchema.safeParse({ name: ' ', color: 'verde' })
    expect(empty.error?.issues.map((issue) => issue.message)).toEqual([
      'Informe o nome da tag',
      'Escolha uma cor',
    ])
    const long = tagInputSchema.safeParse({ name: 'a'.repeat(31), color: validColor })
    expect(long.error?.issues[0].message).toBe('O nome pode ter no máximo 30 caracteres')
  })

  it.each(['#16a34a', '#16A34A'])('aceita %s e grava em maiúsculas', (color) => {
    expect(tagInputSchema.parse({ name: 'Mercado', color }).color).toBe('#16A34A')
  })

  it.each(['', '16A34A', '#16A34', '#16A34AFF', '#GGGGGG', 'green'])('recusa a cor %j', (color) => {
    expect(tagInputSchema.safeParse({ name: 'Mercado', color }).success).toBe(false)
  })
})

describe('tagInputSchema — limites e mensagens (RF-03 / CA-01.2)', () => {
  const color = '#16A34A'
  const messages = (input: { name: string; color: string }) =>
    tagInputSchema.safeParse(input).error?.issues.map((issue) => issue.message) ?? []

  it.each([
    ['0 caracteres', '', ['Informe o nome da tag']],
    ['só espaços', '     ', ['Informe o nome da tag']],
    ['1 caractere depois do trim', '   a   ', []],
    ['30 caracteres depois do trim', `   ${'b'.repeat(30)}   `, []],
    [
      '31 caracteres depois do trim',
      `   ${'b'.repeat(31)}   `,
      ['O nome pode ter no máximo 30 caracteres'],
    ],
  ])('nome com %s → erros %j', (_label, name, expected) => {
    expect(messages({ name, color })).toEqual(expected)
  })

  it('30 letras acentuadas na forma composta (a que o teclado do iPhone gera) são aceitas', () => {
    const name = 'á'.repeat(30).normalize('NFC')
    expect(tagInputSchema.parse({ name, color }).name).toBe(name)
  })

  it.each([
    ['#rrggbb minúsculo', '#0d9488', '#0D9488'],
    ['#RRGGBB maiúsculo', '#0D9488', '#0D9488'],
    ['#RrGgBb misto', '#0d94Aa', '#0D94AA'],
  ])('cor %s é aceita e gravada em maiúsculas', (_label, input, stored) => {
    expect(tagInputSchema.parse({ name: 'X', color: input }).color).toBe(stored)
  })

  it.each([
    ['#RGB (3 dígitos)', '#1A3'],
    ['#rgb minúsculo', '#fff'],
    ['sem #', '0D9488'],
    ['caractere não hexadecimal', '#0D948G'],
    ['caracteres não hexadecimais minúsculos', '#zzzzzz'],
    ['espaço no meio', '#0D 488'],
    ['espaço nas pontas', ' #0D9488 '],
    ['#RRGGBBAA', '#0D9488FF'],
    ['nome de cor', 'red'],
  ])('cor %s (%j) é recusada com "Escolha uma cor"', (_label, input) => {
    expect(messages({ name: 'X', color: input })).toEqual(['Escolha uma cor'])
  })

  it('nome e cor inválidos ao mesmo tempo trazem as duas mensagens, cada uma no seu campo', () => {
    const result = tagInputSchema.safeParse({ name: '', color: '#12' })
    expect(result.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['name', 'Informe o nome da tag'],
      ['color', 'Escolha uma cor'],
    ])
  })

  it('o nome é gravado sem os espaços das pontas, com os do meio e com a caixa digitada', () => {
    expect(tagInputSchema.parse({ name: '  Casa  e Lar ', color }).name).toBe('Casa  e Lar')
  })
})
