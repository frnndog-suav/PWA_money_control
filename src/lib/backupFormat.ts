import { formatISO } from 'date-fns'
import { z } from 'zod'
import { isValidDate, today } from '@/domain/dates'
import { MAX_INSTALLMENTS, MIN_INSTALLMENTS } from '@/domain/installments'
import { toTagNameKey } from '@/domain/tags'
import type {
  DateString,
  InstallmentGroup,
  Recurring,
  Setting,
  Tag,
  Transaction,
} from '@/domain/types'
import {
  AES_KEY_LENGTH,
  ENVELOPE_FORMAT,
  ENVELOPE_FORMAT_VERSION,
  IV_BYTES,
  SALT_BYTES,
  type BackupEnvelope,
} from '@/lib/crypto'
import { isThemePreference, THEME_PREFERENCES, type ThemePreference } from '@/lib/theme'

// RF-10 / §6.8 — formato do backup: schemas zod do envelope e do conteúdo em claro,
// verificação de versão, migrações de backup e integridade referencial. Funções puras: o
// número da versão do esquema chega por parâmetro (o módulo não importa o Dexie).

export const BACKUP_APP_ID = 'app-gastos'
export const BACKUP_FILE_MIME_TYPE = 'application/json'
const BACKUP_FILE_PREFIX = 'gastos-backup-'

/**
 * Maior arquivo aceito na importação. 10.000 lançamentos dão uns 4 MB; o teto só evita ler
 * para a memória um arquivo enorme escolhido por engano.
 */
export const MAX_BACKUP_FILE_BYTES = 50_000_000
/** Teto de iterações aceito no envelope: impede que um arquivo forjado trave o aparelho. */
export const MAX_PBKDF2_ITERATIONS = 10_000_000
// O AES-GCM acrescenta 16 bytes de autenticação; menos que isso não é texto cifrado.
const GCM_TAG_BYTES = 16

/** CA-10.3 — não é um backup do app (ou a estrutura/integridade não confere). */
export class InvalidBackupFileError extends Error {
  constructor() {
    super('Arquivo inválido')
    this.name = 'InvalidBackupFileError'
  }
}

/** CA-10.5 — backup gerado por uma versão do app com esquema mais novo. */
export class NewerBackupVersionError extends Error {
  constructor() {
    super('Backup de uma versão mais nova do app. Atualize o app e tente novamente.')
    this.name = 'NewerBackupVersionError'
  }
}

// --- Envelope -------------------------------------------------------------------------

function decodedBase64Length(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return (base64.length / 4) * 3 - padding
}

const base64OfLength = (bytes: number) =>
  z.base64().refine((value) => decodedBase64Length(value) === bytes)

const envelopeSchema = z.object({
  format: z.literal(ENVELOPE_FORMAT),
  formatVersion: z.literal(ENVELOPE_FORMAT_VERSION),
  createdAt: z.string(),
  kdf: z.object({
    name: z.literal('PBKDF2'),
    hash: z.literal('SHA-256'),
    iterations: z.int().min(1).max(MAX_PBKDF2_ITERATIONS),
    salt: base64OfLength(SALT_BYTES),
  }),
  cipher: z.object({
    name: z.literal('AES-GCM'),
    length: z.literal(AES_KEY_LENGTH),
    iv: base64OfLength(IV_BYTES),
  }),
  ciphertext: z.base64().refine((value) => decodedBase64Length(value) >= GCM_TAG_BYTES),
}) satisfies z.ZodType<BackupEnvelope>

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new InvalidBackupFileError()
  }
}

/** §6.8 importar, passo 2 — texto do arquivo → envelope válido, senão "Arquivo inválido". */
export function parseBackupEnvelope(text: string): BackupEnvelope {
  const result = envelopeSchema.safeParse(parseJson(text))
  if (!result.success) throw new InvalidBackupFileError()
  return result.data
}

// --- Registros (§6.3) -----------------------------------------------------------------

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

const id = z.string().min(1)
const timestamp = z.iso.datetime({ offset: true })
const date = z.string().refine(isValidDate)
const period = z.string().regex(PERIOD_PATTERN)
const cents = z.int().positive() // z.int() já limita aos inteiros seguros
const transactionType = z.enum(['income', 'expense'])
const description = z.string().min(1)

const tagSchema = z
  .object({
    id,
    name: z.string().min(1),
    nameKey: z.string().min(1),
    color: z.string().regex(HEX_COLOR_PATTERN),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  // §6.3 — `nameKey` é sempre derivado do nome; outro valor furaria a unicidade do RF-03.
  .refine((tag) => tag.nameKey === toTagNameKey(tag.name)) satisfies z.ZodType<Tag>

const transactionSchema = z
  .object({
    id,
    type: transactionType,
    amountCents: cents,
    date,
    description,
    tagId: id,
    recurringId: id.nullable(),
    recurringPeriod: period.nullable(),
    installmentGroupId: id.nullable(),
    installmentNumber: z.int().min(1).max(MAX_INSTALLMENTS).nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  // Os vínculos vêm em pares: recorrente + mês, parcelamento + número da parcela.
  .refine((t) => (t.recurringId === null) === (t.recurringPeriod === null))
  .refine(
    (t) => (t.installmentGroupId === null) === (t.installmentNumber === null),
  ) satisfies z.ZodType<Transaction>

/**
 * §6.3 — `amounts` começa em `startPeriod` e segue em ordem estritamente crescente de
 * `fromPeriod` (o valor vigente é o último com `fromPeriod <= mês`); `endPeriod`, se houver,
 * não vem antes do início. Meses `YYYY-MM` se comparam como texto.
 */
function hasOrderedPeriods({
  startPeriod,
  endPeriod,
  amounts,
}: Pick<Recurring, 'startPeriod' | 'endPeriod' | 'amounts'>): boolean {
  // Lista vazia já é recusada pelo `.min(1)`; o zod roda este refine mesmo assim.
  if (amounts[0]?.fromPeriod !== startPeriod) return false
  if (endPeriod !== null && endPeriod < startPeriod) return false
  return amounts.every(
    (amount, index) => index === 0 || amounts[index - 1].fromPeriod < amount.fromPeriod,
  )
}

const recurringSchema = z
  .object({
    id,
    type: transactionType,
    description,
    tagId: id,
    startPeriod: period,
    endPeriod: period.nullable(),
    amounts: z.array(z.object({ fromPeriod: period, amountCents: cents })).min(1),
    skippedPeriods: z.array(period),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .refine(hasOrderedPeriods) satisfies z.ZodType<Recurring>

const installmentGroupSchema = z.object({
  id,
  description,
  tagId: id,
  totalCents: cents,
  count: z.int().min(MIN_INSTALLMENTS).max(MAX_INSTALLMENTS),
  firstDate: date,
  createdAt: timestamp,
}) satisfies z.ZodType<InstallmentGroup>

// §6.8 — só o tema viaja no backup; `lastBackupAt` e `persistRequested` são do aparelho.
const backupSettingSchema = z.object({
  key: z.literal('theme'),
  value: z.enum(THEME_PREFERENCES as [ThemePreference, ...ThemePreference[]]),
})

const backupDataSchema = z.object({
  tags: z.array(tagSchema),
  transactions: z.array(transactionSchema),
  recurrings: z.array(recurringSchema),
  installmentGroups: z.array(installmentGroupSchema),
  settings: z.array(backupSettingSchema).max(1),
})

export type BackupSetting = z.output<typeof backupSettingSchema>
export type BackupData = z.output<typeof backupDataSchema>

/** §6.8 — conteúdo em claro, antes de criptografar. */
export interface BackupContent {
  app: typeof BACKUP_APP_ID
  schemaVersion: number
  exportedAt: string
  data: BackupData
}

const backupContentSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.int().positive(),
  exportedAt: timestamp,
  data: backupDataSchema,
}) satisfies z.ZodType<BackupContent>

// Só o cabeçalho: a versão decide se o resto é migrado antes da validação completa.
const backupHeaderSchema = z.looseObject({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.int().positive(),
})

// --- Exportar -------------------------------------------------------------------------

/** Tabelas como estão no banco (`settings` com todas as chaves do aparelho). */
export interface BackupTables {
  tags: Tag[]
  transactions: Transaction[]
  recurrings: Recurring[]
  installmentGroups: InstallmentGroup[]
  settings: Setting[]
}

/** §6.8 — do `settings` do aparelho só o tema entra no backup. */
export function selectBackupSettings(settings: readonly Setting[]): BackupSetting[] {
  const theme = settings.find((setting) => setting.key === 'theme')?.value
  return isThemePreference(theme) ? [{ key: 'theme', value: theme }] : []
}

interface BuildContentOptions {
  schemaVersion: number
  now?: Date
}

/** §6.8 exportar, passo 2 — monta o conteúdo em claro a partir das tabelas. */
export function buildBackupContent(
  tables: BackupTables,
  { schemaVersion, now = new Date() }: BuildContentOptions,
): BackupContent {
  return {
    app: BACKUP_APP_ID,
    schemaVersion,
    exportedAt: formatISO(now),
    data: {
      tags: tables.tags,
      transactions: tables.transactions,
      recurrings: tables.recurrings,
      installmentGroups: tables.installmentGroups,
      settings: selectBackupSettings(tables.settings),
    },
  }
}

/** RF-10 — `gastos-backup-YYYY-MM-DD.json`, com a data local (princípio 2). */
export function backupFileName(date: DateString = today()): string {
  return `${BACKUP_FILE_PREFIX}${date}.json`
}

// --- Importar: versão e migrações (CA-10.4 / CA-10.5) ---------------------------------

/** Converte o conteúdo da versão `n` para a `n + 1` (recebe e devolve o JSON cru). */
export type BackupMigration = (content: Record<string, unknown>) => Record<string, unknown>

/**
 * CA-10.4 — uma migração por versão de origem: `BACKUP_MIGRATIONS[n]` leva da `n` para a
 * `n + 1`. Vazio enquanto só existe o esquema 1; ao criar o `db.version(2)` (§6.4), acrescente
 * aqui a migração `1` com a mesma mudança.
 */
export const BACKUP_MIGRATIONS: Readonly<Record<number, BackupMigration>> = {}

/** Aplica em cadeia as migrações de `fromVersion` até `toVersion`. */
export function migrateBackupContent(
  content: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
  migrations: Readonly<Record<number, BackupMigration>> = BACKUP_MIGRATIONS,
): Record<string, unknown> {
  let migrated = content
  for (let version = fromVersion; version < toVersion; version++) {
    const migrate = migrations[version]
    if (!migrate) throw new InvalidBackupFileError()
    migrated = { ...migrate(migrated), schemaVersion: version + 1 }
  }
  return migrated
}

// --- Importar: integridade referencial (§6.8 passo 5) ---------------------------------

/** Conjunto dos valores, ou `null` se algum se repetir. */
function toUniqueSet(values: readonly string[]): Set<string> | null {
  const unique = new Set(values)
  return unique.size === values.length ? unique : null
}

/**
 * §6.8 passo 5 — IDs únicos em cada tabela, nomes de tag únicos (índice `&nameKey`) e todo
 * vínculo (`tagId`, `recurringId`, `installmentGroupId`) apontando para um registro existente,
 * com o número da parcela dentro do `count` do parcelamento.
 * Os valores inteiros positivos já são garantidos pelo schema.
 */
export function hasReferentialIntegrity(data: BackupData): boolean {
  const tagIds = toUniqueSet(data.tags.map((tag) => tag.id))
  const recurringIds = toUniqueSet(data.recurrings.map((recurring) => recurring.id))
  const groupIds = toUniqueSet(data.installmentGroups.map((group) => group.id))
  const isEveryIdUnique =
    tagIds !== null &&
    recurringIds !== null &&
    groupIds !== null &&
    toUniqueSet(data.tags.map((tag) => tag.nameKey)) !== null &&
    toUniqueSet(data.transactions.map((transaction) => transaction.id)) !== null
  if (!isEveryIdUnique) return false

  const isTagKnown = (item: { tagId: string }) => tagIds.has(item.tagId)
  // §6.3 — a parcela aponta para um parcelamento existente e vai de 1 ao `count` dele.
  const installmentCounts = new Map(data.installmentGroups.map((group) => [group.id, group.count]))
  const isInstallmentKnown = ({ installmentGroupId, installmentNumber }: Transaction) => {
    if (installmentGroupId === null) return true
    const count = installmentCounts.get(installmentGroupId)
    return count !== undefined && installmentNumber !== null && installmentNumber <= count
  }
  return (
    data.recurrings.every(isTagKnown) &&
    data.installmentGroups.every(isTagKnown) &&
    data.transactions.every(
      (transaction) =>
        isTagKnown(transaction) &&
        (transaction.recurringId === null || recurringIds.has(transaction.recurringId)) &&
        isInstallmentKnown(transaction),
    )
  )
}

interface ParseContentOptions {
  /** Versão atual do esquema do banco (`SCHEMA_VERSION`, §6.4). */
  schemaVersion: number
  migrations?: Readonly<Record<number, BackupMigration>>
}

/**
 * §6.8 importar, passos 4 e 5 — texto descriptografado → conteúdo válido no esquema atual.
 * Versão mais nova: `NewerBackupVersionError`; mais antiga: migra antes de validar; estrutura
 * ou integridade inválida: `InvalidBackupFileError`.
 */
export function parseBackupContent(
  plaintext: string,
  { schemaVersion, migrations = BACKUP_MIGRATIONS }: ParseContentOptions,
): BackupContent {
  const header = backupHeaderSchema.safeParse(parseJson(plaintext))
  if (!header.success) throw new InvalidBackupFileError()
  if (header.data.schemaVersion > schemaVersion) throw new NewerBackupVersionError()

  const migrated = migrateBackupContent(
    header.data,
    header.data.schemaVersion,
    schemaVersion,
    migrations,
  )
  const content = backupContentSchema.safeParse(migrated)
  if (!content.success || content.data.schemaVersion !== schemaVersion) {
    throw new InvalidBackupFileError()
  }
  if (!hasReferentialIntegrity(content.data.data)) throw new InvalidBackupFileError()
  return content.data
}

/** RF-10 — o que a tela mostra antes de confirmar a importação. */
export interface BackupSummary {
  exportedAt: string
  transactionCount: number
  tagCount: number
  recurringCount: number
}

export function summarizeBackup(content: BackupContent): BackupSummary {
  return {
    exportedAt: content.exportedAt,
    transactionCount: content.data.transactions.length,
    tagCount: content.data.tags.length,
    recurringCount: content.data.recurrings.length,
  }
}
