import { describe, expect, it } from 'vitest'
import { compareByRecency, takeMostRecent } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import { makeTransaction } from '@/test/factories'
import { createTestRandom } from '@/test/propertyHelpers'

// RF-02 item 5 — "Últimos lançamentos": por data e, no mesmo dia, por criação.

describe('compareByRecency / takeMostRecent', () => {
  it('ordena por data, mais recente primeiro', () => {
    const old = makeTransaction({ date: '2026-10-01' })
    const recent = makeTransaction({ date: '2026-10-20' })
    const middle = makeTransaction({ date: '2026-10-10' })
    expect(takeMostRecent([old, recent, middle], 5)).toEqual([recent, middle, old])
  })

  it('no mesmo dia, o criado por último vem primeiro', () => {
    const first = makeTransaction({ date: '2026-10-20', createdAt: '2026-10-20T10:00:00.000Z' })
    const second = makeTransaction({ date: '2026-10-20', createdAt: '2026-10-20T11:00:00.000Z' })
    expect(takeMostRecent([first, second], 5)).toEqual([second, first])
    expect(takeMostRecent([second, first], 5)).toEqual([second, first])
    expect(compareByRecency(second, first)).toBeLessThan(0)
  })

  it('a data vale mais que a criação', () => {
    const createdLater = makeTransaction({
      date: '2026-10-01',
      createdAt: '2026-10-20T12:00:00.000Z',
    })
    const newerDate = makeTransaction({ date: '2026-10-02', createdAt: '2026-10-01T12:00:00.000Z' })
    expect(takeMostRecent([createdLater, newerDate], 5)).toEqual([newerDate, createdLater])
  })

  it('empate total desempata pelo id (ordem estável) e o mesmo item é igual a si', () => {
    const a = makeTransaction({ id: 'a' })
    const b = makeTransaction({ id: 'b' })
    expect(takeMostRecent([a, b], 5)).toEqual([b, a])
    expect(compareByRecency(a, a)).toBe(0)
  })

  it('devolve no máximo `count` itens e não altera a lista original', () => {
    const items = ['2026-10-01', '2026-10-02', '2026-10-03'].map((date) =>
      makeTransaction({ date }),
    )
    const copy = [...items]
    expect(takeMostRecent(items, 2).map((t) => t.date)).toEqual(['2026-10-03', '2026-10-02'])
    expect(items).toEqual(copy)
  })
})

// Auditoria da Fase 4 — RF-02 item 5 / D-39.
describe('compareByRecency — simetria e propriedade', () => {
  it('é antissimétrica em cada nível de desempate (data, criação, id)', () => {
    const pairs = [
      [makeTransaction({ date: '2026-10-02' }), makeTransaction({ date: '2026-10-01' })],
      [
        makeTransaction({ date: '2026-10-01', createdAt: '2026-10-01T12:00:01.000Z' }),
        makeTransaction({ date: '2026-10-01', createdAt: '2026-10-01T12:00:00.000Z' }),
      ],
      [makeTransaction({ id: 'b' }), makeTransaction({ id: 'a' })],
    ]
    for (const [newer, older] of pairs) {
      expect(compareByRecency(newer, older)).toBe(-1)
      expect(compareByRecency(older, newer)).toBe(1)
    }
  })

  // Referência independente: só a regra do RF-02 (data, depois criação).
  it('propriedade: os primeiros seguem data e criação, para listas com semente', () => {
    const random = createTestRandom(5)
    for (let run = 0; run < 50; run++) {
      const list = Array.from({ length: random.int(0, 30) }, () =>
        makeTransaction({
          date: `2026-10-0${random.int(1, 4)}`,
          createdAt: `2026-10-20T12:00:0${random.int(0, 3)}.000Z`,
        }),
      )
      const count = random.int(0, 8)
      const key = (t: Transaction) => `${t.date}|${t.createdAt}`
      const expected = list.map(key).toSorted().toReversed().slice(0, count)
      expect(takeMostRecent(list, count).map(key)).toEqual(expected)
    }
  })
})
