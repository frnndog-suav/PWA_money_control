import { describe, expect, it } from 'vitest'
import {
  exportPasswordSchema,
  importBackupSchema,
  PASSWORD_REQUIRED_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  PASSWORDS_DO_NOT_MATCH_MESSAGE,
} from '@/domain/backupPasswordSchema'

// RF-10 / D-08 — senha do backup com no mínimo 8 caracteres e confirmação.

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe('exportPasswordSchema', () => {
  it('aceita 8 caracteres ou mais com a confirmação igual (espaços contam)', () => {
    expect(
      exportPasswordSchema.safeParse({ password: '12345678', confirmation: '12345678' }).success,
    ).toBe(true)
    expect(
      exportPasswordSchema.safeParse({ password: '  senha  ', confirmation: '  senha  ' }).success,
    ).toBe(true)
  })

  it('recusa menos de 8 caracteres', () => {
    const result = exportPasswordSchema.safeParse({ password: '1234567', confirmation: '1234567' })
    expect(messages(result)).toEqual([PASSWORD_TOO_SHORT_MESSAGE])
    expect(PASSWORD_TOO_SHORT_MESSAGE).toBe('A senha precisa ter pelo menos 8 caracteres')
  })

  it('recusa confirmação diferente, mesmo com a senha curta', () => {
    expect(
      messages(exportPasswordSchema.safeParse({ password: '12345678', confirmation: '12345679' })),
    ).toEqual([PASSWORDS_DO_NOT_MATCH_MESSAGE])
    expect(messages(exportPasswordSchema.safeParse({ password: '123', confirmation: '' }))).toEqual(
      [PASSWORD_TOO_SHORT_MESSAGE, PASSWORDS_DO_NOT_MATCH_MESSAGE],
    )
  })
})

// RF-10 / D-08 / D-48 (a) — auditoria: limite exato, espaços e mensagens.
// A spec diz só "mínimo 8 caracteres"; nada manda descartar espaços, e o schema não faz
// `trim` (espaços fazem parte da senha e da chave derivada).
describe('exportPasswordSchema — auditoria (D-08 / D-48 a)', () => {
  const parse = (password: string, confirmation = password) =>
    exportPasswordSchema.safeParse({ password, confirmation })

  it.each([
    ['7 caracteres', '1234567', false],
    ['8 caracteres', '12345678', true],
    ['vazia', '', false],
    ['7 letras + 1 espaço no fim', 'abcdefg ', true],
    ['1 espaço + 7 letras', ' abcdefg', true],
    ['6 letras entre espaços (8 no total)', ' abcdef ', true],
    ['6 letras + 1 espaço (7 no total)', 'abcdef ', false],
    ['8 espaços', '        ', true],
    ['acentos (8 letras)', 'çãéíõúâê', true],
  ])('%s → válida: %s', (_, password, valid) => {
    const result = parse(password)
    expect(result.success).toBe(valid)
    if (!valid) expect(messages(result)).toEqual([PASSWORD_TOO_SHORT_MESSAGE])
  })

  it('confirmação que difere só por um espaço ou por maiúscula não confere', () => {
    expect(messages(parse('senha-forte', 'senha-forte '))).toEqual([PASSWORDS_DO_NOT_MATCH_MESSAGE])
    expect(messages(parse('senha-forte', 'Senha-forte'))).toEqual([PASSWORDS_DO_NOT_MATCH_MESSAGE])
  })

  it('o erro da confirmação fica no campo "confirmation" e o da senha em "password"', () => {
    const result = parse('123', '')
    expect(result.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['password', 'A senha precisa ter pelo menos 8 caracteres'],
      ['confirmation', 'As senhas não coincidem'],
    ])
  })

  it('mensagens exatas (D-48)', () => {
    expect(PASSWORD_TOO_SHORT_MESSAGE).toBe('A senha precisa ter pelo menos 8 caracteres')
    expect(PASSWORDS_DO_NOT_MATCH_MESSAGE).toBe('As senhas não coincidem')
    expect(PASSWORD_REQUIRED_MESSAGE).toBe('Informe a senha')
  })

  it('a senha é devolvida sem alteração (sem trim)', () => {
    const result = parse('  minha senha  ')
    expect(result.success && result.data.password).toBe('  minha senha  ')
  })
})

describe('importBackupSchema', () => {
  const file = new File(['{}'], 'backup.json')

  it('exige o arquivo e a senha preenchida', () => {
    expect(importBackupSchema.safeParse({ file, password: 'x' }).success).toBe(true)
    expect(messages(importBackupSchema.safeParse({ file, password: '' }))).toEqual([
      PASSWORD_REQUIRED_MESSAGE,
    ])
    expect(messages(importBackupSchema.safeParse({ file: null, password: 'x' }))).toEqual([
      'Escolha o arquivo do backup',
    ])
  })
})
