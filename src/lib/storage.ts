// RF-11 / CA-11.4 / CA-11.5 / §6.9 — armazenamento persistente e espaço usado.
// Todas as funções aceitam a StorageManager por parâmetro (testes) e têm fallback para
// navegadores sem a API ou fora de contexto seguro (RNF-09), em vez de lançar exceção.

export interface StorageEstimate {
  usageBytes: number
  quotaBytes: number
}

type StorageManagerLike = Partial<Pick<StorageManager, 'persist' | 'persisted' | 'estimate'>>

function defaultStorageManager(): StorageManagerLike | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage
}

/** Pede ao navegador para não apagar os dados do app; `false` se negado ou sem suporte. */
export async function requestPersistentStorage(
  storage: StorageManagerLike | undefined = defaultStorageManager(),
): Promise<boolean> {
  if (!storage?.persist) return false
  try {
    return await storage.persist()
  } catch {
    return false
  }
}

/** Se o armazenamento já é persistente; `null` quando a API não existe ou falha. */
export async function isStoragePersisted(
  storage: StorageManagerLike | undefined = defaultStorageManager(),
): Promise<boolean | null> {
  if (!storage?.persisted) return null
  try {
    return await storage.persisted()
  } catch {
    return null
  }
}

/** Espaço usado e cota disponível; `null` quando a API não existe ou falha. */
export async function getStorageEstimate(
  storage: StorageManagerLike | undefined = defaultStorageManager(),
): Promise<StorageEstimate | null> {
  if (!storage?.estimate) return null
  try {
    const { usage, quota } = await storage.estimate()
    if (usage === undefined || quota === undefined) return null
    return { usageBytes: usage, quotaBytes: quota }
  } catch {
    return null
  }
}
