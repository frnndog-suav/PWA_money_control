---
name: registrar-decisao
description: Registra uma decisão de implementação ou de produto na tabela "Decisões registradas" (§8.1) do docs/SPEC.md, com o próximo ID D-xx, data e motivo. Use quando uma escolha relevante não coberta pela spec for tomada, ou quando o usuário responder a um ponto em aberto (§8.2).
argument-hint: <decisão e motivo>
---

# Registrar decisão: $ARGUMENTS

1. Leia a §8 de `docs/SPEC.md`. Descubra o maior ID `D-xx` existente (os IDs não estão necessariamente em ordem na tabela) e use o próximo.
2. Verifique se a decisão contradiz algum requisito, princípio (§2) ou decisão anterior. Se contradizer, pare e use a skill `mudar-requisito`.
3. Adicione uma linha **no fim** da tabela da §8.1: `| D-xx | <decisão> | <motivo> (AAAA-MM-DD) |`. Escreva "**Confirmado pelo dono.**" somente se o usuário confirmou explicitamente.
4. Se a decisão resolve um ponto em aberto da §8.2, remova-o da tabela e acrescente na nota abaixo dela ("Q-xx foi resolvida: ver D-xx").
5. Se a decisão afeta outras seções (ex.: nome do app em §6.9), atualize-as também.
6. Mostre o diff ao usuário.
