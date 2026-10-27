import { Navigate, type RouteObject } from 'react-router'
import { getDevRoutes } from '@/app/devRoutes'
import { AppLayout } from '@/app/layout/AppLayout'
import { RouteErrorPage } from '@/app/layout/RouteErrorPage'
import {
  TransactionsPage,
  NewTransactionPage,
  TransactionDetailPage,
  ViewsPage,
  ChartsPage,
  SettingsPage,
  TagsPage,
  RecurringsPage,
  RecurringDetailPage,
  BackupPage,
  AboutPage,
} from '@/app/lazyPages'
import { HomePage } from '@/features/home/HomePage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    // Fase 11 — erro no próprio layout: tela de erro sem a barra inferior.
    errorElement: <RouteErrorPage placement="standalone" />,
    children: [
      {
        // Erro de uma tela (leitura do Dexie que falha, tela lazy que não carregou): a tela
        // de erro aparece dentro do layout e a barra inferior continua funcionando.
        errorElement: <RouteErrorPage placement="inLayout" />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'lancamentos', element: <TransactionsPage /> },
          { path: 'lancamentos/novo', element: <NewTransactionPage /> },
          { path: 'lancamentos/:id', element: <TransactionDetailPage /> },
          { path: 'visoes', element: <ViewsPage /> },
          { path: 'graficos', element: <ChartsPage /> },
          { path: 'ajustes', element: <SettingsPage /> },
          { path: 'ajustes/tags', element: <TagsPage /> },
          { path: 'ajustes/recorrentes', element: <RecurringsPage /> },
          { path: 'ajustes/recorrentes/:id', element: <RecurringDetailPage /> },
          { path: 'ajustes/backup', element: <BackupPage /> },
          { path: 'ajustes/sobre', element: <AboutPage /> },
        ],
      },
    ],
  },
  ...getDevRoutes(),
  // D-21 — caminho desconhecido volta para o Início (o Pages serve o index.html para
  // qualquer caminho e a tela de erro padrão do React Router é em inglês).
  { path: '*', element: <Navigate to="/" replace /> },
]
