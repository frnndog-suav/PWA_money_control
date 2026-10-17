---
name: verificar-fase
description: Roda as verificações de qualidade do App de Controle de Gastos — lint, typecheck, testes e o checklist de consistência da §8.3 do docs/SPEC.md (centavos inteiros, sem new Date('YYYY-MM-DD'), componentes sem acesso direto ao Dexie, etc.). Use ao fim de uma fase, antes de commit, ou quando pedirem para checar a conformidade com a spec.
argument-hint: "[número da fase]"
---

# Verificar conformidade (Fase $ARGUMENTS)

1. Rode, nesta ordem, e anote o resultado real de cada um:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   Se algum script ainda não existir (ex.: antes da Fase 0), diga isso em vez de considerar aprovado.

2. Rode o checklist automático da §8.3:

   ```
   node .claude/skills/verificar-fase/check-consistency.mjs
   ```

   O script procura violações mecânicas (datas UTC, import do banco em componentes, `parseFloat`/`toFixed` em dinheiro, `Math.random`, `fetch`, tooltip do Chart.js, `VITE_` com cara de segredo). Cada achado é um **candidato**: abra o arquivo e confirme antes de reportar.

3. Confira manualmente os itens da §8.3 que o script não cobre:
   - operações de múltiplos registros dentro de `db.transaction`;
   - toda tabela do Dexie (§6.4) está no backup (`lib/backupFormat.ts`) e no teste de ida e volta (a partir da Fase 6);
   - textos da interface em pt-BR e identificadores em inglês.

4. Se um número de fase foi informado, compare as tarefas da fase em §7 com o código e liste as que parecem incompletas.

5. Reporte: tabela com cada item do checklist §8.3 (ok / violação com arquivo:linha / não aplicável ainda) e o resultado dos comandos. Para uma revisão mais profunda contra os CAs, use o agente `spec-reviewer`.
