import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import {
  createTag,
  deleteTag,
  DuplicateTagNameError,
  getTagUsage,
  listTagsWithTransactionCount,
  TagNotFoundError,
  updateTag,
} from '@/repositories/tagsRepository'
import { makeInstallmentGroup, makeRecurring, makeTransaction } from '@/test/factories'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('tagsRepository — criar (RF-03 / CA-03.1)', () => {
  it('grava id UUID, nameKey, cor em maiúsculas e datas ISO', async () => {
    const tag = await createTag({ name: '  Saúde ', color: '#16a34a' })

    expect(tag.id).toMatch(UUID_PATTERN)
    expect(tag).toMatchObject({ name: 'Saúde', nameKey: 'saude', color: '#16A34A' })
    expect(new Date(tag.createdAt).toISOString()).toBe(tag.createdAt)
    expect(tag.updatedAt).toBe(tag.createdAt)
    expect(await db.tags.get(tag.id)).toEqual(tag)
  })

  it('valida a entrada (nome vazio ou cor inválida não são gravados)', async () => {
    await expect(createTag({ name: '  ', color: '#16A34A' })).rejects.toThrow()
    await expect(createTag({ name: 'Mercado', color: 'verde' })).rejects.toThrow()
    expect(await db.tags.count()).toBe(0)
  })

  // CA-03.4 — único sem diferenciar maiúsculas e acentos.
  it.each(['Mercado', 'mercado', ' MÉRCADO '])(
    'recusa %j quando já existe "Mercado"',
    async (name) => {
      await createTag({ name: 'Mercado', color: '#16A34A' })
      await expect(createTag({ name, color: '#2563EB' })).rejects.toBeInstanceOf(
        DuplicateTagNameError,
      )
      expect(await db.tags.count()).toBe(1)
    },
  )

  it('o erro de nome repetido traz o texto do CA-03.4', () => {
    expect(new DuplicateTagNameError().message).toBe('Já existe uma tag com esse nome')
  })

  it('duas criações simultâneas com o mesmo nome: só uma é gravada (índice &nameKey)', async () => {
    const results = await Promise.allSettled([
      createTag({ name: 'Lazer', color: '#9333EA' }),
      createTag({ name: 'lazer', color: '#2563EB' }),
    ])
    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected'])
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected?.reason).toBeInstanceOf(DuplicateTagNameError)
    expect(await db.tags.count()).toBe(1)
  })

  it('outros erros do banco não viram "nome repetido"', async () => {
    const failure = new Error('disco cheio')
    const spy = vi.spyOn(db.tags, 'add').mockRejectedValueOnce(failure)
    await expect(createTag({ name: 'Mercado', color: '#16A34A' })).rejects.toBe(failure)
    spy.mockRestore()
  })
})

describe('tagsRepository — editar (CA-03.1)', () => {
  it('renomeia e troca a cor, mantendo id e createdAt', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    const updated = await updateTag(tag.id, { name: 'Diversão', color: '#db2777' })

    expect(updated).toMatchObject({
      id: tag.id,
      name: 'Diversão',
      nameKey: 'diversao',
      color: '#DB2777',
      createdAt: tag.createdAt,
    })
    expect(updated.updatedAt >= tag.updatedAt).toBe(true)
    expect(await db.tags.get(tag.id)).toEqual(updated)
  })

  it('renomear para o próprio nome com outra caixa ou acento é permitido', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const updated = await updateTag(tag.id, { name: 'MÉRCADO', color: '#16A34A' })
    expect(updated.name).toBe('MÉRCADO')
    expect(await db.tags.count()).toBe(1)
  })

  it('renomear para o nome de outra tag é recusado e nada muda', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    const lazer = await createTag({ name: 'Lazer', color: '#9333EA' })

    await expect(updateTag(lazer.id, { name: 'mercado', color: '#000000' })).rejects.toBeInstanceOf(
      DuplicateTagNameError,
    )
    expect(await db.tags.get(lazer.id)).toEqual(lazer)
  })

  it('tag inexistente → TagNotFoundError', async () => {
    await expect(updateTag('nao-existe', { name: 'X', color: '#000000' })).rejects.toBeInstanceOf(
      TagNotFoundError,
    )
    expect(await db.tags.count()).toBe(0)
  })
})

describe('tagsRepository — excluir com bloqueio (CA-03.2 / CA-03.3 / D-02)', () => {
  it('sem uso: exclui (CA-03.3)', async () => {
    const tag = await createTag({ name: 'Diversão', color: '#DB2777' })
    await expect(deleteTag(tag.id)).resolves.toEqual({ status: 'deleted' })
    expect(await db.tags.get(tag.id)).toBeUndefined()
  })

  it('em uso: bloqueia e devolve as contagens de cada tabela', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const other = await createTag({ name: 'Lazer', color: '#9333EA' })
    await db.transactions.bulkAdd([
      makeTransaction({ tagId: tag.id }),
      makeTransaction({ tagId: tag.id }),
      makeTransaction({ tagId: tag.id }),
      makeTransaction({ tagId: other.id }),
    ])
    await db.recurrings.bulkAdd([
      makeRecurring({ tagId: tag.id }),
      makeRecurring({ tagId: other.id }),
    ])
    await db.installmentGroups.bulkAdd([
      makeInstallmentGroup({ tagId: tag.id }),
      makeInstallmentGroup({ tagId: tag.id }),
    ])

    await expect(deleteTag(tag.id)).resolves.toEqual({
      status: 'in-use',
      usage: { transactions: 3, recurrings: 1, installmentGroups: 2 },
    })
    expect(await db.tags.get(tag.id)).toEqual(tag)
  })

  it.each([
    ['um lançamento', () => db.transactions.add(makeTransaction({ tagId: 'alvo' }))],
    ['um recorrente', () => db.recurrings.add(makeRecurring({ tagId: 'alvo' }))],
    ['um parcelamento', () => db.installmentGroups.add(makeInstallmentGroup({ tagId: 'alvo' }))],
  ])('basta %s para bloquear', async (_label, addUsage) => {
    await db.tags.add({
      id: 'alvo',
      name: 'Alvo',
      nameKey: 'alvo',
      color: '#000000',
      createdAt: '2026-10-19T12:00:00.000Z',
      updatedAt: '2026-10-19T12:00:00.000Z',
    })
    await addUsage()
    const result = await deleteTag('alvo')
    expect(result.status).toBe('in-use')
    expect(await db.tags.count()).toBe(1)
  })

  it('getTagUsage conta zero para tag sem uso', async () => {
    await expect(getTagUsage('qualquer')).resolves.toEqual({
      transactions: 0,
      recurrings: 0,
      installmentGroups: 0,
    })
  })

  // Princípio 8 — contagem e exclusão na mesma transação, cobrindo as quatro tabelas.
  it('conta e exclui numa única transação de escrita sobre as quatro tabelas', async () => {
    const tag = await createTag({ name: 'Diversão', color: '#DB2777' })
    const spy = vi.spyOn(db, 'transaction')

    await deleteTag(tag.id)

    expect(spy).toHaveBeenCalledTimes(1)
    const [mode, tables] = spy.mock.calls[0] as unknown as [string, { name: string }[]]
    expect(mode).toBe('rw')
    expect(tables.map((table) => table.name).sort()).toEqual([
      'installmentGroups',
      'recurrings',
      'tags',
      'transactions',
    ])
    spy.mockRestore()
  })

  it('um lançamento gravado antes da exclusão terminar é visto pela contagem', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const [, result] = await Promise.all([
      db.transactions.add(makeTransaction({ tagId: tag.id })),
      deleteTag(tag.id),
    ])
    expect(result).toEqual({
      status: 'in-use',
      usage: { transactions: 1, recurrings: 0, installmentGroups: 0 },
    })
  })
})

describe('tagsRepository — lista com contagem (CA-03.5)', () => {
  it('ordenada por nome, com a quantidade de lançamentos de cada tag', async () => {
    const salario = await createTag({ name: 'Salário', color: '#2563EB' })
    const mercado = await createTag({ name: 'mercado', color: '#16A34A' })
    const agua = await createTag({ name: 'Água', color: '#0891B2' })
    await db.transactions.bulkAdd([
      makeTransaction({ tagId: mercado.id }),
      makeTransaction({ tagId: mercado.id }),
      makeTransaction({ tagId: salario.id, type: 'income' }),
    ])
    // Recorrentes e parcelamentos não entram na contagem de lançamentos.
    await db.recurrings.add(makeRecurring({ tagId: agua.id }))

    const items = await listTagsWithTransactionCount()
    expect(items.map(({ tag, transactionCount }) => [tag.name, transactionCount])).toEqual([
      ['Água', 0],
      ['mercado', 2],
      ['Salário', 1],
    ])
  })

  it('lista vazia sem tags', async () => {
    await expect(listTagsWithTransactionCount()).resolves.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Auditoria da Fase 3 — casos adicionais escritos a partir da spec (RF-03, D-02, §6.3).
// ---------------------------------------------------------------------------

describe('tagsRepository — unicidade (RF-03 / CA-03.4)', () => {
  it.each([
    ['caixa', 'Alimentação', 'ALIMENTAÇÃO'],
    ['acentos', 'Alimentação', 'Alimentacao'],
    ['caixa e acentos', 'Ônibus', 'ONIBUS'],
    ['espaços nas pontas', 'Saúde', '   saude  '],
    ['forma decomposta (NFD)', 'Saúde'.normalize('NFC'), 'Saúde'.normalize('NFD')],
    ['trema e cedilha', 'Lingüiça', 'LINGUICA'],
  ])('criação recusada por diferença de %s', async (_label, existing, attempt) => {
    await createTag({ name: existing, color: '#16A34A' })
    const error = await createTag({ name: attempt, color: '#2563EB' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DuplicateTagNameError)
    expect((error as Error).message).toBe('Já existe uma tag com esse nome')
    expect(await db.tags.count()).toBe(1)
  })

  it('espaços internos diferentes não são o mesmo nome (só as pontas são ignoradas)', async () => {
    await createTag({ name: 'Casa e Lar', color: '#16A34A' })
    await expect(createTag({ name: 'Casa  e Lar', color: '#16A34A' })).resolves.toBeDefined()
    expect(await db.tags.count()).toBe(2)
  })

  it('a mesma cor em duas tags é permitida (a unicidade é só do nome)', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await createTag({ name: 'Feira', color: '#16a34a' })
    expect(await db.tags.count()).toBe(2)
  })

  it.each(['ônibus', 'ONIBUS', ' Onibus '])(
    'edição para %j recusada quando "Ônibus" é outra tag; nada muda',
    async (name) => {
      const onibus = await createTag({ name: 'Ônibus', color: '#2563EB' })
      const lazer = await createTag({ name: 'Lazer', color: '#9333EA' })
      await expect(updateTag(lazer.id, { name, color: '#DB2777' })).rejects.toBeInstanceOf(
        DuplicateTagNameError,
      )
      expect(await db.tags.get(lazer.id)).toEqual(lazer)
      expect(await db.tags.get(onibus.id)).toEqual(onibus)
    },
  )

  it.each(['mercado', 'MERCADO', 'Mércado', '  Mercado  '])(
    'renomear "Mercado" para %j (mesmo nameKey) é permitido e grava a nova grafia',
    async (name) => {
      const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
      const updated = await updateTag(tag.id, { name, color: '#16A34A' })
      expect(updated).toMatchObject({ id: tag.id, name: name.trim(), nameKey: 'mercado' })
      expect(await db.tags.toArray()).toEqual([updated])
    },
  )

  it('depois de renomear, o nome antigo fica livre e o novo fica ocupado', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    await updateTag(tag.id, { name: 'Diversão', color: '#9333EA' })
    await expect(createTag({ name: 'lazer', color: '#16A34A' })).resolves.toBeDefined()
    await expect(createTag({ name: 'DIVERSAO', color: '#16A34A' })).rejects.toBeInstanceOf(
      DuplicateTagNameError,
    )
  })

  it('depois de excluir, o nome pode ser usado de novo', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    await deleteTag(tag.id)
    await expect(createTag({ name: 'LAZER', color: '#16A34A' })).resolves.toBeDefined()
  })

  it('corrida: várias criações simultâneas com o mesmo nome → só uma grava', async () => {
    const names = ['Lazer', 'lazer', 'LAZER', ' Lazer ', 'Lázer']
    const results = await Promise.allSettled(
      names.map((name) => createTag({ name, color: '#9333EA' })),
    )
    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(4)
    for (const result of rejected) expect(result.reason).toBeInstanceOf(DuplicateTagNameError)
    expect(await db.tags.toArray()).toEqual([fulfilled[0].value])
  })

  it('corrida: duas edições simultâneas para o mesmo nome → só uma grava', async () => {
    const a = await createTag({ name: 'A', color: '#9333EA' })
    const b = await createTag({ name: 'B', color: '#9333EA' })
    const results = await Promise.allSettled([
      updateTag(a.id, { name: 'Viagem', color: '#9333EA' }),
      updateTag(b.id, { name: 'viagem', color: '#9333EA' }),
    ])
    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected'])
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected?.reason).toBeInstanceOf(DuplicateTagNameError)
    expect((await db.tags.toArray()).filter((tag) => tag.nameKey === 'viagem')).toHaveLength(1)
  })

  it('erro de validação na edição não toca no banco', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    await expect(updateTag(tag.id, { name: ' ', color: '#16A34A' })).rejects.toThrow()
    await expect(updateTag(tag.id, { name: 'Mercado', color: '#FFF' })).rejects.toThrow()
    expect(await db.tags.get(tag.id)).toEqual(tag)
  })
})

describe('tagsRepository — datas, IDs e erros (CA-03.1 / princípio 9)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('updatedAt muda na edição e createdAt se mantém', async () => {
    // Só o Date é falso: o fake-indexeddb continua usando os timers reais.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-19T10:00:00.000Z'))
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    expect(tag.createdAt).toBe('2026-10-19T10:00:00.000Z')
    expect(tag.updatedAt).toBe('2026-10-19T10:00:00.000Z')

    vi.setSystemTime(new Date('2026-10-20T15:30:00.000Z'))
    const updated = await updateTag(tag.id, { name: 'Lazer', color: '#2563EB' })
    expect(updated.createdAt).toBe('2026-10-19T10:00:00.000Z')
    expect(updated.updatedAt).toBe('2026-10-20T15:30:00.000Z')
    expect(await db.tags.get(tag.id)).toEqual(updated)
  })

  it('cada tag criada recebe um UUID v4 diferente', async () => {
    const tags = await Promise.all(
      ['A', 'B', 'C', 'D', 'E'].map((name) => createTag({ name, color: '#16A34A' })),
    )
    for (const tag of tags) expect(tag.id).toMatch(UUID_PATTERN)
    expect(new Set(tags.map((tag) => tag.id)).size).toBe(5)
  })

  it('o id usa crypto.randomUUID (princípio 9)', async () => {
    const spy = vi.spyOn(crypto, 'randomUUID')
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(tag.id).toBe(spy.mock.results[0].value)
    spy.mockRestore()
  })

  it('a edição não muda o id', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    const updated = await updateTag(tag.id, { name: 'Diversão', color: '#9333EA' })
    expect(updated.id).toBe(tag.id)
    expect(await db.tags.count()).toBe(1)
  })

  it('TagNotFoundError: tag apagada (ex.: em outra aba) antes de salvar a edição', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    await deleteTag(tag.id)
    const error = await updateTag(tag.id, { name: 'Lazer 2', color: '#9333EA' }).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(TagNotFoundError)
    expect(error).not.toBeInstanceOf(DuplicateTagNameError)
    expect((error as Error).name).toBe('TagNotFoundError')
    expect((error as Error).message).toContain(tag.id)
    expect(await db.tags.count()).toBe(0)
  })

  it('DuplicateTagNameError tem nome próprio e é um Error', () => {
    const error = new DuplicateTagNameError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('DuplicateTagNameError')
  })
})

describe('tagsRepository — contagem de uso e bloqueio (CA-03.2 / CA-03.3 / D-02)', () => {
  type UsageSeed = { transactions: number; recurrings: number; installmentGroups: number }

  async function seedUsage(tagId: string, usage: UsageSeed) {
    await db.transactions.bulkAdd(
      Array.from({ length: usage.transactions }, () => makeTransaction({ tagId })),
    )
    await db.recurrings.bulkAdd(
      Array.from({ length: usage.recurrings }, () => makeRecurring({ tagId })),
    )
    await db.installmentGroups.bulkAdd(
      Array.from({ length: usage.installmentGroups }, () => makeInstallmentGroup({ tagId })),
    )
  }

  it.each([
    { transactions: 1, recurrings: 0, installmentGroups: 0 },
    { transactions: 0, recurrings: 2, installmentGroups: 0 },
    { transactions: 0, recurrings: 0, installmentGroups: 3 },
    { transactions: 4, recurrings: 1, installmentGroups: 0 },
    { transactions: 0, recurrings: 1, installmentGroups: 2 },
    { transactions: 2, recurrings: 0, installmentGroups: 1 },
    { transactions: 5, recurrings: 3, installmentGroups: 2 },
  ])('contagens independentes por tabela: %o', async (usage) => {
    const tag = await createTag({ name: 'Alvo', color: '#16A34A' })
    const other = await createTag({ name: 'Outra', color: '#2563EB' })
    await seedUsage(tag.id, usage)
    // Registros de outra tag não podem entrar na contagem.
    await seedUsage(other.id, { transactions: 7, recurrings: 5, installmentGroups: 4 })

    await expect(getTagUsage(tag.id)).resolves.toEqual(usage)
    await expect(deleteTag(tag.id)).resolves.toEqual({ status: 'in-use', usage })
    expect(await db.tags.get(tag.id)).toEqual(tag)
  })

  it('registros só de outras tags: a tag fica livre e é excluída (CA-03.3)', async () => {
    const tag = await createTag({ name: 'Livre', color: '#16A34A' })
    const other = await createTag({ name: 'Ocupada', color: '#2563EB' })
    await seedUsage(other.id, { transactions: 3, recurrings: 2, installmentGroups: 1 })

    await expect(getTagUsage(tag.id)).resolves.toEqual({
      transactions: 0,
      recurrings: 0,
      installmentGroups: 0,
    })
    await expect(deleteTag(tag.id)).resolves.toEqual({ status: 'deleted' })
    expect(await db.tags.get(tag.id)).toBeUndefined()
    // A outra tag e os registros dela continuam.
    expect(await db.tags.get(other.id)).toEqual(other)
    expect(await db.transactions.count()).toBe(3)
    expect(await db.recurrings.count()).toBe(2)
    expect(await db.installmentGroups.count()).toBe(1)
  })

  it('lançamentos de recorrente e de parcela contam como lançamentos da tag', async () => {
    const tag = await createTag({ name: 'Moradia', color: '#16A34A' })
    await db.transactions.bulkAdd([
      makeTransaction({ tagId: tag.id, recurringId: 'r1', recurringPeriod: '2026-10' }),
      makeTransaction({ tagId: tag.id, installmentGroupId: 'g1', installmentNumber: 1 }),
    ])
    await expect(getTagUsage(tag.id)).resolves.toEqual({
      transactions: 2,
      recurrings: 0,
      installmentGroups: 0,
    })
  })

  it('a exclusão bloqueada não apaga os registros que usam a tag', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    await seedUsage(tag.id, { transactions: 2, recurrings: 1, installmentGroups: 1 })
    await deleteTag(tag.id)
    expect(await db.transactions.count()).toBe(2)
    expect(await db.recurrings.count()).toBe(1)
    expect(await db.installmentGroups.count()).toBe(1)
  })

  it('depois que o último uso some, a exclusão passa a ser permitida', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const transaction = makeTransaction({ tagId: tag.id })
    await db.transactions.add(transaction)
    expect((await deleteTag(tag.id)).status).toBe('in-use')
    await db.transactions.delete(transaction.id)
    expect((await deleteTag(tag.id)).status).toBe('deleted')
  })

  // Atomicidade (D-02 / princípio 8): uma gravação de fora disparada no meio da exclusão
  // — entre a checagem e o delete — não pode se intercalar. Ela só acontece depois que a
  // transação da exclusão termina, então a checagem nunca decide sobre um estado velho.
  it('gravação disparada entre a checagem e o delete só roda depois da transação', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const events: string[] = []
    let concurrentAdd: Promise<unknown> | undefined
    const originalDelete = db.tags.delete.bind(db.tags)
    const spy = vi.spyOn(db.tags, 'delete').mockImplementation((key) => {
      // Fora da transação atual, como faria outra aba ou outra tela.
      concurrentAdd = Dexie.ignoreTransaction(() =>
        db.transactions.add(makeTransaction({ tagId: tag.id })).then(() => {
          events.push('lançamento gravado')
        }),
      )
      return originalDelete(key)
    })

    const result = await deleteTag(tag.id)
    events.push('exclusão concluída')
    await concurrentAdd
    spy.mockRestore()

    expect(result).toEqual({ status: 'deleted' })
    expect(events).toEqual(['exclusão concluída', 'lançamento gravado'])
  })

  it('gravação disparada durante a contagem também espera a transação da exclusão', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const events: string[] = []
    let concurrentAdd: Promise<unknown> | undefined
    const originalFilter = db.recurrings.filter.bind(db.recurrings)
    const spy = vi.spyOn(db.recurrings, 'filter').mockImplementation((predicate) => {
      concurrentAdd ??= Dexie.ignoreTransaction(() =>
        db.recurrings.add(makeRecurring({ tagId: tag.id })).then(() => {
          events.push('recorrente gravado')
        }),
      )
      return originalFilter(predicate)
    })

    const result = await deleteTag(tag.id)
    events.push('exclusão concluída')
    await concurrentAdd
    spy.mockRestore()

    expect(result).toEqual({ status: 'deleted' })
    expect(events).toEqual(['exclusão concluída', 'recorrente gravado'])
  })

  it('uso gravado antes de a exclusão começar bloqueia (recorrente e parcelamento)', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const [, , result] = await Promise.all([
      db.recurrings.add(makeRecurring({ tagId: tag.id })),
      db.installmentGroups.add(makeInstallmentGroup({ tagId: tag.id })),
      deleteTag(tag.id),
    ])
    expect(result).toEqual({
      status: 'in-use',
      usage: { transactions: 0, recurrings: 1, installmentGroups: 1 },
    })
    expect(await db.tags.get(tag.id)).toEqual(tag)
  })

  it('falha no meio da exclusão não apaga a tag', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    const failure = new Error('falha simulada')
    const spy = vi.spyOn(db.tags, 'delete').mockRejectedValueOnce(failure)
    await expect(deleteTag(tag.id)).rejects.toBe(failure)
    spy.mockRestore()
    expect(await db.tags.get(tag.id)).toEqual(tag)
  })
})

describe('tagsRepository — lista com contagem, mais casos (CA-03.5)', () => {
  it('várias tags, com e sem lançamentos, em ordem pt-BR sem diferenciar caixa', async () => {
    const created = await Promise.all(
      ['Outros', 'Ônibus', 'alimentação', 'Água', 'Zoo', 'banco'].map((name) =>
        createTag({ name, color: '#16A34A' }),
      ),
    )
    const byName = Object.fromEntries(created.map((tag) => [tag.name, tag]))
    await db.transactions.bulkAdd([
      ...Array.from({ length: 4 }, () => makeTransaction({ tagId: byName['Ônibus'].id })),
      makeTransaction({ tagId: byName['banco'].id, type: 'income' }),
      makeTransaction({ tagId: byName['banco'].id }),
      makeTransaction({ tagId: byName['Água'].id }),
    ])
    await db.installmentGroups.add(makeInstallmentGroup({ tagId: byName['Zoo'].id }))

    const items = await listTagsWithTransactionCount()
    expect(items.map(({ tag, transactionCount }) => [tag.name, transactionCount])).toEqual([
      ['Água', 1],
      ['alimentação', 0],
      ['banco', 2],
      ['Ônibus', 4],
      ['Outros', 0],
      ['Zoo', 0],
    ])
    // Cada item traz a tag completa (nome e cor, CA-03.5).
    expect(items[0].tag).toEqual(byName['Água'])
  })

  it('lançamentos de tags que não existem mais não aparecem na lista', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    await db.transactions.bulkAdd([
      makeTransaction({ tagId: tag.id }),
      makeTransaction({ tagId: 'tag-orfa' }),
    ])
    const items = await listTagsWithTransactionCount()
    expect(items).toEqual([{ tag, transactionCount: 1 }])
  })

  it('reflete renomeação e troca de cor (CA-03.1)', async () => {
    const tag = await createTag({ name: 'Zoo', color: '#16A34A' })
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await db.transactions.add(makeTransaction({ tagId: tag.id }))
    await updateTag(tag.id, { name: 'Academia', color: '#db2777' })

    const items = await listTagsWithTransactionCount()
    expect(
      items.map(({ tag: t, transactionCount }) => [t.name, t.color, transactionCount]),
    ).toEqual([
      ['Academia', '#DB2777', 1],
      ['Mercado', '#16A34A', 0],
    ])
  })
})
