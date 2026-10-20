import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { isTagInUse, sortByTagName, toTagNameKey, type TagUsage } from '@/domain/tags'
import { tagInputSchema, type TagInput } from '@/domain/tagSchema'
import type { Tag } from '@/domain/types'

// RF-03 — tabela `tags`. Princípio 7: a interface só chega ao Dexie por estas funções e hooks.

/** CA-03.4 — já existe tag com o mesmo `nameKey` (a tela mostra "Já existe uma tag com esse nome"). */
export class DuplicateTagNameError extends Error {
  constructor() {
    super('Já existe uma tag com esse nome')
    this.name = 'DuplicateTagNameError'
  }
}

/** A tag foi apagada (ex.: em outra aba) enquanto estava sendo editada. */
export class TagNotFoundError extends Error {
  constructor(id: string) {
    super(`Tag não encontrada: ${id}`)
    this.name = 'TagNotFoundError'
  }
}

export interface TagWithTransactionCount {
  tag: Tag
  transactionCount: number
}

export type DeleteTagResult = { status: 'deleted' } | { status: 'in-use'; usage: TagUsage }

// O índice único `&nameKey` é a única verificação de nome repetido: não há leitura prévia,
// então duas gravações simultâneas (duas abas) também caem aqui.
function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const inner = (error as { inner?: unknown }).inner
  return (
    error.name === 'ConstraintError' || (inner instanceof Error && inner.name === 'ConstraintError')
  )
}

function rethrowAsDuplicate(error: unknown): never {
  throw isUniqueConstraintError(error) ? new DuplicateTagNameError() : error
}

function toStoredFields(input: TagInput): Pick<Tag, 'name' | 'nameKey' | 'color'> {
  const { name, color } = tagInputSchema.parse(input)
  return { name, nameKey: toTagNameKey(name), color }
}

export async function createTag(input: TagInput): Promise<Tag> {
  const now = new Date().toISOString()
  const tag: Tag = {
    id: crypto.randomUUID(),
    ...toStoredFields(input),
    createdAt: now,
    updatedAt: now,
  }
  await db.tags.add(tag).catch(rethrowAsDuplicate)
  return tag
}

/**
 * CA-03.1 — renomeia e/ou troca a cor. Os lançamentos guardam só o `tagId`, então a mudança
 * aparece em todas as telas. Renomear para o próprio nome com outra caixa é permitido: o
 * `nameKey` continua o mesmo registro.
 */
export async function updateTag(id: string, input: TagInput): Promise<Tag> {
  const fields = toStoredFields(input)
  return db
    .transaction('rw', db.tags, async () => {
      const current = await db.tags.get(id)
      if (!current) throw new TagNotFoundError(id)
      const updated: Tag = { ...current, ...fields, updatedAt: new Date().toISOString() }
      await db.tags.put(updated)
      return updated
    })
    .catch(rethrowAsDuplicate)
}

/**
 * D-02 — quantos registros usam a tag. `transactions` usa o índice `tagId`; `recurrings` e
 * `installmentGroups` não têm esse índice na v1 (§6.4), mas são tabelas pequenas.
 */
export async function getTagUsage(id: string): Promise<TagUsage> {
  const [transactions, recurrings, installmentGroups] = await Promise.all([
    db.transactions.where('tagId').equals(id).count(),
    db.recurrings.filter((recurring) => recurring.tagId === id).count(),
    db.installmentGroups.filter((group) => group.tagId === id).count(),
  ])
  return { transactions, recurrings, installmentGroups }
}

/**
 * CA-03.2 / CA-03.3 / D-02 — exclui só se nada usa a tag. Contagem e exclusão ficam na mesma
 * transação (princípio 8): nenhum registro pode passar a usar a tag entre as duas.
 */
export async function deleteTag(id: string): Promise<DeleteTagResult> {
  return db.transaction(
    'rw',
    [db.tags, db.transactions, db.recurrings, db.installmentGroups],
    async (): Promise<DeleteTagResult> => {
      const usage = await getTagUsage(id)
      if (isTagInUse(usage)) return { status: 'in-use', usage }
      await db.tags.delete(id)
      return { status: 'deleted' }
    },
  )
}

/** CA-03.5 — tags em ordem de nome, cada uma com a quantidade de lançamentos. */
export async function listTagsWithTransactionCount(): Promise<TagWithTransactionCount[]> {
  // A tabela de tags é pequena; a contagem usa o índice `tagId` (IDBIndex.count), sem ler
  // os lançamentos, e continua rápida com 10.000 deles (RNF-02).
  const tags = await db.tags.toArray()
  const counts = await Promise.all(
    tags.map((tag) => db.transactions.where('tagId').equals(tag.id).count()),
  )
  const items = tags.map((tag, index) => ({ tag, transactionCount: counts[index] }))
  return sortByTagName(items, (item) => item.tag)
}

/** Lista ao vivo da tela de tags: `undefined` enquanto carrega. */
export function useTagsWithTransactionCount(): TagWithTransactionCount[] | undefined {
  return useLiveQuery(listTagsWithTransactionCount)
}

/** RF-01 — tags em ordem de nome, para o seletor do formulário de lançamento e os chips. */
export async function listTags(): Promise<Tag[]> {
  return sortByTagName(await db.tags.toArray(), (tag) => tag)
}

/** Lista ao vivo das tags: `undefined` enquanto carrega. */
export function useTags(): Tag[] | undefined {
  return useLiveQuery(listTags)
}
