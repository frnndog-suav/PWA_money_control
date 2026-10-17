---
name: mudar-requisito
description: Altera um requisito do App de Controle de Gastos atualizando primeiro o docs/SPEC.md (requisito, critérios de aceite, decisões e fases afetadas) e só implementando depois da aprovação. Use quando o usuário quiser mudar uma regra, comportamento ou tela já especificada.
argument-hint: <RF-XX e a nova regra>
---

# Mudar requisito: $ARGUMENTS

Regra da spec (§0.6): **atualize primeiro o documento, depois o código.**

1. Leia `docs/SPEC.md` e localize tudo que a mudança afeta:
   - o RF/RNF e seus CAs;
   - glossário (§3), modelo de dados (§6.3), esquema Dexie (§6.4 — mudança de esquema exige **nova versão** e incremento de `SCHEMA_VERSION`, nunca editar uma versão publicada), regras de domínio (§6.5), rotas (§6.6), Zustand (§6.7), backup (§6.8 — mudança no formato pode exigir migração de backup);
   - decisões da §8.1 que conflitam;
   - tarefas e roteiros de teste das fases da §7 (inclusive de fases já concluídas, que podem precisar de retrabalho).
2. Se a mudança for ambígua ou conflitar com uma decisão marcada "Confirmado pelo dono", pergunte antes de editar.
3. Edite `docs/SPEC.md`:
   - atualize requisito, CAs e seções técnicas afetadas;
   - registre/atualize a decisão na §8.1 (próximo `D-xx`, com a data de hoje e o motivo);
   - incremente a versão do documento no cabeçalho (ex.: 1.2 → 1.3) com a data e um resumo curto;
   - se fases já concluídas forem afetadas, adicione tarefas novas desmarcadas na fase correspondente ou na fase atual.
4. Mostre ao usuário o diff (`git diff docs/SPEC.md`) e um resumo do impacto no código.
5. **Pare e espere a aprovação.** Só depois implemente (seguindo as regras do agente `spec-implementer`) e rode `/verificar-fase`.
