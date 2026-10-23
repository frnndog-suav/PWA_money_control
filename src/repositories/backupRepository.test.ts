import { afterEach, describe, expect, it, vi } from 'vitest'
import { db, SCHEMA_VERSION } from '@/db/database'
import type { InstallmentGroup, Recurring, Setting, Tag, Transaction } from '@/domain/types'
import { BACKUP_APP_ID, InvalidBackupFileError, NewerBackupVersionError } from '@/lib/backupFormat'
import {
  BackupDecryptionError,
  base64ToBytes,
  bytesToBase64,
  encryptBackupText,
} from '@/lib/crypto'
import {
  createBackupFile,
  deliverBackupFile,
  openBackupFile,
  readBackupTables,
  recordBackupDone,
  restoreBackup,
} from '@/repositories/backupRepository'
import { makeInstallmentGroup, makeRecurring, makeTag, makeTransaction } from '@/test/factories'

// RF-10 / §6.8 — integração do backup com o Dexie (fake-indexeddb): exportar → limpar →
// importar (CA-10.1), erros sem alterar nada (CA-10.2 / CA-10.3 / CA-10.5) e importação
// atômica (D-07). Iterações reduzidas; o teste com as 600.000 reais está em crypto.test.ts.

const FAST = { iterations: 1000 }
const PASSWORD = 'minha senha secreta'
const NOW = new Date(2026, 9, 17, 15, 5)
const LAST_BACKUP_AT = '2026-10-01T12:00:00.000Z'
const PERSIST_REQUESTED = '2026-09-01T12:00:00.000Z'

interface Dataset {
  tags: Tag[]
  transactions: Transaction[]
  recurrings: Recurring[]
  installmentGroups: InstallmentGroup[]
  settings: Setting[]
}

/** Dados com todas as tabelas: recorrente com histórico de valores e meses pulados e parcelamento. */
function buildDataset(): Dataset {
  const market = makeTag({ name: 'Mercado', nameKey: 'mercado', color: '#16A34A' })
  const rent = makeTag({ name: 'Aluguel Secreto', nameKey: 'aluguel secreto', color: '#DC2626' })
  const recurring = makeRecurring({
    description: 'Aluguel do apartamento',
    tagId: rent.id,
    startPeriod: '2026-01',
    endPeriod: '2026-12',
    amounts: [
      { fromPeriod: '2026-01', amountCents: 150_000 },
      { fromPeriod: '2026-07', amountCents: 165_432 },
    ],
    skippedPeriods: ['2026-03', '2026-08'],
  })
  const group = makeInstallmentGroup({
    description: 'Geladeira parcelada',
    tagId: market.id,
    totalCents: 359_999,
    count: 3,
    firstDate: '2026-01-31',
  })
  return {
    tags: [market, rent],
    recurrings: [recurring],
    installmentGroups: [group],
    transactions: [
      makeTransaction({
        description: 'Pão de queijo da padaria',
        amountCents: 1_987,
        tagId: market.id,
      }),
      makeTransaction({
        type: 'income',
        description: 'Salário',
        amountCents: 987_654,
        date: '2026-10-05',
        tagId: market.id,
      }),
      makeTransaction({
        description: 'Aluguel do apartamento',
        amountCents: 150_000,
        date: '2026-02-10',
        tagId: rent.id,
        recurringId: recurring.id,
        recurringPeriod: '2026-02',
      }),
      makeTransaction({
        description: 'Geladeira parcelada',
        amountCents: 120_001,
        date: '2026-01-31',
        tagId: market.id,
        installmentGroupId: group.id,
        installmentNumber: 1,
      }),
      makeTransaction({
        description: 'Geladeira parcelada',
        amountCents: 119_999,
        date: '2026-02-28',
        tagId: market.id,
        installmentGroupId: group.id,
        installmentNumber: 2,
      }),
      makeTransaction({
        description: 'Geladeira parcelada',
        amountCents: 119_999,
        date: '2026-03-31',
        tagId: market.id,
        installmentGroupId: group.id,
        installmentNumber: 3,
      }),
    ],
    settings: [
      { key: 'theme', value: 'dark' },
      { key: 'lastBackupAt', value: LAST_BACKUP_AT },
      { key: 'persistRequested', value: PERSIST_REQUESTED },
    ],
  }
}

async function seed(dataset: Dataset): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await db.tags.bulkAdd(dataset.tags)
    await db.recurrings.bulkAdd(dataset.recurrings)
    await db.installmentGroups.bulkAdd(dataset.installmentGroups)
    await db.transactions.bulkAdd(dataset.transactions)
    await db.settings.bulkAdd(dataset.settings)
  })
}

async function clearAll(): Promise<void> {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())))
}

const byId = <T extends { id: string }>(items: T[]) =>
  [...items].sort((a, b) => a.id.localeCompare(b.id))

async function snapshot() {
  const tables = await readBackupTables()
  return {
    tags: byId(tables.tags),
    transactions: byId(tables.transactions),
    recurrings: byId(tables.recurrings),
    installmentGroups: byId(tables.installmentGroups),
    settings: [...tables.settings].sort((a, b) => a.key.localeCompare(b.key)),
  }
}

/** Arquivo de backup com o conteúdo em claro informado (para versões e integridade). */
async function fileWithContent(content: unknown): Promise<File> {
  const envelope = await encryptBackupText(JSON.stringify(content), PASSWORD, FAST)
  return new File([JSON.stringify(envelope)], 'gastos-backup.json')
}

async function exportedEnvelopeText(): Promise<string> {
  return (await createBackupFile(PASSWORD, { ...FAST, now: NOW })).text()
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createBackupFile (§6.8 exportar)', () => {
  it('gera gastos-backup-YYYY-MM-DD.json, application/json, com o envelope', async () => {
    await seed(buildDataset())
    const file = await createBackupFile(PASSWORD, { ...FAST, now: NOW })
    expect(file.name).toBe('gastos-backup-2026-10-17.json')
    expect(file.type).toBe('application/json')
    const envelope = JSON.parse(await file.text())
    expect(envelope.format).toBe('app-gastos-backup')
    expect(envelope.kdf.iterations).toBe(FAST.iterations)
  })

  // CA-10.6 — nenhuma descrição, valor ou nome de tag legível no arquivo.
  it('não deixa dado legível no arquivo exportado', async () => {
    const dataset = buildDataset()
    await seed(dataset)
    const text = await exportedEnvelopeText()
    const knownTexts = [
      ...dataset.tags.flatMap((tag) => [tag.name, tag.nameKey]),
      ...dataset.transactions.flatMap((t) => [t.description, String(t.amountCents)]),
      ...dataset.recurrings.flatMap((r) => [
        r.description,
        ...r.amounts.map((a) => String(a.amountCents)),
      ]),
      ...dataset.installmentGroups.flatMap((g) => [g.description, String(g.totalCents)]),
      'amountCents',
      'transactions',
      // O campo "app" do conteúdo em claro ('app-gastos' também é prefixo do "format" do envelope).
      '"app"',
    ]
    for (const known of knownTexts) expect(text).not.toContain(known)
  })

  // RNF-05 — sal e IV aleatórios por exportação.
  it('usa sal e IV diferentes a cada exportação', async () => {
    await seed(buildDataset())
    const first = JSON.parse(await exportedEnvelopeText())
    const second = JSON.parse(await exportedEnvelopeText())
    expect(first.kdf.salt).not.toBe(second.kdf.salt)
    expect(first.cipher.iv).not.toBe(second.cipher.iv)
  })
})

describe('exportar → limpar → importar (CA-10.1)', () => {
  it('todas as 5 tabelas voltam idênticas; lastBackupAt e persistRequested são do aparelho', async () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn(), getItem: vi.fn() })
    await seed(buildDataset())
    const original = await snapshot()
    const file = await createBackupFile(PASSWORD, { ...FAST, now: NOW })

    await clearAll()
    await db.settings.bulkAdd([
      { key: 'theme', value: 'light' },
      { key: 'lastBackupAt', value: '2026-10-20T08:00:00.000Z' },
    ])

    const content = await openBackupFile(file, PASSWORD)
    expect(content.schemaVersion).toBe(SCHEMA_VERSION)
    await expect(restoreBackup(content.data)).resolves.toBe('dark')

    const restored = await snapshot()
    expect(restored.tags).toEqual(original.tags)
    expect(restored.transactions).toEqual(original.transactions)
    expect(restored.recurrings).toEqual(original.recurrings)
    expect(restored.recurrings[0].amounts).toHaveLength(2)
    expect(restored.recurrings[0].skippedPeriods).toEqual(['2026-03', '2026-08'])
    expect(restored.installmentGroups).toEqual(original.installmentGroups)
    // D-28 — tema importado no Dexie e no espelho; o lastBackupAt do aparelho fica.
    expect(restored.settings).toEqual([
      { key: 'lastBackupAt', value: '2026-10-20T08:00:00.000Z' },
      { key: 'theme', value: 'dark' },
    ])
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('preserva persistRequested e importa num app vazio', async () => {
    await seed(buildDataset())
    const file = await createBackupFile(PASSWORD, { ...FAST, now: NOW })
    await clearAll()
    await db.settings.put({ key: 'persistRequested', value: PERSIST_REQUESTED })

    await restoreBackup((await openBackupFile(file, PASSWORD)).data)

    expect(await db.settings.get('persistRequested')).toEqual({
      key: 'persistRequested',
      value: PERSIST_REQUESTED,
    })
    expect(await db.settings.get('lastBackupAt')).toBeUndefined()
    expect(await db.transactions.count()).toBe(6)
  })

  it('banco vazio sem tema → backup vazio que importa o tema padrão', async () => {
    const file = await createBackupFile(PASSWORD, { ...FAST, now: NOW })
    const content = await openBackupFile(file, PASSWORD)
    expect(content.data).toEqual({
      tags: [],
      transactions: [],
      recurrings: [],
      installmentGroups: [],
      settings: [],
    })
    await seed(buildDataset())

    await expect(restoreBackup(content.data)).resolves.toBe('system')
    expect(await db.tags.count()).toBe(0)
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'system' })
  })
})

describe('erros na importação não alteram nada', () => {
  async function expectOpenToFail(file: Blob, password: string, error: new () => Error) {
    await seed(buildDataset())
    const before = await snapshot()
    await expect(openBackupFile(file, password)).rejects.toBeInstanceOf(error)
    expect(await snapshot()).toEqual(before)
  }

  // CA-10.2
  it('senha errada → BackupDecryptionError', async () => {
    const file = await createBackupFile(PASSWORD, FAST)
    await expectOpenToFail(file, 'senha errada', BackupDecryptionError)
  })

  // CA-10.2 — um bit trocado no texto cifrado.
  it('texto cifrado adulterado → BackupDecryptionError', async () => {
    const envelope = JSON.parse(await (await createBackupFile(PASSWORD, FAST)).text())
    const bytes = base64ToBytes(envelope.ciphertext)
    bytes[0] ^= 1
    const tampered = new File(
      [JSON.stringify({ ...envelope, ciphertext: bytesToBase64(bytes) })],
      'b.json',
    )
    await expectOpenToFail(tampered, PASSWORD, BackupDecryptionError)
  })

  // CA-10.3
  it.each([
    ['JSON qualquer', JSON.stringify({ lancamentos: [{ valor: 10 }] })],
    ['texto que não é JSON', 'nome;valor\nmercado;10'],
    [
      'envelope sem o texto cifrado',
      JSON.stringify({
        format: 'app-gastos-backup',
        formatVersion: 1,
        createdAt: '',
        kdf: {},
        cipher: {},
      }),
    ],
  ])('%s → InvalidBackupFileError', async (_, text) => {
    await expectOpenToFail(new File([text], 'x.json'), PASSWORD, InvalidBackupFileError)
  })

  it('arquivo grande demais → InvalidBackupFileError (sem ler o conteúdo)', async () => {
    const huge = { size: 50_000_001, text: vi.fn() } as unknown as Blob
    await expectOpenToFail(huge, PASSWORD, InvalidBackupFileError)
    expect(huge.text).not.toHaveBeenCalled()
  })

  it('conteúdo descriptografado que não é JSON → InvalidBackupFileError', async () => {
    const envelope = await encryptBackupText('não é json', PASSWORD, FAST)
    await expectOpenToFail(
      new File([JSON.stringify(envelope)], 'x.json'),
      PASSWORD,
      InvalidBackupFileError,
    )
  })

  // CA-10.5
  it('versão de esquema mais nova → NewerBackupVersionError', async () => {
    const file = await fileWithContent({
      app: BACKUP_APP_ID,
      schemaVersion: SCHEMA_VERSION + 1,
      exportedAt: '2027-01-01T00:00:00Z',
      data: {},
    })
    await expectOpenToFail(file, PASSWORD, NewerBackupVersionError)
  })

  // §6.8 passo 5
  it('integridade referencial quebrada → InvalidBackupFileError', async () => {
    const dataset = buildDataset()
    const file = await fileWithContent({
      app: BACKUP_APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '2026-10-17T15:05:00-03:00',
      data: {
        tags: [dataset.tags[0]],
        transactions: dataset.transactions,
        recurrings: dataset.recurrings,
        installmentGroups: dataset.installmentGroups,
        settings: [],
      },
    })
    await expectOpenToFail(file, PASSWORD, InvalidBackupFileError)
  })
})

describe('restoreBackup é atômico (D-07)', () => {
  it('falha no meio da gravação → banco intacto', async () => {
    await seed(buildDataset())
    const file = await createBackupFile(PASSWORD, FAST)
    const content = await openBackupFile(file, PASSWORD)
    // Muda o banco depois de exportar, para conferir que nada da importação ficou gravado.
    await db.tags.add(makeTag({ name: 'Depois do backup', nameKey: 'depois do backup' }))
    const before = await snapshot()

    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('disco cheio'))
    await expect(restoreBackup(content.data)).rejects.toThrow('disco cheio')

    expect(await snapshot()).toEqual(before)
  })
})

describe('lastBackupAt (§6.8 passo 8)', () => {
  const file = new File(['{}'], 'gastos-backup-2026-10-17.json')

  it.each(['shared', 'downloaded'] as const)('grava a data depois de %s', async (outcome) => {
    const before = Date.now()
    await expect(deliverBackupFile(file, async () => outcome)).resolves.toBe(outcome)
    const saved = (await db.settings.get('lastBackupAt'))?.value ?? ''
    expect(Date.parse(saved)).toBeGreaterThanOrEqual(before - 1000)
    expect(saved).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it.each(['cancelled', 'blocked'] as const)('não grava quando %s', async (outcome) => {
    await expect(deliverBackupFile(file, async () => outcome)).resolves.toBe(outcome)
    expect(await db.settings.get('lastBackupAt')).toBeUndefined()
  })

  it('compartilhamento cancelado (AbortError) pela Web Share API não grava', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' })
    vi.stubGlobal('navigator', { canShare: () => true, share: () => Promise.reject(abort) })
    await expect(deliverBackupFile(file)).resolves.toBe('cancelled')
    expect(await db.settings.get('lastBackupAt')).toBeUndefined()
  })

  it('recordBackupDone grava em ISO 8601', async () => {
    await recordBackupDone(new Date('2026-10-17T18:05:00.000Z'))
    expect(await db.settings.get('lastBackupAt')).toEqual({
      key: 'lastBackupAt',
      value: '2026-10-17T18:05:00.000Z',
    })
  })
})
