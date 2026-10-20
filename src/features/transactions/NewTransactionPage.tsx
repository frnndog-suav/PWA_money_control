import { TransactionForm } from '@/components/transactions/TransactionForm'
import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

// RF-01 — formulário completo. (A opção "Parcelado" — RF-08 — chega na Fase 10.)
export function NewTransactionPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/lancamentos" />}>Novo lançamento</Page.Header>
      <TransactionForm />
    </Page>
  )
}
