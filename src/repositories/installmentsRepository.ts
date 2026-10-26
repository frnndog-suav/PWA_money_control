import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import {
  buildInstallmentTransactions,
  installmentsToDelete,
  type InstallmentDeleteScope,
} from '@/domain/installments'
import { installmentInputSchema, type InstallmentInput } from '@/domain/installmentSchema'
import type { InstallmentGroup, Transaction } from '@/domain/types'

// RF-08 — tabela `installmentGroups` e as parcelas (lançamentos com `installmentGroupId`).
// Princípio 7: a interface só chega ao Dexie por aqui; princípio 8 / CA-08.2: grupo e parcelas
// são criados (e excluídos) numa transação só.

/** D-01 — a tag escolhida não existe (ex.: foi excluída em outra aba). */
export class InstallmentTagNotFoundError extends Error {
  constructor(tagId: string) {
    super(`Tag não encontrada: ${tagId}`)
    this.name = 'InstallmentTagNotFoundError'
  }
}

export interface InstallmentPurchase {
  group: InstallmentGroup
  installments: Transaction[]
}

export interface InstallmentGroupDetails {
  group: InstallmentGroup
  /** Parcelas que ainda existem, da 1ª à última. */
  installments: Transaction[]
}

function installmentsOf(groupId: string) {
  return db.transactions.where('installmentGroupId').equals(groupId)
}

function byNumber(a: Transaction, b: Transaction): number {
  return (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0)
}

/**
 * RF-08 / CA-08.1 / CA-08.2 — cria o parcelamento e todas as parcelas de uma vez: ou tudo é
 * gravado, ou nada (a transação desfaz o grupo se uma parcela falhar).
 */
export async function createInstallmentPurchase(
  input: InstallmentInput,
): Promise<InstallmentPurchase> {
  const values = installmentInputSchema.parse(input)
  const now = new Date().toISOString()
  const group: InstallmentGroup = {
    id: crypto.randomUUID(),
    description: values.description,
    tagId: values.tagId,
    totalCents: values.totalCents,
    count: values.count,
    firstDate: values.firstDate,
    createdAt: now,
  }
  const installments: Transaction[] = buildInstallmentTransactions(group).map((draft) => ({
    id: crypto.randomUUID(),
    ...draft,
    createdAt: now,
    updatedAt: now,
  }))
  await db.transaction('rw', [db.tags, db.installmentGroups, db.transactions], async () => {
    if ((await db.tags.where('id').equals(group.tagId).count()) === 0) {
      throw new InstallmentTagNotFoundError(group.tagId)
    }
    await db.installmentGroups.add(group)
    await db.transactions.bulkAdd(installments)
  })
  return { group, installments }
}

/**
 * CA-08.4 — exclui a partir de uma parcela: só esta, esta e as seguintes, ou todas. Sem
 * parcelas restantes, o grupo também sai (não fica parcelamento vazio prendendo a tag — D-02).
 */
export async function deleteInstallments(
  transactionId: string,
  scope: InstallmentDeleteScope,
): Promise<void> {
  await db.transaction('rw', [db.installmentGroups, db.transactions], async () => {
    const from = await db.transactions.get(transactionId)
    if (!from) return
    const groupId = from.installmentGroupId
    if (groupId === null) {
      await db.transactions.delete(transactionId)
      return
    }
    const installments = await installmentsOf(groupId).toArray()
    const removed = installmentsToDelete(installments, from, scope)
    await db.transactions.bulkDelete(removed.map((installment) => installment.id))
    if (removed.length === installments.length) await db.installmentGroups.delete(groupId)
  })
}

/** CA-08.5 — o parcelamento e as parcelas que ainda existem; `null` sem o grupo. */
export async function getInstallmentGroupDetails(
  groupId: string,
): Promise<InstallmentGroupDetails | null> {
  return db.transaction('r', [db.installmentGroups, db.transactions], async () => {
    const group = await db.installmentGroups.get(groupId)
    if (!group) return null
    return { group, installments: (await installmentsOf(groupId).toArray()).sort(byNumber) }
  })
}

// Hooks ao vivo: `undefined` enquanto carrega.

export function useInstallmentGroupDetails(
  groupId: string,
): InstallmentGroupDetails | null | undefined {
  return useLiveQuery(() => getInstallmentGroupDetails(groupId), [groupId])
}

/**
 * RF-08 — número de parcelas do grupo, para exibir "Descrição (k/n)". Só as linhas que são
 * parcela usam (poucas numa lista); `undefined` enquanto carrega ou sem o grupo.
 */
export function useInstallmentCount(groupId: string): number | undefined {
  return useLiveQuery(async () => (await db.installmentGroups.get(groupId))?.count, [groupId])
}
