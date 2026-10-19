import { describe, expect, it } from 'vitest'
import { DATABASE_NAME, db, SCHEMA_VERSION } from '@/db/database'
import { SCHEMA_VERSION as EXPOSED_SCHEMA_VERSION } from '@/repositories/databaseInfo'
import { makeTransaction } from '@/test/factories'

// §6.4 — o esquema v1 conferido direto no IndexedDB (fake-indexeddb), não só na
// descrição do Dexie: nomes, chaves, índices, unicidade e o índice composto.

interface IndexInfo {
  keyPath: string | string[]
  unique: boolean
  multiEntry: boolean
}

interface StoreInfo {
  keyPath: string | string[] | null
  autoIncrement: boolean
  indexes: Record<string, IndexInfo>
}

async function readNativeSchema(): Promise<Record<string, StoreInfo>> {
  await db.open()
  const native = db.backendDB()
  const names = [...native.objectStoreNames].sort()
  const transaction = native.transaction(names, 'readonly')
  const schema: Record<string, StoreInfo> = {}
  for (const name of names) {
    const store = transaction.objectStore(name)
    const indexes: Record<string, IndexInfo> = {}
    for (const indexName of [...store.indexNames]) {
      const index = store.index(indexName)
      indexes[indexName] = {
        keyPath: index.keyPath,
        unique: index.unique,
        multiEntry: index.multiEntry,
      }
    }
    schema[name] = { keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes }
  }
  return schema
}

const plain = (keyPath: string, unique = false): IndexInfo => ({
  keyPath,
  unique,
  multiEntry: false,
})

describe('esquema v1 no IndexedDB (§6.4)', () => {
  it('nome do banco e versão do esquema', async () => {
    await db.open()
    expect(db.backendDB().name).toBe(DATABASE_NAME)
    // O Dexie multiplica a versão por 10 no IndexedDB nativo.
    expect(db.backendDB().version).toBe(SCHEMA_VERSION * 10)
    expect(db.verno).toBe(1)
  })

  // CA-11.5 — a tela Sobre recebe a mesma versão, via repositório (princípio 7).
  it('databaseInfo expõe a mesma SCHEMA_VERSION', () => {
    expect(EXPOSED_SCHEMA_VERSION).toBe(SCHEMA_VERSION)
  })

  it('tabelas, chaves primárias e índices batem exatamente com a §6.4', async () => {
    expect(await readNativeSchema()).toEqual({
      tags: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: { nameKey: plain('nameKey', true) },
      },
      transactions: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: {
          date: plain('date'),
          type: plain('type'),
          tagId: plain('tagId'),
          recurringId: plain('recurringId'),
          '[recurringId+recurringPeriod]': {
            keyPath: ['recurringId', 'recurringPeriod'],
            unique: false,
            multiEntry: false,
          },
          installmentGroupId: plain('installmentGroupId'),
        },
      },
      recurrings: { keyPath: 'id', autoIncrement: false, indexes: {} },
      installmentGroups: { keyPath: 'id', autoIncrement: false, indexes: {} },
      settings: { keyPath: 'key', autoIncrement: false, indexes: {} },
    })
  })

  // RF-03 / §6.4 — `&nameKey`: duas tags com o mesmo nome normalizado são recusadas.
  it('&nameKey recusa duas tags com o mesmo nome normalizado', async () => {
    const tag = {
      id: crypto.randomUUID(),
      name: 'Mercado',
      nameKey: 'mercado',
      color: '#16A34A',
      createdAt: '2026-10-19T12:00:00.000Z',
      updatedAt: '2026-10-19T12:00:00.000Z',
    }
    await db.tags.add(tag)
    await expect(
      db.tags.add({ ...tag, id: crypto.randomUUID(), name: ' MERCADO ' }),
    ).rejects.toMatchObject({ name: 'ConstraintError' })
    expect(await db.tags.count()).toBe(1)
    await expect(
      db.tags.add({ ...tag, id: crypto.randomUUID(), name: 'Feira', nameKey: 'feira' }),
    ).resolves.toBeDefined()
  })

  // RF-07 / §6.5 — pendências procuram o lançamento por [recurringId+recurringPeriod].
  it('o índice composto [recurringId+recurringPeriod] encontra a ocorrência do mês', async () => {
    await db.transactions.bulkAdd([
      makeTransaction({ id: 'a', recurringId: 'rec-1', recurringPeriod: '2026-10' }),
      makeTransaction({ id: 'b', recurringId: 'rec-1', recurringPeriod: '2026-11' }),
      makeTransaction({ id: 'c', recurringId: 'rec-2', recurringPeriod: '2026-10' }),
      makeTransaction({ id: 'd' }), // avulso: recurringId nulo fica fora do índice
    ])
    const found = await db.transactions
      .where('[recurringId+recurringPeriod]')
      .equals(['rec-1', '2026-10'])
      .toArray()
    expect(found.map((transaction) => transaction.id)).toEqual(['a'])
    // Índice não único: o esquema não impede duas ocorrências do mesmo mês (a regra fica
    // na camada de repositório, Fase 9).
    expect(db.transactions.schema.idxByName['[recurringId+recurringPeriod]'].unique).toBeFalsy()
  })

  it('os índices simples respondem às consultas das telas', async () => {
    await db.transactions.bulkAdd([
      makeTransaction({ id: 'x', date: '2026-10-01', type: 'income', tagId: 't1' }),
      makeTransaction({ id: 'y', date: '2026-10-31', installmentGroupId: 'g1' }),
      makeTransaction({ id: 'z', date: '2026-11-01', tagId: 't1' }),
    ])
    const october = await db.transactions
      .where('date')
      .between('2026-10-01', '2026-10-31', true, true)
      .primaryKeys()
    expect(october.sort()).toEqual(['x', 'y'])
    expect(await db.transactions.where('tagId').equals('t1').count()).toBe(2)
    expect(await db.transactions.where('type').equals('income').primaryKeys()).toEqual(['x'])
    expect(await db.transactions.where('installmentGroupId').equals('g1').primaryKeys()).toEqual([
      'y',
    ])
  })

  // Princípio 9 — IDs são UUID gerados pelo app: nenhuma tabela usa auto incremento.
  it('nenhuma tabela usa chave auto incrementada', () => {
    for (const table of db.tables) {
      expect(table.schema.primKey.auto).toBe(false)
    }
  })
})
