import type { StorageStatus } from '@/features/settings/useStorageStatus'
import { formatStorageUsage } from '@/lib/formatBytes'

// CA-11.4 / CA-11.5 — textos do status do armazenamento em Ajustes → Sobre.

export const LOADING_TEXT = 'Carregando…'
export const UNAVAILABLE_TEXT = 'Indisponível neste navegador'

export function describeStorageUsage(status: StorageStatus): string {
  if (status.isLoading) return LOADING_TEXT
  if (!status.estimate) return UNAVAILABLE_TEXT
  return formatStorageUsage(status.estimate.usageBytes, status.estimate.quotaBytes)
}

/** Sem a API, não dá para afirmar que é persistente: "não garantido". */
export function describePersistence(status: StorageStatus): string {
  if (status.isLoading) return 'Armazenamento persistente: verificando…'
  return status.isPersisted
    ? 'Armazenamento persistente: ativo'
    : 'Armazenamento persistente: não garantido'
}
