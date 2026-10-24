import { describe, expect, it } from 'vitest'
import { formatMoneyTick, moneyAxis } from '@/features/charts/chart/moneyAxis'

// RF-06 — eixo Y em centavos. O Chart.js gera marcas fracionárias quando a faixa é pequena
// (saldo constante em zero vira −0,8, −0,6…, 0, 0,2…): o rótulo não pode derrubar o gráfico.
const text = (value: string) => value.replace(/\s/g, ' ')

describe('formatMoneyTick (RF-06)', () => {
  it('aceita marcas fracionárias, arredondando para o centavo', () => {
    expect(text(formatMoneyTick(-0.8))).toBe('−R$ 0')
    expect(text(formatMoneyTick(0.2))).toBe('R$ 0')
    expect(text(formatMoneyTick(0.5))).toBe('R$ 0')
    expect(text(formatMoneyTick(49.6))).toBe('R$ 0,5')
  })

  it('aceita o valor em texto, como o Chart.js às vezes entrega', () => {
    expect(text(formatMoneyTick('123456'))).toBe('R$ 1,2 mil')
  })

  it('o eixo pede passo inteiro e usa as cores do tema', () => {
    const colors = { grid: '#111111', text: '#222222' } as Parameters<typeof moneyAxis>[0]
    expect(moneyAxis(colors, { beginAtZero: true })).toEqual({
      beginAtZero: true,
      grid: { color: '#111111' },
      border: { display: false },
      ticks: { color: '#222222', precision: 0, callback: formatMoneyTick },
    })
  })
})
