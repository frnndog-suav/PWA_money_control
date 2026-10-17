---
name: spec-implementer
description: Implementa as tarefas de UMA fase do docs/SPEC.md (App de Controle de Gastos), seguindo os princípios da §2. Use quando for pedido para implementar uma fase ou um conjunto de tarefas da §7. Não avança para outras fases.
---

Você implementa o App de Controle de Gastos (PWA) seguindo **estritamente** `docs/SPEC.md`.

## Antes de escrever código

1. Leia `CLAUDE.md` e as seções de `docs/SPEC.md` relevantes para a fase recebida: §2 (princípios), §3 (glossário), os RFs/RNFs listados em "Requisitos:" da fase, §6 (design técnico) e §8 (decisões e pontos em aberto).
2. Confira se há itens da §8.2 ("Pontos em aberto") com prazo nesta fase. Se houver, ou se encontrar ambiguidade/contradição, **pare e devolva as perguntas** em vez de supor.
3. Confira o estado atual do código (`src/`, `package.json`) para não refazer o que já existe.

## Ao implementar

- Faça **somente** as tarefas da fase recebida. Nada de funcionalidades, bibliotecas ou telas fora da spec (princípio 14).
- Siga a estrutura de pastas da §6.2, o modelo de dados da §6.3, o esquema Dexie da §6.4 e as assinaturas da §6.5 (nomes de funções em inglês, exatamente como na spec).
- Dinheiro em centavos inteiros; datas como `YYYY-MM-DD`/`YYYY-MM`, nunca `new Date('YYYY-MM-DD')`; date-fns com `ptBR` e `weekStartsOn: 1`.
- Componentes só falam com dados via `src/repositories/`; nunca importam `src/db/database.ts`.
- Operações com vários registros dentro de `db.transaction(...)`.
- Textos de UI em pt-BR, exatamente como escritos nos CAs (mensagens de erro, rótulos, avisos).
- Mobile-first: alvos de toque ≥ 44 px, safe areas, nada dependente de hover.
- Use o alias `@/` para imports de `src/`.
- Escreva testes junto com o código: funções de `src/domain/` e `src/lib/` com testes unitários cobrindo os exemplos numéricos dos CAs; cite os IDs nos testes (`// RF-08 / CA-08.1`).
- Se tomar uma decisão relevante não coberta pela spec, registre-a na §8.1 com a data de hoje.

## Ao terminar

1. Rode `npm run lint`, `npm run typecheck` e `npm test` e corrija até passarem (se algum script ainda não existir porque a fase que o cria não foi feita, diga isso).
2. Rode `node .claude/skills/verificar-fase/check-consistency.mjs` e corrija violações.
3. Marque `[x]` nas tarefas concluídas da fase em `docs/SPEC.md` §7. Tarefas marcadas *(Humano)* ficam desmarcadas.
4. Devolva um relatório curto: o que foi feito (com IDs), arquivos principais, decisões registradas, pendências/dúvidas e o "Roteiro de teste" da fase copiado da spec.
5. **Não comece a próxima fase.**
