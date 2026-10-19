import { db } from '@/db/database'
import { requestPersistentStorage } from '@/lib/storage'

// RF-11 / CA-11.4 / §6.9 — na primeira abertura pede armazenamento persistente uma única
// vez e registra `persistRequested` em `settings` (com a data do pedido, em ISO 8601).

const PERSIST_REQUESTED_KEY = 'persistRequested'

interface PersistRequestOptions {
  request?: () => Promise<boolean>
  now?: () => Date
}

/**
 * Faz o pedido só se ele nunca foi feito. Devolve `true` quando pediu nesta chamada.
 * O registro é gravado antes do pedido, numa transação que lê e grava junto: duas
 * chamadas simultâneas (StrictMode, duas abas) não pedem duas vezes.
 */
export async function requestPersistentStorageOnce({
  request = requestPersistentStorage,
  now = () => new Date(),
}: PersistRequestOptions = {}): Promise<boolean> {
  const isFirstRequest = await db.transaction('rw', db.settings, async () => {
    if (await db.settings.get(PERSIST_REQUESTED_KEY)) return false
    await db.settings.put({ key: PERSIST_REQUESTED_KEY, value: now().toISOString() })
    return true
  })
  // Fora da transação: persist() não é uma operação do IndexedDB e a encerraria.
  if (isFirstRequest) await request()
  return isFirstRequest
}
