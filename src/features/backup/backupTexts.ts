import { format, parseISO } from 'date-fns'
import { InvalidBackupFileError, NewerBackupVersionError } from '@/lib/backupFormat'
import { BackupDecryptionError } from '@/lib/crypto'

// RF-10 — textos (pt-BR) da tela de backup. As mensagens de erro são as dos CAs.

export const EXPORT_LABEL = 'Exportar backup'
export const EXPORTING_LABEL = 'Gerando backup…'
export const SAVE_FILE_LABEL = 'Salvar backup'
export const IMPORT_LABEL = 'Importar backup'
export const OPENING_LABEL = 'Verificando backup…'
export const CONFIRM_IMPORT_LABEL = 'Substituir dados'
export const RESTORING_LABEL = 'Substituindo…'

export const EXPORT_DONE_MESSAGE = 'Backup exportado.'
export const EXPORT_CANCELLED_MESSAGE = 'Exportação cancelada. O backup não foi salvo.'
export const EXPORT_READY_MESSAGE = 'O backup está pronto. Toque em “Salvar backup” para guardá-lo.'
export const EXPORT_FAILED_MESSAGE = 'Não foi possível gerar o backup. Tente novamente.'
export const IMPORT_DONE_MESSAGE = 'Backup importado.'
export const REPLACE_WARNING = 'Isso vai substituir todos os dados atuais.' // RF-10
export const RESTORE_FAILED_MESSAGE =
  'Não foi possível importar o backup. Nenhum dado foi alterado.'

export const WRONG_PASSWORD_MESSAGE = 'Senha incorreta ou arquivo corrompido' // CA-10.2
export const INVALID_FILE_MESSAGE = 'Arquivo inválido' // CA-10.3
export const NEWER_VERSION_MESSAGE =
  'Backup de uma versão mais nova do app. Atualize o app e tente novamente.' // CA-10.5
export const OPEN_FAILED_MESSAGE = 'Não foi possível abrir o backup. Nenhum dado foi alterado.'

/** CA-10.2 / CA-10.3 / CA-10.5 — mensagem exibida para cada falha ao abrir o arquivo. */
export function describeOpenError(error: unknown): string {
  if (error instanceof BackupDecryptionError) return WRONG_PASSWORD_MESSAGE
  if (error instanceof NewerBackupVersionError) return NEWER_VERSION_MESSAGE
  if (error instanceof InvalidBackupFileError) return INVALID_FILE_MESSAGE
  return OPEN_FAILED_MESSAGE
}

// Criado uma vez (RNF-02): "1.234" com o separador de milhar do pt-BR.
const countFormatter = new Intl.NumberFormat('pt-BR')

/** "1 lançamento" / "1.234 lançamentos". */
export function formatCount(count: number, singular: string, plural: string): string {
  return `${countFormatter.format(count)} ${count === 1 ? singular : plural}`
}

/** Data e hora (locais) em que o backup foi gerado: "17/10/2026 às 15:05". */
export function formatBackupDate(isoDateTime: string): string {
  return format(parseISO(isoDateTime), "dd/MM/yyyy 'às' HH:mm")
}
