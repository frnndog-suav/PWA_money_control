import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { db } from '@/db/database'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'
import { installMatchMedia, resetMatchMedia } from '@/test/matchMedia'

installMatchMedia()

afterEach(async () => {
  cleanup()
  // Banco limpo entre os testes. Roda depois do cleanup(): as gravações pedidas pelos
  // componentes já estão na fila do IndexedDB e terminam antes desta transação.
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())))
  localStorage.clear()
  resetMatchMedia()
  useUiStore.setState(INITIAL_UI_STATE)
  document.documentElement.className = ''
  document.head.innerHTML = ''
})
