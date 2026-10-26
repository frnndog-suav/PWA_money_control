import { TransactionForm } from '@/components/transactions/TransactionForm'
import { BackLink } from '@/components/ui/BackLink'
import { Page } from '@/components/ui/Page'

// RF-01 / RF-08 — formulário completo, com a opção "Parcelado" (só aqui — D-53).
export function NewTransactionPage() {
  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/lancamentos" />}>Novo lançamento</Page.Header>
      <TransactionForm allowInstallments />
    </Page>
  )
}
