import { afterEach, describe, expect, it, vi } from 'vitest'
import { db, SCHEMA_VERSION } from '@/db/database'
import {
  BACKUP_APP_ID,
  InvalidBackupFileError,
  MAX_BACKUP_FILE_BYTES,
  type BackupData,
} from '@/lib/backupFormat'
import { decryptBackupText, encryptBackupText, type BackupEnvelope } from '@/lib/crypto'
import {
  createBackupFile,
  deliverBackupFile,
  openBackupFile,
  restoreBackup,
} from '@/repositories/backupRepository'
import { generateBackupDataset, type BackupDataset } from '@/test/backupDataset'
import { makeInstallmentGroup, makeRecurring, makeTag, makeTransaction } from '@/test/factories'

// RF-10 / §6.8 / D-07 / D-47 — auditoria do repositório do backup com fake-indexeddb:
// ida e volta com dados gerados por semente (CA-10.1), substituição total (D-07),
// preferências do aparelho preservadas, atomicidade em cada etapa (princípio 8),
// lastBackupAt só depois de salvar (§6.8 passo 8) e nenhuma chamada de rede (princípio 5).

const FAST = { iterations: 1 }
const PASSWORD = 'senha do teste ç 🔑'
const DEVICE_LAST_BACKUP = '2026-10-20T08:00:00.000Z'
const DEVICE_PERSIST = '2026-09-01T12:00:00.000Z'
const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (ORIGINAL_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIGINAL_TZ
})

async function seed(dataset: BackupDataset): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await db.tags.bulkAdd(dataset.tags)
    await db.recurrings.bulkAdd(dataset.recurrings)
    await db.installmentGroups.bulkAdd(dataset.installmentGroups)
    await db.transactions.bulkAdd(dataset.transactions)
    await db.settings.bulkPut(dataset.settings)
  })
}

async function clearAll(): Promise<void> {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())))
}

/** Cada tabela como um mapa id → registro (comparação campo a campo por id). */
async function tablesById() {
  const toMap = <T extends { id: string }>(rows: T[]) =>
    Object.fromEntries(rows.map((row) => [row.id, row]))
  return {
    tags: toMap(await db.tags.toArray()),
    transactions: toMap(await db.transactions.toArray()),
    recurrings: toMap(await db.recurrings.toArray()),
    installmentGroups: toMap(await db.installmentGroups.toArray()),
    settings: Object.fromEntries((await db.settings.toArray()).map((s) => [s.key, s.value])),
  }
}

function datasetById(dataset: BackupDataset) {
  const toMap = <T extends { id: string }>(rows: T[]) =>
    Object.fromEntries(rows.map((row) => [row.id, row]))
  return {
    tags: toMap(dataset.tags),
    transactions: toMap(dataset.transactions),
    recurrings: toMap(dataset.recurrings),
    installmentGroups: toMap(dataset.installmentGroups),
  }
}

async function fileWithContent(content: unknown): Promise<File> {
  const envelope = await encryptBackupText(JSON.stringify(content), PASSWORD, FAST)
  return new File([JSON.stringify(envelope)], 'gastos-backup.json')
}

describe('CA-10.1 — exportar → limpar → importar com dados gerados por semente', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
    'semente %i: as 5 tabelas voltam idênticas',
    async (seedValue) => {
      const dataset = generateBackupDataset(seedValue)
      await seed(dataset)
      const file = await createBackupFile(PASSWORD, FAST)

      await clearAll()
      await db.settings.bulkPut([
        { key: 'lastBackupAt', value: DEVICE_LAST_BACKUP },
        { key: 'persistRequested', value: DEVICE_PERSIST },
      ])
      const content = await openBackupFile(file, PASSWORD)
      const theme = await restoreBackup(content.data)

      const restored = await tablesById()
      const expected = datasetById(dataset)
      expect(restored.tags).toStrictEqual(expected.tags)
      expect(restored.transactions).toStrictEqual(expected.transactions)
      expect(restored.recurrings).toStrictEqual(expected.recurrings)
      expect(restored.installmentGroups).toStrictEqual(expected.installmentGroups)
      for (const recurring of dataset.recurrings) {
        expect(restored.recurrings[recurring.id].amounts).toStrictEqual(recurring.amounts)
        expect(restored.recurrings[recurring.id].skippedPeriods).toStrictEqual(
          recurring.skippedPeriods,
        )
      }
      // Tema do backup (ou o padrão "system"); as chaves do aparelho continuam as dele.
      const exportedTheme = dataset.settings.find((s) => s.key === 'theme')?.value ?? 'system'
      expect(theme).toBe(exportedTheme)
      expect(restored.settings).toStrictEqual({
        theme: exportedTheme,
        lastBackupAt: DEVICE_LAST_BACKUP,
        persistRequested: DEVICE_PERSIST,
      })
    },
  )

  it('volume maior (até 2.000 lançamentos) também volta idêntico', async () => {
    const dataset = generateBackupDataset(99, { maxTransactions: 2000 })
    await seed(dataset)
    const file = await createBackupFile(PASSWORD, FAST)
    await clearAll()
    await restoreBackup((await openBackupFile(file, PASSWORD)).data)
    expect((await tablesById()).transactions).toStrictEqual(datasetById(dataset).transactions)
  })

  it('uma implementação independente (crypto.subtle direto) abre o arquivo exportado', async () => {
    const dataset = generateBackupDataset(21)
    await seed(dataset)
    const envelope = JSON.parse(
      await (await createBackupFile(PASSWORD, FAST)).text(),
    ) as BackupEnvelope
    const raw = (b64: string) => new Uint8Array(Buffer.from(b64, 'base64'))
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PASSWORD),
      'PBKDF2',
      false,
      ['deriveBits'],
    )
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: raw(envelope.kdf.salt),
        iterations: envelope.kdf.iterations,
      },
      passwordKey,
      256,
    )
    const key = await crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt'])
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw(envelope.cipher.iv) },
      key,
      raw(envelope.ciphertext),
    )
    const content = JSON.parse(new TextDecoder().decode(plaintext))
    expect(content.app).toBe('app-gastos')
    expect(content.schemaVersion).toBe(SCHEMA_VERSION)
    expect(content.data.transactions).toHaveLength(dataset.transactions.length)
  })
})

describe('arquivo exportado (§6.8)', () => {
  it('envelope com exatamente os campos da §6.8; createdAt e nome do arquivo na data local', async () => {
    // Principio 2: 20h de 17/10 em Los Angeles já é 18/10 em UTC; o nome usa a data local.
    process.env.TZ = 'America/Los_Angeles'
    const now = new Date(2026, 9, 17, 20, 0)
    const file = await createBackupFile(PASSWORD, { ...FAST, now })
    expect(file.name).toBe('gastos-backup-2026-10-17.json')
    expect(file.type).toBe('application/json')
    const envelope = JSON.parse(await file.text()) as Record<string, unknown>
    expect(Object.keys(envelope).sort()).toEqual(
      ['cipher', 'ciphertext', 'createdAt', 'format', 'formatVersion', 'kdf'].sort(),
    )
    expect(envelope.createdAt).toBe('2026-10-17T20:00:00-07:00')
  })

  it('createdAt e exportedAt no formato do exemplo da §6.8 (-03:00)', async () => {
    process.env.TZ = 'America/Sao_Paulo'
    const now = new Date(2026, 9, 17, 15, 5)
    const envelope = JSON.parse(
      await (await createBackupFile(PASSWORD, { ...FAST, now })).text(),
    ) as BackupEnvelope
    expect(envelope.createdAt).toBe('2026-10-17T15:05:00-03:00')
    const content = JSON.parse(await decryptBackupText(envelope, PASSWORD))
    expect(content.exportedAt).toBe('2026-10-17T15:05:00-03:00')
  })

  it('o conteúdo leva só o tema em settings, sem lastBackupAt nem persistRequested', async () => {
    const dataset = generateBackupDataset(3)
    dataset.settings = [
      { key: 'theme', value: 'dark' },
      { key: 'lastBackupAt', value: DEVICE_LAST_BACKUP },
      { key: 'persistRequested', value: DEVICE_PERSIST },
    ]
    await seed(dataset)
    const envelope = JSON.parse(
      await (await createBackupFile(PASSWORD, FAST)).text(),
    ) as BackupEnvelope
    const plaintext = await decryptBackupText(envelope, PASSWORD)
    expect(JSON.parse(plaintext).data.settings).toStrictEqual([{ key: 'theme', value: 'dark' }])
    for (const local of ['lastBackupAt', 'persistRequested', DEVICE_LAST_BACKUP, DEVICE_PERSIST]) {
      expect(plaintext).not.toContain(local)
    }
  })

  // RNF-05 — sal e IV novos em cada exportação.
  it('em 50 exportações nenhum sal nem IV se repete', async () => {
    await seed(generateBackupDataset(5))
    const envelopes: BackupEnvelope[] = []
    for (let index = 0; index < 50; index++) {
      envelopes.push(JSON.parse(await (await createBackupFile(PASSWORD, FAST)).text()))
    }
    expect(new Set(envelopes.map((e) => e.kdf.salt)).size).toBe(50)
    expect(new Set(envelopes.map((e) => e.cipher.iv)).size).toBe(50)
  })
})

describe('princípio 5 — nenhuma chamada de rede ao exportar e importar', () => {
  it('fetch, XMLHttpRequest e sendBeacon não são usados', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('rede proibida')))
    const xhrSpy = vi.fn()
    const beaconSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubGlobal('XMLHttpRequest', xhrSpy)
    vi.stubGlobal('navigator', { sendBeacon: beaconSpy })

    await seed(generateBackupDataset(8))
    const file = await createBackupFile(PASSWORD, FAST)
    await deliverBackupFile(file, async () => 'downloaded')
    const content = await openBackupFile(file, PASSWORD)
    await restoreBackup(content.data)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
    expect(beaconSpy).not.toHaveBeenCalled()
  })
})

describe('D-07 — a importação substitui tudo', () => {
  it('registros que existiam antes e não estão no backup somem', async () => {
    const dataset = generateBackupDataset(12)
    await seed(dataset)
    const file = await createBackupFile(PASSWORD, FAST)

    // Dados criados depois do backup, em todas as tabelas, com nameKey que existe no backup
    // trocado de dono (o índice único não pode impedir a substituição).
    const extraTag = makeTag({ name: 'Extra depois do backup' })
    const extraRecurring = makeRecurring({ tagId: extraTag.id })
    const extraGroup = makeInstallmentGroup({ tagId: extraTag.id })
    const extraTransaction = makeTransaction({ tagId: extraTag.id })
    await db.tags.add(extraTag)
    await db.recurrings.add(extraRecurring)
    await db.installmentGroups.add(extraGroup)
    await db.transactions.add(extraTransaction)
    await db.tags.delete(dataset.tags[0].id)
    await db.tags.add(makeTag({ name: dataset.tags[0].name }))

    await restoreBackup((await openBackupFile(file, PASSWORD)).data)

    const restored = await tablesById()
    const expected = datasetById(dataset)
    expect(restored.tags).toStrictEqual(expected.tags)
    expect(restored.transactions).toStrictEqual(expected.transactions)
    expect(restored.recurrings).toStrictEqual(expected.recurrings)
    expect(restored.installmentGroups).toStrictEqual(expected.installmentGroups)
    expect(await db.tags.get(extraTag.id)).toBeUndefined()
    expect(await db.transactions.get(extraTransaction.id)).toBeUndefined()
  })

  it('lastBackupAt e persistRequested do aparelho ficam como estão (D-47 d)', async () => {
    const dataset = generateBackupDataset(13)
    dataset.settings = [
      { key: 'theme', value: 'light' },
      { key: 'lastBackupAt', value: '2020-01-01T00:00:00.000Z' },
      { key: 'persistRequested', value: '2020-01-01T00:00:00.000Z' },
    ]
    await seed(dataset)
    const file = await createBackupFile(PASSWORD, FAST)
    await db.settings.bulkPut([
      { key: 'theme', value: 'dark' },
      { key: 'lastBackupAt', value: DEVICE_LAST_BACKUP },
      { key: 'persistRequested', value: DEVICE_PERSIST },
    ])

    await restoreBackup((await openBackupFile(file, PASSWORD)).data)

    expect((await tablesById()).settings).toStrictEqual({
      theme: 'light',
      lastBackupAt: DEVICE_LAST_BACKUP,
      persistRequested: DEVICE_PERSIST,
    })
  })

  it.each(['lastBackupAt', 'persistRequested'] as const)(
    'arquivo que traz %s em settings → "Arquivo inválido" e nada muda (D-47 d)',
    async (key) => {
      const dataset = generateBackupDataset(14)
      await seed(dataset)
      const before = await tablesById()
      const file = await fileWithContent({
        app: BACKUP_APP_ID,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: '2026-10-17T15:05:00-03:00',
        data: {
          tags: dataset.tags,
          transactions: dataset.transactions,
          recurrings: dataset.recurrings,
          installmentGroups: dataset.installmentGroups,
          settings: [{ key, value: '2030-01-01T00:00:00.000Z' }],
        },
      })
      await expect(openBackupFile(file, PASSWORD)).rejects.toThrow('Arquivo inválido')
      expect(await tablesById()).toStrictEqual(before)
    },
  )
})

describe('openBackupFile — limite de tamanho e arquivos estranhos (CA-10.3)', () => {
  it('exatamente 50 MB ainda é lido; 1 byte a mais é recusado sem ler', async () => {
    const realText = await (await createBackupFile(PASSWORD, FAST)).text()
    const atLimit = { size: MAX_BACKUP_FILE_BYTES, text: vi.fn(async () => realText) }
    await expect(openBackupFile(atLimit as unknown as Blob, PASSWORD)).resolves.toMatchObject({
      app: BACKUP_APP_ID,
    })
    const overLimit = { size: MAX_BACKUP_FILE_BYTES + 1, text: vi.fn(async () => realText) }
    await expect(openBackupFile(overLimit as unknown as Blob, PASSWORD)).rejects.toBeInstanceOf(
      InvalidBackupFileError,
    )
    expect(overLimit.text).not.toHaveBeenCalled()
  })

  it.each([
    ['imagem PNG', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])],
    ['arquivo vazio', new Uint8Array([])],
    ['CSV', new TextEncoder().encode('data;valor\n2026-10-17;19,99')],
  ])('%s → "Arquivo inválido"', async (_, bytes) => {
    await expect(openBackupFile(new File([bytes], 'x.json'), PASSWORD)).rejects.toThrow(
      'Arquivo inválido',
    )
  })
})

describe('restoreBackup é atômico em cada etapa (princípio 8 / D-07)', () => {
  type Step = [string, () => unknown]
  const steps: Step[] = [
    ['limpeza de tags', () => vi.spyOn(db.tags, 'clear')],
    ['limpeza de lançamentos', () => vi.spyOn(db.transactions, 'clear')],
    ['limpeza de recorrentes', () => vi.spyOn(db.recurrings, 'clear')],
    ['limpeza de parcelamentos', () => vi.spyOn(db.installmentGroups, 'clear')],
    ['bulkAdd de tags', () => vi.spyOn(db.tags, 'bulkAdd')],
    ['bulkAdd de recorrentes', () => vi.spyOn(db.recurrings, 'bulkAdd')],
    ['bulkAdd de parcelamentos', () => vi.spyOn(db.installmentGroups, 'bulkAdd')],
    ['bulkAdd de lançamentos', () => vi.spyOn(db.transactions, 'bulkAdd')],
    ['gravação do tema', () => vi.spyOn(db.settings, 'put')],
  ]

  it.each(steps)('falha na %s → banco intacto e espelho do tema intocado', async (_, spyOn) => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem, getItem: vi.fn() })
    const backup = generateBackupDataset(31)
    backup.settings = [{ key: 'theme', value: 'dark' }]
    await seed(backup)
    const file = await createBackupFile(PASSWORD, FAST)
    const data = (await openBackupFile(file, PASSWORD)).data

    // Banco atual diferente do backup.
    await clearAll()
    await seed({ ...generateBackupDataset(32), settings: [{ key: 'theme', value: 'light' }] })
    const before = await tablesById()

    const spy = spyOn() as { mockRejectedValueOnce: (error: Error) => void }
    spy.mockRejectedValueOnce(new Error('falha simulada'))
    await expect(restoreBackup(data)).rejects.toThrow('falha simulada')

    expect(await tablesById()).toStrictEqual(before)
    expect(setItem).not.toHaveBeenCalled()
  })

  it.each<[string, (data: BackupData) => void]>([
    ['nameKey repetido (índice &nameKey)', (d) => d.tags.push({ ...d.tags[0], id: 'tag-dup' })],
    ['id de lançamento repetido', (d) => d.transactions.push({ ...d.transactions[0] })],
  ])('erro real do IndexedDB (%s) → banco intacto', async (_, corrupt) => {
    const backup = generateBackupDataset(41)
    if (backup.transactions.length === 0)
      backup.transactions.push(makeTransaction({ tagId: backup.tags[0].id }))
    await seed(backup)
    const data = (await openBackupFile(await createBackupFile(PASSWORD, FAST), PASSWORD)).data
    corrupt(data)

    await clearAll()
    await seed(generateBackupDataset(42))
    const before = await tablesById()

    await expect(restoreBackup(data)).rejects.toThrow()
    expect(await tablesById()).toStrictEqual(before)
  })
})

describe('lastBackupAt só depois de salvar (§6.8 passo 8)', () => {
  const file = new File(['{}'], 'gastos-backup-2026-10-17.json')

  it('falha inesperada ao compartilhar → erro relançado e nada gravado', async () => {
    await expect(
      deliverBackupFile(file, () => Promise.reject(new TypeError('falhou'))),
    ).rejects.toBeInstanceOf(TypeError)
    expect(await db.settings.get('lastBackupAt')).toBeUndefined()
  })

  it('cancelar ou bloquear não sobrescreve um lastBackupAt anterior', async () => {
    await db.settings.put({ key: 'lastBackupAt', value: DEVICE_LAST_BACKUP })
    for (const outcome of ['cancelled', 'blocked'] as const) {
      await deliverBackupFile(file, async () => outcome)
    }
    expect((await db.settings.get('lastBackupAt'))?.value).toBe(DEVICE_LAST_BACKUP)
  })

  it('compartilhar grava a data atual (relógio controlado)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T13:45:00.000Z'))
    try {
      await deliverBackupFile(file, async () => 'shared')
    } finally {
      vi.useRealTimers()
    }
    expect((await db.settings.get('lastBackupAt'))?.value).toBe('2026-10-22T13:45:00.000Z')
  })
})
