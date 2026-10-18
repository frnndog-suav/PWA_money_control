import { lazy } from 'react'

// §6.6 — telas carregadas sob demanda com React.lazy. O Início não entra aqui: ele vai
// no pacote principal para a abertura ser rápida (RNF-02).
export const TransactionsPage = lazy(() =>
  import('@/features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })),
)
export const NewTransactionPage = lazy(() =>
  import('@/features/transactions/NewTransactionPage').then((m) => ({
    default: m.NewTransactionPage,
  })),
)
export const TransactionDetailPage = lazy(() =>
  import('@/features/transactions/TransactionDetailPage').then((m) => ({
    default: m.TransactionDetailPage,
  })),
)
export const ViewsPage = lazy(() =>
  import('@/features/views/ViewsPage').then((m) => ({ default: m.ViewsPage })),
)
export const ChartsPage = lazy(() =>
  import('@/features/charts/ChartsPage').then((m) => ({ default: m.ChartsPage })),
)
export const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
export const TagsPage = lazy(() =>
  import('@/features/tags/TagsPage').then((m) => ({ default: m.TagsPage })),
)
export const RecurringsPage = lazy(() =>
  import('@/features/recurrings/RecurringsPage').then((m) => ({ default: m.RecurringsPage })),
)
export const RecurringDetailPage = lazy(() =>
  import('@/features/recurrings/RecurringDetailPage').then((m) => ({
    default: m.RecurringDetailPage,
  })),
)
export const BackupPage = lazy(() =>
  import('@/features/backup/BackupPage').then((m) => ({ default: m.BackupPage })),
)
export const AboutPage = lazy(() =>
  import('@/features/settings/AboutPage').then((m) => ({ default: m.AboutPage })),
)
