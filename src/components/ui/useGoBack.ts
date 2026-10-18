import { useLocation, useNavigate } from 'react-router'

// O React Router dá a chave 'default' à primeira entrada do histórico do app,
// ou seja, quando a página foi aberta direto pela URL (link, recarga, atalho).
const FIRST_HISTORY_ENTRY_KEY = 'default'

/**
 * CA-13.2 — volta de verdade no histórico quando há uma tela anterior dentro do app;
 * senão vai para a tela pai substituindo a entrada atual, para o "voltar" do navegador
 * não retornar à subpágina.
 */
export function useGoBack(fallbackTo: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  const hasPreviousEntry = location.key !== FIRST_HISTORY_ENTRY_KEY

  return () => {
    if (hasPreviousEntry) {
      void navigate(-1)
      return
    }
    void navigate(fallbackTo, { replace: true })
  }
}
