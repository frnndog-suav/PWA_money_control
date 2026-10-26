import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from '@/components/ui/Field'
import { InfoPopover } from '@/components/ui/InfoPopover'
import { TextInput } from '@/components/ui/TextInput'

// CA-07.8 / Fase 9 — balão "ⓘ" por toque (princípio 15) e linha de ajuda do campo.

function renderPopover() {
  render(
    <div>
      <InfoPopover label="Por que esta data?">Explicação da data.</InfoPopover>
      <p>Fora do balão</p>
    </div>,
  )
  return screen.getByRole('button', { name: 'Por que esta data?' })
}

const balloon = () => screen.getByText('Explicação da data.')

describe('InfoPopover (CA-07.8)', () => {
  it('começa fechado e abre ao tocar, com aria-expanded e aria-controls', () => {
    const button = renderPopover()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(balloon().hidden).toBe(true)

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(balloon().hidden).toBe(false)
    expect(button.getAttribute('aria-controls')).toBe(balloon().id)
  })

  it('fecha ao tocar no ícone de novo', () => {
    const button = renderPopover()
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('fecha ao tocar fora; tocar no próprio balão não fecha', () => {
    const button = renderPopover()
    fireEvent.click(button)
    fireEvent.pointerDown(balloon())
    expect(balloon().hidden).toBe(false)
    fireEvent.pointerDown(screen.getByText('Fora do balão'))
    expect(balloon().hidden).toBe(true)
  })

  it('fecha com Esc (teclado)', () => {
    const button = renderPopover()
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Field.Hint', () => {
  it('a linha de ajuda fica visível e descreve o campo junto com o erro', () => {
    render(
      <Field
        hint="Escolha um dia de novembro de 2026."
        error="A data precisa estar em novembro de 2026."
      >
        <Field.Label>Data</Field.Label>
        <TextInput value="" onChange={() => {}} />
        <Field.Hint />
        <Field.Error />
      </Field>,
    )
    const input = screen.getByLabelText('Data')
    const hint = screen.getByText('Escolha um dia de novembro de 2026.')
    const error = screen.getByText('A data precisa estar em novembro de 2026.')
    expect(input.getAttribute('aria-describedby')).toBe(`${hint.id} ${error.id}`)
  })

  it('sem ajuda nem erro, nada descreve o campo', () => {
    render(
      <Field>
        <Field.Label>Nome</Field.Label>
        <TextInput value="" onChange={() => {}} />
        <Field.Hint />
      </Field>,
    )
    expect(screen.getByLabelText('Nome').getAttribute('aria-describedby')).toBeNull()
  })
})
