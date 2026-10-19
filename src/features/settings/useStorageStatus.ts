import { useEffect, useState } from 'react'
import { getStorageEstimate, isStoragePersisted, type StorageEstimate } from '@/lib/storage'

export type StorageStatus =
  | { isLoading: true }
  | {
      isLoading: false
      /** `null` quando o navegador não informa. */
      isPersisted: boolean | null
      /** `null` quando o navegador não informa. */
      estimate: StorageEstimate | null
    }

/** RF-11 / CA-11.4 / CA-11.5 — status do armazenamento consultado ao abrir a tela. */
export function useStorageStatus(): StorageStatus {
  const [status, setStatus] = useState<StorageStatus>({ isLoading: true })

  useEffect(() => {
    let isMounted = true
    // As duas funções têm fallback e nunca rejeitam.
    void Promise.all([isStoragePersisted(), getStorageEstimate()]).then(
      ([isPersisted, estimate]) => {
        if (isMounted) setStatus({ isLoading: false, isPersisted, estimate })
      },
    )
    return () => {
      isMounted = false
    }
  }, [])

  return status
}
