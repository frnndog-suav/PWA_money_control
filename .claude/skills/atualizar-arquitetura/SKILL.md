---
name: atualizar-arquitetura
description: Atualiza (ou cria, na primeira vez) a página secreta de arquitetura e timeline do App de Controle de Gastos (rota somente DEV /__dev/arquitetura, SPEC §6.12) — roda o scanner do código, atualiza fluxos, composição e a linha do tempo. Use ao fim de cada fase, depois de mudanças estruturais, ou quando pedirem para ver/atualizar a arquitetura ou a timeline.
argument-hint: "[fase ou descrição do que mudou]"
---

# Atualizar a página de arquitetura ($ARGUMENTS)

1. **Pré-condição:** a página precisa do roteamento da Fase 0 (React Router + layout). Se a Fase 0 ainda não foi feita, rode só o scanner com `--stdout`, mostre um resumo ao usuário e explique que a página será criada depois da Fase 0.
2. Rode o scanner:

   ```
   node .claude/skills/atualizar-arquitetura/scan-architecture.mjs
   ```

   Ele grava `src/dev/architecture/data/module-graph.json` (não editar à mão).
3. Delegue ao agente `architecture-mapper`, passando `$ARGUMENTS` (fase concluída ou o que mudou) e o resumo do relatório do `spec-implementer`, se houver.
4. Confira o resultado: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, e confirme que `dist/` não contém `ArchitecturePage`, `module-graph` nem `__dev`.
5. Responda ao usuário com: o que mudou na página, as novas entradas da timeline, violações/ciclos apontados pelo scanner e como abrir a página (`npm run dev` → `http://localhost:5173/__dev/arquitetura`).
