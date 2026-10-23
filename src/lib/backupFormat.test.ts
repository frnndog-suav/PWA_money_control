import { describe, expect, it } from 'vitest'
import { toTagNameKey } from '@/domain/tags'
import {
  BACKUP_APP_ID,
  backupFileName,
  buildBackupContent,
  hasReferentialIntegrity,
  InvalidBackupFileError,
  MAX_PBKDF2_ITERATIONS,
  migrateBackupContent,
  NewerBackupVersionError,
  parseBackupContent,
  parseBackupEnvelope,
  selectBackupSettings,
  summarizeBackup,
  type BackupData,
  type BackupMigration,
  type BackupTables,
} from '@/lib/backupFormat'
import { bytesToBase64, type BackupEnvelope } from '@/lib/crypto'
import { makeInstallmentGroup, makeRecurring, makeTag, makeTransaction } from '@/test/factories'

// RF-10 / §6.8 — formato do backup: envelope, conteúdo, versões e integridade.

const SCHEMA_VERSION = 1

function validEnvelope(overrides: Partial<BackupEnvelope> = {}): BackupEnvelope {
  return {
    format: 'app-gastos-backup',
    formatVersion: 1,
    createdAt: '2026-10-17T15:05:00-03:00',
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600_000,
      salt: bytesToBase64(new Uint8Array(16)),
    },
    cipher: { name: 'AES-GCM', length: 256, iv: bytesToBase64(new Uint8Array(12)) },
    ciphertext: bytesToBase64(new Uint8Array(32)),
    ...overrides,
  }
}

function sampleTables(): BackupTables {
  const tag = makeTag()
  const recurring = makeRecurring({
    tagId: tag.id,
    amounts: [
      { fromPeriod: '2026-01', amountCents: 5000 },
      { fromPeriod: '2026-06', amountCents: 5500 },
    ],
    skippedPeriods: ['2026-03'],
  })
  const group = makeInstallmentGroup({ tagId: tag.id })
  return {
    tags: [tag],
    recurrings: [recurring],
    installmentGroups: [group],
    transactions: [
      makeTransaction({ tagId: tag.id }),
      makeTransaction({ tagId: tag.id, recurringId: recurring.id, recurringPeriod: '2026-02' }),
      makeTransaction({ tagId: tag.id, installmentGroupId: group.id, installmentNumber: 1 }),
    ],
    settings: [
      { key: 'theme', value: 'dark' },
      { key: 'lastBackupAt', value: '2026-10-01T10:00:00.000Z' },
      { key: 'persistRequested', value: '2026-10-01T10:00:00.000Z' },
    ],
  }
}

const NOW = new Date(2026, 9, 17, 15, 5)

function contentJson(tables: BackupTables = sampleTables(), schemaVersion = SCHEMA_VERSION) {
  return JSON.stringify(buildBackupContent(tables, { schemaVersion, now: NOW }))
}

function dataWith(change: (data: BackupData) => void): BackupData {
  const data = buildBackupContent(sampleTables(), { schemaVersion: 1 }).data
  change(data)
  return data
}

describe('parseBackupEnvelope (§6.8 passo 2 / CA-10.3)', () => {
  it('aceita o envelope da §6.8', () => {
    const envelope = validEnvelope()
    expect(parseBackupEnvelope(JSON.stringify(envelope))).toEqual(envelope)
  })

  it.each<[string, string]>([
    ['texto que não é JSON', 'isto não é um backup'],
    ['JSON qualquer', JSON.stringify({ nome: 'planilha', itens: [1, 2, 3] })],
    ['JSON que não é objeto', '[1, 2, 3]'],
    ['nulo', 'null'],
    ['outro formato', JSON.stringify(validEnvelope({ format: 'outro' as 'app-gastos-backup' }))],
    ['outra versão do formato', JSON.stringify({ ...validEnvelope(), formatVersion: 2 })],
    ['sem texto cifrado', JSON.stringify({ ...validEnvelope(), ciphertext: undefined })],
    [
      'texto cifrado curto',
      JSON.stringify(validEnvelope({ ciphertext: bytesToBase64(new Uint8Array(15)) })),
    ],
    ['texto cifrado fora de base64', JSON.stringify(validEnvelope({ ciphertext: 'não-base64!' }))],
    ['sem kdf', JSON.stringify({ ...validEnvelope(), kdf: undefined })],
    [
      'sal de 8 bytes',
      JSON.stringify(
        validEnvelope({ kdf: { ...validEnvelope().kdf, salt: bytesToBase64(new Uint8Array(8)) } }),
      ),
    ],
    [
      'IV de 16 bytes',
      JSON.stringify(
        validEnvelope({
          cipher: { ...validEnvelope().cipher, iv: bytesToBase64(new Uint8Array(16)) },
        }),
      ),
    ],
    [
      'hash diferente',
      JSON.stringify({ ...validEnvelope(), kdf: { ...validEnvelope().kdf, hash: 'SHA-1' } }),
    ],
    [
      'chave de 128 bits',
      JSON.stringify({ ...validEnvelope(), cipher: { ...validEnvelope().cipher, length: 128 } }),
    ],
    [
      'iterações zero',
      JSON.stringify(validEnvelope({ kdf: { ...validEnvelope().kdf, iterations: 0 } })),
    ],
    [
      'iterações acima do teto',
      JSON.stringify(
        validEnvelope({ kdf: { ...validEnvelope().kdf, iterations: MAX_PBKDF2_ITERATIONS + 1 } }),
      ),
    ],
    [
      'iterações fracionárias',
      JSON.stringify(validEnvelope({ kdf: { ...validEnvelope().kdf, iterations: 1.5 } })),
    ],
  ])('%s → "Arquivo inválido"', (_, text) => {
    expect(() => parseBackupEnvelope(text)).toThrow(InvalidBackupFileError)
    expect(() => parseBackupEnvelope(text)).toThrow('Arquivo inválido')
  })
})

describe('buildBackupContent / selectBackupSettings (§6.8)', () => {
  it('monta o conteúdo em claro com as 5 tabelas e só o tema em settings', () => {
    const tables = sampleTables()
    const content = buildBackupContent(tables, { schemaVersion: SCHEMA_VERSION, now: NOW })
    expect(content.app).toBe(BACKUP_APP_ID)
    expect(content.schemaVersion).toBe(SCHEMA_VERSION)
    expect(content.exportedAt).toMatch(/^2026-10-17T15:05:00(Z|[+-]\d{2}:\d{2})$/)
    expect(Object.keys(content.data)).toEqual([
      'tags',
      'transactions',
      'recurrings',
      'installmentGroups',
      'settings',
    ])
    expect(content.data.tags).toEqual(tables.tags)
    expect(content.data.transactions).toEqual(tables.transactions)
    expect(content.data.recurrings).toEqual(tables.recurrings)
    expect(content.data.installmentGroups).toEqual(tables.installmentGroups)
    expect(content.data.settings).toEqual([{ key: 'theme', value: 'dark' }])
  })

  it('usa a data e hora atuais por padrão', () => {
    const content = buildBackupContent(sampleTables(), { schemaVersion: 1 })
    expect(Number.isNaN(Date.parse(content.exportedAt))).toBe(false)
  })

  it('deixa de fora lastBackupAt, persistRequested e um tema inválido', () => {
    expect(selectBackupSettings([])).toEqual([])
    expect(selectBackupSettings([{ key: 'lastBackupAt', value: 'x' }])).toEqual([])
    expect(selectBackupSettings([{ key: 'theme', value: 'roxo' }])).toEqual([])
    expect(selectBackupSettings([{ key: 'theme', value: 'system' }])).toEqual([
      { key: 'theme', value: 'system' },
    ])
  })
})

describe('backupFileName (RF-10)', () => {
  it('gastos-backup-YYYY-MM-DD.json com a data informada ou a de hoje', () => {
    expect(backupFileName('2026-10-17')).toBe('gastos-backup-2026-10-17.json')
    expect(backupFileName()).toMatch(/^gastos-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })
})

describe('parseBackupContent (§6.8 passos 4 e 5)', () => {
  // CA-10.1 — o conteúdo exportado volta idêntico.
  it('devolve o conteúdo válido do esquema atual', () => {
    const tables = sampleTables()
    const content = parseBackupContent(contentJson(tables), { schemaVersion: SCHEMA_VERSION })
    expect(content).toEqual(buildBackupContent(tables, { schemaVersion: SCHEMA_VERSION, now: NOW }))
  })

  // CA-10.5
  it('recusa backup de esquema mais novo', () => {
    const json = contentJson(sampleTables(), SCHEMA_VERSION + 1)
    expect(() => parseBackupContent(json, { schemaVersion: SCHEMA_VERSION })).toThrow(
      NewerBackupVersionError,
    )
    expect(() => parseBackupContent(json, { schemaVersion: SCHEMA_VERSION })).toThrow(
      'Backup de uma versão mais nova do app. Atualize o app e tente novamente.',
    )
  })

  // CA-10.4 — migração fictícia injetada: v1 → v2 → v3 em cadeia antes da validação.
  it('migra backups de esquemas anteriores em cadeia', () => {
    const calls: number[] = []
    const migrations: Record<number, BackupMigration> = {
      1: (content) => {
        calls.push(1)
        const data = content.data as { tags: { name: string }[] }
        return {
          ...content,
          // O nameKey acompanha o nome (D-47 c).
          data: {
            ...data,
            tags: data.tags.map((t) => {
              const name = `${t.name} (v2)`
              return { ...t, name, nameKey: toTagNameKey(name) }
            }),
          },
        }
      },
      2: (content) => {
        expect(content.schemaVersion).toBe(2)
        calls.push(2)
        return content
      },
    }
    const tables = sampleTables()
    const content = parseBackupContent(contentJson(tables, 1), { schemaVersion: 3, migrations })
    expect(calls).toEqual([1, 2])
    expect(content.schemaVersion).toBe(3)
    expect(content.data.tags[0].name).toBe(`${tables.tags[0].name} (v2)`)
  })

  it('sem a migração de uma versão intermediária → "Arquivo inválido"', () => {
    expect(() =>
      parseBackupContent(contentJson(sampleTables(), 1), { schemaVersion: 2, migrations: {} }),
    ).toThrow(InvalidBackupFileError)
  })

  it('a estrutura de migrações começa vazia (só existe o esquema 1)', () => {
    const content = { schemaVersion: 1 }
    expect(migrateBackupContent(content, 1, 1)).toBe(content)
    expect(() => migrateBackupContent(content, 1, 2)).toThrow(InvalidBackupFileError)
  })

  it.each<[string, string]>([
    ['texto que não é JSON', '{ quebrado'],
    ['outro app', JSON.stringify({ app: 'outro', schemaVersion: 1, exportedAt: '', data: {} })],
    ['sem versão', JSON.stringify({ app: BACKUP_APP_ID, data: {} })],
    [
      'sem dados',
      JSON.stringify({ app: BACKUP_APP_ID, schemaVersion: 1, exportedAt: '2026-10-17T15:05:00Z' }),
    ],
  ])('%s → "Arquivo inválido"', (_, json) => {
    expect(() => parseBackupContent(json, { schemaVersion: SCHEMA_VERSION })).toThrow(
      InvalidBackupFileError,
    )
  })

  it.each<[string, (data: BackupData) => void]>([
    ['valor zero', (d) => (d.transactions[0].amountCents = 0)],
    ['valor negativo', (d) => (d.transactions[0].amountCents = -100)],
    ['valor fracionário', (d) => (d.transactions[0].amountCents = 10.5)],
    [
      'valor acima do inteiro seguro',
      (d) => (d.transactions[0].amountCents = Number.MAX_SAFE_INTEGER + 2),
    ],
    [
      'valor em texto',
      (d) => ((d.transactions[0] as unknown as { amountCents: string }).amountCents = '1000'),
    ],
    ['data inexistente', (d) => (d.transactions[0].date = '2026-02-30')],
    [
      'tipo desconhecido',
      (d) => ((d.transactions[0] as unknown as { type: string }).type = 'transfer'),
    ],
    ['descrição vazia', (d) => (d.transactions[0].description = '')],
    ['recorrente sem mês', (d) => (d.transactions[1].recurringPeriod = null)],
    ['parcela sem número', (d) => (d.transactions[2].installmentNumber = null)],
    ['cor inválida', (d) => (d.tags[0].color = 'verde')],
    ['data de criação inválida', (d) => (d.tags[0].createdAt = 'ontem')],
    ['recorrente sem valores', (d) => (d.recurrings[0].amounts = [])],
    ['mês pulado inválido', (d) => (d.recurrings[0].skippedPeriods = ['2026-13'])],
    ['valor do recorrente zero', (d) => (d.recurrings[0].amounts[0].amountCents = 0)],
    ['parcelamento com 1 parcela', (d) => (d.installmentGroups[0].count = 1)],
    ['parcelamento com 49 parcelas', (d) => (d.installmentGroups[0].count = 49)],
    ['total do parcelamento zero', (d) => (d.installmentGroups[0].totalCents = 0)],
    [
      'outra chave em settings',
      (d) => ((d.settings as unknown as { key: string }[])[0].key = 'lastBackupAt'),
    ],
    [
      'tema desconhecido',
      (d) => ((d.settings as unknown as { value: string }[])[0].value = 'roxo'),
    ],
    ['tabela faltando', (d) => delete (d as Partial<BackupData>).recurrings],
    // D-47 (c) — nameKey derivado do nome (§6.3).
    ['nameKey diferente do nome', (d) => (d.tags[0].nameKey = 'outra coisa')],
    ['nameKey com acento', (d) => Object.assign(d.tags[0], { name: 'Café', nameKey: 'café' })],
    // D-47 (c) — ordem dos valores do recorrente (§6.3).
    ['1º valor depois do início', (d) => (d.recurrings[0].amounts[0].fromPeriod = '2026-02')],
    [
      'valores fora de ordem',
      (d) => d.recurrings[0].amounts.push({ fromPeriod: '2026-03', amountCents: 100 }),
    ],
    [
      'dois valores no mesmo mês',
      (d) => (d.recurrings[0].amounts[1].fromPeriod = d.recurrings[0].amounts[0].fromPeriod),
    ],
    ['fim antes do início', (d) => (d.recurrings[0].endPeriod = '2025-12')],
  ])('registro inválido (%s) → "Arquivo inválido"', (_, change) => {
    const content = {
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      exportedAt: '2026-10-17T15:05:00Z',
      data: dataWith(change),
    }
    expect(() =>
      parseBackupContent(JSON.stringify(content), { schemaVersion: SCHEMA_VERSION }),
    ).toThrow(InvalidBackupFileError)
  })

  it('aceita nameKey derivado de nome com acento e fim igual ao início', () => {
    const data = dataWith((d) => {
      Object.assign(d.tags[0], { name: '  Café da Manhã ', nameKey: 'cafe da manha' })
      d.recurrings[0].endPeriod = d.recurrings[0].startPeriod
    })
    const content = {
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      exportedAt: '2026-10-17T15:05:00Z',
      data,
    }
    expect(
      parseBackupContent(JSON.stringify(content), { schemaVersion: SCHEMA_VERSION }).data,
    ).toEqual(data)
  })

  it('integridade quebrada → "Arquivo inválido"', () => {
    const data = dataWith((d) => (d.transactions[0].tagId = 'tag-que-nao-existe'))
    const content = {
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      exportedAt: '2026-10-17T15:05:00Z',
      data,
    }
    expect(() =>
      parseBackupContent(JSON.stringify(content), { schemaVersion: SCHEMA_VERSION }),
    ).toThrow(InvalidBackupFileError)
  })
})

describe('hasReferentialIntegrity (§6.8 passo 5)', () => {
  it('aceita dados consistentes e tabelas vazias', () => {
    expect(hasReferentialIntegrity(dataWith(() => {}))).toBe(true)
    expect(
      hasReferentialIntegrity({
        tags: [],
        transactions: [],
        recurrings: [],
        installmentGroups: [],
        settings: [],
      }),
    ).toBe(true)
  })

  it.each<[string, (data: BackupData) => void]>([
    ['tagId de lançamento inexistente', (d) => (d.transactions[0].tagId = 'x')],
    ['tagId de recorrente inexistente', (d) => (d.recurrings[0].tagId = 'x')],
    ['tagId de parcelamento inexistente', (d) => (d.installmentGroups[0].tagId = 'x')],
    ['recurringId inexistente', (d) => (d.transactions[1].recurringId = 'x')],
    ['installmentGroupId inexistente', (d) => (d.transactions[2].installmentGroupId = 'x')],
    ['id de tag repetido', (d) => d.tags.push({ ...d.tags[0], nameKey: 'outra' })],
    ['nome de tag repetido', (d) => d.tags.push({ ...d.tags[0], id: 'outra-tag' })],
    ['id de lançamento repetido', (d) => d.transactions.push({ ...d.transactions[0] })],
    ['id de recorrente repetido', (d) => d.recurrings.push({ ...d.recurrings[0] })],
    ['id de parcelamento repetido', (d) => d.installmentGroups.push({ ...d.installmentGroups[0] })],
    // D-47 (c) — §6.3: parcela de 1 a n.
    [
      'parcela acima do count do parcelamento',
      (d) => (d.transactions[2].installmentNumber = d.installmentGroups[0].count + 1),
    ],
  ])('recusa %s', (_, change) => {
    expect(hasReferentialIntegrity(dataWith(change))).toBe(false)
  })
})

describe('parcela na borda (D-47 c)', () => {
  it('aceita a última parcela (n = count)', () => {
    const data = dataWith(
      (d) => (d.transactions[2].installmentNumber = d.installmentGroups[0].count),
    )
    expect(hasReferentialIntegrity(data)).toBe(true)
  })
})

describe('summarizeBackup (RF-10)', () => {
  it('data do backup e quantidades de lançamentos, tags e recorrentes', () => {
    const content = buildBackupContent(sampleTables(), { schemaVersion: 1, now: NOW })
    expect(summarizeBackup(content)).toEqual({
      exportedAt: content.exportedAt,
      transactionCount: 3,
      tagCount: 1,
      recurringCount: 1,
    })
  })
})
