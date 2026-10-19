import type { DateString } from '@/domain/types'
import type { SeededRandom } from '@/dev/sampleData/seededRandom'

// §6.11 — contexto compartilhado pelos geradores de dados de exemplo.

export interface SampleContext {
  random: SeededRandom
  today: DateString
  /** Primeiro dia coberto pelos dados (3 anos antes de hoje). */
  firstDate: DateString
  tagIdByName: ReadonlyMap<string, string>
}

/** Timestamp ISO estável derivado da data (os dados precisam ser determinísticos). */
export function timestampOf(date: DateString): string {
  return `${date}T12:00:00.000Z`
}

/** Id da tag do catálogo; falha cedo se o nome não existir (erro de programação). */
export function tagIdOf(context: SampleContext, name: string): string {
  const id = context.tagIdByName.get(name)
  if (!id) throw new Error(`Tag de exemplo inexistente: ${name}`)
  return id
}
