import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'vitest'

// Ações do formulário de lançamento (RF-01) usadas nos testes de tela.

type Scope = HTMLElement | undefined

const query = (scope: Scope) => (scope ? within(scope) : screen)

export function amountInput(scope?: Scope): HTMLInputElement {
  return query(scope).getByLabelText<HTMLInputElement>('Valor')
}

export function dateInput(scope?: Scope): HTMLInputElement {
  return query(scope).getByLabelText<HTMLInputElement>('Data')
}

export function descriptionInput(scope?: Scope): HTMLInputElement {
  return query(scope).getByLabelText<HTMLInputElement>('Descrição')
}

export function submitButton(name: 'Lançar' | 'Salvar', scope?: Scope): HTMLButtonElement {
  return query(scope).getByRole<HTMLButtonElement>('button', { name })
}

/** Digita os dígitos um a um, como o teclado numérico (CA-01.3). */
export function typeAmount(digits: string, scope?: Scope): void {
  const input = amountInput(scope)
  for (const digit of digits) {
    fireEvent.change(input, { target: { value: input.value + digit } })
  }
}

export function clearAmount(scope?: Scope): void {
  fireEvent.change(amountInput(scope), { target: { value: '' } })
}

export function chooseType(label: 'Saída' | 'Entrada', scope?: Scope): void {
  fireEvent.click(query(scope).getByRole('radio', { name: label }))
}

export function chooseDate(date: string, scope?: Scope): void {
  fireEvent.change(dateInput(scope), { target: { value: date } })
}

export async function chooseTag(name: string, scope?: Scope): Promise<void> {
  fireEvent.click(await query(scope).findByRole('radio', { name }))
}

export function typeDescription(text: string, scope?: Scope): void {
  fireEvent.change(descriptionInput(scope), { target: { value: text } })
}

interface FillOptions {
  type?: 'Saída' | 'Entrada'
  digits: string
  date?: string
  tag: string
  description: string
}

export async function fillTransactionForm(options: FillOptions, scope?: Scope): Promise<void> {
  if (options.type) chooseType(options.type, scope)
  typeAmount(options.digits, scope)
  if (options.date) chooseDate(options.date, scope)
  await chooseTag(options.tag, scope)
  typeDescription(options.description, scope)
}

/** Princípio 16 — espera o botão habilitar (a validação é assíncrona) e toca nele. */
export async function submit(name: 'Lançar' | 'Salvar', scope?: Scope): Promise<void> {
  const button = submitButton(name, scope)
  await waitFor(() => expect(button.disabled).toBe(false))
  fireEvent.click(button)
}

export async function expectSubmitEnabled(
  name: 'Lançar' | 'Salvar',
  isEnabled: boolean,
  scope?: Scope,
): Promise<void> {
  await waitFor(() => expect(submitButton(name, scope).disabled).toBe(!isEnabled))
}
