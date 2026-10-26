import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { createBackupFile, openBackupFile, restoreBackup } from '@/repositories/backupRepository'
import {
  createInstallmentPurchase,
  deleteInstallments,
  getInstallmentGroupDetails,
  InstallmentTagNotFoundError,
} from '@/repositories/installmentsRepository'
import { createTag } from '@/repositories/tagsRepository'
import {
  getMonthTotals,
  getOverallBalance,
  listRecentTransactions,
  LockedTypeChangeError,
  updateTransaction,
} from '@/repositories/transactionsRepository'

// RF-08 — repositório de parcelamentos com o IndexedDB em memória (Fase 10).

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function setup(overrides: Partial<Parameters<typeof createInstallmentPurchase>[0]> = {}) {
  const tag = await createTag({ name: 'Eletrônicos', color: '#2563EB' })
  const purchase = await createInstallmentPurchase({
    totalCents: 10000,
    count: 3,
    firstDate: '2026-10-31',
    tagId: tag.id,
    description: ' Fone ',
    ...overrides,
  })
  return { tag, ...purchase }
}

async function storedInstallments() {
  return (await db.transactions.toArray()).sort(
    (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
  )
}

describe('createInstallmentPurchase (CA-08.1 / CA-08.2)', () => {
  it('CA-08.1: R$ 100,00 em 3 a partir de 31/10 → 33,34 / 33,33 / 33,33 em 31/10, 30/11, 31/12', async () => {
    const { group, tag } = await setup()
    expect(await db.installmentGroups.get(group.id)).toMatchObject({
      description: 'Fone',
      tagId: tag.id,
      totalCents: 10000,
      count: 3,
      firstDate: '2026-10-31',
    })
    const installments = await storedInstallments()
    expect(
      installments.map(({ amountCents, date, installmentNumber }) => ({
        amountCents,
        date,
        installmentNumber,
      })),
    ).toEqual([
      { amountCents: 3334, date: '2026-10-31', installmentNumber: 1 },
      { amountCents: 3333, date: '2026-11-30', installmentNumber: 2 },
      { amountCents: 3333, date: '2026-12-31', installmentNumber: 3 },
    ])
    for (const installment of installments) {
      expect(installment).toMatchObject({
        type: 'expense',
        description: 'Fone',
        tagId: tag.id,
        installmentGroupId: group.id,
        recurringId: null,
      })
    }
    expect(new Set(installments.map((installment) => installment.id)).size).toBe(3)
  })

  it('CA-08.2: se uma parcela falhar, nem o grupo nem as outras ficam gravados', async () => {
    const tag = await createTag({ name: 'Eletrônicos', color: '#2563EB' })
    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('disco cheio'))
    await expect(
      createInstallmentPurchase({
        totalCents: 10000,
        count: 3,
        firstDate: '2026-10-31',
        tagId: tag.id,
        description: 'Fone',
      }),
    ).rejects.toThrow('disco cheio')
    expect(await db.installmentGroups.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
  })

  it('tag inexistente: nada é gravado', async () => {
    await expect(
      createInstallmentPurchase({
        totalCents: 10000,
        count: 3,
        firstDate: '2026-10-31',
        tagId: 'nao-existe',
        description: 'Fone',
      }),
    ).rejects.toThrow(InstallmentTagNotFoundError)
    expect(await db.installmentGroups.count()).toBe(0)
  })

  it('recusa dados inválidos (número de parcelas, total menor que as parcelas)', async () => {
    const tag = await createTag({ name: 'X', color: '#2563EB' })
    const base = { totalCents: 10000, firstDate: '2026-10-31', tagId: tag.id, description: 'Fone' }
    await expect(createInstallmentPurchase({ ...base, count: 1 })).rejects.toThrow()
    await expect(createInstallmentPurchase({ ...base, count: 49 })).rejects.toThrow()
    await expect(createInstallmentPurchase({ ...base, totalCents: 2, count: 3 })).rejects.toThrow()
    expect(await db.transactions.count()).toBe(0)
  })
})

describe('saldos com parcelas (RF-08 / D-42 / D-40)', () => {
  it('todas entram no saldo geral; no mês só a do mês; as futuras não aparecem nos últimos', async () => {
    await setup()
    expect(await getOverallBalance()).toBe(-10000)
    expect((await getMonthTotals('2026-10')).expenseCents).toBe(3334)
    expect((await getMonthTotals('2026-11')).expenseCents).toBe(3333)
    const recent = await listRecentTransactions('2026-11-15', 5)
    expect(recent.map((transaction) => transaction.installmentNumber)).toEqual([1])
  })
})

describe('editar uma parcela (CA-08.3 / D-53)', () => {
  it('muda só aquela parcela; o grupo e as outras ficam', async () => {
    const { group, installments, tag } = await setup()
    const second = installments[1]
    await updateTransaction(second.id, {
      type: 'expense',
      amountCents: 5000,
      date: second.date,
      tagId: tag.id,
      description: 'Fone',
    })
    const after = await storedInstallments()
    expect(after.map((installment) => installment.amountCents)).toEqual([3334, 5000, 3333])
    expect((await db.installmentGroups.get(group.id))?.totalCents).toBe(10000)
  })

  it('D-53: a parcela não vira entrada', async () => {
    const { installments, tag } = await setup()
    await expect(
      updateTransaction(installments[0].id, {
        type: 'income',
        amountCents: 3334,
        date: '2026-10-31',
        tagId: tag.id,
        description: 'Fone',
      }),
    ).rejects.toThrow(LockedTypeChangeError)
  })
})

describe('deleteInstallments (CA-08.4)', () => {
  it('"Só esta": as outras ficam', async () => {
    const { installments } = await setup()
    await deleteInstallments(installments[1].id, 'one')
    expect((await storedInstallments()).map((i) => i.installmentNumber)).toEqual([1, 3])
  })

  it('"Esta e as seguintes" a partir da 2: sobra só a 1', async () => {
    const { installments, group } = await setup()
    await deleteInstallments(installments[1].id, 'following')
    expect((await storedInstallments()).map((i) => i.installmentNumber)).toEqual([1])
    expect(await db.installmentGroups.get(group.id)).toBeDefined()
  })

  it('"Todas as parcelas": parcelas e grupo saem juntos', async () => {
    const { installments } = await setup()
    await deleteInstallments(installments[2].id, 'all')
    expect(await db.transactions.count()).toBe(0)
    expect(await db.installmentGroups.count()).toBe(0)
  })

  it('sem parcelas restantes, o grupo sai (não prende a tag — D-02)', async () => {
    const { installments } = await setup({ count: 2, totalCents: 200 })
    await deleteInstallments(installments[0].id, 'one')
    expect(await db.installmentGroups.count()).toBe(1)
    await deleteInstallments(installments[1].id, 'one')
    expect(await db.installmentGroups.count()).toBe(0)
  })

  it('lançamento inexistente ou avulso', async () => {
    await expect(deleteInstallments('nao-existe', 'all')).resolves.toBeUndefined()
  })
})

describe('getInstallmentGroupDetails (CA-08.5)', () => {
  it('grupo e parcelas restantes em ordem', async () => {
    const { group, installments } = await setup()
    await deleteInstallments(installments[0].id, 'one')
    const details = await getInstallmentGroupDetails(group.id)
    expect(details?.group.count).toBe(3)
    expect(details?.installments.map((i) => i.installmentNumber)).toEqual([2, 3])
    expect(await getInstallmentGroupDetails('nao-existe')).toBeNull()
  })
})

describe('backup com parcelamentos (RF-10 / Fase 10)', () => {
  it('exportar → limpar → importar preserva o grupo e as parcelas', async () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn(), getItem: vi.fn() })
    const { installments, tag } = await setup()
    await updateTransaction(installments[1].id, {
      type: 'expense',
      amountCents: 4000,
      date: '2026-11-28',
      tagId: tag.id,
      description: 'Fone (editada)',
    })
    const groupsBefore = await db.installmentGroups.toArray()
    const transactionsBefore = await db.transactions.toArray()

    const file = await createBackupFile('senha forte 123', { iterations: 1000 })
    await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())))
    await restoreBackup((await openBackupFile(file, 'senha forte 123')).data)

    expect(await db.installmentGroups.toArray()).toEqual(groupsBefore)
    expect(await db.transactions.toArray()).toEqual(transactionsBefore)
    vi.unstubAllGlobals()
  })
})
