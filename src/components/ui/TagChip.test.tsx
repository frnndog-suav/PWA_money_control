import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TagChip } from '@/components/ui/TagChip'

// jsdom devolve as cores do style em rgb().
describe('TagChip (CA-03.6)', () => {
  it('fundo na cor da tag e texto branco sobre cor escura', () => {
    render(<TagChip name="Salário" color="#1D4ED8" />)
    const chip = screen.getByText('Salário').parentElement as HTMLElement
    expect(chip.style.backgroundColor).toBe('rgb(29, 78, 216)')
    expect(chip.style.color).toBe('rgb(255, 255, 255)')
  })

  it('texto preto sobre cor clara', () => {
    render(<TagChip name="Lazer" color="#FACC15" />)
    const chip = screen.getByText('Lazer').parentElement as HTMLElement
    expect(chip.style.color).toBe('rgb(0, 0, 0)')
  })

  // RNF-06 — a cor nunca é a única informação: o nome está sempre escrito.
  it('mostra o nome como texto', () => {
    render(<TagChip name="Mercado" color="#16A34A" />)
    expect(screen.getByText('Mercado')).toBeDefined()
  })
})

describe('TagChip — nome longo', () => {
  const longName = 'a'.repeat(30)

  it('padrão: uma linha com reticências', () => {
    render(<TagChip name={longName} color="#16A34A" />)
    expect(screen.getByText(longName).className).toContain('truncate')
  })

  // CA-03.5 — na lista o nome aparece inteiro, quebrando a linha.
  it('overflow="wrap": quebra a linha em vez de cortar', () => {
    render(<TagChip name={longName} color="#16A34A" overflow="wrap" />)
    const name = screen.getByText(longName)
    expect(name.className).toContain('wrap-anywhere')
    expect(name.className).not.toContain('truncate')
  })
})
