import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import { db } from '@/db/database'

// Setup do projeto `unit` (ambiente node): sem Testing Library nem polyfills de DOM.
// Só o IndexedDB em memória e o banco limpo entre os testes, para os testes de
// repositório que chamam funções (sem renderHook).
afterEach(async () => {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())))
})
