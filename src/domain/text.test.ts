import { describe, expect, it } from 'vitest'
import { toTagNameKey } from '@/domain/tags'
import { foldText } from '@/domain/text'

// RF-04 / CA-04.2 — busca sem diferenciar maiúsculas e acentos; RF-03 — mesma regra na
// unicidade do nome da tag.

describe('foldText (RF-04 / CA-04.2)', () => {
  it('passa para minúsculas e remove acentos, cedilha e til', () => {
    expect(foldText('Mércado')).toBe('mercado')
    expect(foldText('AÇÚCAR')).toBe('acucar')
    expect(foldText('Pão de Queijo')).toBe('pao de queijo')
    expect(foldText('ÀÁÂÃÄ èéêë ìíîï òóôõö ùúûü ñ')).toBe('aaaaa eeee iiii ooooo uuuu n')
  })

  it('NFC (teclado do iPhone) e NFD dão o mesmo resultado', () => {
    const nfc = 'Feijão'.normalize('NFC')
    const nfd = 'Feijão'.normalize('NFD')
    expect(nfc).not.toBe(nfd)
    expect(foldText(nfc)).toBe(foldText(nfd))
    expect(foldText(nfd)).toBe('feijao')
  })

  it('mantém espaços, números e sinais avulsos (não são acentos de letra)', () => {
    expect(foldText('  Conta 2 ^ ` ´ ¨ · ')).toBe('  conta 2 ^ ` ´ ¨ · ')
  })

  it('é idempotente', () => {
    const once = foldText('Ção É Ü')
    expect(foldText(once)).toBe(once)
  })

  // RF-03 — a chave da tag é a mesma normalização, com trim.
  it('toTagNameKey = foldText + trim', () => {
    expect(toTagNameKey('  Mércado ')).toBe(foldText('Mércado'))
  })
})
