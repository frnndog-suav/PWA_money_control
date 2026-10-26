import { screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import type { RecurringInput } from '@/domain/recurringSchema'
import type { Recurring, Tag } from '@/domain/types'
import { createRecurring } from '@/repositories/recurringsRepository'
import { createTag } from '@/repositories/tagsRepository'

// Apoio aos testes de tela de recorrentes (RF-07).

/** "Hoje" dos testes: 24/10/2026, sábado. Só o Date é falso (os timers continuam reais). */
export const TODAY = new Date(2026, 9, 24, 10, 0)

export function freezeToday(date: Date = TODAY): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(date)
}

export async function seedLightBill(
  overrides: Partial<RecurringInput> = {},
): Promise<{ tag: Tag; light: Recurring }> {
  const tag = await createTag({ name: 'Casa', color: '#16A34A' })
  const light = await createRecurring({
    type: 'expense',
    description: 'Conta de luz',
    tagId: tag.id,
    amountCents: 18000,
    startPeriod: '2026-10',
    endPeriod: '',
    ...overrides,
  })
  return { tag, light }
}

/** O modal aberto (`<dialog open>`), para procurar só dentro dele. */
export async function openDialog(name: string | RegExp): Promise<HTMLElement> {
  return screen.findByRole('dialog', { name })
}

/** Seção "Recorrentes pendentes" da tela. */
export function pendingSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Recorrentes pendentes' })
}

export function pendingItems(): HTMLElement[] {
  return within(pendingSection()).getAllByRole('listitem')
}
