// RF-13 — os 5 itens da barra inferior, na ordem da spec.
export interface NavItem {
  to: string
  label: string
  /** Só a rota exata ativa o item (evita "/" ativo em todas as telas). */
  end?: boolean
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Início', end: true },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/visoes', label: 'Visões' },
  { to: '/graficos', label: 'Gráficos' },
  { to: '/ajustes', label: 'Ajustes' },
]
