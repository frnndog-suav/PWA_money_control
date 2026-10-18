import { NAV_ITEMS } from '@/app/layout/navItems'
import { TabBar } from '@/components/ui/TabBar'

export function BottomNav() {
  return (
    <TabBar label="Navegação principal">
      {NAV_ITEMS.map((item) => (
        <TabBar.Link key={item.to} to={item.to} end={item.end}>
          {item.label}
        </TabBar.Link>
      ))}
    </TabBar>
  )
}
