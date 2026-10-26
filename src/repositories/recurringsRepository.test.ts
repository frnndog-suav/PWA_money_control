import { describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { AmountBeforeStartError, EndBeforeConfirmedError } from '@/domain/recurring'
import type { Tag } from '@/domain/types'
import { createBackupFile, openBackupFile, restoreBackup } from '@/repositories/backupRepository'
import {
  changeRecurringAmount,
  confirmOccurrence,
  createRecurring,
  deleteConfirmedTransaction,
  deleteRecurring,
  endRecurringAt,
  getConfirmedKeysIn,
  listPendingOccurrences,
  listRecurringConfirmations,
  listRecurrings,
  OccurrenceAlreadyConfirmedError,
  OccurrenceNotPendingError,
  RecurringHasConfirmationsError,
  RecurringNotFoundError,
  RecurringTagNotFoundError,
  skipOccurrence,
  unskipOccurrence,
  updateRecurringDetails,
} from '@/repositories/recurringsRepository'
import { createTag } from '@/repositories/tagsRepository'
import {
  OccurrenceDateOutsidePeriodError,
  OccurrenceTypeChangeError,
  updateTransaction,
} from '@/repositories/transactionsRepository'

// RF-07 — repositório de recorrentes com o IndexedDB em memória (Fase 9).

async function setup() {
  const tag = await createTag({ name: 'Casa', color: '#16A34A' })
  const light = await createRecurring({
    type: 'expense',
    description: 'Conta de luz',
    tagId: tag.id,
    amountCents: 18000,
    startPeriod: '2026-10',
    endPeriod: '',
  })
  return { tag, light }
}

const confirmInput = (tag: Tag, date = '2026-11-17', amountCents = 18740) => ({
  amountCents,
  date,
  tagId: tag.id,
  description: 'Conta de luz',
})

async function pendingIn(period: string) {
  return (await listPendingOccurrences([period])).get(period) ?? []
}

describe('createRecurring / updateRecurringDetails (RF-07 / D-51)', () => {
  it('grava o 1º valor desde o mês de início, sem término nem meses pulados', async () => {
    const { tag, light } = await setup()
    expect(await db.recurrings.get(light.id)).toMatchObject({
      type: 'expense',
      description: 'Conta de luz',
      tagId: tag.id,
      startPeriod: '2026-10',
      endPeriod: null,
      amounts: [{ fromPeriod: '2026-10', amountCents: 18000 }],
      skippedPeriods: [],
    })
  })

  it('aceita término e recusa tag inexistente', async () => {
    const { tag } = await setup()
    const ended = await createRecurring({
      type: 'income',
      description: 'Bolsa',
      tagId: tag.id,
      amountCents: 100,
      startPeriod: '2026-01',
      endPeriod: '2026-06',
    })
    expect(ended.endPeriod).toBe('2026-06')
    await expect(
      createRecurring({
        type: 'income',
        description: 'X',
        tagId: 'nao-existe',
        amountCents: 100,
        startPeriod: '2026-01',
        endPeriod: '',
      }),
    ).rejects.toThrow(RecurringTagNotFoundError)
  })

  it('editar muda só descrição e tag; o lançamento confirmado não muda', async () => {
    const { tag, light } = await setup()
    const other = await createTag({ name: 'Energia', color: '#2563EB' })
    const confirmed = await confirmOccurrence(light.id, '2026-11', confirmInput(tag))

    const updated = await updateRecurringDetails(light.id, {
      description: ' Luz ',
      tagId: other.id,
    })
    expect(updated).toMatchObject({ description: 'Luz', tagId: other.id, type: 'expense' })
    expect(await db.transactions.get(confirmed.id)).toMatchObject({
      description: 'Conta de luz',
      tagId: tag.id,
    })
    await expect(
      updateRecurringDetails('nao-existe', { description: 'a', tagId: tag.id }),
    ).rejects.toThrow(RecurringNotFoundError)
  })
})

describe('confirmOccurrence (CA-07.1 / CA-07.2 / CA-07.5)', () => {
  it('CA-07.1: pendente em novembro com o valor vigente', async () => {
    const { light } = await setup()
    expect(await pendingIn('2026-11')).toEqual([
      {
        recurring: expect.objectContaining({ id: light.id }),
        period: '2026-11',
        amountCents: 18000,
      },
    ])
  })

  it('CA-07.2: cria o lançamento vinculado e a ocorrência sai das pendentes', async () => {
    const { tag, light } = await setup()
    const transaction = await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    expect(transaction).toMatchObject({
      type: 'expense',
      amountCents: 18740,
      date: '2026-11-17',
      recurringId: light.id,
      recurringPeriod: '2026-11',
      installmentGroupId: null,
    })
    expect(await db.transactions.get(transaction.id)).toEqual(transaction)
    expect(await pendingIn('2026-11')).toEqual([])
    expect(await pendingIn('2026-12')).toHaveLength(1)
    expect([...(await getConfirmedKeysIn('2026-11'))]).toEqual([`${light.id}|2026-11`])
  })

  it('CA-07.5: não confirma duas vezes a mesma ocorrência', async () => {
    const { tag, light } = await setup()
    await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    await expect(confirmOccurrence(light.id, '2026-11', confirmInput(tag))).rejects.toThrow(
      OccurrenceAlreadyConfirmedError,
    )
    expect(await db.transactions.count()).toBe(1)
  })

  it('duas confirmações ao mesmo tempo (duas abas) gravam um lançamento só', async () => {
    const { tag, light } = await setup()
    const results = await Promise.allSettled([
      confirmOccurrence(light.id, '2026-11', confirmInput(tag)),
      confirmOccurrence(light.id, '2026-11', confirmInput(tag)),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await db.transactions.count()).toBe(1)
  })

  it('CA-07.8: a data precisa estar no mês da ocorrência', async () => {
    const { tag, light } = await setup()
    await expect(
      confirmOccurrence(light.id, '2026-11', confirmInput(tag, '2026-12-01')),
    ).rejects.toThrow('A data precisa estar em novembro de 2026.')
  })

  it('mês pulado ou fora do período não pode ser confirmado', async () => {
    const { tag, light } = await setup()
    await skipOccurrence(light.id, '2026-11')
    await expect(confirmOccurrence(light.id, '2026-11', confirmInput(tag))).rejects.toThrow(
      OccurrenceNotPendingError,
    )
    await expect(
      confirmOccurrence(light.id, '2026-09', confirmInput(tag, '2026-09-10')),
    ).rejects.toThrow(OccurrenceNotPendingError)
  })

  it('D-51: editar o lançamento confirmado mantém a data no mês da ocorrência', async () => {
    const { tag, light } = await setup()
    const transaction = await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    const edit = { ...confirmInput(tag), type: 'expense' as const }
    await expect(
      updateTransaction(transaction.id, { ...edit, date: '2026-12-02' }),
    ).rejects.toThrow(OccurrenceDateOutsidePeriodError)
    const updated = await updateTransaction(transaction.id, { ...edit, date: '2026-11-30' })
    expect(updated).toMatchObject({ date: '2026-11-30', recurringPeriod: '2026-11' })
  })
})

describe('D-51 — tipo do lançamento confirmado', () => {
  it('não pode virar entrada; os outros campos continuam editáveis', async () => {
    const { tag, light } = await setup()
    const transaction = await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    const edit = { ...confirmInput(tag), date: '2026-11-20' }
    await expect(updateTransaction(transaction.id, { ...edit, type: 'income' })).rejects.toThrow(
      OccurrenceTypeChangeError,
    )
    expect((await db.transactions.get(transaction.id))?.type).toBe('expense')
    await expect(
      updateTransaction(transaction.id, { ...edit, type: 'expense', amountCents: 19000 }),
    ).resolves.toMatchObject({ type: 'expense', amountCents: 19000, date: '2026-11-20' })
  })
})

describe('CA-07.7 — pendências de meses passados continuam no mês', () => {
  it('cada mês tem a sua lista, até confirmar ou pular', async () => {
    const { tag, light } = await setup()
    const byMonth = await listPendingOccurrences(['2026-10', '2026-11', '2026-12'])
    expect([...byMonth.values()].map((list) => list.length)).toEqual([1, 1, 1])

    await confirmOccurrence(light.id, '2026-10', confirmInput(tag, '2026-10-05'))
    await skipOccurrence(light.id, '2026-12')
    const after = await listPendingOccurrences(['2026-10', '2026-11', '2026-12'])
    expect([...after.values()].map((list) => list.length)).toEqual([0, 1, 0])
  })

  it('sem recorrentes, listas vazias', async () => {
    expect(await pendingIn('2026-11')).toEqual([])
  })
})

describe('changeRecurringAmount (CA-07.3)', () => {
  it('R$ 55,00 a partir de 2026-11: anteriores e confirmados ficam como estavam', async () => {
    const { tag, light } = await setup()
    const october = await confirmOccurrence(
      light.id,
      '2026-10',
      confirmInput(tag, '2026-10-05', 18000),
    )
    await changeRecurringAmount(light.id, { fromPeriod: '2026-11', amountCents: 20000 })

    expect((await pendingIn('2026-11'))[0].amountCents).toBe(20000)
    expect((await pendingIn('2027-03'))[0].amountCents).toBe(20000)
    expect((await db.transactions.get(october.id))?.amountCents).toBe(18000)
    expect((await db.recurrings.get(light.id))?.amounts).toEqual([
      { fromPeriod: '2026-10', amountCents: 18000 },
      { fromPeriod: '2026-11', amountCents: 20000 },
    ])
  })

  it('antes do início: erro, nada muda', async () => {
    const { light } = await setup()
    await expect(
      changeRecurringAmount(light.id, { fromPeriod: '2026-09', amountCents: 1 }),
    ).rejects.toThrow(AmountBeforeStartError)
    expect((await db.recurrings.get(light.id))?.amounts).toHaveLength(1)
  })
})

describe('skipOccurrence / unskipOccurrence (CA-07.4)', () => {
  it('pula e desfaz', async () => {
    const { light } = await setup()
    await skipOccurrence(light.id, '2026-12')
    expect(await pendingIn('2026-12')).toEqual([])
    await unskipOccurrence(light.id, '2026-12')
    expect(await pendingIn('2026-12')).toHaveLength(1)
  })

  it('não pula ocorrência confirmada', async () => {
    const { tag, light } = await setup()
    await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    await expect(skipOccurrence(light.id, '2026-11')).rejects.toThrow(
      OccurrenceAlreadyConfirmedError,
    )
  })
})

describe('endRecurringAt (RF-07 "Encerrar" / D-51)', () => {
  it('meses depois do término não têm mais ocorrência', async () => {
    const { light } = await setup()
    await endRecurringAt(light.id, { endPeriod: '2026-11' })
    expect(await pendingIn('2026-11')).toHaveLength(1)
    expect(await pendingIn('2026-12')).toEqual([])
  })

  it('bloqueado antes do último mês confirmado', async () => {
    const { tag, light } = await setup()
    await confirmOccurrence(light.id, '2026-12', confirmInput(tag, '2026-12-01'))
    await expect(endRecurringAt(light.id, { endPeriod: '2026-10' })).rejects.toThrow(
      EndBeforeConfirmedError,
    )
    expect((await db.recurrings.get(light.id))?.endPeriod).toBeNull()
    await expect(endRecurringAt(light.id, { endPeriod: '2026-12' })).resolves.toMatchObject({
      endPeriod: '2026-12',
    })
  })
})

describe('deleteRecurring (RF-07)', () => {
  it('sem confirmadas: exclui', async () => {
    const { light } = await setup()
    await deleteRecurring(light.id)
    expect(await listRecurrings()).toEqual([])
  })

  it('com confirmada: bloqueia e não apaga nada', async () => {
    const { tag, light } = await setup()
    await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    await expect(deleteRecurring(light.id)).rejects.toThrow(RecurringHasConfirmationsError)
    expect(await db.recurrings.count()).toBe(1)
  })
})

describe('deleteConfirmedTransaction (RF-07)', () => {
  it('"voltar a pendente": apaga o lançamento e a ocorrência volta', async () => {
    const { tag, light } = await setup()
    const transaction = await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    await deleteConfirmedTransaction(transaction.id, 'pending')
    expect(await db.transactions.count()).toBe(0)
    expect(await pendingIn('2026-11')).toHaveLength(1)
  })

  it('"pular este mês": apaga o lançamento e pula o mês, juntos', async () => {
    const { tag, light } = await setup()
    const transaction = await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    await deleteConfirmedTransaction(transaction.id, 'skip')
    expect(await db.transactions.count()).toBe(0)
    expect(await pendingIn('2026-11')).toEqual([])
    expect((await db.recurrings.get(light.id))?.skippedPeriods).toEqual(['2026-11'])
  })

  it('lançamento que não existe: nada acontece', async () => {
    await expect(deleteConfirmedTransaction('nao-existe', 'skip')).resolves.toBeUndefined()
  })
})

describe('listRecurrings / listRecurringConfirmations', () => {
  it('recorrentes pela descrição; confirmações do mês mais recente ao mais antigo', async () => {
    const { tag, light } = await setup()
    await createRecurring({
      type: 'income',
      description: 'aluguel recebido',
      tagId: tag.id,
      amountCents: 1,
      startPeriod: '2026-01',
      endPeriod: '',
    })
    expect((await listRecurrings()).map((recurring) => recurring.description)).toEqual([
      'aluguel recebido',
      'Conta de luz',
    ])
    await confirmOccurrence(light.id, '2026-10', confirmInput(tag, '2026-10-02'))
    await confirmOccurrence(light.id, '2026-12', confirmInput(tag, '2026-12-02'))
    const periods = (await listRecurringConfirmations(light.id)).map((t) => t.recurringPeriod)
    expect(periods).toEqual(['2026-12', '2026-10'])
  })
})

describe('backup com recorrentes (RF-10 / Fase 9)', () => {
  it('exportar → limpar → importar preserva recorrentes, valores, pulos e confirmações', async () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn(), getItem: vi.fn() })
    const { tag, light } = await setup()
    await changeRecurringAmount(light.id, { fromPeriod: '2026-12', amountCents: 20000 })
    await skipOccurrence(light.id, '2027-01')
    await confirmOccurrence(light.id, '2026-11', confirmInput(tag))
    const recurringsBefore = await db.recurrings.toArray()
    const transactionsBefore = await db.transactions.toArray()

    const file = await createBackupFile('senha forte 123', { iterations: 1000 })
    await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())))
    await restoreBackup((await openBackupFile(file, 'senha forte 123')).data)

    expect(await db.recurrings.toArray()).toEqual(recurringsBefore)
    expect(await db.transactions.toArray()).toEqual(transactionsBefore)
    expect(await pendingIn('2026-11')).toEqual([])
    expect((await pendingIn('2026-12'))[0].amountCents).toBe(20000)
    expect(await pendingIn('2027-01')).toEqual([])
    vi.unstubAllGlobals()
  })
})
