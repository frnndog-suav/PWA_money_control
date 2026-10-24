import { describe, expect, it } from 'vitest'
import { formatCompactBRL } from '@/domain/money'

// RF-06 — valores do eixo dos gráficos. O Testing Library não entra aqui: compara o texto com
// o espaço não separável do pt-BR normalizado.
const text = (value: string) => value.replace(/\s/g, ' ')

describe('formatCompactBRL (RF-06)', () => {
  it.each([
    [0, 'R$ 0'],
    [50, 'R$ 0,5'],
    [5000, 'R$ 50'],
    [100000, 'R$ 1 mil'],
    [123456, 'R$ 1,2 mil'],
    [250000000, 'R$ 2,5 mi'],
    [-250000000, '−R$ 2,5 mi'], // sinal de menos tipográfico, como no CA-02.1
  ])('%d centavos → %s', (cents, expected) => {
    expect(text(formatCompactBRL(cents))).toBe(expected)
  })

  it('recusa valores que não são centavos inteiros', () => {
    expect(() => formatCompactBRL(1.5)).toThrow(RangeError)
  })
})
