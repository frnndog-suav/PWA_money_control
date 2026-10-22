import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { countTransactions, listTransactionsInPeriod } from '@/repositories/transactionsRepository'
import { makeTransaction } from '@/test/factories'

// RF-04 / CA-04.1 / CA-04.6 — consulta da lista pelo índice `date`, em ordem, com futuros.

afterEach(() => {
  vi.restoreAllMocks()
})

const at = (hour: number) => `2026-10-20T${String(hour).padStart(2, '0')}:00:00.000Z`

async function seed() {
  await db.transactions.bulkAdd([
    makeTransaction({ description: 'set', date: '2026-09-30' }),
    makeTransaction({ description: 'out-1', date: '2026-10-01' }),
    makeTransaction({ description: 'out-20a', date: '2026-10-20', createdAt: at(8) }),
    makeTransaction({ description: 'out-20b', date: '2026-10-20', createdAt: at(9) }),
    makeTransaction({ description: 'out-31', date: '2026-10-31' }),
    makeTransaction({ description: 'futuro', date: '2027-03-15' }),
  ])
}

const descriptions = (list: { description: string }[]) => list.map((t) => t.description)

describe('listTransactionsInPeriod (RF-04)', () => {
  it('sem período: todos, do mais recente para o mais antigo, inclusive datas futuras', async () => {
    await seed()
    expect(descriptions(await listTransactionsInPeriod(null, null))).toEqual([
      'futuro',
      'out-31',
      'out-20b',
      'out-20a',
      'out-1',
      'set',
    ])
  })

  it('período fechado: datas inclusivas nas duas pontas', async () => {
    await seed()
    expect(descriptions(await listTransactionsInPeriod('2026-10-01', '2026-10-31'))).toEqual([
      'out-31',
      'out-20b',
      'out-20a',
      'out-1',
    ])
  })

  it('só data inicial ou só data final', async () => {
    await seed()
    expect(descriptions(await listTransactionsInPeriod('2026-10-31', null))).toEqual([
      'futuro',
      'out-31',
    ])
    expect(descriptions(await listTransactionsInPeriod(null, '2026-10-01'))).toEqual([
      'out-1',
      'set',
    ])
  })

  it('consulta pelo índice `date` (between / aboveOrEqual / belowOrEqual / orderBy)', async () => {
    await seed()
    const where = vi.spyOn(db.transactions, 'where')
    const orderBy = vi.spyOn(db.transactions, 'orderBy')

    await listTransactionsInPeriod('2026-10-01', '2026-10-31')
    await listTransactionsInPeriod('2026-10-01', null)
    await listTransactionsInPeriod(null, '2026-10-31')
    expect(where.mock.calls).toEqual([['date'], ['date'], ['date']])

    await listTransactionsInPeriod(null, null)
    expect(orderBy).toHaveBeenCalledWith('date')
  })

  it('banco vazio → lista vazia', async () => {
    expect(await listTransactionsInPeriod(null, null)).toEqual([])
    expect(await listTransactionsInPeriod('2026-10-01', '2026-10-31')).toEqual([])
  })
})

describe('countTransactions', () => {
  it('conta todos os lançamentos', async () => {
    expect(await countTransactions()).toBe(0)
    await seed()
    expect(await countTransactions()).toBe(6)
  })
})
