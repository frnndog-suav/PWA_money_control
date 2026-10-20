import { describe, expect, it } from 'vitest'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'

const BASE = { isValid: false, isSubmitting: false, isDirty: false, errors: {} }

// princípio 16 / D-36
describe('canSubmitForm', () => {
  it('só permite enviar com o formulário válido e fora do envio', () => {
    expect(canSubmitForm({ ...BASE, isValid: true })).toBe(true)
    expect(canSubmitForm(BASE)).toBe(false)
    expect(canSubmitForm({ ...BASE, isValid: true, isSubmitting: true })).toBe(false)
    expect(canSubmitForm({ ...BASE, isSubmitting: true })).toBe(false)
  })

  it('valores iniciais válidos e intocados permitem enviar antes de o RHF calcular isValid', () => {
    expect(canSubmitForm(BASE, { startsValid: true })).toBe(true)
    expect(canSubmitForm({ ...BASE, isDirty: true }, { startsValid: true })).toBe(false)
    expect(
      canSubmitForm(
        { ...BASE, errors: { name: { type: 'x', message: 'erro' } } },
        { startsValid: true },
      ),
    ).toBe(false)
    expect(canSubmitForm({ ...BASE, isSubmitting: true }, { startsValid: true })).toBe(false)
  })

  it('valida enquanto o usuário digita', () => {
    expect(LIVE_VALIDATION.mode).toBe('onChange')
  })
})
