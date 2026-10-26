import { addMonthsClamped } from '@/domain/dates'
import type { Cents, DateString, InstallmentGroup, Transaction } from '@/domain/types'

// §6.5 / RF-08 — compras parceladas, só para saídas (D-06). Funções puras (princípio 6): o
// repositório cria o grupo e as parcelas numa transação só (CA-08.2).

/** RF-08 — número de parcelas aceito. */
export const MIN_INSTALLMENTS = 2
export const MAX_INSTALLMENTS = 48

/** Os campos de uma parcela que o domínio decide (o repositório põe id e datas de criação). */
export type InstallmentDraft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>

/** RF-08 — o que excluir a partir de uma parcela (CA-08.4). */
export type InstallmentDeleteScope = 'one' | 'following' | 'all'

function assertCount(count: number): void {
  if (!Number.isInteger(count) || count < MIN_INSTALLMENTS || count > MAX_INSTALLMENTS) {
    throw new RangeError(`Número de parcelas inválido: ${count}`)
  }
}

/**
 * RF-08 / CA-08.1 — `floor(total / n)` em cada parcela e o resto dos centavos na 1ª: a soma é
 * sempre igual ao total. Cada parcela precisa ter pelo menos 1 centavo.
 */
export function splitInstallments(totalCents: Cents, count: number): Cents[] {
  assertCount(count)
  if (!Number.isSafeInteger(totalCents) || totalCents < count) {
    throw new RangeError(`Total inválido para ${count} parcelas: ${totalCents}`)
  }
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base))
}

/**
 * §6.5 / CA-08.1 — as parcelas do grupo: a parcela k cai no mesmo dia da primeira, k−1 meses
 * depois (último dia do mês quando o dia não existe), com a descrição base (o "(k/n)" é só
 * exibição) e o vínculo com o grupo.
 */
export function buildInstallmentTransactions(
  group: Pick<
    InstallmentGroup,
    'id' | 'description' | 'tagId' | 'totalCents' | 'count' | 'firstDate'
  >,
): InstallmentDraft[] {
  return splitInstallments(group.totalCents, group.count).map((amountCents, index) => ({
    type: 'expense',
    amountCents,
    date: addMonthsClamped(group.firstDate, index),
    description: group.description,
    tagId: group.tagId,
    recurringId: null,
    recurringPeriod: null,
    installmentGroupId: group.id,
    installmentNumber: index + 1,
  }))
}

/** RF-08 — `"Notebook (2/12)"`; lançamentos que não são parcela ficam como estão. */
export function displayDescription(
  transaction: Pick<Transaction, 'description' | 'installmentNumber'>,
  installmentCount: number | undefined,
): string {
  if (transaction.installmentNumber === null || installmentCount === undefined) {
    return transaction.description
  }
  return `${transaction.description} (${transaction.installmentNumber}/${installmentCount})`
}

/**
 * CA-08.5 / D-53 — quantas parcelas do plano têm data até hoje (inclusive), como os "Últimos
 * lançamentos" (D-40). Conta pelas datas do plano (1ª data + k−1 meses): editar ou excluir uma
 * parcela não muda quantas já passaram.
 */
export function countPassedInstallments(
  group: Pick<InstallmentGroup, 'count' | 'firstDate'>,
  today: DateString,
): number {
  let passed = 0
  for (let index = 0; index < group.count; index++) {
    if (addMonthsClamped(group.firstDate, index) > today) break
    passed++
  }
  return passed
}

/** CA-08.4 — as parcelas que saem: só esta, esta e as seguintes (pelo número), ou todas. */
export function installmentsToDelete<T extends Pick<Transaction, 'id' | 'installmentNumber'>>(
  installments: readonly T[],
  from: T,
  scope: InstallmentDeleteScope,
): T[] {
  if (scope === 'one') return installments.filter((installment) => installment.id === from.id)
  if (scope === 'all') return [...installments]
  const fromNumber = from.installmentNumber ?? 0
  return installments.filter((installment) => (installment.installmentNumber ?? 0) >= fromNumber)
}
