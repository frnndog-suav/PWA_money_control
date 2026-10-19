import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import type { Setting } from '@/domain/types'

// §6.3 / §6.4 — tabela `settings` (chave → texto). Princípio 7: a interface só chega aqui
// por estas funções e hooks.

export type SettingKey = Setting['key']

/** Valor salvo, ou `null` se a chave não existe. */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const setting = await db.settings.get(key)
  return setting?.value ?? null
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

/**
 * Valor ao vivo de uma chave: `undefined` enquanto carrega, `null` se não existe.
 * A tela se atualiza sozinha quando o valor muda (§6.1).
 */
export function useSetting(key: SettingKey): string | null | undefined {
  return useLiveQuery(() => getSetting(key), [key])
}
