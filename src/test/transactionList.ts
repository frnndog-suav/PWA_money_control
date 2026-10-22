import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'
import type { Tag, Transaction } from '@/domain/types'
import { createTag } from '@/repositories/tagsRepository'
import { renderApp } from '@/test/renderApp'
import { seedRecords } from '@/test/seedDatabase'
import { makeTransaction } from '@/test/factories'

// Apoio aos testes da lista de lançamentos (RF-04).

/** O Testing Library normaliza o espaço não separável (D-29) do texto da tela. */
export const text = (value: string) => value.replace(/\s/g, ' ')

export async function openList(initialEntries: string[] = ['/lancamentos']) {
  const router = renderApp(initialEntries)
  await screen.findByRole('heading', { level: 1, name: 'Lançamentos' })
  return router
}

/** Links das linhas da lista (cada lançamento abre `/lancamentos/:id`). */
export function transactionLinks(): HTMLElement[] {
  return screen
    .queryAllByRole('link')
    .filter((link) => /^\/lancamentos\/(?!novo$)/.test(link.getAttribute('href') ?? ''))
}

export async function expectRowCount(count: number): Promise<void> {
  await waitFor(() => expect(transactionLinks()).toHaveLength(count))
}

export function searchInput(): HTMLInputElement {
  return screen.getByLabelText<HTMLInputElement>('Buscar na descrição')
}

export function typeSearch(value: string): void {
  fireEvent.change(searchInput(), { target: { value } })
}

export function openFiltersPanel(): void {
  fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }))
}

export function setDate(label: 'Data inicial' | 'Data final', value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

export async function seedTags(): Promise<{ market: Tag; salary: Tag; health: Tag }> {
  const market = await createTag({ name: 'Mercado', color: '#16A34A' })
  const salary = await createTag({ name: 'Salário', color: '#2563EB' })
  const health = await createTag({ name: 'Saúde', color: '#DC2626' })
  return { market, salary, health }
}

export async function seedTransactions(...items: Partial<Transaction>[]): Promise<Transaction[]> {
  const transactions = items.map((item) => makeTransaction(item))
  await seedRecords({ transactions })
  return transactions
}
