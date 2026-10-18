import { NavList } from '@/components/ui/NavList'

// RF-13 — itens de Ajustes que abrem subpáginas.
export function SettingsMenu() {
  return (
    <nav aria-label="Ajustes">
      <NavList>
        <NavList.Link to="/ajustes/tags">Tags</NavList.Link>
        <NavList.Link to="/ajustes/recorrentes">Recorrentes</NavList.Link>
        <NavList.Link to="/ajustes/backup">Backup</NavList.Link>
        <NavList.Link to="/ajustes/sobre">Sobre</NavList.Link>
      </NavList>
    </nav>
  )
}
