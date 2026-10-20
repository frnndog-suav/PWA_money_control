import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagPicker } from '@/components/tags/TagPicker'
import { makeTag } from '@/test/factories'

const TAGS = [makeTag({ name: 'A' }), makeTag({ name: 'Mercado' })]

function renderPicker(props: { value?: string; error?: string } = {}) {
  const onChange = vi.fn<(tagId: string) => void>()
  render(
    <TagPicker
      tags={TAGS}
      value={props.value ?? ''}
      onChange={onChange}
      error={props.error}
      emptyState={<p>Nenhuma tag</p>}
    />,
  )
  return onChange
}

describe('TagPicker (RF-01 / D-01)', () => {
  it('uma opção por tag; tocar escolhe a tag', () => {
    const onChange = renderPicker()
    fireEvent.click(screen.getByRole('radio', { name: 'Mercado' }))
    expect(onChange).toHaveBeenCalledWith(TAGS[1].id)
  })

  // RNF-06 — a marcada tem "✓", não só a cor; alvo de toque ≥ 44×44 px mesmo com nome curto.
  it('marca a escolhida com ✓ e garante alvo mínimo de 44 px', () => {
    renderPicker({ value: TAGS[0].id })
    const radio = screen.getByRole<HTMLInputElement>('radio', { name: /A$/ })
    expect(radio.checked).toBe(true)
    const label = radio.closest('label') as HTMLElement
    expect(label.className).toMatch(/\bmin-h-11\b/)
    expect(label.className).toMatch(/\bmin-w-11\b/)
    expect(label.textContent).toContain('✓')
  })

  // ARIA 1.2 — sem aria-invalid no <fieldset>; o erro fica ligado pelo aria-describedby.
  it('liga o erro ao grupo por aria-describedby, sem aria-invalid', () => {
    renderPicker({ error: 'Escolha uma tag' })
    const group = screen.getByRole('group', { name: 'Tag' })
    expect(group.hasAttribute('aria-invalid')).toBe(false)
    expect(group.getAttribute('aria-describedby')).toBe(screen.getByText('Escolha uma tag').id)
  })

  it('sem erro, o grupo não aponta para mensagem nenhuma', () => {
    renderPicker()
    expect(screen.getByRole('group', { name: 'Tag' }).hasAttribute('aria-describedby')).toBe(false)
  })
})
