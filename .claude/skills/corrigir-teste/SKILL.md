---
name: corrigir-teste
description: Corrige uma falha encontrada no roteiro de teste manual de uma fase do App de Controle de Gastos, sem alterar o comportamento de outras fases. Use quando o usuário relatar que um item do roteiro de teste falhou ou que algo não funciona como na spec.
argument-hint: <Fase N, item X — o que aconteceu>
---

# Corrigir falha de teste: $ARGUMENTS

1. Identifique a fase e o item do "Roteiro de teste" em `docs/SPEC.md` §7, e os RFs/CAs envolvidos. Se o relato não deixar claro o que era esperado, pergunte.
2. Decida se é:
   - **bug** (o código diverge da spec) → corrija o código;
   - **lacuna/erro da spec** (a spec não cobre ou está errada) → **não mude o código ainda**: proponha a alteração em `docs/SPEC.md` (siga a skill `mudar-requisito`) e espere aprovação.
3. Antes de corrigir, escreva (ou peça ao agente `domain-test-writer`) um teste que reproduza a falha, citando o CA (`// RF-xx / CA-xx.y`), e confirme que ele falha.
4. Corrija com a menor mudança possível, sem alterar comportamento de outras fases e respeitando a §2.
5. Rode `npm run lint`, `npm run typecheck`, `npm test` e `node .claude/skills/verificar-fase/check-consistency.mjs`.
6. Responda com: causa raiz, o que mudou, o teste adicionado e quais passos do roteiro o usuário deve repetir. Se a correção dependeu de algo no iPhone (Safari/WebKit) que não dá para testar localmente, diga isso claramente.
