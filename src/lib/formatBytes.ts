// CA-11.5 — espaço usado em texto legível pt-BR ("1,2 MB de 500 MB").
// Unidades decimais (1 KB = 1.000 bytes), como o iOS mostra o armazenamento nos Ajustes.

const BYTES_PER_UNIT = 1000
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
// Com uma casa decimal, qualquer valor a partir daqui aparece como "1.000".
const ROUNDS_UP_TO_NEXT_UNIT = BYTES_PER_UNIT - 0.05

// Criado uma vez no módulo (não a cada chamada). Uma casa decimal basta para o indicador.
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** `1_234_567` → `"1,2 MB"`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError(`Tamanho inválido: ${bytes}`)

  let value = bytes
  let unitIndex = 0
  // Usa o limite de arredondamento (999,95) e não 1.000: senão 999.960 bytes viraria
  // "1.000 KB" em vez de "1 MB".
  while (value >= ROUNDS_UP_TO_NEXT_UNIT && unitIndex < UNITS.length - 1) {
    value /= BYTES_PER_UNIT
    unitIndex++
  }
  return `${sizeFormatter.format(value)} ${UNITS[unitIndex]}`
}

/** `"1,2 MB de 500 MB"`. */
export function formatStorageUsage(usageBytes: number, quotaBytes: number): string {
  return `${formatBytes(usageBytes)} de ${formatBytes(quotaBytes)}`
}
