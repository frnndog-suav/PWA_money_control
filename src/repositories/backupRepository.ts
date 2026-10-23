import { db, SCHEMA_VERSION } from '@/db/database'
import { today } from '@/domain/dates'
import {
  BACKUP_FILE_MIME_TYPE,
  backupFileName,
  buildBackupContent,
  InvalidBackupFileError,
  MAX_BACKUP_FILE_BYTES,
  parseBackupContent,
  parseBackupEnvelope,
  type BackupContent,
  type BackupData,
  type BackupTables,
} from '@/lib/backupFormat'
import { decryptBackupText, encryptBackupText } from '@/lib/crypto'
import { shareOrDownloadFile, type ShareOutcome } from '@/lib/share'
import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from '@/lib/theme'
import { writeThemeMirror } from '@/lib/themeStorage'
import { setSetting } from '@/repositories/settingsRepository'

// RF-10 / §6.8 — exportar e importar o backup. Princípio 7: a tela de backup só chega ao
// Dexie por aqui. Só a tela de backup (carregada sob demanda) importa este módulo, para a
// criptografia e o zod do backup ficarem fora do pacote principal (RNF-02 / D-41).

const BACKUP_TABLES = [
  db.tags,
  db.transactions,
  db.recurrings,
  db.installmentGroups,
  db.settings,
] as const

/** §6.8 exportar, passo 1 — todas as tabelas numa única transação de leitura. */
export async function readBackupTables(): Promise<BackupTables> {
  return db.transaction('r', BACKUP_TABLES, async () => {
    const [tags, transactions, recurrings, installmentGroups, settings] = await Promise.all([
      db.tags.toArray(),
      db.transactions.toArray(),
      db.recurrings.toArray(),
      db.installmentGroups.toArray(),
      db.settings.toArray(),
    ])
    return { tags, transactions, recurrings, installmentGroups, settings }
  })
}

export interface CreateBackupOptions {
  /** Só os testes reduzem as iterações do PBKDF2; o padrão é o de produção (RNF-05). */
  iterations?: number
  now?: Date
}

/** §6.8 exportar, passos 1 a 6 — lê, serializa, criptografa e monta o arquivo. */
export async function createBackupFile(
  password: string,
  { iterations, now = new Date() }: CreateBackupOptions = {},
): Promise<File> {
  const content = buildBackupContent(await readBackupTables(), {
    schemaVersion: SCHEMA_VERSION,
    now,
  })
  const envelope = await encryptBackupText(JSON.stringify(content), password, { iterations, now })
  return new File([JSON.stringify(envelope, null, 2)], backupFileName(today(now)), {
    type: BACKUP_FILE_MIME_TYPE,
  })
}

/** §6.8 exportar, passo 8 — data do último backup (ISO 8601), local ao aparelho. */
export async function recordBackupDone(now: Date = new Date()): Promise<void> {
  await setSetting('lastBackupAt', now.toISOString())
}

/**
 * §6.8 exportar, passos 7 e 8 — compartilha ou baixa o arquivo e grava `lastBackupAt` só se a
 * entrega não foi cancelada nem bloqueada.
 */
export async function deliverBackupFile(
  file: File,
  share: (file: File) => Promise<ShareOutcome> = shareOrDownloadFile,
): Promise<ShareOutcome> {
  const outcome = await share(file)
  if (outcome === 'shared' || outcome === 'downloaded') await recordBackupDone()
  return outcome
}

/**
 * §6.8 importar, passos 1 a 5 — lê o arquivo, valida o envelope, descriptografa e valida o
 * conteúdo (versão, migrações, estrutura e integridade). Não altera nada no banco.
 */
export async function openBackupFile(file: Blob, password: string): Promise<BackupContent> {
  if (file.size > MAX_BACKUP_FILE_BYTES) throw new InvalidBackupFileError()
  const envelope = parseBackupEnvelope(await file.text())
  const plaintext = await decryptBackupText(envelope, password)
  return parseBackupContent(plaintext, { schemaVersion: SCHEMA_VERSION })
}

/**
 * §6.8 importar, passo 7 / D-07 — substitui todos os dados numa única transação `rw`: se
 * qualquer etapa falhar, nada muda. `lastBackupAt` e `persistRequested` são do aparelho e
 * ficam como estão. O tema importado vai também para o espelho do localStorage (D-28).
 * Devolve o tema aplicado.
 */
export async function restoreBackup(data: BackupData): Promise<ThemePreference> {
  const theme = data.settings[0]?.value ?? DEFAULT_THEME_PREFERENCE
  await db.transaction('rw', BACKUP_TABLES, async () => {
    await Promise.all([
      db.tags.clear(),
      db.transactions.clear(),
      db.recurrings.clear(),
      db.installmentGroups.clear(),
    ])
    await db.tags.bulkAdd(data.tags)
    await db.recurrings.bulkAdd(data.recurrings)
    await db.installmentGroups.bulkAdd(data.installmentGroups)
    await db.transactions.bulkAdd(data.transactions)
    await db.settings.put({ key: 'theme', value: theme })
  })
  writeThemeMirror(theme)
  return theme
}
