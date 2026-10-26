// RF-01 — textos do formulário de lançamento (pt-BR).

export const TRANSACTION_SAVED_MESSAGE = 'Lançamento salvo' // CA-01.1
export const INSTALLMENTS_SAVED_MESSAGE = 'Parcelamento salvo' // RF-08
export const SAVE_TRANSACTION_FAILED_MESSAGE =
  'Não foi possível salvar o lançamento. Tente de novo.'
export const TRANSACTION_NOT_FOUND_MESSAGE = 'Este lançamento não existe mais.'
export const TRANSACTION_TAG_NOT_FOUND_MESSAGE = 'A tag escolhida não existe mais. Escolha outra.'
/** D-51 — explica por que o tipo não muda no lançamento de um recorrente. */
export const TYPE_LOCKED_MESSAGE = 'O tipo segue o do recorrente e não pode ser trocado.'
/** D-53 — parcelamento é só para saídas (D-06). */
export const INSTALLMENT_TYPE_LOCKED_MESSAGE =
  'Parcelas são sempre saídas; o tipo não pode ser trocado.'

// RF-08 — opção "Parcelado" do formulário completo.
export const INSTALLMENT_OPTION_LABEL = 'Parcelado'
export const INSTALLMENT_COUNT_LABEL = 'Número de parcelas'
export const INSTALLMENT_TOTAL_LABEL = 'Valor total'
export const INSTALLMENT_FIRST_DATE_LABEL = 'Data da primeira parcela'
export const NO_TAGS_MESSAGE =
  'Você ainda não tem nenhuma tag. Crie uma para classificar este lançamento; o que já foi digitado continua aqui.' // CA-01.7
