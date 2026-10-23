import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP_ID,
  buildBackupContent,
  InvalidBackupFileError,
  MAX_BACKUP_FILE_BYTES,
  MAX_PBKDF2_ITERATIONS,
  NewerBackupVersionError,
  parseBackupContent,
  parseBackupEnvelope,
  type BackupMigration,
} from '@/lib/backupFormat'
import { generateBackupDataset } from '@/test/backupDataset'
import { makeInstallmentGroup, makeRecurring, makeTag, makeTransaction } from '@/test/factories'

// RF-10 / §6.3 / §6.8 / D-47 — auditoria do formato: envelope, versões, migrações em cadeia,
// invariantes dos registros e integridade referencial. Tudo que não confere = "Arquivo
// inválido" (CA-10.3); versão mais nova = mensagem do CA-10.5.

const CURRENT = 1
const INVALID = 'Arquivo inválido'
const NEWER = 'Backup de uma versão mais nova do app. Atualize o app e tente novamente.'

type Json = Record<string, unknown>

const b64 = (bytes: number) => Buffer.alloc(bytes, 7).toString('base64')

function envelope(): Json {
  return {
    format: 'app-gastos-backup',
    formatVersion: 1,
    createdAt: '2026-10-17T15:05:00-03:00',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, salt: b64(16) },
    cipher: { name: 'AES-GCM', length: 256, iv: b64(12) },
    ciphertext: b64(40),
  }
}

/** Envelope válido com um caminho (`a.b`) trocado pelo valor informado. */
function envelopeWith(path: string, value: unknown): string {
  const result = envelope()
  const keys = path.split('.')
  let target = result
  for (const key of keys.slice(0, -1)) target = target[key] as Json
  target[keys[keys.length - 1]] = value
  return JSON.stringify(result)
}

function expectInvalid(run: () => unknown) {
  expect(run).toThrow(InvalidBackupFileError)
  expect(run).toThrow(INVALID)
}

describe('parseBackupEnvelope — tipos, base64 e iterações (CA-10.3 / D-47 c)', () => {
  it.each<[string, unknown]>([
    ['format', 1],
    ['format', 'APP-GASTOS-BACKUP'],
    ['formatVersion', '1'],
    ['formatVersion', 0],
    ['createdAt', 1_700_000_000],
    ['createdAt', null],
    ['kdf', 'PBKDF2'],
    ['kdf', []],
    ['kdf.name', 'pbkdf2'],
    ['kdf.name', 'scrypt'],
    ['kdf.hash', 'SHA-512'],
    ['kdf.iterations', '600000'],
    ['kdf.iterations', 0],
    ['kdf.iterations', -1],
    ['kdf.iterations', -600_000],
    ['kdf.iterations', MAX_PBKDF2_ITERATIONS + 1],
    ['kdf.iterations', 1e12],
    ['kdf.iterations', null], // Infinity/NaN viram null no JSON
    ['kdf.iterations', 600_000.5],
    ['kdf.salt', 12345],
    ['kdf.salt', ''],
    ['kdf.salt', b64(15)],
    ['kdf.salt', b64(17)],
    ['kdf.salt', b64(16).replace(/=+$/, '')], // sem preenchimento
    ['kdf.salt', 'AAAA AAAA AAAA AAAA AAAA'], // com espaços
    ['kdf.salt', '-_-_-_-_-_-_-_-_-_-_-w=='], // base64url
    ['kdf.salt', 'não é base64 de jeito nenhum'],
    ['cipher', null],
    ['cipher.name', 'AES-CBC'],
    ['cipher.length', '256'],
    ['cipher.length', 192],
    ['cipher.iv', b64(11)],
    ['cipher.iv', b64(16)],
    ['cipher.iv', '!!!!!!!!!!!!!!!!'],
    ['ciphertext', 42],
    ['ciphertext', ''],
    ['ciphertext', b64(15)],
    ['ciphertext', 'ab$d'],
    ['ciphertext', ['AAAA']],
  ])('%s = %j → "Arquivo inválido"', (path, value) => {
    expectInvalid(() => parseBackupEnvelope(envelopeWith(path, value)))
  })

  it.each([
    ['vazio', ''],
    ['true', 'true'],
    ['número', '42'],
    ['texto JSON', '"app-gastos-backup"'],
    ['lista', JSON.stringify([envelope()])],
    ['binário', String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0)],
    [
      'conteúdo em claro no lugar do envelope',
      JSON.stringify({ app: 'app-gastos', schemaVersion: 1 }),
    ],
  ])('%s → "Arquivo inválido"', (_, text) => {
    expectInvalid(() => parseBackupEnvelope(text))
  })

  it('aceita as iterações nos limites (1 e o teto de 10.000.000) e o mínimo de 16 bytes cifrados', () => {
    expect(parseBackupEnvelope(envelopeWith('kdf.iterations', 1)).kdf.iterations).toBe(1)
    expect(
      parseBackupEnvelope(envelopeWith('kdf.iterations', MAX_PBKDF2_ITERATIONS)).kdf.iterations,
    ).toBe(10_000_000)
    expect(MAX_PBKDF2_ITERATIONS).toBe(10_000_000)
    expect(() => parseBackupEnvelope(envelopeWith('ciphertext', b64(16)))).not.toThrow()
  })

  it('o teto de tamanho do arquivo é 50 MB (D-47 c)', () => {
    expect(MAX_BACKUP_FILE_BYTES).toBe(50_000_000)
  })
})

// --- Conteúdo -------------------------------------------------------------------------

/** Dados fixos com todos os vínculos: recorrente, parcelamento e parcela. */
function baseData() {
  const tag = makeTag({ name: 'Mercado' })
  const otherTag = makeTag({ name: 'Aluguel' })
  const recurring = makeRecurring({ tagId: otherTag.id })
  const group = makeInstallmentGroup({ tagId: tag.id, count: 3 })
  return {
    tags: [tag, otherTag],
    transactions: [
      makeTransaction({ tagId: tag.id }),
      makeTransaction({
        tagId: otherTag.id,
        recurringId: recurring.id,
        recurringPeriod: '2026-02',
      }),
      makeTransaction({ tagId: tag.id, installmentGroupId: group.id, installmentNumber: 1 }),
    ],
    recurrings: [recurring],
    installmentGroups: [group],
    settings: [{ key: 'theme', value: 'dark' }],
  }
}

type Data = ReturnType<typeof baseData>
type Loose = Record<string, unknown>

function contentText(data: unknown, schemaVersion = CURRENT): string {
  return JSON.stringify({
    app: BACKUP_APP_ID,
    schemaVersion,
    exportedAt: '2026-10-17T15:05:00-03:00',
    data,
  })
}

function parseWith(change: (data: Data) => void) {
  const data = baseData()
  change(data)
  return () => parseBackupContent(contentText(data), { schemaVersion: CURRENT })
}

const tx = (d: Data, index: number) => d.transactions[index] as unknown as Loose
const rec = (d: Data) => d.recurrings[0] as unknown as Loose
const group = (d: Data) => d.installmentGroups[0] as unknown as Loose
const tag = (d: Data) => d.tags[0] as unknown as Loose

describe('parseBackupContent — versões (CA-10.4 / CA-10.5)', () => {
  it.each([2, 3, 99])('schemaVersion %i > atual → mensagem do CA-10.5', (version) => {
    const run = () => parseBackupContent(contentText({}, version), { schemaVersion: CURRENT })
    expect(run).toThrow(NewerBackupVersionError)
    expect(run).toThrow(NEWER)
  })

  it.each<[string, unknown]>([
    ['zero', 0],
    ['negativa', -1],
    ['fracionária', 1.5],
    ['em texto', '1'],
    ['nula', null],
  ])('schemaVersion %s → "Arquivo inválido"', (_, version) => {
    expectInvalid(() =>
      parseBackupContent(
        JSON.stringify({
          app: BACKUP_APP_ID,
          schemaVersion: version,
          exportedAt: '2026-10-17T15:05:00Z',
          data: baseData(),
        }),
        { schemaVersion: CURRENT },
      ),
    )
  })

  // CA-10.4 — esquema fictício de 4 versões: cada migração muda a estrutura de verdade.
  // v1: lançamentos em `data.entries` com `valueCents` e sem `settings`;
  // v2: `entries` → `transactions`; v3: `valueCents` → `amountCents`; v4: `settings` = [].
  const legacyV1 = () => {
    const { transactions, settings: _ignored, ...rest } = baseData()
    void _ignored
    return {
      ...rest,
      entries: transactions.map(({ amountCents, ...t }) => ({ ...t, valueCents: amountCents })),
    }
  }

  function chainMigrations(calls: number[]): Record<number, BackupMigration> {
    const data = (content: Loose) => content.data as Loose
    return {
      1: (content) => {
        calls.push(content.schemaVersion as number)
        const { entries, ...rest } = data(content)
        return { ...content, data: { ...rest, transactions: entries } }
      },
      2: (content) => {
        calls.push(content.schemaVersion as number)
        const transactions = (data(content).transactions as Loose[]).map(
          ({ valueCents, ...t }) => ({
            ...t,
            amountCents: valueCents,
          }),
        )
        return { ...content, data: { ...data(content), transactions } }
      },
      3: (content) => {
        calls.push(content.schemaVersion as number)
        return { ...content, data: { ...data(content), settings: [] } }
      },
    }
  }

  it('migra v1 → v2 → v3 → v4 em ordem, cada passo recebendo a sua versão', () => {
    const calls: number[] = []
    const content = parseBackupContent(contentText(legacyV1(), 1), {
      schemaVersion: 4,
      migrations: chainMigrations(calls),
    })
    expect(calls).toEqual([1, 2, 3])
    expect(content.schemaVersion).toBe(4)
    expect(content.data.transactions.map((t) => t.amountCents)).toEqual(
      baseData().transactions.map((t) => t.amountCents),
    )
    expect(content.data.settings).toEqual([])
  })

  it('backup da v2 só passa pelas migrações 2 e 3', () => {
    const calls: number[] = []
    const { entries, ...rest } = legacyV1()
    const v2 = { ...rest, transactions: entries }
    const content = parseBackupContent(contentText(v2, 2), {
      schemaVersion: 4,
      migrations: chainMigrations(calls),
    })
    expect(calls).toEqual([2, 3])
    expect(content.schemaVersion).toBe(4)
  })

  it('sem migrar, o formato antigo é recusado; migração intermediária ausente também', () => {
    expectInvalid(() => parseBackupContent(contentText(legacyV1(), 1), { schemaVersion: 1 }))
    const calls: number[] = []
    const { 2: _missing, ...gap } = chainMigrations(calls)
    void _missing
    expectInvalid(() =>
      parseBackupContent(contentText(legacyV1(), 1), { schemaVersion: 4, migrations: gap }),
    )
  })

  it('o resultado migrado ainda passa pela validação e pela integridade', () => {
    const breaksIntegrity: Record<number, BackupMigration> = {
      1: (content) => {
        const data = content.data as Data
        return {
          ...content,
          data: { ...data, tags: [] },
        }
      },
    }
    expectInvalid(() =>
      parseBackupContent(contentText(baseData(), 1), {
        schemaVersion: 2,
        migrations: breaksIntegrity,
      }),
    )
  })
})

describe('parseBackupContent — registros que violam a §6.3 (CA-10.3)', () => {
  it.each<[string, (d: Data) => void]>([
    // Centavos inteiros e > 0 (princípio 1).
    ['amountCents 0,1', (d) => (tx(d, 0).amountCents = 0.1)],
    ['amountCents 19,99 em reais', (d) => (tx(d, 0).amountCents = 19.99)],
    ['amountCents 0', (d) => (tx(d, 0).amountCents = 0)],
    ['amountCents −1', (d) => (tx(d, 0).amountCents = -1)],
    ['amountCents nulo', (d) => (tx(d, 0).amountCents = null)],
    ['amountCents 2^53 (não seguro)', (d) => (tx(d, 0).amountCents = 2 ** 53)],
    ['totalCents fracionário', (d) => (group(d).totalCents = 100.5)],
    ['totalCents negativo', (d) => (group(d).totalCents = -100)],
    ['valor do recorrente fracionário', (d) => ((rec(d).amounts as Loose[])[0].amountCents = 50.5)],
    ['valor do recorrente negativo', (d) => ((rec(d).amounts as Loose[])[0].amountCents = -1)],
    // Datas (princípio 2).
    ['data 29/02 em ano não bissexto', (d) => (tx(d, 0).date = '2026-02-29')],
    ['data 31/04', (d) => (tx(d, 0).date = '2026-04-31')],
    ['mês 13', (d) => (tx(d, 0).date = '2026-13-01')],
    ['mês 00', (d) => (tx(d, 0).date = '2026-00-10')],
    ['sem zero à esquerda', (d) => (tx(d, 0).date = '2026-1-05')],
    ['data com hora', (d) => (tx(d, 0).date = '2026-01-05T00:00:00')],
    ['data em DD/MM/AAAA', (d) => (tx(d, 0).date = '05/01/2026')],
    ['data vazia', (d) => (tx(d, 0).date = '')],
    ['firstDate inexistente', (d) => (group(d).firstDate = '2026-02-30')],
    ['recurringPeriod inválido', (d) => (tx(d, 1).recurringPeriod = '2026-13')],
    ['startPeriod inválido', (d) => (rec(d).startPeriod = '2026-1')],
    ['endPeriod inválido', (d) => (rec(d).endPeriod = '2026-00')],
    ['fromPeriod inválido', (d) => ((rec(d).amounts as Loose[])[0].fromPeriod = '2026')],
    // Vínculos sempre em par.
    ['recurringId sem recurringPeriod', (d) => (tx(d, 1).recurringPeriod = null)],
    ['recurringPeriod sem recurringId', (d) => (tx(d, 0).recurringPeriod = '2026-02')],
    ['installmentGroupId sem número', (d) => (tx(d, 2).installmentNumber = null)],
    ['número de parcela sem installmentGroupId', (d) => (tx(d, 0).installmentNumber = 1)],
    ['número de parcela 0', (d) => (tx(d, 2).installmentNumber = 0)],
    ['número de parcela 49', (d) => (tx(d, 2).installmentNumber = 49)],
    ['número de parcela fracionário', (d) => (tx(d, 2).installmentNumber = 1.5)],
    // Parcelamento com 2..48 parcelas (RF-08).
    ['parcelamento com 0 parcelas', (d) => (group(d).count = 0)],
    ['parcelamento com 1 parcela', (d) => (group(d).count = 1)],
    ['parcelamento com 49 parcelas', (d) => (group(d).count = 49)],
    ['parcelamento com 2,5 parcelas', (d) => (group(d).count = 2.5)],
    // Outros campos da §6.3.
    ['tag sem nameKey', (d) => delete tag(d).nameKey],
    ['cor com 5 dígitos', (d) => (tag(d).color = '#12345')],
    ['cor fora de hexadecimal', (d) => (tag(d).color = '#GGGGGG')],
    ['tipo do recorrente inválido', (d) => (rec(d).type = 'monthly')],
    ['skippedPeriods não é lista', (d) => (rec(d).skippedPeriods = '2026-03')],
    ['lista de lançamentos não é lista', (d) => ((d as unknown as Loose).transactions = {})],
  ])('%s → "Arquivo inválido"', (_, change) => {
    expectInvalid(parseWith(change))
  })

  it('aceita os limites válidos: maior inteiro seguro, 2 e 48 parcelas, 29/02 bissexto', () => {
    const data = baseData()
    data.transactions[0].amountCents = Number.MAX_SAFE_INTEGER
    data.transactions[0].date = '2028-02-29'
    data.installmentGroups[0].count = 48
    data.transactions[2].installmentNumber = 48
    data.installmentGroups.push(makeInstallmentGroup({ tagId: data.tags[0].id, count: 2 }))
    const content = parseBackupContent(contentText(data), { schemaVersion: CURRENT })
    expect(content.data.transactions[0].amountCents).toBe(9_007_199_254_740_991)
    expect(content.data.installmentGroups.map((g) => g.count)).toEqual([48, 2])
  })
})

describe('parseBackupContent — integridade referencial (§6.8 passo 5)', () => {
  it.each<[string, (d: Data) => void]>([
    ['tagId inexistente em lançamento', (d) => (d.transactions[0].tagId = 'sem-tag')],
    ['tagId inexistente em recorrente', (d) => (d.recurrings[0].tagId = 'sem-tag')],
    ['tagId inexistente em parcelamento', (d) => (d.installmentGroups[0].tagId = 'sem-tag')],
    ['recurringId inexistente', (d) => (d.transactions[1].recurringId = 'sem-recorrente')],
    [
      'installmentGroupId inexistente',
      (d) => (d.transactions[2].installmentGroupId = 'sem-parcelamento'),
    ],
    // Um ID de outra tabela não vale como vínculo.
    [
      'recurringId que é o id de um parcelamento',
      (d) => (d.transactions[1].recurringId = d.installmentGroups[0].id),
    ],
    [
      'installmentGroupId que é o id de um recorrente',
      (d) => (d.transactions[2].installmentGroupId = d.recurrings[0].id),
    ],
    ['tagId que é o id de um lançamento', (d) => (d.recurrings[0].tagId = d.transactions[0].id)],
    ['id de tag duplicado', (d) => d.tags.push({ ...d.tags[0], nameKey: 'outra' })],
    ['id de lançamento duplicado', (d) => d.transactions.push({ ...d.transactions[0] })],
    ['id de recorrente duplicado', (d) => d.recurrings.push({ ...d.recurrings[0] })],
    [
      'id de parcelamento duplicado',
      (d) => d.installmentGroups.push({ ...d.installmentGroups[0] }),
    ],
    ['nameKey duplicado', (d) => d.tags.push({ ...d.tags[0], id: 'tag-nova' })],
  ])('%s → "Arquivo inválido"', (_, change) => {
    expectInvalid(parseWith(change))
  })

  it('dados gerados com semente são aceitos e voltam idênticos (CA-10.1)', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const dataset = generateBackupDataset(seed)
      const built = buildBackupContent(dataset, { schemaVersion: CURRENT })
      const parsed = parseBackupContent(JSON.stringify(built), { schemaVersion: CURRENT })
      expect(parsed).toStrictEqual(built)
    }
  })
})

describe('settings no backup (§6.8 / D-47 d)', () => {
  it('a exportação leva só o tema, nunca lastBackupAt nem persistRequested', () => {
    const dataset = generateBackupDataset(11)
    dataset.settings = [
      { key: 'lastBackupAt', value: '2026-10-01T10:00:00.000Z' },
      { key: 'theme', value: 'light' },
      { key: 'persistRequested', value: '2026-09-01T10:00:00.000Z' },
    ]
    const content = buildBackupContent(dataset, { schemaVersion: CURRENT })
    expect(content.data.settings).toStrictEqual([{ key: 'theme', value: 'light' }])
    expect(JSON.stringify(content)).not.toContain('lastBackupAt')
    expect(JSON.stringify(content)).not.toContain('persistRequested')
  })

  it.each<[string, unknown[]]>([
    ['lastBackupAt', [{ key: 'lastBackupAt', value: '2026-10-01T10:00:00.000Z' }]],
    ['persistRequested', [{ key: 'persistRequested', value: '2026-10-01T10:00:00.000Z' }]],
    [
      'tema + lastBackupAt',
      [
        { key: 'theme', value: 'dark' },
        { key: 'lastBackupAt', value: '2026-10-01T10:00:00.000Z' },
      ],
    ],
    [
      'tema + persistRequested',
      [
        { key: 'theme', value: 'dark' },
        { key: 'persistRequested', value: '2026-10-01T10:00:00.000Z' },
      ],
    ],
    [
      'dois temas',
      [
        { key: 'theme', value: 'dark' },
        { key: 'theme', value: 'light' },
      ],
    ],
    ['tema sem valor', [{ key: 'theme' }]],
  ])('importação com %s no settings → "Arquivo inválido" (D-47 d)', (_, settings) => {
    expectInvalid(parseWith((d) => ((d as unknown as Loose).settings = settings)))
  })

  it.each(['system', 'light', 'dark'])('aceita o tema %s e settings vazio', (value) => {
    const data = baseData()
    data.settings = [{ key: 'theme', value }]
    expect(
      parseBackupContent(contentText(data), { schemaVersion: CURRENT }).data.settings,
    ).toStrictEqual([{ key: 'theme', value }])
    data.settings = []
    expect(parseBackupContent(contentText(data), { schemaVersion: CURRENT }).data.settings).toEqual(
      [],
    )
  })
})
