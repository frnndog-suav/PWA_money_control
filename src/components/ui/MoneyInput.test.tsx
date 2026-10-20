import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Field } from '@/components/ui/Field'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { digitsToCents, formatBRL } from '@/domain/money'
import { createTestRandom } from '@/test/propertyHelpers'

// "R$" e o número são separados por espaço não separável (D-29).
const brl = (text: string) => text.replace(' ', ' ')

// Último valor entregue pelo campo (onChange).
let lastCents = 0
const recordCents = (cents: number) => {
  lastCents = cents
}

function Harness({ initial = 0, error }: { initial?: number; error?: string }) {
  const [cents, setCents] = useState(initial)
  return (
    <Field error={error}>
      <Field.Label>Valor</Field.Label>
      <MoneyInput
        value={cents}
        onChange={(next) => {
          recordCents(next)
          setCents(next)
        }}
      />
      <Field.Error />
    </Field>
  )
}

function renderMoneyInput(props: { initial?: number; error?: string } = {}) {
  lastCents = props.initial ?? 0
  render(<Harness {...props} />)
  return screen.getByLabelText<HTMLInputElement>('Valor')
}

// Simula o teclado: o navegador acrescenta o dígito no fim do texto atual (cursor no fim).
function typeDigits(input: HTMLInputElement, digits: string) {
  for (const digit of digits) {
    fireEvent.change(input, { target: { value: input.value + digit } })
  }
}

function pressBackspace(input: HTMLInputElement) {
  fireEvent.change(input, { target: { value: input.value.slice(0, -1) } })
}

describe('MoneyInput', () => {
  // CA-01.3 — os dígitos entram pela direita.
  it('1, 9, 9, 9 → "R$ 19,99" e valor interno 1999', () => {
    const input = renderMoneyInput()
    const steps = [
      ['1', 'R$ 0,01', 1],
      ['9', 'R$ 0,19', 19],
      ['9', 'R$ 1,99', 199],
      ['9', 'R$ 19,99', 1999],
    ] as const
    for (const [digit, text, cents] of steps) {
      typeDigits(input, digit)
      expect(input.value).toBe(brl(text))
      expect(lastCents).toBe(cents)
    }
  })

  // CA-01.4 — teclado numérico no iPhone.
  it('abre o teclado numérico (inputMode="numeric")', () => {
    const input = renderMoneyInput()
    expect(input.inputMode).toBe('numeric')
    expect(input.type).toBe('text')
  })

  it('vazio quando o valor é zero, com "R$ 0,00" de exemplo', () => {
    const input = renderMoneyInput()
    expect(input.value).toBe('')
    expect(input.placeholder).toBe(brl('R$ 0,00'))
  })

  it('apagar remove o último dígito, até esvaziar', () => {
    const input = renderMoneyInput({ initial: 1999 })
    pressBackspace(input)
    expect(input.value).toBe(brl('R$ 1,99'))
    expect(lastCents).toBe(199)
    pressBackspace(input)
    pressBackspace(input)
    expect(input.value).toBe(brl('R$ 0,01'))
    pressBackspace(input)
    expect(input.value).toBe('')
    expect(lastCents).toBe(0)
  })

  it('colar aproveita só os dígitos do texto colado', () => {
    const input = renderMoneyInput()
    fireEvent.change(input, { target: { value: 'R$ 1.234,56 (mercado)' } })
    expect(input.value).toBe(brl('R$ 1.234,56'))
    expect(lastCents).toBe(123456)
  })

  it('selecionar tudo e digitar substitui o valor', () => {
    const input = renderMoneyInput({ initial: 1999 })
    fireEvent.change(input, { target: { value: '5' } })
    expect(lastCents).toBe(5)
  })

  it('ignora o que não é dígito', () => {
    const input = renderMoneyInput({ initial: 1999 })
    fireEvent.change(input, { target: { value: `${input.value}a` } })
    expect(input.value).toBe(brl('R$ 19,99'))
    expect(lastCents).toBe(1999)
  })

  // D-31 — no máximo 10 dígitos (R$ 99.999.999,99, o teto do RF-01).
  it('limite de 10 dígitos: o 11º é ignorado', () => {
    const input = renderMoneyInput()
    typeDigits(input, '9999999999')
    expect(input.value).toBe(brl('R$ 99.999.999,99'))
    expect(lastCents).toBe(9_999_999_999)
    typeDigits(input, '1')
    expect(input.value).toBe(brl('R$ 99.999.999,99'))
    expect(lastCents).toBe(9_999_999_999)
  })

  it('zeros à esquerda colados não contam no limite', () => {
    const input = renderMoneyInput()
    fireEvent.change(input, { target: { value: '0000000000001234' } })
    expect(lastCents).toBe(1234)
  })

  it('mantém o cursor no fim do texto', () => {
    const input = renderMoneyInput({ initial: 1999 })
    input.focus()
    input.setSelectionRange(2, 2)
    fireEvent.select(input)
    expect(input.selectionStart).toBe(input.value.length)
    typeDigits(input, '1')
    expect(input.selectionStart).toBe(input.value.length)
  })

  it('respeita uma seleção de verdade (ex.: selecionar tudo)', () => {
    const input = renderMoneyInput({ initial: 1999 })
    input.focus()
    input.setSelectionRange(0, input.value.length)
    fireEvent.select(input)
    expect(input.selectionStart).toBe(0)
  })

  // RNF-06 — rótulo associado e erro anunciado com o campo.
  it('liga o erro ao campo por aria-describedby', () => {
    const input = renderMoneyInput({ error: 'Informe um valor maior que zero' })
    const error = screen.getByText('Informe um valor maior que zero')
    expect(input.getAttribute('aria-describedby')).toBe(error.id)
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })
})

// Auditoria da Fase 4 — máscara do CA-01.3 / D-31, casos que faltavam.
describe('MoneyInput — máscara (CA-01.3 / D-31)', () => {
  it('zeros digitados à esquerda não mudam o valor: 0, 0, 5 → "R$ 0,05" / 5', () => {
    const input = renderMoneyInput()
    typeDigits(input, '0')
    expect(input.value).toBe('')
    expect(lastCents).toBe(0)
    typeDigits(input, '0')
    expect(input.value).toBe('')
    typeDigits(input, '5')
    expect(input.value).toBe(brl('R$ 0,05'))
    expect(lastCents).toBe(5)
  })

  it('zero no meio e no fim conta: 1, 0, 0, 0, 0 → "R$ 100,00" / 10000', () => {
    const input = renderMoneyInput()
    typeDigits(input, '10000')
    expect(input.value).toBe(brl('R$ 100,00'))
    expect(lastCents).toBe(10000)
  })

  it('11º dígito ignorado mesmo depois de zeros à esquerda', () => {
    const input = renderMoneyInput()
    typeDigits(input, '001234567890')
    expect(input.value).toBe(brl('R$ 12.345.678,90'))
    expect(lastCents).toBe(1_234_567_890)
    typeDigits(input, '5')
    expect(input.value).toBe(brl('R$ 12.345.678,90'))
    expect(lastCents).toBe(1_234_567_890)
  })

  it.each([
    ['abc12x3', 123, 'R$ 1,23'],
    ['R$ 19,99', 1999, 'R$ 19,99'],
    ['  1.000,00 reais', 100000, 'R$ 1.000,00'],
    ['-45,90', 4590, 'R$ 45,90'],
    ['12345678901', 1_234_567_890, 'R$ 12.345.678,90'],
    ['texto sem dígitos', 0, ''],
  ])('colar %j → %d (%j)', (pasted, cents, text) => {
    const input = renderMoneyInput()
    fireEvent.change(input, { target: { value: pasted } })
    expect(lastCents).toBe(cents)
    expect(input.value).toBe(brl(text))
  })

  it('apagar tudo de um valor com 10 dígitos volta a vazio e 0', () => {
    const input = renderMoneyInput()
    typeDigits(input, '9999999999')
    for (let i = 0; i < 10; i++) pressBackspace(input)
    expect(input.value).toBe('')
    expect(lastCents).toBe(0)
    pressBackspace(input)
    expect(input.value).toBe('')
    expect(lastCents).toBe(0)
  })

  it('o valor entregue é sempre um inteiro seguro (princípio 1)', () => {
    const input = renderMoneyInput()
    typeDigits(input, '9999999999')
    expect(Number.isSafeInteger(lastCents)).toBe(true)
  })

  // Propriedade: para sequências de até 10 dígitos, o valor interno é o de digitsToCents e o
  // texto é o formatBRL dele (vazio quando zero).
  it('propriedade: digitar até 10 dígitos dá digitsToCents e formatBRL', () => {
    const random = createTestRandom(20261020)
    for (let run = 0; run < 150; run++) {
      const length = random.int(1, 10)
      // Zeros com mais chance, para cobrir zeros à esquerda.
      const digits = Array.from({ length }, () =>
        random.next() < 0.3 ? '0' : String(random.int(0, 9)),
      ).join('')
      const input = renderMoneyInput()
      typeDigits(input, digits)
      const expected = digitsToCents(digits)
      expect(lastCents, digits).toBe(expected)
      expect(input.value, digits).toBe(expected === 0 ? '' : formatBRL(expected))
      cleanup()
    }
  })
})
