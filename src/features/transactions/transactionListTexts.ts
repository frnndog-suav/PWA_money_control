// RF-04 / RF-01 — textos (pt-BR) e constantes da lista e dos detalhes de lançamentos.

export const CLEAR_FILTERS_LABEL = 'Limpar filtros' // CA-04.4
export const LOAD_MORE_LABEL = 'Carregar mais' // CA-04.6
export const NEW_TRANSACTION_LABEL = 'Novo'

export const NO_TRANSACTIONS_YET_MESSAGE =
  'Nenhum lançamento ainda. Toque em “Novo” para lançar o primeiro.'
export const NO_FILTER_RESULTS_MESSAGE = 'Nenhum lançamento encontrado com esses filtros.'
// Fase 11 — id aberto pela URL que não existe (ex.: lançamento já excluído).
export const TRANSACTION_NOT_FOUND_MESSAGE =
  'Lançamento não encontrado. Ele pode ter sido excluído.'
export const INVERTED_PERIOD_MESSAGE =
  'A data inicial é depois da data final. O filtro de período não está sendo aplicado.'

/** Espera depois da última tecla antes de refazer a busca (RNF-02: 10.000 lançamentos). */
export const SEARCH_DEBOUNCE_MS = 250

/**
 * CA-04.6 — lançamentos por página da lista (em dias inteiros). Uns 50 itens enchem algumas
 * telas do iPhone sem montar milhares de nós; a próxima página entra antes de o fim aparecer.
 */
export const LIST_PAGE_ITEM_COUNT = 50

// Criado uma vez (RNF-02): "5.000" com o separador de milhar do pt-BR.
const countFormatter = new Intl.NumberFormat('pt-BR')

/** CA-04.3 — "1 lançamento encontrado" / "5.000 lançamentos encontrados". */
export function formatResultCount(count: number): string {
  const formatted = countFormatter.format(count)
  return count === 1 ? `${formatted} lançamento encontrado` : `${formatted} lançamentos encontrados`
}
