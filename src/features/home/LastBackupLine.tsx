import { Link } from 'react-router'

interface LastBackupLineProps {
  /** Frase pronta de `describeLastBackup` ("Último backup: há 3 dias"). */
  children: string
}

/**
 * RF-10 / D-48 (c) — linha discreta "Último backup: …" no Início quando não há aviso.
 * É um link para a tela de backup (atalho sem custo de espaço), com alvo ≥ 44 px (RNF-06).
 * slate-600 / slate-400 passam do contraste AA sobre o fundo da página nos dois temas.
 */
export function LastBackupLine({ children }: LastBackupLineProps) {
  return (
    <Link
      to="/ajustes/backup"
      className="flex min-h-11 items-center self-start text-sm text-slate-600 dark:text-slate-400"
    >
      {children}
    </Link>
  )
}
