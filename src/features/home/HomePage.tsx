import { useId } from 'react'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Page } from '@/components/ui/Page'
import { useToday } from '@/components/ui/useToday'
import { BackupReminder } from '@/features/home/BackupReminder'
import { BalanceSummary } from '@/features/home/BalanceSummary'
import { RecentTransactions } from '@/features/home/RecentTransactions'

// RF-02 — Início, de cima para baixo: "Último backup" (RF-10 — aviso quando vale, senão linha
// discreta; D-48 c), saldos,
// lançamento rápido e últimos lançamentos.
// (Recorrentes pendentes — item 4 — chegam na Fase 9.)
export function HomePage() {
  const todayDate = useToday()
  const formTitleId = useId()

  return (
    <Page>
      <Page.Header>Início</Page.Header>
      <Page.Body>
        <BackupReminder today={todayDate} />
        <BalanceSummary today={todayDate} />
        <section aria-labelledby={formTitleId} className="flex flex-col gap-2">
          <h2 id={formTitleId} className="text-lg font-semibold">
            Novo lançamento
          </h2>
          <TransactionForm />
        </section>
        <RecentTransactions today={todayDate} />
      </Page.Body>
    </Page>
  )
}
