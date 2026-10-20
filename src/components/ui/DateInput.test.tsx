import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DateInput } from '@/components/ui/DateInput'
import { Field } from '@/components/ui/Field'

describe('DateInput', () => {
  // Princípio 2 — o valor do campo já é YYYY-MM-DD local e passa direto, sem virar Date.
  it('mostra e devolve a data como YYYY-MM-DD', () => {
    const onChange = vi.fn<(value: string) => void>()
    render(
      <Field>
        <Field.Label>Data</Field.Label>
        <DateInput value="2026-10-20" onChange={onChange} />
      </Field>,
    )
    const input = screen.getByLabelText<HTMLInputElement>('Data')
    expect(input.type).toBe('date')
    expect(input.value).toBe('2026-10-20')
    fireEvent.change(input, { target: { value: '2026-11-01' } })
    expect(onChange).toHaveBeenCalledWith('2026-11-01')
  })
})
