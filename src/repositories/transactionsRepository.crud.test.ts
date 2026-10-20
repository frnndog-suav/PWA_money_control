import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import type { TransactionInput } from '@/domain/transactionSchema'
import { createTag, deleteTag, type DeleteTagResult } from '@/repositories/tagsRepository'
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  TransactionNotFoundError,
  TransactionTagNotFoundError,
  updateTransaction,
} from '@/repositories/transactionsRepository'
import { makeTransaction } from '@/test/factories'

// RF-01 (CA-01.1, CA-01.2, CA-01.5, CA-01.6) / princípios 8 e 9 / D-01 / D-02 / D-39 / CA-03.2.

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function makeStoredTag(name = 'Mercado') {
  return createTag({ name, color: '#16A34A' })
}

function input(tagId: string, overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: 'expense',
    amountCents: 25000,
    date: '2026-10-20',
    tagId,
    description: 'Compra do mês',
    ...overrides,
  }
}

/** Nenhum lançamento aponta para uma tag que não existe (D-01). */
async function expectNoOrphans(): Promise<void> {
  const tagIds = new Set((await db.tags.toArray()).map((tag) => tag.id))
  for (const transaction of await db.transactions.toArray()) {
    expect(tagIds.has(transaction.tagId)).toBe(true)
  }
}

describe('criar (CA-01.1 / princípio 9)', () => {
  it('o id vem de crypto.randomUUID', async () => {
    const tag = await makeStoredTag()
    const spy = vi.spyOn(crypto, 'randomUUID')
    const transaction = await createTransaction(input(tag.id))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(transaction.id).toBe(spy.mock.results[0].value)
  })

  it('cada lançamento recebe um id diferente', async () => {
    const tag = await makeStoredTag()
    const created = await Promise.all(
      Array.from({ length: 10 }, () => createTransaction(input(tag.id))),
    )
    expect(new Set(created.map((t) => t.id)).size).toBe(10)
    expect(await db.transactions.count()).toBe(10)
  })

  it('lançamento avulso: os quatro vínculos (RF-07 / RF-08) são nulos', async () => {
    const tag = await makeStoredTag()
    const stored = await getTransaction((await createTransaction(input(tag.id))).id)
    expect(stored).toMatchObject({
      recurringId: null,
      recurringPeriod: null,
      installmentGroupId: null,
      installmentNumber: null,
    })
  })

  it('createdAt e updatedAt são o instante da criação, em ISO 8601', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'))
    const tag = await makeStoredTag()
    const transaction = await createTransaction(input(tag.id))
    expect(transaction.createdAt).toBe('2026-10-20T10:00:00.000Z')
    expect(transaction.updatedAt).toBe('2026-10-20T10:00:00.000Z')
  })

  it('grava entrada e saída, valor 1 e valor no teto (RF-01)', async () => {
    const tag = await makeStoredTag()
    const small = await createTransaction(input(tag.id, { type: 'income', amountCents: 1 }))
    const max = await createTransaction(input(tag.id, { amountCents: MAX_AMOUNT_CENTS }))
    expect(await getTransaction(small.id)).toMatchObject({ type: 'income', amountCents: 1 })
    expect(await getTransaction(max.id)).toMatchObject({
      type: 'expense',
      amountCents: MAX_AMOUNT_CENTS,
    })
  })

  it('datas passadas e futuras são aceitas (RF-01)', async () => {
    const tag = await makeStoredTag()
    for (const date of ['2020-01-01', '2028-02-29', '2099-12-31']) {
      const transaction = await createTransaction(input(tag.id, { date }))
      expect((await getTransaction(transaction.id))?.date).toBe(date)
    }
  })

  // CA-01.2 — campo inválido: nada é gravado.
  it.each<[string, Partial<TransactionInput>]>([
    ['valor acima do teto', { amountCents: MAX_AMOUNT_CENTS + 1 }],
    ['valor negativo', { amountCents: -1 }],
    ['valor não inteiro', { amountCents: 10.5 }],
    ['data 2026-02-29', { date: '2026-02-29' }],
    ['data 2026-13-01', { date: '2026-13-01' }],
    ['descrição com 101 caracteres', { description: 'a'.repeat(101) }],
    ['tag vazia', { tagId: '' }],
  ])('%s → recusado sem gravar', async (_label, overrides) => {
    const tag = await makeStoredTag()
    await expect(createTransaction(input(tag.id, overrides))).rejects.toThrow()
    expect(await db.transactions.count()).toBe(0)
  })
})

describe('editar (CA-01.5)', () => {
  it('updatedAt muda e createdAt se mantém', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-19T10:00:00.000Z'))
    const tag = await makeStoredTag()
    const created = await createTransaction(input(tag.id))

    vi.setSystemTime(new Date('2026-10-20T15:30:00.000Z'))
    const updated = await updateTransaction(created.id, input(tag.id, { amountCents: 999 }))

    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe('2026-10-19T10:00:00.000Z')
    expect(updated.updatedAt).toBe('2026-10-20T15:30:00.000Z')
    expect(await getTransaction(created.id)).toEqual(updated)
  })

  it('editar não gera novo id nem cria outro registro', async () => {
    const tag = await makeStoredTag()
    const created = await createTransaction(input(tag.id))
    const spy = vi.spyOn(crypto, 'randomUUID')
    await updateTransaction(created.id, input(tag.id, { description: 'Outra' }))
    expect(spy).not.toHaveBeenCalled()
    expect(await db.transactions.count()).toBe(1)
  })

  it('mantém os vínculos de parcela', async () => {
    const tag = await makeStoredTag()
    const stored = makeTransaction({
      tagId: tag.id,
      installmentGroupId: 'group-1',
      installmentNumber: 2,
    })
    await db.transactions.add(stored)
    const updated = await updateTransaction(stored.id, input(tag.id))
    expect(updated).toMatchObject({ installmentGroupId: 'group-1', installmentNumber: 2 })
  })

  it('cada campo editável é alterado (tipo, valor, data, tag, descrição)', async () => {
    const tag = await makeStoredTag()
    const other = await makeStoredTag('Salário')
    const created = await createTransaction(input(tag.id))
    const updated = await updateTransaction(created.id, {
      type: 'income',
      amountCents: 100000,
      date: '2026-11-05',
      tagId: other.id,
      description: '  Pagamento  ',
    })
    expect(await getTransaction(created.id)).toMatchObject({
      type: 'income',
      amountCents: 100000,
      date: '2026-11-05',
      tagId: other.id,
      description: 'Pagamento',
    })
    expect(updated.description).toBe('Pagamento')
  })

  it('entrada inválida na edição não altera o registro (CA-01.2)', async () => {
    const tag = await makeStoredTag()
    const created = await createTransaction(input(tag.id))
    await expect(
      updateTransaction(created.id, input(tag.id, { description: ' ' })),
    ).rejects.toThrow()
    expect(await getTransaction(created.id)).toEqual(created)
  })

  it('lançamento excluído antes de salvar a edição → TransactionNotFoundError', async () => {
    const tag = await makeStoredTag()
    const created = await createTransaction(input(tag.id))
    await deleteTransaction(created.id)
    const error = await updateTransaction(created.id, input(tag.id)).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TransactionNotFoundError)
    expect(error).toBeInstanceOf(Error)
    expect(await db.transactions.count()).toBe(0)
  })
})

describe('tag inexistente (D-01 / TransactionTagNotFoundError)', () => {
  it('criar com uma tag excluída antes de salvar → erro e nada gravado', async () => {
    const tag = await makeStoredTag()
    expect(await deleteTag(tag.id)).toEqual({ status: 'deleted' })
    const error = await createTransaction(input(tag.id)).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TransactionTagNotFoundError)
    expect(error).toBeInstanceOf(Error)
    expect(await db.transactions.count()).toBe(0)
  })

  it('editar para uma tag excluída antes de salvar → erro e nada muda', async () => {
    const tag = await makeStoredTag()
    const other = await makeStoredTag('Lazer')
    const created = await createTransaction(input(tag.id))
    await deleteTag(other.id)
    await expect(updateTransaction(created.id, input(other.id))).rejects.toBeInstanceOf(
      TransactionTagNotFoundError,
    )
    expect(await getTransaction(created.id)).toEqual(created)
  })
})

// Princípio 8 / D-02 / D-39 — a checagem da tag e a gravação ficam na mesma transação `rw`
// de `tags` e `transactions`. Uma exclusão de tag disparada entre as duas (outra aba, outra
// tela) não pode se intercalar: ou o lançamento é gravado e a exclusão é bloqueada, ou a tag
// sai antes e nada é gravado. Nunca fica lançamento apontando para tag inexistente.
describe('atomicidade da checagem da tag (princípio 8 / D-39)', () => {
  it('exclusão disparada entre a checagem e a gravação do criar só roda depois → bloqueada', async () => {
    const tag = await makeStoredTag()
    const events: string[] = []
    let concurrentDelete: Promise<DeleteTagResult> | undefined
    const originalAdd = db.transactions.add.bind(db.transactions)
    vi.spyOn(db.transactions, 'add').mockImplementation((item, key) => {
      concurrentDelete ??= Dexie.ignoreTransaction(() =>
        deleteTag(tag.id).then((result) => {
          events.push('exclusão da tag terminou')
          return result
        }),
      )
      return originalAdd(item, key)
    })

    const transaction = await createTransaction(input(tag.id))
    events.push('lançamento gravado')
    const deleteResult = await concurrentDelete

    expect(events).toEqual(['lançamento gravado', 'exclusão da tag terminou'])
    expect(deleteResult).toEqual({
      status: 'in-use',
      usage: { transactions: 1, recurrings: 0, installmentGroups: 0 },
    })
    expect(await getTransaction(transaction.id)).toEqual(transaction)
    await expectNoOrphans()
  })

  it('exclusão disparada entre a checagem e a gravação do editar só roda depois → bloqueada', async () => {
    const tag = await makeStoredTag()
    const other = await makeStoredTag('Lazer')
    const created = await createTransaction(input(tag.id))
    let concurrentDelete: Promise<DeleteTagResult> | undefined
    const originalPut = db.transactions.put.bind(db.transactions)
    vi.spyOn(db.transactions, 'put').mockImplementation((item, key) => {
      concurrentDelete ??= Dexie.ignoreTransaction(() => deleteTag(other.id))
      return originalPut(item, key)
    })

    await updateTransaction(created.id, input(other.id))

    expect((await concurrentDelete)?.status).toBe('in-use')
    expect((await getTransaction(created.id))?.tagId).toBe(other.id)
    await expectNoOrphans()
  })

  it('tag excluída enquanto o criar espera a vez → erro e nada gravado', async () => {
    const tag = await makeStoredTag()
    let concurrentCreate: Promise<unknown> | undefined
    const originalDelete = db.tags.delete.bind(db.tags)
    vi.spyOn(db.tags, 'delete').mockImplementation((key: string) => {
      // O usuário toca em "Lançar" no meio da exclusão da tag (fora da transação dela).
      concurrentCreate ??= Dexie.ignoreTransaction(() =>
        createTransaction(input(tag.id)).catch((e: unknown) => e),
      )
      return originalDelete(key)
    })

    expect(await deleteTag(tag.id)).toEqual({ status: 'deleted' })
    expect(await concurrentCreate).toBeInstanceOf(TransactionTagNotFoundError)
    expect(await db.transactions.count()).toBe(0)
    await expectNoOrphans()
  })

  it('falha na gravação depois da checagem → nada gravado e o erro é propagado', async () => {
    const tag = await makeStoredTag()
    vi.spyOn(db.transactions, 'add').mockRejectedValue(new Error('disco cheio'))
    await expect(createTransaction(input(tag.id))).rejects.toThrow('disco cheio')
    vi.restoreAllMocks()
    expect(await db.transactions.count()).toBe(0)
  })

  it('falha na gravação da edição → registro original intacto', async () => {
    const tag = await makeStoredTag()
    const created = await createTransaction(input(tag.id))
    vi.spyOn(db.transactions, 'put').mockRejectedValue(new Error('disco cheio'))
    await expect(updateTransaction(created.id, input(tag.id, { amountCents: 1 }))).rejects.toThrow(
      'disco cheio',
    )
    vi.restoreAllMocks()
    expect(await getTransaction(created.id)).toEqual(created)
  })
})

describe('excluir e ler (CA-01.6)', () => {
  it('exclui só o lançamento escolhido', async () => {
    const tag = await makeStoredTag()
    const keep = await createTransaction(input(tag.id, { description: 'fica' }))
    const remove = await createTransaction(input(tag.id, { description: 'sai' }))
    await deleteTransaction(remove.id)
    expect(await getTransaction(remove.id)).toBeUndefined()
    expect(await getTransaction(keep.id)).toEqual(keep)
    expect(await db.transactions.count()).toBe(1)
  })

  it('getTransaction de id inexistente → undefined', async () => {
    expect(await getTransaction('nao-existe')).toBeUndefined()
  })
})

// CA-03.2 completo — integração com lançamentos reais do repositório.
describe('CA-03.2 — tag em uso por lançamentos reais', () => {
  it('bloqueia com a contagem enquanto houver lançamento; libera quando o último sai', async () => {
    const tag = await makeStoredTag()
    const first = await createTransaction(input(tag.id))
    const second = await createTransaction(input(tag.id, { type: 'income' }))

    expect(await deleteTag(tag.id)).toEqual({
      status: 'in-use',
      usage: { transactions: 2, recurrings: 0, installmentGroups: 0 },
    })

    await deleteTransaction(first.id)
    expect(await deleteTag(tag.id)).toEqual({
      status: 'in-use',
      usage: { transactions: 1, recurrings: 0, installmentGroups: 0 },
    })
    expect(await db.tags.get(tag.id)).toBeDefined()

    await deleteTransaction(second.id)
    expect(await deleteTag(tag.id)).toEqual({ status: 'deleted' })
    expect(await db.tags.get(tag.id)).toBeUndefined()
  })

  it('trocar a tag do lançamento libera a tag antiga e bloqueia a nova', async () => {
    const tag = await makeStoredTag()
    const other = await makeStoredTag('Lazer')
    const created = await createTransaction(input(tag.id))
    await updateTransaction(created.id, input(other.id))

    expect((await deleteTag(other.id)).status).toBe('in-use')
    expect(await deleteTag(tag.id)).toEqual({ status: 'deleted' })
  })
})
