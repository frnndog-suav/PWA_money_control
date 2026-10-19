import { useEffect } from 'react'
import { requestPersistentStorageOnce } from '@/repositories/persistentStorageRepository'

// Sem IndexedDB disponível não há o que proteger nem onde registrar o pedido.
function ignoreStorageError(): void {}

/** RF-11 / CA-11.4 — pede armazenamento persistente na primeira abertura do app. */
export function usePersistentStorageRequest(): void {
  useEffect(() => {
    requestPersistentStorageOnce().catch(ignoreStorageError)
  }, [])
}
