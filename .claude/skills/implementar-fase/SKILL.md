---
name: implementar-fase
description: Implementa uma única fase do plano de docs/SPEC.md §7 (App de Controle de Gastos), roda as verificações, marca as tarefas e entrega o roteiro de teste manual. Use quando o usuário pedir "implementar a fase N".
argument-hint: <número da fase, 0 a 11>
disable-model-invocation: true
---

# Implementar a Fase $ARGUMENTS

Siga estes passos em ordem. Se `$ARGUMENTS` estiver vazio, pergunte qual fase implementar.

## 1. Pré-condições

- Leia `CLAUDE.md` e `docs/SPEC.md` (§0, §2 e a Fase $ARGUMENTS da §7 inteira, mais os RFs/RNFs listados em "Requisitos:" e as partes da §6 que eles usam).
- Confira em `docs/SPEC.md` §7 se todas as tarefas **não-humanas** das fases anteriores estão `[x]`. Se não estiverem, avise o usuário e pergunte se deve seguir mesmo assim.
- Confira a §8.2: se houver ponto em aberto com prazo até esta fase, pergunte ao usuário antes de começar.
- **Se for a Fase 0 e for a primeira sessão:** antes de codar, entregue (a) um resumo de 5 linhas do produto e (b) dúvidas/contradições encontradas na spec. Espere as respostas.

## 2. Plano

Liste as tarefas da fase (copiadas da §7) e, para cada uma, os arquivos que pretende criar/alterar e os CAs que ela atende. Se a fase for grande, use a lista de tarefas para acompanhar o progresso.

## 3. Implementação

Delegue ao agente `spec-implementer` (ou implemente diretamente, seguindo as mesmas regras dele), passando o número da fase e o plano. Para funções de `src/domain/`, `src/lib/` e repositórios, use o agente `domain-test-writer` para os testes quando fizer sentido.

## 4. Verificação

1. `npm run lint`, `npm run typecheck`, `npm test` — todos sem erros. Reporte a saída real se algo falhar.
2. `node .claude/skills/verificar-fase/check-consistency.mjs` — sem violações.
3. Peça ao agente `spec-reviewer` uma revisão da fase $ARGUMENTS e corrija os achados **bloqueantes**.

## 5. Encerramento

1. Atualize a página de arquitetura e a timeline com a skill `atualizar-arquitetura` (agente `architecture-mapper`), informando a fase $ARGUMENTS e o que foi criado/alterado. Na Fase 0, essa etapa **cria** a página.
2. Marque `[x]` nas tarefas concluídas da Fase $ARGUMENTS em `docs/SPEC.md` §7 (tarefas *(Humano)* ficam como estão).
3. Se houve decisões novas, confirme que estão na §8.1 com data.
4. Responda ao usuário com:
   - resumo do que foi feito (com IDs de requisito);
   - decisões registradas e dúvidas pendentes;
   - tarefas *(Humano)* da fase, se houver;
   - o **"Roteiro de teste"** da fase, copiado da spec;
   - sugestão de mensagem de commit citando os IDs (não faça commit sem o usuário pedir).
5. **Pare.** Não comece a próxima fase até o usuário confirmar que o roteiro de teste passou.
