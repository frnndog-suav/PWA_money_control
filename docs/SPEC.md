# Especificação — App de Controle de Gastos (PWA)

> **Versão do documento:** 1.34 — 26/10/2026 (D-51 confirmada; D-52 — Vitest com 4 workers; Fase 9 concluída — roteiro validado pelo dono) · 1.33 — 25/10/2026 (Fase 9: recorrentes; D-51 aguardando confirmação) · 1.32 — 25/10/2026 (D-50 confirmada, com a exceção de `components/periods`; Fase 8 concluída — roteiro validado pelo dono no PC e no iPhone) · 1.31 — 24/10/2026 (Fase 8: gráficos; D-50 aguardando confirmação) · 1.30 — 24/10/2026 (D-49 confirmada; Fase 7 concluída — roteiro validado pelo dono no PC; §6.7 cita `openPeriod`) · 1.29 — 24/10/2026 (Fase 7: visões por período; D-49 aguardando confirmação) · 1.28 — 23/10/2026 (D-46, D-47 e D-48 confirmadas) · 1.27 — 23/10/2026 (Fase 6 concluída — roteiro validado pelo dono no PC e no iPhone; app liberado para dados reais) · 1.26 — 23/10/2026 (Fase 6: "Último backup" sempre na tela inicial — linha discreta sem aviso, só o aviso quando ele aparece; D-48 (c), opção (a) do dono, aguardando confirmação) · 1.25 — 23/10/2026 (Fase 6: teste manual — "Salvar backup" baixa o arquivo quando a folha é recusada de novo; D-48 aguardando confirmação) · 1.24 — 22/10/2026 (Fase 6: ajustes da revisão — validação do backup, senha em NFC e foco; D-47 e D-48 aguardando confirmação) · 1.23 — 22/10/2026 (Fase 6: backup — D-47 e D-48 aguardando confirmação) · 1.22 — 22/10/2026 (Fase 5 concluída — roteiro validado pelo dono) · 1.21 — 22/10/2026 (testes em dois projetos do Vitest, `unit` em node e `dom` em jsdom — D-46 aguardando confirmação) · 1.20 — 22/10/2026 (D-44 e D-45 confirmadas) · 1.19 — 21/10/2026 (Fase 5: D-44 e D-45 aguardando confirmação) · 1.18 — 21/10/2026 (D-43 confirmada; Fase 4 concluída) · 1.17 — 21/10/2026 (folha Tailwind única em DEV — D-43 aguardando confirmação) · 1.16 — 21/10/2026 (saldo geral inclui lançamentos futuros — D-42 substitui a D-03; D-39 confirmada) · 1.15 — 21/10/2026 (D-37 e D-38 confirmadas; últimos lançamentos só até hoje — D-40; bundle medido na Fase 11 — D-41) · 1.14 — 20/10/2026 (Fase 4: D-37 a D-39 aguardando confirmação) · 1.13 — 20/10/2026 (princípio 16 — botão de envio só ativo com formulário válido, D-36; nota do Tab na D-33) · 1.12 — 20/10/2026 (D-32 a D-34 confirmadas; limite do nome da tag em UTF-16 — D-35) · 1.11 — 20/10/2026 (Fase 3: D-32 a D-34 aguardando confirmação) · 1.10 — 19/10/2026 (D-24 ampliada: procura de versão nova ao abrir, foco, online e a cada 30 min) · 1.9 — 19/10/2026 (exemplo do CA-05.3 corrigido; limite de 10 dígitos — D-31; D-27 a D-30 confirmadas) · 1.8 — 19/10/2026 (Fase 2: D-27 a D-30 aguardando confirmação) · 1.7 — 19/10/2026 (D-23 a D-25 confirmadas) · 1.6 — 19/10/2026 (acesso restrito vira a Fase 12, opcional — D-26) · 1.5 — 18/10/2026 (Fase 1: D-23 a D-25 aguardando confirmação) · 1.4 — 17/10/2026 (oxlint + Prettier — D-19; react-router e versões fixas — D-20; rota desconhecida → Início — D-21; tema sai de app/ na Fase 2 — D-22)
> **Tipo:** Especificação para desenvolvimento orientado por especificação (*spec-driven development*)
> **Uso:** fonte única da verdade para a implementação por um agente de IA, em fases incrementais e testáveis.

---

## Sumário

0. [Como usar este documento (leia primeiro)](#0-como-usar-este-documento-leia-primeiro)
1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Princípios do projeto ("constituição")](#2-princípios-do-projeto-constituição)
3. [Glossário](#3-glossário)
4. [Requisitos funcionais](#4-requisitos-funcionais)
5. [Requisitos não funcionais](#5-requisitos-não-funcionais)
6. [Design técnico](#6-design-técnico)
7. [Plano de implementação em fases](#7-plano-de-implementação-em-fases)
8. [Decisões registradas e pontos em aberto](#8-decisões-registradas-e-pontos-em-aberto)
9. [Anexo — modelos de prompt por sessão](#9-anexo--modelos-de-prompt-por-sessão)

---

## 0. Como usar este documento (leia primeiro)

**Para o agente de IA que vai implementar:**

1. Este documento é a **fonte única da verdade**. Não implemente nada que não esteja descrito aqui. Se algo estiver ambíguo, contraditório ou faltando, **pare e pergunte** antes de supor.
2. Trabalhe **uma fase por sessão** (seção 7). Ao terminar a fase:
   - rode `npm run lint`, `npm run typecheck` e `npm test` sem erros;
   - marque as tarefas concluídas (`[x]`) na seção 7;
   - liste para o humano **o que testar manualmente** (copie o "Roteiro de teste" da fase);
   - atualize a página de arquitetura e a linha do tempo (§6.12);
   - **não comece a próxima fase** até o humano confirmar.
3. Respeite os princípios da seção 2 em todas as fases.
4. Cada requisito tem um ID (ex.: `RF-04`). Cite os IDs nas mensagens de commit e nos comentários de testes (ex.: `// RF-04 / CA-04.3`).
5. Se uma decisão de implementação não estiver coberta aqui e for relevante, registre-a na seção 8 ("Decisões registradas") com data.
6. Se o humano pedir uma mudança de comportamento, **atualize primeiro este documento**, depois o código.

**Para o humano (dono do projeto):**

- Salve este arquivo no repositório como `docs/SPEC.md`.
- Crie na raiz do projeto um arquivo `CLAUDE.md` (ou `AGENTS.md`, conforme a ferramenta) contendo a seção 2 deste documento e a instrução: *"Leia docs/SPEC.md antes de qualquer tarefa."*
- Use os prompts da seção 9 para iniciar cada sessão.
- Não use o app com **dados reais** antes de concluir a **Fase 6 (Backup)**.

---

## 1. Visão geral do produto

### 1.1 Problema

Os apps de controle financeiro disponíveis não oferecem os controles e a organização que o usuário quer. O objetivo é um app pessoal, sob medida, para registrar entradas e saídas e enxergar o resultado por período.

### 1.2 Solução

Um **PWA (Progressive Web App)** em React, instalado na tela de início do iPhone, que funciona **offline** e guarda os dados **somente no aparelho** (IndexedDB). Não há backend. O único deploy é o do site estático, protegido por login no provedor de hospedagem.

### 1.3 Usuário

Um único usuário (o dono do projeto). Uso principal no **iPhone (Safari/WebKit, app instalado na tela de início)**. Uso secundário no navegador do PC durante o desenvolvimento.

### 1.4 Objetivos

- Lançar entradas e saídas de forma rápida, direto da tela inicial.
- Ver o **saldo geral** (todos os dados) e o **saldo do mês** ao abrir o app.
- Ver totais por **dia, semana, mês e ano**, e gráficos por tag.
- Organizar lançamentos com **tags coloridas**.
- Controlar **lançamentos recorrentes** mensais (sem dia fixo) e **compras parceladas**.
- Fazer **backup criptografado** (exportar e importar JSON).

### 1.5 Fora do escopo (não implementar)

- Contas, carteiras ou cartões com saldos separados.
- Orçamento ou limite por tag.
- Múltiplas moedas (somente Real, BRL).
- Múltiplos usuários, cadastro, sincronização ou qualquer backend.
- Exportação em CSV ou outros formatos (somente JSON).
- Criptografia do banco local (somente o arquivo de backup é criptografado).
- Notificações push e lembretes fora do app.
- Publicação em lojas de apps.

---

## 2. Princípios do projeto ("constituição")

Estas regras valem para **todas** as fases e não devem ser violadas.

1. **Dinheiro é inteiro.** Todo valor monetário é armazenado e calculado em **centavos, como número inteiro** (`1999` = R$ 19,99). Nunca usar `float` para dinheiro. Conversão para texto só na camada de apresentação.
2. **Datas sem fuso.** Datas de lançamento são strings `YYYY-MM-DD` no horário local. Períodos mensais são `YYYY-MM`. Nunca usar `new Date('YYYY-MM-DD')` (interpreta como UTC); usar `parseISO` do date-fns ou utilitários próprios.
3. **Semana começa na segunda-feira** (`weekStartsOn: 1`).
4. **Somente Real (BRL), localidade pt-BR** em toda formatação.
5. **Local-first.** Nenhum dado do usuário sai do aparelho, exceto pelo arquivo de backup que o próprio usuário exporta. Sem chamadas de rede para dados.
6. **Lógica de negócio pura e testada.** Regras de cálculo (saldos, recorrências, parcelas, períodos, dinheiro, criptografia) ficam em funções puras em `src/domain/` ou `src/lib/`, sem React e sem Dexie, com testes unitários.
7. **Acesso a dados isolado.** Componentes nunca acessam o Dexie diretamente; usam funções e hooks de `src/repositories/`.
8. **Escritas atômicas.** Operações que alteram mais de um registro (parcelas, importação) usam transação do Dexie.
9. **IDs são UUID** (`crypto.randomUUID()`).
10. **Mobile-first.** Layout pensado para iPhone (largura ~375–430 px), alvos de toque ≥ 44 px, respeito às *safe areas* (`env(safe-area-inset-*)`).
11. **Interface em português (pt-BR); código em inglês** (nomes de variáveis, funções, tipos, tabelas).
12. **TypeScript estrito** (`strict: true`), sem `any` implícito.
13. **Nada de segredos no front-end.** Nenhuma senha ou chave em variáveis `VITE_*` ou no código.
14. **Escopo fechado.** Não adicionar funcionalidades, bibliotecas ou telas que não estejam nesta especificação sem perguntar.
15. **Nada depende de "passar o mouse".** No iPhone não existe *hover*. Toda explicação ou detalhe é exibido como texto visível ou aberto por **toque** (ex.: ícone "ⓘ" que abre um balão/popover e fecha ao tocar fora ou de novo).
16. **Botão de envio só ativo com o formulário válido.** Em **todos** os formulários, o botão principal ("Salvar", "Lançar", "Confirmar", "Exportar"...) fica **desabilitado** enquanto algum campo obrigatório estiver vazio ou inválido (ex.: nome vazio ou acima do limite de caracteres) e durante o envio. Para o usuário saber o motivo, o erro de um campo aparece **enquanto ele digita**, assim que o campo deixa de ser válido depois de ter sido editado; um campo obrigatório ainda não tocado não mostra erro, só mantém o botão desabilitado (D-36).

---

## 3. Glossário

| Termo (UI) | Termo (código) | Definição |
|---|---|---|
| Lançamento | `Transaction` | Registro de uma entrada ou saída de dinheiro em uma data. |
| Entrada | `income` | Lançamento que aumenta o saldo. |
| Saída / Gasto | `expense` | Lançamento que diminui o saldo. |
| Tag | `Tag` | Rótulo com nome e cor. Todo lançamento tem exatamente uma tag. |
| Saldo geral | `overallBalance` | Entradas − saídas de **todos** os lançamentos, inclusive os com data futura (D-42). |
| Saldo do mês | `monthBalance` | Entradas − saídas dos lançamentos do mês corrente. |
| Recorrente | `Recurring` | Modelo de lançamento que acontece **todo mês**, sem dia fixo. |
| Ocorrência | `occurrence` | A instância de um recorrente em um mês específico (`YYYY-MM`). |
| Ocorrência pendente | `pending occurrence` | Ocorrência de um mês que ainda não foi confirmada (não virou lançamento) nem pulada. |
| Confirmar ocorrência | `confirm` | Transformar uma ocorrência pendente em lançamento real, com data e valor. |
| Pular ocorrência | `skip` | Remover a ocorrência de um mês específico, sem afetar os outros meses. |
| Parcelamento | `InstallmentGroup` | Compra dividida em N parcelas mensais, cada uma gerando um lançamento. |
| Realizado | `actual` | Soma dos lançamentos existentes no período. |
| Previsto | `projected` | Realizado + ocorrências recorrentes pendentes do período. |
| Backup | `backup` | Arquivo JSON criptografado com todos os dados do app. |

---

## 4. Requisitos funcionais

Formato: história de usuário + critérios de aceite (`CA`) no estilo **DADO / QUANDO / ENTÃO**.

### RF-01 — Lançamentos (criar, editar, excluir)

**História:** Como usuário, quero registrar entradas e saídas com valor, data, tag e descrição, para controlar meu dinheiro.

**Campos do lançamento:**

| Campo | Regra |
|---|---|
| Tipo | Obrigatório. `Entrada` ou `Saída`. Padrão: `Saída`. |
| Valor | Obrigatório. Inteiro em centavos, > 0 e ≤ 9.999.999.999 (R$ 99.999.999,99). |
| Data | Obrigatória. `YYYY-MM-DD`. Padrão: hoje. Pode ser passada ou futura. |
| Tag | Obrigatória. Exatamente uma tag existente. |
| Descrição | Obrigatória. 1 a 100 caracteres após remover espaços nas pontas. |

**Critérios de aceite:**

- **CA-01.1** DADO o formulário preenchido corretamente, QUANDO o usuário toca em "Lançar", ENTÃO o lançamento é salvo, o formulário é limpo (mantendo tipo e data) e os saldos se atualizam sem recarregar a página.
- **CA-01.2** DADO um campo inválido, QUANDO o usuário tenta salvar, ENTÃO o lançamento não é salvo e uma mensagem de erro aparece abaixo do campo.
- **CA-01.3** DADO o campo de valor, QUANDO o usuário digita os dígitos `1`, `9`, `9`, `9`, ENTÃO o campo exibe `R$ 19,99` (máscara estilo app de banco: os dígitos entram pela direita) e o valor interno é `1999`.
- **CA-01.4** DADO o campo de valor, QUANDO ganha foco no iPhone, ENTÃO abre o teclado numérico (`inputMode="numeric"`).
- **CA-01.5** DADO um lançamento existente, QUANDO o usuário o abre e altera qualquer campo, ENTÃO as alterações são salvas e refletidas em todas as telas.
- **CA-01.6** DADO um lançamento existente, QUANDO o usuário escolhe "Excluir" e confirma, ENTÃO ele é removido. Lançamentos de recorrentes e parcelas seguem regras próprias (RF-07, RF-08).
- **CA-01.7** DADO que não existe nenhuma tag, QUANDO o usuário abre o formulário, ENTÃO o app orienta a criar uma tag (atalho para criar tag sem perder o que já foi digitado).

### RF-02 — Tela inicial

**História:** Como usuário, ao abrir o app quero ver imediatamente como estou e lançar algo rápido.

**Conteúdo, de cima para baixo:**

1. **Saldo geral** (destaque principal): entradas − saídas de **todos** os lançamentos, inclusive os com data futura (D-42).
2. **Saldo do mês corrente**: valor do resultado do mês (entradas − saídas de todos os lançamentos do mês, inclusive com data futura dentro do mês; sem recorrentes pendentes — D-05) e, em texto menor, entradas e saídas do mês.
3. **Formulário de lançamento rápido** (RF-01): tipo (alternador Saída/Entrada), valor, data (padrão hoje), tag, descrição e botão **"Lançar"**.
4. **Recorrentes pendentes do mês** (RF-07): lista compacta com botão "Confirmar" em cada item. Oculta se não houver pendências.
5. **Últimos lançamentos**: os 5 mais recentes **com data até hoje (inclusive)** (por data, depois por criação), com link "Ver todos". Lançamentos com data futura não aparecem nesta lista (D-40).

**Critérios de aceite:**

- **CA-02.1** Valores positivos são exibidos em verde e negativos em vermelho, com sinal explícito (`+R$ 120,00` / `−R$ 45,90`). Zero é neutro. A cor nunca é o único indicador (o sinal também aparece).
- **CA-02.2** DADO que o app é aberto em qualquer dia, ENTÃO a data do formulário é sempre a data de hoje, e o usuário pode trocá-la.
- **CA-02.3** Lançamentos com data futura **entram** no saldo geral. No saldo do mês só entram os lançamentos do mês corrente: um lançamento (futuro ou passado) de outro mês **não** altera o saldo do mês corrente. *(Ver decisão D-42, que substitui a D-03.)*
- **CA-02.4** Após um lançamento, saldo geral, saldo do mês e últimos lançamentos se atualizam imediatamente.

### RF-03 — Tags

**História:** Como usuário, quero criar tags com nome e cor para classificar meus lançamentos.

**Regras:**

- Nome obrigatório, 1 a 30 caracteres, **único** sem diferenciar maiúsculas/minúsculas e acentos ("Mercado" = "mercado").
- Cor obrigatória, escolhida pelo usuário: paleta de 12 cores sugeridas **e** seletor livre (`<input type="color">`). Formato `#RRGGBB`.
- Uma tag pode ser usada em entradas e saídas.

**Critérios de aceite:**

- **CA-03.1** O usuário pode criar, renomear e trocar a cor de uma tag. A mudança aparece em todos os lançamentos e gráficos.
- **CA-03.2** DADO que existe pelo menos um lançamento, recorrente ou parcelamento usando a tag, QUANDO o usuário tenta excluí-la, ENTÃO a exclusão é **bloqueada** e o app informa quantos registros usam a tag.
- **CA-03.3** DADO que nenhum registro usa a tag, QUANDO o usuário a exclui e confirma, ENTÃO ela é removida.
- **CA-03.4** DADO um nome já existente, QUANDO o usuário tenta salvar, ENTÃO aparece o erro "Já existe uma tag com esse nome".
- **CA-03.5** A lista de tags mostra nome, cor e quantidade de lançamentos de cada uma, ordenada por nome.
- **CA-03.6** A tag é exibida como um "chip" com a cor de fundo e texto com contraste legível (texto claro ou escuro calculado pela luminância da cor).

### RF-04 — Lista de lançamentos, busca e filtros

**História:** Como usuário, quero encontrar lançamentos por texto, tag, tipo e período.

**Critérios de aceite:**

- **CA-04.1** A lista mostra os lançamentos agrupados por dia (cabeçalho com a data por extenso e os totais de entrada e saída do dia), do mais recente para o mais antigo.
- **CA-04.2** Filtros disponíveis, combináveis entre si:
  - texto na descrição (sem diferenciar maiúsculas/minúsculas e acentos);
  - tipo (todos / entradas / saídas);
  - tag (todas ou uma específica);
  - período (data inicial e final, ambas opcionais).
- **CA-04.3** Com filtros ativos, o topo mostra a quantidade de resultados e os totais (entradas, saídas, resultado) do conjunto filtrado.
- **CA-04.4** Há um botão "Limpar filtros". Os filtros ficam guardados enquanto o app estiver aberto (estado no Zustand), mas não persistem após fechar.
- **CA-04.5** Tocar em um lançamento abre a edição (RF-01).
- **CA-04.6** A lista continua fluida com 10.000 lançamentos (carregamento paginado ou virtualizado, à escolha da implementação).

### RF-05 — Visões por período

**História:** Como usuário, quero ver entradas, saídas e resultado por dia, semana, mês e ano.

**Elementos comuns:**

- Seletor de granularidade: **Dia | Semana | Mês | Ano**.
- Navegação com setas (anterior/próximo) e um botão "Hoje" que volta ao período atual.
- Cartão de resumo do período: **Entradas**, **Saídas** e **Resultado** (entradas − saídas).

**Por granularidade:**

| Visão | Período | Detalhamento exibido |
|---|---|---|
| **Dia** | uma data | Totais do dia (ex.: "Entradas R$ 10,00 · Saídas R$ 20,00") e a lista dos lançamentos do dia. |
| **Semana** | segunda a domingo | Uma linha por dia (7 linhas) com entradas, saídas e resultado. Tocar abre a visão Dia. |
| **Mês** | mês civil | Uma linha por dia **com movimento** + seção "Recorrentes pendentes" + linha "Previsto" no resumo. Tocar abre a visão Dia. |
| **Ano** | ano civil | Uma linha por mês (12 linhas) com entradas, saídas, resultado e previsto. Tocar abre a visão Mês. |

**Critérios de aceite:**

- **CA-05.1** Os totais de cada período consideram somente lançamentos com data dentro do período.
- **CA-05.2** Na visão Mês, o resumo mostra **Realizado** (lançamentos) e **Previsto** (realizado + recorrentes pendentes daquele mês), separadamente.
- **CA-05.3** A semana sempre vai de segunda a domingo e o título mostra o intervalo (ex.: "12 a 18 de out. de 2026").
- **CA-05.4** O período selecionado e a granularidade ficam no estado global (Zustand) e são compartilhados com a tela de gráficos.

### RF-06 — Gráficos

**História:** Como usuário, quero ver gráficos para entender para onde vai meu dinheiro.

Usar **Chart.js** (renderiza em Canvas) via `react-chartjs-2`.

| Gráfico | Tipo | Disponível em | Dados |
|---|---|---|---|
| Saídas por tag | Pizza (rosca) | Semana, Mês, Ano | Soma de saídas por tag, usando a cor da tag. |
| Entradas por tag | Pizza (rosca) | Semana, Mês, Ano | Soma de entradas por tag, usando a cor da tag. |
| Entradas × Saídas | Barras agrupadas | Semana (por dia), Mês (por dia), Ano (por mês) | Totais por subperíodo. |
| Evolução do saldo | Linha | Mês (por dia), Ano (por mês) | Saldo acumulado de todos os lançamentos com data até o fim de cada subperíodo (no mês corrente, os dias futuros já refletem os lançamentos futuros do mês). O último ponto só coincide com o saldo geral (D-42) se não houver lançamentos depois do período. |

**Critérios de aceite:**

- **CA-06.1** Os gráficos usam o mesmo período selecionado na tela de visões (RF-05).
- **CA-06.2** **Sem tooltip flutuante.** O tooltip nativo do Chart.js fica desativado (`plugins.tooltip.enabled = false`). Os detalhes aparecem num **painel fixo abaixo de cada gráfico** (princípio 15), com valores formatados em reais.
- **CA-06.3** **Pizzas:** abaixo do gráfico há uma **legenda em lista, sempre visível**, com cor, nome da tag, valor e percentual de cada tag, ordenada do maior para o menor valor. A legenda nativa do Chart.js fica desativada.
  - Tocar numa fatia **ou** num item da lista seleciona aquela tag: a fatia é destacada (deslocada para fora ou com as demais esmaecidas) e o item da lista fica realçado.
  - Tocar de novo no item selecionado, ou fora do gráfico e da lista, limpa a seleção.
  - Exemplo de item: "● Mercado — R$ 1.230,50 · 41,2%".
- **CA-06.4** **Barras (Entradas × Saídas):** tocar em **qualquer ponto da coluna** de um dia ou mês seleciona aquele subperíodo (modo de interação `index`, `intersect: false`), não só sobre a barra. A coluna selecionada fica destacada e o painel mostra, por exemplo: "15 de out.: Entradas R$ 1.200,00 · Saídas R$ 350,00 · Resultado +R$ 850,00". Sem seleção, o painel mostra os totais do período inteiro.
- **CA-06.5** **Linha (Evolução do saldo):** tocar ou **arrastar o dedo** sobre o gráfico move um marcador vertical até o ponto mais próximo, e o painel mostra a data/mês e o saldo acumulado naquele ponto. Ao soltar o dedo, a seleção permanece até tocar fora. Durante o arraste horizontal sobre o gráfico, a página não deve rolar (`touch-action: pan-y` no contêiner, tratando o gesto horizontal no gráfico).
- **CA-06.6** Os alvos de toque têm pelo menos 44 px: na pizza, a lista garante isso mesmo para fatias pequenas; nas barras, a coluna inteira é o alvo.
- **CA-06.7** A seleção é anunciada para leitores de tela: o painel de detalhes tem `aria-live="polite"`, e a lista da pizza é composta de botões com `aria-pressed`.
- **CA-06.8** Trocar de período ou de granularidade limpa a seleção.
- **CA-06.9** Os gráficos respeitam o tema claro/escuro (cores de texto, grades e fundo).
- **CA-06.10** Período sem dados mostra um estado vazio ("Nenhum lançamento neste período"), não um gráfico em branco.
- **CA-06.11** Os gráficos consideram somente lançamentos realizados (não incluem recorrentes pendentes).

### RF-07 — Lançamentos recorrentes (mensais, sem dia fixo)

**História:** Como usuário, tenho gastos e entradas que acontecem **todo mês**, mas em dias diferentes. Quero vê-los já ao abrir o mês, confirmar quando acontecerem, pular um mês específico e atualizar o valor dali para frente.

**Campos do recorrente:**

| Campo | Regra |
|---|---|
| Tipo | Entrada ou Saída. |
| Descrição | 1 a 100 caracteres. |
| Tag | Uma tag existente. |
| Valor | Em centavos, com **histórico de valores** (ver abaixo). |
| Mês de início | `YYYY-MM`. Padrão: mês atual. |
| Mês de término | `YYYY-MM` ou vazio (sem término). |

**Comportamento:**

- Para cada mês entre o início e o término (inclusive), o recorrente gera uma **ocorrência**. A ocorrência **não tem dia**: pertence ao mês.
- Uma ocorrência está em um de três estados:
  - **Pendente**: não confirmada e não pulada. Aparece em "Recorrentes pendentes" no mês e na tela inicial (mês corrente). Conta no **Previsto**, não no Realizado nem nos saldos.
  - **Confirmada**: virou um lançamento real (RF-01) vinculado ao recorrente e ao mês.
  - **Pulada**: removida apenas daquele mês.
- **Confirmar**: abre um formulário preenchido com o valor vigente do mês, a descrição e a tag do recorrente. A data padrão é **hoje** se o mês da ocorrência for o mês atual; caso contrário, o **dia 1 do mês da ocorrência**. O usuário pode alterar valor, data, descrição e tag **somente para essa ocorrência**. A data escolhida deve estar dentro do mês da ocorrência. A regra da data padrão é **explicada no próprio formulário** (ver CA-07.8).
- **Alterar valor para o futuro**: o usuário informa o novo valor e o mês a partir do qual ele vale (padrão: mês atual). O novo valor vale para esse mês e os seguintes. Ocorrências **já confirmadas** não mudam.
- **Pular um mês**: a ocorrência some daquele mês. É possível **desfazer** (voltar a pendente).
- **Encerrar**: define o mês de término (padrão: mês atual). Ocorrências posteriores deixam de existir.
- **Excluir recorrente**: permitido somente se ele **não tiver nenhuma ocorrência confirmada**. Se tiver, o app sugere "Encerrar".
- **Excluir um lançamento confirmado de um recorrente**: o app pergunta se a ocorrência deve **voltar a ficar pendente** ou **ser pulada** naquele mês.

**Critérios de aceite:**

- **CA-07.1** DADO um recorrente "Conta de luz" iniciado em 2026-10, QUANDO o usuário abre a visão de novembro/2026, ENTÃO "Conta de luz" aparece como pendente com o valor vigente, e o Previsto do mês inclui esse valor.
- **CA-07.2** DADO uma ocorrência pendente, QUANDO o usuário confirma com a data 2026-11-17 e o valor R$ 187,40, ENTÃO um lançamento é criado com esses dados, a ocorrência sai da lista de pendentes e os saldos se atualizam.
- **CA-07.3** DADO um recorrente com valor R$ 50,00 desde 2026-01, QUANDO o usuário altera para R$ 55,00 a partir de 2026-11, ENTÃO as ocorrências pendentes de 2026-11 em diante mostram R$ 55,00, as anteriores continuam com R$ 50,00 e os lançamentos já confirmados não mudam.
- **CA-07.4** DADO uma ocorrência de 2026-12, QUANDO o usuário a pula, ENTÃO ela não aparece em dezembro e não conta no Previsto. QUANDO o usuário desfaz, ENTÃO ela volta a pendente.
- **CA-07.5** Não é possível confirmar duas vezes a mesma ocorrência (mesmo recorrente e mesmo mês).
- **CA-07.6** Existe uma tela "Recorrentes" listando todos (ativos e encerrados) com tipo, tag, valor vigente e status do mês atual, onde o usuário cria, edita, altera valor, encerra e exclui.
- **CA-07.7** Ocorrências pendentes de meses **passados** continuam aparecendo naquele mês, marcadas como "Não confirmada", até serem confirmadas ou puladas.
- **CA-07.8** No formulário de confirmação, ao lado do campo de data, há um ícone **"ⓘ"**. Ao tocar nele, abre um balão explicativo (fecha ao tocar fora ou no ícone de novo) com o texto:
  - se a ocorrência é do mês atual: *"A data sugerida é hoje porque esta ocorrência é do mês atual. Você pode escolher qualquer dia deste mês."*;
  - se é de outro mês: *"A data sugerida é o dia 1 porque esta ocorrência é de <mês/ano>. Escolha o dia em que o lançamento realmente aconteceu, dentro desse mês."*

  Além do balão, abaixo do campo aparece sempre uma linha curta de ajuda: *"Escolha um dia de <mês/ano>."* Se o usuário escolher uma data fora do mês, o erro é: *"A data precisa estar em <mês/ano>."*

### RF-08 — Compras parceladas

**História:** Como usuário, quero lançar uma compra parcelada uma vez e ver cada parcela no mês certo.

**Regras:**

- Disponível somente para **Saída**. No formulário de lançamento há a opção **"Parcelado"**, que exibe o campo **Número de parcelas** (2 a 48).
- O usuário informa o **valor total**, a **data da primeira parcela**, a tag e a descrição.
- **Divisão do valor:** `parcela = floor(total / n)`; o **resto** dos centavos é somado à **primeira** parcela. A soma das parcelas é sempre igual ao total.
- **Datas:** a parcela *k* (k = 1..n) cai no mesmo dia da primeira, *k−1* meses depois. Se o dia não existir no mês, usa o último dia do mês (ex.: 31/01 → 28/02 ou 29/02 → 31/03).
- Cada parcela é um lançamento normal, exibido como **"Descrição (k/n)"**.
- Parcelas futuras aparecem nos meses futuros e **já entram no saldo geral** desde a criação do parcelamento (D-42). No saldo do mês, cada parcela só conta no seu próprio mês.

**Critérios de aceite:**

- **CA-08.1** DADO total R$ 100,00 em 3 parcelas a partir de 2026-10-31, QUANDO salvo, ENTÃO são criados 3 lançamentos: R$ 33,34 em 2026-10-31, R$ 33,33 em 2026-11-30 e R$ 33,33 em 2026-12-31.
- **CA-08.2** A criação das parcelas é atômica: ou todas são criadas, ou nenhuma.
- **CA-08.3** Editar uma parcela altera **somente aquela parcela**.
- **CA-08.4** Excluir uma parcela oferece três opções: **"Só esta"**, **"Esta e as seguintes"**, **"Todas as parcelas"**.
- **CA-08.5** Os detalhes de uma parcela mostram as informações do parcelamento (valor total, número de parcelas e quantas já passaram).

### RF-09 — Tema claro e escuro

- **CA-09.1** Três opções em Ajustes: **Automático (segue o sistema)**, **Claro**, **Escuro**. Padrão: Automático.
- **CA-09.2** A escolha persiste entre aberturas do app.
- **CA-09.3** A troca é imediata, sem piscar a tela ao abrir (aplicar a classe do tema antes da primeira renderização).
- **CA-09.4** A cor da barra de status do iPhone (`theme-color`) acompanha o tema.

### RF-10 — Backup: exportar e importar (JSON criptografado)

**História:** Como usuário, quero salvar todos os meus dados num arquivo protegido por senha, fora do celular, e restaurá-los quando precisar.

**Exportar:**

- O usuário toca em "Exportar backup", digita uma **senha** (mínimo 8 caracteres) e a confirma.
- O app gera o arquivo `gastos-backup-YYYY-MM-DD.json` com **todos** os dados, criptografado (seção 6.8).
- No iPhone, o arquivo é entregue pela **folha de compartilhamento** do sistema (Web Share API com arquivo), onde o usuário escolhe "Salvar em Arquivos" (iCloud Drive). Se o navegador não suportar compartilhar arquivos, o app faz o download do arquivo.
- Após exportar com sucesso, o app registra a data do último backup.

**Importar:**

- O usuário toca em "Importar backup", escolhe o arquivo e digita a senha.
- O app valida o arquivo (formato, versão, senha, estrutura com zod).
- O app mostra um resumo (data do backup, quantidade de lançamentos, tags e recorrentes) e avisa: **"Isso vai substituir todos os dados atuais."** O usuário confirma.
- A importação **substitui todos os dados** numa única transação. Se qualquer etapa falhar, nada é alterado.

**Lembrete:**

- Em Ajustes e na tela inicial aparece "Último backup: há N dias". Se nunca houve backup ou se passaram **7 dias ou mais** desde o último e existir pelo menos um lançamento, a tela inicial mostra um aviso discreto com atalho para exportar.

**Critérios de aceite:**

- **CA-10.1** DADO um backup exportado, QUANDO importado com a senha correta em um app vazio, ENTÃO todos os dados (lançamentos, tags, recorrentes com histórico de valores e meses pulados, parcelamentos, preferência de tema) ficam idênticos aos originais.
- **CA-10.2** DADO uma senha errada, QUANDO o usuário importa, ENTÃO aparece "Senha incorreta ou arquivo corrompido" e nenhum dado é alterado.
- **CA-10.3** DADO um arquivo que não é um backup do app, QUANDO importado, ENTÃO aparece "Arquivo inválido" e nada é alterado.
- **CA-10.4** DADO um backup de uma versão de esquema **anterior**, QUANDO importado, ENTÃO os dados são migrados para o esquema atual antes de serem gravados.
- **CA-10.5** DADO um backup de uma versão de esquema **mais nova** que a do app, QUANDO importado, ENTÃO o app recusa com "Backup de uma versão mais nova do app. Atualize o app e tente novamente."
- **CA-10.6** O conteúdo do arquivo exportado não contém nenhum dado legível (descrições, valores, tags) sem a senha.

### RF-11 — PWA, instalação e funcionamento offline

- **CA-11.1** O app pode ser adicionado à tela de início do iPhone ("Adicionar à Tela de Início") e abre em tela cheia, sem barra do navegador, com nome e ícone próprios.
- **CA-11.2** Depois da primeira abertura, o app abre e funciona **sem internet** (modo avião), incluindo criar, editar e ver lançamentos.
- **CA-11.3** Quando houver uma versão nova publicada, o app mostra um aviso "Nova versão disponível" com o botão "Atualizar". O app **não** recarrega sozinho enquanto o usuário usa.
- **CA-11.4** Na primeira abertura, o app solicita armazenamento persistente (`navigator.storage.persist()`). Em Ajustes, há um indicador do resultado ("Armazenamento persistente: ativo/não garantido").
- **CA-11.5** Em Ajustes, há uma seção "Sobre" com a versão do app, a versão do esquema do banco e o espaço usado (`navigator.storage.estimate()`).
- **CA-11.6** Se o app for aberto numa aba comum do navegador (fora do modo instalado), mostra um aviso discreto: "Para seus dados ficarem guardados com segurança, adicione o app à Tela de Início e use sempre pelo ícone." (Detecção via `display-mode: standalone` / `navigator.standalone`.)

### RF-12 — Acesso restrito ao site

> **Opcional (D-26):** implementado na Fase 12, depois de todas as outras fases, se o dono decidir. Até lá o site fica sem restrição de acesso.

- **CA-12.1** O site publicado só é entregue a quem fizer login com o e-mail do dono no **Cloudflare Access** (código de uso único por e-mail). Qualquer outra pessoa não recebe nem o HTML do app.
- **CA-12.2** As URLs de *preview* (deploys de branches) também ficam protegidas.
- **CA-12.3** O app instalado continua abrindo offline mesmo quando a sessão do Access expirar; ao ficar online com a sessão expirada, o usuário consegue fazer login de novo e o app volta a receber atualizações.

### RF-13 — Navegação e Ajustes

**Navegação principal:** barra inferior fixa com 5 itens:

| Item | Conteúdo |
|---|---|
| **Início** | RF-02 |
| **Lançamentos** | RF-04 |
| **Visões** | RF-05 |
| **Gráficos** | RF-06 |
| **Ajustes** | Tags (RF-03), Recorrentes (RF-07), Backup (RF-10), Tema (RF-09), Sobre/Armazenamento (RF-11) |

- **CA-13.1** A barra inferior respeita a área segura do iPhone (`safe-area-inset-bottom`).
- **CA-13.2** Rotas usam histórico do navegador, e o gesto/botão "voltar" funciona dentro do app.

---

## 5. Requisitos não funcionais

| ID | Requisito |
|---|---|
| **RNF-01** Plataforma | Alvo principal: iPhone com iOS atual, Safari/WebKit, app instalado na tela de início. Deve funcionar também no Chrome/Edge do PC. |
| **RNF-02** Desempenho | Abertura do app instalado (com cache) em < 1,5 s. Telas com 10.000 lançamentos respondem em < 300 ms. |
| **RNF-03** Offline | Todas as funcionalidades funcionam sem internet, exceto receber atualizações do app. |
| **RNF-04** Privacidade | Nenhum dado de lançamento trafega pela rede. Sem analytics, sem rastreadores, sem fontes ou scripts de CDN externos em produção (tudo empacotado no build). |
| **RNF-05** Segurança do backup | AES-GCM 256 bits, chave derivada da senha com PBKDF2-SHA-256 (600.000 iterações), sal e IV aleatórios por exportação. |
| **RNF-06** Acessibilidade | Contraste AA, rótulos em todos os campos, foco visível, alvos de toque ≥ 44 px, cor nunca como única forma de informação. |
| **RNF-07** Qualidade | TypeScript estrito; lint (oxlint — D-19) sem erros; testes unitários para todo `src/domain/` e `src/lib/` (cobertura ≥ 90% nessas pastas); testes de componentes para formulários principais. |
| **RNF-08** Custo | Zero: hospedagem gratuita, sem serviços pagos. |
| **RNF-09** Contexto seguro | Recursos como Service Worker, `crypto.subtle` e `crypto.randomUUID` exigem HTTPS ou `localhost`. Testes no iPhone devem usar a URL publicada (HTTPS), nunca `http://IP-do-PC:5173`. |

---

## 6. Design técnico

### 6.1 Stack

| Camada | Tecnologia |
|---|---|
| Build | **Vite** |
| UI | **React** + **TypeScript** (strict) |
| Estilo | **Tailwind CSS** (tema escuro via classe `dark` no `<html>`) |
| Rotas | **React Router** (pacote `react-router` — D-20) |
| Banco local | **IndexedDB** via **Dexie.js** + **dexie-react-hooks** (`useLiveQuery`) |
| Estado de interface | **Zustand** |
| Formulários | **React Hook Form** + **@hookform/resolvers** |
| Validação | **Zod** (formulários e arquivo de backup) |
| Datas | **date-fns** (locale `ptBR`, `weekStartsOn: 1`) |
| Gráficos | **Chart.js** + **react-chartjs-2** (Canvas) |
| PWA | **vite-plugin-pwa** (Workbox) |
| Criptografia | **Web Crypto API** nativa (`crypto.subtle`) |
| Testes | **Vitest** + **@testing-library/react** + **fake-indexeddb** |
| Qualidade | **oxlint** + **Prettier** (D-19) |
| Hospedagem | **Cloudflare Pages** (+ **Cloudflare Access**) |

Usar as versões estáveis mais recentes no momento da Fase 0 e registrar as versões no `package.json` **sem `^`** (versões fixas — D-20).

**Divisão de responsabilidades do estado:**

- **Dados persistidos** (lançamentos, tags, recorrentes, parcelamentos, configurações) → Dexie, lidos com `useLiveQuery` (a tela atualiza sozinha quando os dados mudam). **Não** duplicar esses dados no Zustand.
- **Estado de interface** (granularidade e data de referência das visões, filtros da lista, aviso de atualização disponível) → Zustand.

### 6.2 Estrutura de pastas

```
src/
  app/                 # App.tsx, rotas, layout (barra inferior), providers, aplicação do tema
  components/ui/       # Botões, inputs, MoneyInput, DateInput, TagChip, Modal, Toast, EmptyState...
  components/<entidade>/ # Componentes de domínio usados por mais de uma feature (ex.: tags/TagForm, transactions/TransactionForm — D-37)
  components/periods/  # Controles de período das Visões e dos Gráficos, ligados ao Zustand (D-50)
  features/
    home/              # RF-02
    transactions/      # RF-01, RF-04, RF-08 (formulário, lista, filtros)
    tags/              # RF-03
    views/             # RF-05
    charts/            # RF-06
    recurrings/        # RF-07
    backup/            # RF-10
    settings/          # RF-09, RF-11, RF-13
  domain/              # Funções puras + tipos (sem React, sem Dexie)
    types.ts
    money.ts           # parse/format de centavos
    dates.ts           # períodos, semanas, meses, clamp de dia
    balances.ts        # saldos e totais
    recurring.ts       # ocorrências, valor vigente, pendências
    installments.ts    # geração de parcelas
    tagColor.ts        # contraste de texto
  db/
    database.ts        # classe Dexie, versões e migrações
  repositories/        # Acesso a dados: funções + hooks (useTransactions, useTags...)
  lib/
    crypto.ts          # criptografia do backup
    backupFormat.ts    # schemas zod do backup e migrações de backup
    share.ts           # Web Share API / download
    storage.ts         # persist() e estimate()
  stores/
    uiStore.ts         # Zustand
  test/                # setup do Vitest, fábricas de dados de teste
  dev/                 # Somente desenvolvimento (fora do build de produção)
    architecture/      # Página de arquitetura e timeline (§6.12)
docs/
  SPEC.md              # este documento
```

### 6.3 Modelo de dados (TypeScript)

```ts
export type TransactionType = 'income' | 'expense';
export type DateString = string;   // 'YYYY-MM-DD'
export type PeriodString = string; // 'YYYY-MM'
export type Cents = number;        // inteiro

export interface Tag {
  id: string;
  name: string;
  nameKey: string;      // nome normalizado: minúsculas, sem acentos, sem espaços nas pontas (unicidade)
  color: string;        // '#RRGGBB'
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: Cents;           // > 0
  date: DateString;
  description: string;
  tagId: string;
  // Vínculo com recorrente (RF-07)
  recurringId: string | null;
  recurringPeriod: PeriodString | null;   // mês da ocorrência
  // Vínculo com parcelamento (RF-08)
  installmentGroupId: string | null;
  installmentNumber: number | null;       // 1..n
  createdAt: string;
  updatedAt: string;
}

export interface RecurringAmount {
  fromPeriod: PeriodString;   // vale a partir deste mês
  amountCents: Cents;
}

export interface Recurring {
  id: string;
  type: TransactionType;
  description: string;
  tagId: string;
  startPeriod: PeriodString;
  endPeriod: PeriodString | null;
  amounts: RecurringAmount[];      // ordenado por fromPeriod; o 1º tem fromPeriod = startPeriod
  skippedPeriods: PeriodString[];  // meses pulados
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentGroup {
  id: string;
  description: string;
  tagId: string;
  totalCents: Cents;
  count: number;              // 2..48
  firstDate: DateString;
  createdAt: string;
}

export interface Setting {
  key: 'theme' | 'lastBackupAt' | 'persistRequested';
  value: string;
}
```

### 6.4 Esquema Dexie

```ts
// db/database.ts — versão 1
db.version(1).stores({
  tags: 'id, &nameKey',
  transactions: 'id, date, type, tagId, recurringId, [recurringId+recurringPeriod], installmentGroupId',
  recurrings: 'id',
  installmentGroups: 'id',
  settings: 'key',
});
```

- Toda mudança de esquema cria uma **nova versão** (`db.version(2)...upgrade(...)`) e incrementa `SCHEMA_VERSION` exportada pelo módulo. Nunca alterar uma versão já publicada.
- `SCHEMA_VERSION` também é gravada no backup (seção 6.8).

### 6.5 Regras de domínio (funções puras)

**Dinheiro (`domain/money.ts`)**

- `formatBRL(cents)` → `"R$ 1.234,56"` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- `formatSignedBRL(cents)` → `"+R$ 10,00"` / `"−R$ 10,00"` / `"R$ 0,00"`.
- `digitsToCents("199")` → `199`; usado pela máscara do `MoneyInput` (somente dígitos, entram pela direita, limite de 10 dígitos — o mesmo do valor máximo do RF-01, R$ 99.999.999,99; D-31).
- Somas sempre com inteiros; validar com `Number.isSafeInteger`.

**Datas (`domain/dates.ts`)**

- `today()` → `DateString` local.
- `periodOf(date)` → `'YYYY-MM'`.
- `weekRange(date)` → `{ start, end }`, segunda a domingo.
- `monthRange(period)`, `yearRange(year)`.
- `addMonthsClamped(date, k)` → mesmo dia, *k* meses depois; se o dia não existir, último dia do mês.
- `periodsBetween(start, end)` → lista de `'YYYY-MM'` inclusiva.

**Saldos (`domain/balances.ts`)**

- `totals(transactions)` → `{ incomeCents, expenseCents, resultCents }`.
- `overallBalance(transactions)` → resultado de **todos** os lançamentos, sem filtro por data (D-42).
- `groupByDay(transactions)`, `groupByMonth(transactions)`, `groupByTag(transactions)`.
- `runningBalance(transactions, buckets)` → saldo acumulado ao fim de cada subperíodo (para o gráfico de linha). Considera todos os lançamentos anteriores ao início do período como saldo inicial.

**Recorrentes (`domain/recurring.ts`)**

- `amountFor(recurring, period)` → valor do último item de `amounts` com `fromPeriod <= period`.
- `isActiveIn(recurring, period)` → `startPeriod <= period` e (`endPeriod` nulo ou `period <= endPeriod`).
- `pendingOccurrences(recurrings, transactions, period)` → lista de `{ recurring, period, amountCents }` para recorrentes ativos no mês, cujo mês não está em `skippedPeriods` e que **não** têm lançamento com `[recurringId+recurringPeriod]` igual.
- `setAmountFrom(recurring, fromPeriod, amountCents)` → remove itens de `amounts` com `fromPeriod >= novo fromPeriod` e adiciona o novo (mantém ordenado). Se `fromPeriod < startPeriod`, erro.
- `projected(actualTotals, pending)` → totais previstos.

**Parcelas (`domain/installments.ts`)**

- `splitInstallments(totalCents, count)` → array de centavos; resto somado à 1ª parcela; soma igual ao total.
- `buildInstallmentTransactions(group)` → lançamentos com datas via `addMonthsClamped(firstDate, k-1)`.
- Exibição: `"${description} (${k}/${n})"`. A descrição armazenada em cada lançamento é a descrição base, sem o sufixo.

**Cor de tag (`domain/tagColor.ts`)**

- `readableTextColor(hex)` → `'#000000'` ou `'#FFFFFF'` pela luminância relativa (WCAG).

### 6.6 Telas e rotas

| Rota | Tela | Requisitos |
|---|---|---|
| `/` | Início | RF-02 |
| `/lancamentos` | Lista + filtros | RF-04 |
| `/lancamentos/novo` | Formulário completo (com opção Parcelado) | RF-01, RF-08 |
| `/lancamentos/:id` | Edição / detalhes / exclusão | RF-01, RF-07, RF-08 |
| `/visoes` | Visões por período | RF-05 |
| `/graficos` | Gráficos | RF-06 |
| `/ajustes` | Menu de ajustes | RF-13 |
| `/ajustes/tags` | Tags | RF-03 |
| `/ajustes/recorrentes` | Lista de recorrentes | RF-07 |
| `/ajustes/recorrentes/:id` | Detalhes, alterar valor, encerrar, excluir, meses pulados | RF-07 |
| `/ajustes/backup` | Exportar / importar | RF-10 |
| `/ajustes/sobre` | Versão, esquema, armazenamento | RF-11 |
| `/__dev/arquitetura` | Arquitetura e timeline — **somente em desenvolvimento**, sem link na interface | §6.12 / D-17 |

Modais (não são rotas): confirmar ocorrência recorrente, confirmações de exclusão, senha de backup.

### 6.7 Zustand (`stores/uiStore.ts`)

```ts
interface UiState {
  viewGranularity: 'day' | 'week' | 'month' | 'year';
  viewAnchorDate: DateString;              // data de referência do período
  transactionFilters: {
    text: string;
    type: 'all' | TransactionType;
    tagId: string | null;
    from: DateString | null;
    to: DateString | null;
  };
  updateAvailable: boolean;                // aviso de nova versão do PWA
  // ações: setGranularity, goPrev, goNext, goToday, openPeriod (detalhamento — D-49), setFilters, clearFilters, setUpdateAvailable
}
```

O tema **não** fica no Zustand; fica na tabela `settings` (persistido) e é aplicado por um provider.

### 6.8 Backup — formato e criptografia

**Conteúdo em claro (antes de criptografar):**

```json
{
  "app": "app-gastos",
  "schemaVersion": 1,
  "exportedAt": "2026-10-17T15:05:00-03:00",
  "data": {
    "tags": [],
    "transactions": [],
    "recurrings": [],
    "installmentGroups": [],
    "settings": [{ "key": "theme", "value": "system" }]
  }
}
```

(`settings` exportado inclui somente `theme`; `lastBackupAt` e `persistRequested` são locais ao aparelho.)

**Arquivo gravado (envelope):**

```json
{
  "format": "app-gastos-backup",
  "formatVersion": 1,
  "createdAt": "2026-10-17T15:05:00-03:00",
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": "<base64, 16 bytes>" },
  "cipher": { "name": "AES-GCM", "length": 256, "iv": "<base64, 12 bytes>" },
  "ciphertext": "<base64>"
}
```

**Exportar (`lib/crypto.ts` + `features/backup`):**

1. Ler todas as tabelas numa transação de leitura.
2. Serializar o conteúdo em claro em JSON (UTF-8).
3. Gerar `salt` (16 bytes) e `iv` (12 bytes) com `crypto.getRandomValues`.
4. Derivar a chave: `PBKDF2(senha, salt, 600000, SHA-256)` → chave AES-GCM 256.
5. Criptografar e montar o envelope.
6. Criar `File([json], 'gastos-backup-YYYY-MM-DD.json', { type: 'application/json' })`.
7. Se `navigator.canShare?.({ files: [file] })` → `navigator.share({ files: [file] })`; senão, baixar via `<a download>`.
8. Gravar `lastBackupAt` **somente** se o compartilhamento/download não foi cancelado (tratar `AbortError`).

**Importar:**

1. Ler o arquivo escolhido (`<input type="file" accept="application/json,.json">`).
2. Validar o envelope com zod → senão "Arquivo inválido".
3. Derivar a chave e descriptografar → falha (`OperationError`) = "Senha incorreta ou arquivo corrompido".
4. Validar o conteúdo com zod. Se `schemaVersion` > atual → recusar (CA-10.5). Se menor → aplicar migrações de backup (`lib/backupFormat.ts`, uma função por versão).
5. Validar integridade referencial (todo `tagId` existe; todo `recurringId`/`installmentGroupId` existe; valores inteiros positivos).
6. Mostrar resumo e pedir confirmação.
7. Numa única transação `rw` em todas as tabelas: limpar e inserir tudo.

### 6.9 PWA

- `vite-plugin-pwa` com `registerType: 'prompt'` (o app mostra o aviso de atualização; ver CA-11.3).
- Precache de todos os arquivos do build (JS, CSS, HTML, ícones, fontes locais).
- Manifest:
  - `name`: "Meus Gastos"; `short_name`: "Gastos" *(nomes provisórios — D-09)*;
  - `display: "standalone"`, `start_url: "/"`, `scope: "/"`, `lang: "pt-BR"`;
  - `theme_color` e `background_color` coerentes com o tema;
  - ícones 192×192 e 512×512 (inclusive `maskable`).
- `index.html`:
  - `<link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">` (necessário para o manifest ser carregado atrás do Cloudflare Access);
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (180×180);
  - `<meta name="apple-mobile-web-app-capable" content="yes">` e `<meta name="apple-mobile-web-app-status-bar-style" content="default">`;
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`;
  - script inline mínimo que aplica a classe do tema antes da renderização (CA-09.3), lendo uma cópia do tema em `localStorage` (espelho do valor salvo no Dexie, apenas para evitar o "piscar").
- Ao abrir: `navigator.storage.persist()` (uma vez; registrar `persistRequested`).

### 6.10 Deploy e acesso (Cloudflare Pages + Cloudflare Access)

> O deploy é feito na Fase 1. O **acesso restrito** é opcional e fica para a Fase 12 (D-26).

**Deploy:**

1. Repositório no GitHub.
2. Cloudflare → Workers & Pages → criar projeto **Pages** conectado ao repositório.
3. Build: comando `npm run build`, diretório de saída `dist`.
4. Cada `git push` na branch principal publica em produção (`<projeto>.pages.dev`); outras branches geram URLs de preview.
5. Roteamento SPA: sem `404.html` no build, o Pages serve o `index.html` para rotas desconhecidas. Não gerar `404.html`.

**Acesso restrito:**

1. No projeto Pages → Settings → General → **Enable access policy**. Isso protege as URLs de preview.
2. Em Zero Trust → Access → Applications, editar a aplicação criada e **incluir também o domínio de produção** `<projeto>.pages.dev` (seguir a página "Known issues" da documentação do Cloudflare Pages, seção "Enable Access on your *.pages.dev domain").
3. Política: **Allow** → Include → **Emails** = e-mail do dono.
4. Método de login: **One-time PIN** (código por e-mail).
5. Duração da sessão: a mais longa disponível que o dono aceitar (ex.: 1 mês).

**Alternativa (se o Access der problema no iPhone):** Vercel com **Vercel Authentication** em "All Deployments" (gratuito), com login por conta Vercel. Registrar a troca na seção 8.

### 6.11 Estratégia de testes

| Tipo | Ferramenta | O que cobre |
|---|---|---|
| Unitário | Vitest (projeto `unit`, node) | Tudo em `domain/` e `lib/` (dinheiro, datas, saldos, recorrentes, parcelas, cripto, formato de backup). |
| Integração de dados | Vitest + fake-indexeddb (projeto `unit`, node; `dom` se usar `renderHook` ou `localStorage`) | Repositórios: CRUD, unicidade de tag, bloqueio de exclusão, transações de parcelas, importação atômica. |
| Componente | Testing Library (projeto `dom`, jsdom) | MoneyInput, formulário de lançamento, formulário de tag, confirmação de recorrente. |
| Manual | iPhone | Roteiro de teste de cada fase (seção 7). |

**Projetos do Vitest (D-46):** `*.test.ts` roda no projeto `unit` (node, sem DOM); `*.test.tsx` e os `*.test.ts` listados em `DOM_TEST_FILES` no `vite.config.ts` rodam no projeto `dom` (jsdom + Testing Library). `npm test` roda os dois.

Casos obrigatórios de teste unitário (mínimo): todos os exemplos numéricos dos CAs (ex.: CA-01.3, CA-07.3, CA-08.1), anos bissextos em `addMonthsClamped`, virada de ano em semanas, valores grandes (limite de 10 dígitos — D-31), soma de parcelas igual ao total para vários totais e números de parcelas.

**Dados de teste:** criar um script/ação **somente em desenvolvimento** (`import.meta.env.DEV`) para gerar dados de exemplo (ex.: 12 tags, 5.000 lançamentos em 3 anos, 4 recorrentes, 3 parcelamentos) e outro para apagar tudo. Não incluir no build de produção.

### 6.12 Página de arquitetura e timeline (somente desenvolvimento)

Ferramenta interna para o desenvolvedor, mantida pelo agente `architecture-mapper` (`.claude/agents/architecture-mapper.md`). Não é funcionalidade do produto.

- **Rota:** `/__dev/arquitetura`, registrada somente quando `import.meta.env.DEV` é verdadeiro e carregada com `React.lazy`. Sem link na barra inferior nem em Ajustes. **Nada desta página entra no build de produção** (verificar no `dist/`).
- **Conteúdo:** a topologia da aplicação inteira — camadas e direções de dependência permitidas, grafo de módulos com inspetor, rotas e telas, árvore de composição de componentes, fluxos de dados e interações por funcionalidade (diagramas de sequência), modelo de dados (tabelas Dexie, índices, quem lê/escreve), estado do Zustand, funções de domínio, rastreabilidade requisito → código → teste, dependências externas, saúde da arquitetura (violações, ciclos, órfãos) — e a **linha do tempo** das implementações (data, fase, commits, requisitos, decisões e arquivos de cada entrega).
- **Dados:** `src/dev/architecture/data/module-graph.json` é **gerado** por `.claude/skills/atualizar-arquitetura/scan-architecture.mjs` a partir do código (não editar à mão); fluxos, explicações e timeline são escritos pelo agente em `curated.ts` e `timeline.ts`, com um teste Vitest que garante que toda referência aponta para um módulo existente.
- **Estilos:** sem folha CSS própria. Existe uma única folha Tailwind (`src/index.css`); as fontes dela vêm do alias `@tailwind-sources` do `vite.config.ts`, que em DEV (`vite serve`) inclui `src/dev` e no build exclui (`@source not`), para nenhuma classe desta página entrar no CSS do `dist/` (D-43).
- **Restrições:** sem bibliotecas de diagrama sem autorização (SVG inline com React + Tailwind); nunca exibe dados do usuário; segue os princípios da seção 2 (pt-BR, tema claro/escuro, sem depender de hover).
- **Atualização:** ao fim de cada fase (seção 0, item 2) e após mudanças estruturais.

---

## 7. Plano de implementação em fases

Cada fase termina com o app **funcionando e testável**. Ao concluir uma fase, o agente para e entrega o roteiro de teste.

> **Como testar no iPhone:** faça `git push` de uma branch e abra a URL de preview do Cloudflare Pages (HTTPS). Não use `http://IP-do-PC`, porque o iPhone não trata esse endereço como contexto seguro (RNF-09).

---

### Fase 0 — Fundação do projeto

**Requisitos:** RF-09, RF-13 (estrutura), RNF-07

- [x] Criar projeto Vite + React + TypeScript (strict), oxlint, Prettier (D-19).
- [x] Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`.
- [x] Configurar Tailwind com modo escuro por classe.
- [x] Configurar Vitest + Testing Library + fake-indexeddb.
- [x] Criar a estrutura de pastas da seção 6.2.
- [x] Layout com barra inferior de 5 itens e rotas vazias (páginas com título) — seção 6.6.
- [x] Tema Automático/Claro/Escuro em `/ajustes` (persistência temporária em `localStorage`; migra para Dexie na Fase 2), sem piscar ao abrir.
- [x] Respeitar *safe areas* do iPhone.
- [x] Criar a página de arquitetura e timeline em `/__dev/arquitetura`, somente em DEV (§6.12), com as entradas da linha do tempo desde o primeiro commit.

**Roteiro de teste:**
1. `npm run dev` → abrir `http://localhost:5173` no PC.
2. Navegar pelas 5 abas; voltar com o botão do navegador.
3. Trocar o tema nas três opções; recarregar e conferir que a escolha permanece.
4. `npm run lint`, `npm run typecheck` e `npm test` passam.

---

### Fase 1 — PWA e deploy

**Requisitos:** RF-11 (CA-11.1 a 11.3, 11.6). *(RF-12 — acesso restrito — foi movido para a Fase 12, opcional: D-26.)*

- [x] Configurar `vite-plugin-pwa` (seção 6.9), ícones provisórios, manifest, metatags do iOS.
- [x] Componente de aviso "Nova versão disponível" com botão "Atualizar" (Zustand `updateAvailable`).
- [x] Aviso para quando o app estiver aberto fora do modo instalado (CA-11.6).
- [x] Documentar no `README.md` o passo a passo de deploy e Access (seção 6.10).
- [x] *(Humano)* Criar o projeto no Cloudflare Pages e publicar. *(Configurar o Cloudflare Access passou para a Fase 12 — D-26.)*

**Roteiro de teste (iPhone):**
1. Adicionar à Tela de Início → abrir pelo ícone → deve abrir em tela cheia com nome e ícone.
2. Ativar o modo avião → abrir pelo ícone → o app deve abrir normalmente.
3. Fazer uma mudança visível, dar push, abrir o app → deve aparecer "Nova versão disponível" → tocar "Atualizar" → mudança visível.

*(Os testes de login do Access estão no roteiro da Fase 12.)*

---

### Fase 2 — Domínio e banco de dados

**Requisitos:** princípios 1, 2, 3, 6, 7, 9; seções 6.3 a 6.5

- [x] `domain/types.ts`, `money.ts`, `dates.ts`, `balances.ts`, `tagColor.ts` com testes unitários.
- [x] `db/database.ts` com o esquema versão 1 e `SCHEMA_VERSION`.
- [x] Repositório de `settings`; mover a preferência de tema para o Dexie (mantendo o espelho em `localStorage` só para evitar o "piscar").
- [x] Mover o hook e o contexto do tema (`useTheme`, `ThemeContext`) de `src/app/theme/` para `src/repositories/`, para que as features não importem de `app/` (D-22).
- [x] `lib/storage.ts`: `persist()` na primeira abertura e `estimate()`.
- [x] Tela `/ajustes/sobre` (CA-11.4, CA-11.5).
- [x] Ferramentas de desenvolvimento: gerar e apagar dados de exemplo (somente em DEV; as funções podem ser concluídas nas fases seguintes, à medida que as tabelas forem usadas).

**Roteiro de teste:**
1. `npm test` → todos os testes de domínio passam (incluindo os exemplos dos CAs já aplicáveis).
2. No iPhone (preview): Ajustes → Sobre mostra versão, esquema 1, espaço usado e status do armazenamento persistente.
3. Tema continua funcionando após a migração para o Dexie.

---

### Fase 3 — Tags

**Requisitos:** RF-03

- [x] Repositório de tags (criar, editar, excluir com bloqueio, contagem de uso).
- [x] Componente `TagChip` com contraste automático.
- [x] Tela `/ajustes/tags`: lista, criar, editar (nome e cor com paleta de 12 + seletor livre), excluir.
- [x] Testes: unicidade (maiúsculas e acentos), bloqueio de exclusão em uso.

**Roteiro de teste:**
1. Criar "Mercado" (verde), "Salário" (azul), "Lazer" (roxo).
2. Tentar criar "mercado" → erro de nome repetido.
3. Renomear "Lazer" para "Diversão" e trocar a cor.
4. Excluir "Diversão" (sem uso) → removida.
5. (A regra de bloqueio por uso é testada na Fase 4.)

---

### Fase 4 — Lançamentos e tela inicial

**Requisitos:** RF-01, RF-02 (exceto itens de recorrentes), RF-03 (CA-03.2 completo)

- [x] Componentes `MoneyInput` (máscara, teclado numérico) e `DateInput`.
- [x] Repositório de lançamentos (CRUD) e hooks de saldo geral e saldo do mês.
- [x] Formulário de lançamento (React Hook Form + Zod) reutilizado na tela inicial e em `/lancamentos/novo` e `/lancamentos/:id`.
- [x] Tela inicial: saldo geral, saldo do mês, formulário rápido, últimos 5 lançamentos.
- [x] Atalho para criar tag a partir do formulário (CA-01.7).
- [x] Testes de componente do `MoneyInput` e do formulário.

**Roteiro de teste (iPhone, app instalado):**
1. Digitar `1999` no valor → aparece `R$ 19,99`; o teclado é numérico.
2. Lançar uma entrada de R$ 1.000,00 (Salário) e uma saída de R$ 250,00 (Mercado) hoje → saldo geral `+R$ 750,00`; saldo do mês `+R$ 750,00`.
3. Lançar uma saída com data de amanhã → saldo geral muda; saldo do mês muda se amanhã for no mês corrente. Lançar uma saída com data no **mês seguinte** → saldo geral muda, saldo do mês **não** muda (D-42). Em nenhum dos dois casos o lançamento aparece em "Últimos lançamentos" (D-40).
4. Editar o valor de um lançamento → os saldos se atualizam.
5. Excluir um lançamento → os saldos se atualizam.
6. Tentar excluir a tag "Mercado" (em uso) → bloqueado com a contagem.
7. Fechar o app completamente, abrir de novo → os dados continuam lá e a data do formulário é hoje.

---

### Fase 5 — Lista, busca e filtros

**Requisitos:** RF-04

- [x] Lista agrupada por dia com totais diários.
- [x] Filtros (texto, tipo, tag, período) no Zustand; totais do conjunto filtrado; "Limpar filtros".
- [x] Paginação ou virtualização (CA-04.6).

**Roteiro de teste:**
1. Gerar dados de exemplo (ferramenta de DEV, no PC) e verificar que a rolagem é fluida.
2. Buscar "merc" → encontra "Mercado" e "mercado do bairro".
3. Combinar tag + período → totais batem com a soma manual de alguns itens.
4. Trocar de aba e voltar → filtros mantidos; fechar o app → filtros zerados.

---

### Fase 6 — Backup (exportar e importar)

**Requisitos:** RF-10

> ⚠️ A partir do fim desta fase o app pode ser usado com dados reais.

- [x] `lib/crypto.ts` (PBKDF2 + AES-GCM) com testes (ida e volta, senha errada, adulteração do texto cifrado).
- [x] `lib/backupFormat.ts`: schemas zod, verificação de versão, estrutura de migrações (vazia por enquanto).
- [x] `lib/share.ts`: Web Share API com arquivo e fallback de download.
- [x] Tela `/ajustes/backup`: exportar (senha + confirmação), importar (arquivo + senha + resumo + confirmação), "Último backup: há N dias".
- [x] Aviso de backup na tela inicial (regra dos 7 dias).
- [x] Teste de integração: exportar → limpar banco → importar → dados idênticos.

**Roteiro de teste (iPhone):**
1. Exportar com uma senha → folha de compartilhamento → "Salvar em Arquivos" → iCloud Drive.
2. Abrir o arquivo no app Arquivos → conteúdo ilegível (sem descrições nem valores visíveis).
3. Importar com senha errada → erro, nada muda.
4. Remover o app da tela de início, adicionar de novo (app vazio) → importar o backup → todos os dados voltam.
5. Conferir "Último backup: hoje".

---

### Fase 7 — Visões por período

**Requisitos:** RF-05 (sem a parte de recorrentes, que entra na Fase 9)

- [x] Seletor Dia/Semana/Mês/Ano, setas e "Hoje" (Zustand).
- [x] Cartão de resumo e detalhamento de cada granularidade.
- [x] Navegação de detalhamento (Ano → Mês → Dia; Semana → Dia).
- [x] Testes de `weekRange` e de virada de mês/ano.

**Roteiro de teste:**
1. Visão Dia de hoje → totais de entrada e saída corretos.
2. Visão Semana → 7 linhas de segunda a domingo; o título mostra o intervalo.
3. Visão Mês → só os dias com movimento; tocar num dia abre a visão Dia.
4. Visão Ano → 12 meses; tocar num mês abre a visão Mês.
5. Navegar para dezembro → janeiro (virada de ano) sem erros.

---

### Fase 8 — Gráficos

**Requisitos:** RF-06

- [x] Registrar somente os componentes necessários do Chart.js (para reduzir o tamanho do pacote).
- [x] Pizza de saídas por tag, pizza de entradas por tag, barras entradas × saídas, linha de evolução do saldo.
- [x] Desativar tooltip e legenda nativos; componente `ChartDetailPanel` (painel fixo abaixo do gráfico, `aria-live`).
- [x] Legenda em lista das pizzas, com seleção sincronizada entre fatia e item (CA-06.3).
- [x] Seleção por coluna nas barras (CA-06.4) e marcador arrastável na linha (CA-06.5).
- [x] Cores das tags, tema claro/escuro, estados vazios, limpeza da seleção ao trocar de período.
- [x] Funções puras para os dados dos gráficos (agrupamento, percentuais que somam 100% com arredondamento consistente) com testes.

**Roteiro de teste (iPhone):**
1. Mês com dados → a pizza de saídas usa as cores das tags; a lista abaixo mostra valor e percentual de cada tag, do maior para o menor, e os valores batem com a visão Mês.
2. Tocar numa fatia grande → a fatia e o item da lista ficam destacados. Tocar no item de uma tag pequena na lista → a fatia fininha correspondente fica destacada.
3. Tocar de novo no item selecionado → a seleção some.
4. Gráfico de barras do mês → tocar no espaço vazio acima de uma barra baixa → aquele dia é selecionado e o painel mostra entradas, saídas e resultado.
5. Gráfico de linha → arrastar o dedo horizontalmente → o marcador acompanha, o painel atualiza e a página não rola.
6. Trocar de mês → a seleção é limpa.
7. Trocar o tema → gráficos e painéis legíveis nos dois modos.
8. Período sem dados → mensagem de estado vazio.

---

### Fase 9 — Recorrentes

**Requisitos:** RF-07; integra com RF-02 (item 4), RF-05 (Previsto e pendentes), RF-10 (backup inclui recorrentes)

- [x] `domain/recurring.ts` com testes (valor vigente, ativo no mês, pendências, alteração de valor, meses pulados).
- [x] Repositório de recorrentes; confirmar ocorrência (cria lançamento vinculado); pular/desfazer; alterar valor a partir de um mês; encerrar; excluir (com regra).
- [x] Telas `/ajustes/recorrentes` e `/ajustes/recorrentes/:id`.
- [x] Modal de confirmação de ocorrência (data dentro do mês da ocorrência), com o ícone "ⓘ", o balão explicativo e a linha de ajuda (CA-07.8).
- [x] Componente reutilizável `InfoPopover` (abre e fecha por toque, acessível por teclado, `aria-expanded`).
- [x] Pendentes do mês na tela inicial; "Previsto" e seção de pendentes na visão Mês; coluna Previsto na visão Ano.
- [x] Exclusão de lançamento confirmado: perguntar "voltar a pendente" ou "pular este mês".
- [x] Atualizar backup (exportação/importação incluem recorrentes) e teste de ida e volta.

**Roteiro de teste:**
1. Criar recorrente "Conta de luz", saída, R$ 180,00, início no mês atual → aparece como pendente na tela inicial e na visão Mês; Previsto inclui R$ 180,00.
2. Navegar para os próximos 2 meses → aparece pendente com R$ 180,00.
3. Confirmar no mês atual com R$ 187,40 → vira lançamento; sai das pendências; saldos atualizam. Antes de confirmar, tocar no "ⓘ" ao lado da data → o balão explica que a data sugerida é hoje.
3b. Abrir uma ocorrência de um mês futuro para confirmar → data sugerida é o dia 1 daquele mês; o "ⓘ" explica o motivo; escolher uma data fora do mês → mensagem de erro.
4. Alterar o valor para R$ 200,00 a partir do próximo mês → próximo mês mostra R$ 200,00; o lançamento confirmado continua R$ 187,40.
5. Pular o mês seguinte → some; desfazer → volta.
6. Tentar excluir o recorrente → bloqueado (tem ocorrência confirmada); encerrar → meses posteriores não mostram mais.
7. Exportar e importar backup → recorrentes, valores e meses pulados preservados.

---

### Fase 10 — Parcelamento

**Requisitos:** RF-08; integra com RF-10

- [ ] `domain/installments.ts` com testes (divisão, resto, datas com fim de mês, bissexto).
- [ ] Opção "Parcelado" no formulário (somente Saída), número de parcelas 2–48, valor total.
- [ ] Criação atômica do grupo e das parcelas.
- [ ] Exibição "Descrição (k/n)" e detalhes do parcelamento.
- [ ] Exclusão com as três opções.
- [ ] Atualizar backup e teste de ida e volta.

**Roteiro de teste:**
1. Parcelar R$ 100,00 em 3x a partir do dia 31 → parcelas de R$ 33,34, R$ 33,33, R$ 33,33 em 31, 30 (ou último dia) e 31.
2. **Todas** as parcelas entram no saldo geral desde a criação (D-42); no saldo do mês corrente entra só a parcela do mês corrente; as futuras aparecem nos meses seguintes e não aparecem em "Últimos lançamentos" na tela inicial (D-40).
3. Editar o valor da parcela 2 → só ela muda.
4. Excluir "Esta e as seguintes" a partir da 2 → sobra só a 1.
5. Backup → importar → parcelamento preservado.

---

### Fase 11 — Polimento e revisão final

**Requisitos:** RNF-02, RNF-04, RNF-06

- [ ] Estados vazios e mensagens de erro em todas as telas.
- [ ] Revisão de acessibilidade (rótulos, foco, contraste, alvos de toque).
- [ ] Teste de desempenho com 10.000 lançamentos.
- [ ] Ícones e nome definitivos (D-09).
- [ ] Revisar que nenhum recurso externo é carregado em produção (aba Rede do navegador).
- [ ] Rodar o *checklist* de consistência da seção 8 e atualizar este documento com o estado final.

**Roteiro de teste:**
1. Percorrer todos os roteiros anteriores rapidamente com o app instalado.
2. Usar por uma semana com dados reais e anotar ajustes desejados (que viram mudanças nesta especificação).

---

### Fase 12 — Acesso restrito *(opcional — depois da Fase 11)*

**Requisitos:** RF-12 (D-26)

> Opcional. Só começa depois que todas as outras fases estiverem concluídas e se o dono decidir fazê-la. Até lá o site publicado fica **sem restrição de acesso** (qualquer pessoa com a URL abre o app). Os dados continuam somente no aparelho de quem usa (princípio 5): a URL pública expõe o código do app, nunca os lançamentos.

O código já está preparado (Fase 1): manifest carregado com `crossorigin="use-credentials"` e service worker sem responder às rotas `/cdn-cgi/`.

- [ ] *(Humano)* Verificar se o Cloudflare Access (Zero Trust) está disponível no plano gratuito da conta; se não estiver, avaliar a alternativa Vercel + Vercel Authentication (§6.10) ou outra opção gratuita, e registrar a escolha na seção 8.
- [ ] *(Humano)* Configurar o controle de acesso escolhido conforme §6.10 (produção **e** previews).
- [ ] Ajustar o código e o `README.md` se a solução escolhida exigir algo diferente do Cloudflare Access.

**Roteiro de teste (iPhone):**
1. Abrir a URL de produção → deve pedir login → receber o código por e-mail → entrar.
2. Abrir a mesma URL numa janela anônima ou outro aparelho com outro e-mail → **não** deve conseguir entrar.
3. Abrir uma URL de preview → também deve pedir login.
4. App instalado: continua abrindo offline; com a sessão expirada, ao ficar online, consegue fazer login de novo e volta a receber atualizações (CA-12.3). Se der problema, registrar na seção 8.

---

## 8. Decisões registradas e pontos em aberto

### 8.1 Decisões registradas

| ID | Decisão | Motivo |
|---|---|---|
| D-01 | Cada lançamento tem **exatamente uma tag**, obrigatória. | Definido pelo dono; simplifica gráficos por tag. |
| D-02 | Tag não pode ser excluída enquanto houver lançamento, recorrente ou parcelamento usando-a. | Definido pelo dono (lançamentos); estendido a recorrentes e parcelamentos por consistência. |
| D-03 | **[Substituída pela D-42 em 21/10/2026]** **Saldo geral** considera somente lançamentos com data **≤ hoje**. Lançamentos futuros (inclusive parcelas) aparecem nos seus meses, mas só entram no saldo geral quando a data chega. | Evita que parcelas futuras distorçam o saldo atual. **Confirmado pelo dono.** |
| D-04 | Recorrentes são **somente mensais** e não têm dia fixo; a ocorrência pertence ao mês. | Definido pelo dono. |
| D-05 | Ocorrências pendentes contam no **Previsto**, nunca no Realizado, nos saldos ou nos gráficos. | Separar o que aconteceu do que é esperado. |
| D-06 | Parcelamento somente para **saídas**; o resto da divisão vai para a 1ª parcela; editar uma parcela afeta só ela. | Simplicidade; caso de uso principal é compra parcelada. |
| D-07 | Importação de backup **substitui tudo** (sem mesclar). | Mais simples e previsível para restauração. **Confirmado pelo dono.** |
| D-08 | Criptografia **apenas no arquivo de backup** (senha obrigatória, mínimo 8 caracteres). O banco local não é criptografado. | Definido pelo dono (opção A). |
| D-09 | Nome provisório do app: "Meus Gastos" / "Gastos". | Definir até a Fase 11. |
| D-10 | Descrição **obrigatória** (1–100 caracteres) em lançamentos, recorrentes e parcelamentos. | **Confirmado pelo dono.** |
| D-11 | Lembrete de backup após **7 dias**. | Equilíbrio entre segurança e incômodo. |
| D-12 | Gráficos com **Chart.js** (Canvas) em vez de Canvas manual. | Acordado com o dono. |
| D-13 | Hospedagem no **Cloudflare Pages** com **Cloudflare Access**; alternativa: Vercel + Vercel Authentication. Sem domínio próprio (`*.pages.dev`). | Gratuito e bloqueia o acesso antes de entregar o site. |
| D-16 | Gráficos **sem tooltip flutuante**: detalhes num painel fixo abaixo do gráfico, legenda em lista nas pizzas, seleção por coluna nas barras e marcador arrastável na linha (RF-06). | No iPhone o dedo cobre o tooltip e fatias/barras pequenas são difíceis de tocar. **Confirmado pelo dono.** |
| D-14 | Ao confirmar uma ocorrência recorrente, a data padrão é **hoje** se a ocorrência for do mês atual; senão, o **dia 1 do mês da ocorrência**. A regra é explicada no app por um ícone "ⓘ" com balão e uma linha de ajuda (CA-07.8). | **Confirmado pelo dono**, com a exigência da explicação na interface. |
| D-15 | Um recorrente só pode ser **excluído** se nunca teve ocorrência confirmada; caso contrário, ele é **encerrado**. | **Confirmado pelo dono.** |
| D-17 | Página interna de **arquitetura e timeline** em `/__dev/arquitetura`, somente em desenvolvimento e fora do build de produção (§6.12), mantida pelo agente `architecture-mapper` ao fim de cada fase. | Dar ao desenvolvedor uma visão detalhada e sempre atual da topologia e do histórico do projeto. **Confirmado pelo dono.** (17/10/2026) |
| D-18 | Pacotes **pré-autorizados** além da seção 6.1: `@tailwindcss/vite`, `jsdom`, `@vitest/coverage-v8` e `react-router-dom`. Qualquer outro pacote fora da especificação exige autorização do dono antes da instalação. | Necessários para Tailwind com Vite, ambiente DOM dos testes, cobertura (RNF-07) e rotas. **Confirmado pelo dono.** (17/10/2026) |
| D-19 | Lint com **oxlint** (já configurado no repositório) em vez de ESLint; formatação com **Prettier**. | oxlint é muito mais rápido e já estava configurado. **Confirmado pelo dono.** (17/10/2026) |
| D-20 | Rotas com o pacote **`react-router`** (v7) apenas; `react-router-dom` fica autorizado mas não é instalado. Versões das bibliotecas fixas no `package.json`, **sem `^`**. | Pacote único e atual do React Router; builds reprodutíveis. **Confirmado pelo dono.** (17/10/2026) |
| D-21 | Caminho desconhecido (rota `*`) **redireciona para o Início** (`/`) com `replace`, em vez de exibir uma tela de "não encontrado". | O Cloudflare Pages serve o `index.html` para qualquer caminho (§6.10) e a tela de erro padrão do React Router é em inglês. **Confirmado pelo dono.** (17/10/2026) |
| D-22 | Features não importam de `src/app/`. A exceção atual (`useTheme` em `src/app/theme/`, usado por Ajustes) é eliminada na Fase 2, quando o tema passa para o Dexie e o hook vai para `src/repositories/`. | Mantém a direção de dependência entre camadas sem exceções. **Confirmado pelo dono.** (17/10/2026) |
| D-23 | O aviso de app fora do modo instalado (CA-11.6) fica no **layout** (topo do conteúdo de todas as telas com barra inferior), em faixa discreta só de texto, sem botão de fechar. | O app pode ser aberto por qualquer URL numa aba comum, não só pelo Início; o aviso some sozinho quando o app é aberto pelo ícone. **Confirmado pelo dono.** (18/10/2026; confirmado em 19/10/2026) |
| D-24 | Além da checagem do navegador ao navegar, o app pede ao service worker que procure versão nova (`registration.update()`): **logo ao abrir**, ao voltar a ficar **visível**, ao ganhar **foco**, quando a **conexão volta** (`online`) e **a cada 30 minutos** enquanto estiver visível; sempre só se estiver online, com **intervalo mínimo de 1 minuto** entre checagens e ignorando falhas (sem rede ou sessão do Access expirada). A troca de versão continua só pelo toque em "Atualizar" (CA-11.3). | No iPhone o app instalado é aberto do zero ou volta do segundo plano sem nova navegação, e o evento `visibilitychange` nem sempre dispara; no teste da Fase 2 o aviso só apareceu depois de recarregar a página. **Confirmado pelo dono.** (18/10/2026; confirmado em 19/10/2026; ampliado em 19/10/2026 com aprovação do dono) |
| D-25 | Ícones provisórios (192, 512, 512 *maskable*, `apple-touch-icon` 180 e `favicon.png` 48) gerados por `scripts/generate-icons.mjs` só com módulos nativos do Node; o `favicon.svg` do template foi removido. Também foi adicionada a meta `apple-mobile-web-app-title` = "Gastos", igual ao `short_name`. | Sem dependências extras; nome e ícone definitivos na Fase 11 (Q-03 / D-09). **Confirmado pelo dono.** (18/10/2026; confirmado em 19/10/2026) |
| D-26 | O **acesso restrito** (RF-12, Cloudflare Access) passa a ser **opcional** e vira a **Fase 12**, depois de todas as outras. Até lá o site publicado fica sem restrição de acesso. O código continua preparado (manifest com credenciais, SW sem responder a `/cdn-cgi/`). | O dono não conseguiu configurar o Zero Trust e não sabe se está disponível no plano gratuito; como os dados ficam só no aparelho (princípio 5), a URL pública expõe apenas o código do app. **Confirmado pelo dono.** (19/10/2026) |
| D-27 | **Versão do app** (CA-11.5) vem do campo `version` do `package.json`, lido no `vite.config.ts` e injetado pelo `define` como `__APP_VERSION__` (tipo declarado em `src/globals.d.ts`, exposto por `src/lib/appVersion.ts`). | Só a string entra no bundle (importar o JSON levaria o arquivo inteiro e exigiria `resolveJsonModule`); vale também nos testes do Vitest. **Confirmado pelo dono.** (19/10/2026; confirmado em 19/10/2026) |
| D-28 | **Tema no Dexie** (Fase 2): a tabela `settings` (chave `theme`) é a fonte da verdade; `localStorage['theme']` é só o espelho lido pelo script do `index.html`. Ao abrir, um valor que só exista no `localStorage` (Fase 0) é copiado para o Dexie; enquanto o IndexedDB carrega vale o espelho; a escolha feita na sessão vale na hora; quando o Dexie carrega, o espelho é corrigido para o valor dele. `useTheme` e `ThemeContext` ficam em `src/repositories/` (D-22); o `ThemeProvider` continua em `src/app/theme/`. O pedido de armazenamento persistente grava `persistRequested` com a data do pedido (ISO 8601) **antes** de chamar `persist()`, numa transação que lê e grava junto, para nunca pedir duas vezes. | Primeira renderização igual ao que o script inline aplicou (sem piscar — CA-09.3) e pedido único mesmo com o StrictMode ou duas abas (CA-11.4). **Confirmado pelo dono.** (19/10/2026; confirmado em 19/10/2026) |
| D-29 | **Dinheiro e bytes em texto:** `formatBRL` mantém o espaço não separável (U+00A0) que o `Intl` coloca entre "R$" e o número; `formatSignedBRL` usa "−" (U+2212). `digitsToCents` ignora o que não é dígito e descarta o que passa de 10 dígitos (D-31) (o teto de R$ 99.999.999,99 do RF-01 é validado no formulário, na Fase 4). `groupByDay/Month/Tag` devolvem um `Map` da chave para os totais e os lançamentos do grupo; `runningBalance` recebe os subperíodos como `{ start, end }[]` em ordem. O espaço usado (CA-11.5) usa unidades decimais (1 KB = 1.000 bytes) com uma casa decimal ("1,2 MB de 500 MB"). | O espaço não separável impede a quebra de linha entre "R$" e o valor; formatos que servem às telas das Fases 4 a 8 sem novas funções; unidades decimais são as que o iOS mostra. **Confirmado pelo dono.** (19/10/2026; confirmado em 19/10/2026) |
| D-30 | **Ferramentas DEV de dados de exemplo** (§6.11) em `src/dev/sampleData/`, carregadas com `lazy()` atrás de `import.meta.env.DEV` como uma seção extra em Ajustes → Sobre, sem folha CSS própria (usam a folha Tailwind única do app — D-43). Gerador com semente (mulberry32) e data de referência; os IDs são UUID v4 derivados do gerador (não `crypto.randomUUID`) para os dados serem determinísticos. "Gerar dados de exemplo" **substitui** tags, lançamentos, recorrentes e parcelamentos; "Apagar todos os dados" apaga essas quatro tabelas e **mantém** `settings` (tema, `persistRequested`). As duas ações pedem confirmação (`window.confirm`) e gravam numa única transação. Essas ferramentas (`src/dev/sampleData/useSampleDataTools.ts` e `sampleDataStore.ts`) acessam o `db` diretamente: exceção consciente ao princípio 7, válida só para `src/dev`, que fica fora do build de produção. | Ferramenta só de desenvolvimento; dados reprodutíveis para medir desempenho (RNF-02) e conferir telas; manter o tema evita "piscar" ao limpar. **Confirmado pelo dono.** (19/10/2026; confirmado em 19/10/2026) |
| D-31 | O campo de valor aceita no máximo **10 dígitos** (`MAX_AMOUNT_DIGITS = 10`), o mesmo limite do valor máximo do RF-01 (R$ 99.999.999,99 = 9.999.999.999 centavos). Assim a máscara nunca permite digitar um valor acima do teto. Corrige a divergência entre o RF-01 (10 dígitos) e o texto antigo da §6.5/§6.11 (11 dígitos). | Opção escolhida pelo dono entre limitar a máscara ou validar só no formulário. **Confirmado pelo dono.** (19/10/2026) |
| D-32 | **Paleta de 12 cores sugeridas das tags** (RF-03), em `src/domain/tags.ts` (`SUGGESTED_TAG_COLORS`), com nome em pt-BR para o rótulo acessível: Vermelho `#DC2626`, Laranja `#EA580C`, Amarelo `#CA8A04`, Verde-limão `#65A30D`, Verde `#16A34A`, Verde-água `#0D9488`, Ciano `#0891B2`, Azul `#2563EB`, Anil `#4F46E5`, Roxo `#9333EA`, Rosa `#DB2777`, Cinza `#64748B`. Tag nova já vem com a 1ª cor marcada (o usuário troca). A cor é gravada em maiúsculas (`#RRGGBB`); o `<input type="color">` devolve minúsculas e é normalizado. | A spec não definia as cores. Tons médios, distintos entre si e visíveis nos temas claro e escuro; com o texto de `readableTextColor` todas passam do contraste AA (4,5:1), conferido em teste. Uma só grafia da cor evita duplicidade e facilita comparar com a paleta. **Confirmado pelo dono.** (20/10/2026) |
| D-33 | **Modais com o `<dialog>` nativo** (`showModal()`), no primitivo composto `Modal` (`Modal.Body`, `Modal.Actions`) em `src/components/ui/`, com a prop `title` **obrigatória** (título visível e `aria-labelledby`, sempre renderizado, para o modal nunca ficar sem nome acessível). O conteúdo só existe enquanto o modal está aberto. Na tela de tags: tocar numa tag abre o modal de edição, que tem o botão "Excluir tag"; antes de pedir a confirmação o app confere o uso e, se a tag estiver em uso, mostra direto o aviso de bloqueio com as contagens; a exclusão confere de novo na mesma transação (D-02). Se conferir o uso ou excluir falhar (erro do IndexedDB), o modal aberto mostra uma mensagem em pt-BR e "Excluir tag"/"Excluir" ficam desabilitados enquanto a operação está pendente. Nos testes, o jsdom (que não implementa `showModal`/`close`) recebe um substituto mínimo em `src/test/dialog.ts`. | O navegador já prende o foco, fecha com Esc, marca `aria-modal`, deixa o fundo inerte, devolve o foco ao fechar e põe o modal na camada superior (nunca atrás da barra inferior nem do aviso de versão), sem biblioteca. Conferir o uso antes evita pedir confirmação de algo que será bloqueado. Com o `<dialog>` nativo, o Tab percorre os elementos do modal e pode seguir para a interface do navegador (barra de endereço etc.), mas **nunca** para elementos do app atrás do modal; esse comportamento padrão é aceito (verificado pelo dono em 20/10/2026). **Confirmado pelo dono.** (20/10/2026) |
| D-34 | **Versões da Fase 3:** `react-hook-form` 7.90.0, `zod` 4.6.7 e `@hookform/resolvers` **5.9.2** (e não a 6.0.0, publicada um dia antes da fase, versão principal nova). Nos testes de componente, o tempo de espera do `findBy` passa de 1 s para 3 s (`src/test/setup.ts`), porque com a cobertura ligada a primeira importação de uma tela `lazy` pode passar de 1 s. Os testes de tela preparam dados das tabelas sem repositório ainda por `src/test/seedDatabase.ts`. | Evitar uma versão principal recém-lançada; testes estáveis no Windows; testes de tela sem importar o Dexie (princípio 7). **Confirmado pelo dono.** (20/10/2026) |
| D-35 | O limite de **30 caracteres** do nome da tag (RF-03) é contado em **unidades UTF-16** (`String.length`, `.max(30)` do Zod): um emoji simples conta como 2. Para nomes com letras do português (NFC, como o teclado do iPhone gera) não há diferença. | Mais simples e suficiente para o uso real; contar grafemas com `Intl.Segmenter` foi considerado e descartado. **Confirmado pelo dono.** (20/10/2026) |
| D-36 | Princípio 16: em todos os formulários o botão de envio fica desabilitado enquanto houver campo obrigatório vazio ou inválido e durante o envio; erros de campo aparecem enquanto o usuário digita (depois de o campo ser editado). Padrão reutilizável em `src/lib/formSubmit.ts` (`LIVE_VALIDATION` = validação a cada alteração; `canSubmitForm` = válido e não enviando; com `startsValid`, um formulário de edição que abre com dados válidos já começa com o botão habilitado). Erros do banco ligados a um campo (ex.: nome repetido) vão para o campo e somem, com o botão voltando a habilitar, quando o usuário altera qualquer campo; uma falha genérica de gravação aparece numa mensagem à parte e **não** desabilita o botão, para permitir tentar de novo. Aplicado ao formulário de tags na Fase 3 e obrigatório nos formulários das fases seguintes. | Sugestão do dono no teste da Fase 3 para melhorar a experiência: evita tocar em "Salvar" só para descobrir o erro. **Confirmado pelo dono.** (20/10/2026) |
| D-37 | **Componentes de domínio compartilhados** entre features ficam em `src/components/<entidade>/`: `components/tags/` (`TagForm`, `TagColorPicker`, `useTagForm`, `TagPicker`, `CreateTagDialog`, `tagFormTexts`, movidos de `features/tags/` ou criados na Fase 4) e `components/transactions/` (`TransactionForm`, `useTransactionForm`, `TransactionRow`, `NoTagsNotice`, `transactionTexts`). Podem importar `domain`, `lib`, `repositories` e `components/ui`; nunca `features` nem `app`. `src/components/ui/` **nunca** importa `repositories` (nem `features`/`app`): só `src/components/<entidade>/` pode acessar os repositórios dentro de `src/components/`. `components/ui/` continua só com primitivos genéricos (agora também `Field`, `TextInput`, `MoneyInput`, `DateInput`, `SignedAmount`, `Toast`, `useToast`, `useToday` e a variante `segmented` do `createRadioGroup`). As páginas continuam nas features (`features/home`, `features/transactions`, `features/tags`). | O formulário de lançamento é usado pelo Início e por `/lancamentos/novo` e `/lancamentos/:id`, e o atalho do CA-01.7 reutiliza o formulário de tag; uma feature não pode importar internos de outra (regra do scanner) e a §6.2 não tinha lugar para componentes que conhecem o domínio. Evita duplicar o formulário de tag. *(Fase 4 — aguardando confirmação do dono.)* **Confirmado pelo dono.** (20/10/2026; confirmado em 21/10/2026) |
| D-38 | **Comportamento das telas da Fase 4:** (a) a tag é escolhida numa lista de **chips-rádio** com a cor da tag (o `<select>` nativo não mostra cores); a marcada tem contorno e "✓"; (b) depois de "Lançar" aparece a confirmação **"Lançamento salvo"** (`Toast`, `role="status"`, 3 s) no **topo** da tela, para não cobrir a barra inferior, o aviso de versão nem o teclado; o formulário volta a Saída/Entrada e data como estavam, e valor, **tag** e descrição ficam vazios; (c) na edição, "Salvar" e "Excluir" (com o modal "Excluir lançamento?") gravam e **voltam para a tela anterior** (`useGoBack`, tela pai `/lancamentos`); id inexistente mostra "Lançamento não encontrado"; (d) o campo de valor vazio mostra "R$ 0,00" como exemplo, alinhado à direita, com o cursor sempre no fim; (e) "Últimos lançamentos" seguem a ordem literal do RF-02 (data, depois criação), então um lançamento com data futura aparece no topo; (f) datas da lista em `DD/MM/AAAA` e o título do mês como "Saldo de outubro de 2026"; (g) virada do dia (CA-02.2): `useToday` recalcula "hoje" em `visibilitychange`, `focus` e `pageshow`; a data do formulário só muda se ainda for a preenchida automaticamente; o saldo do mês e os últimos lançamentos (D-40) passam a usar o novo dia; (h) a descrição (1 a 100 caracteres, D-10) é contada em unidades UTF-16, como o nome da tag (D-35). | Escolhas de interface não detalhadas nos CAs, pensadas para o iPhone (toque, teclado, nada escondido) e para lançar vários itens seguidos. O item (e) pode precisar de ajuste na Fase 10, quando parcelas futuras existirem. *(Fase 4 — aguardando confirmação do dono.)* O item (e) foi substituído pela D-40. **Confirmado pelo dono.** (20/10/2026; confirmado em 21/10/2026) |
| D-39 | **Consultas e formulário da Fase 4:** saldo geral = `db.transactions.toArray()` (a tabela inteira, porque todos os lançamentos entram — D-42) + `overallBalance` do domínio (o Dexie resolve com um único `getAll()` nativo; somar com `each()` abriria um cursor com uma volta ao IndexedDB por registro, mais lento com 10.000 lançamentos — RNF-02); saldo do mês = `where('date').between(início, fim)` + `totals`; últimos 5 (só datas até hoje — D-40) = `where('date').belowOrEqual(hoje).reverse().limit(5)` para achar a data de corte e releitura de `where('date').between(corte, hoje)` numa transação de leitura, ordenando no domínio (`takeMostRecent`: data, `createdAt`, `id`), porque o índice só ordena por data. Criar e editar conferem a tag na mesma transação `rw` de `tags` e `transactions` (D-01/D-02). No formulário, todos os campos usam `Controller` (controlados), e não `register`, porque o React Compiler memoiza o `ref` do `register` e o `reset` depois de "Lançar" não limparia o campo. | Desempenho com 10.000 lançamentos, regras no domínio (princípio 6) e um formulário que funciona com o React Compiler. *(Fase 4 — aguardando confirmação do dono.)* **Confirmado pelo dono.** (20/10/2026; consulta dos últimos 5 atualizada pela D-40 em 21/10/2026; confirmado em 21/10/2026; consulta do saldo geral atualizada pela D-42 em 21/10/2026) |
| D-40 | **Últimos lançamentos** (RF-02 item 5) mostram só lançamentos com data **até hoje (inclusive)**; lançamentos com data futura (inclusive parcelas futuras) não aparecem nessa lista. Substitui o item (e) da D-38. | Evita que lançamentos e parcelas futuras ocupem a lista de "últimos". **Confirmado pelo dono.** (21/10/2026) |
| D-41 | **Tamanho do bundle principal** (~189 kB gzip na Fase 4, com React Hook Form e Zod na tela inicial): nenhuma otimização agora; a abertura do app (RNF-02, < 1,5 s com cache) será medida no iPhone na Fase 11, e só então se decide sobre formulário lazy, separar leitura/escrita dos repositórios ou `zod/mini`. | Recomendação da revisão: 189 kB vindos do precache ficam bem dentro da meta; otimizar agora trocaria legibilidade por ganho não medido. **Confirmado pelo dono.** (21/10/2026) |
| D-42 | **Saldo geral = todos os lançamentos**, inclusive os com data futura (e todas as parcelas de um parcelamento, desde a criação). O **saldo do mês** continua considerando só os lançamentos do mês corrente; lançamentos de outros meses não o alteram. Recorrentes **pendentes** continuam fora de qualquer saldo (D-05). Substitui a D-03. | Pedido do dono no teste da Fase 4: o saldo geral deve mostrar o dinheiro já comprometido. **Confirmado pelo dono.** (21/10/2026) |
| D-43 | **Uma única folha Tailwind** (`src/index.css`), inclusive em DEV. As fontes vêm do alias `@tailwind-sources`, resolvido pelo `vite.config.ts` conforme o comando: em `vite serve`, `src/styles/tailwind-sources.serve.css` (sem exclusões; a detecção automática varre `src/dev`); em `vite build`, `src/styles/tailwind-sources.build.css` (`@source not '../dev'`). As páginas DEV (arquitetura e dados de exemplo) deixam de ter folha própria (`architecture.css` e `sampleData.css` removidos); `src/styles/utilities.css` e o `@custom-variant dark` entram uma vez só. Um teste Vitest (`src/styles/tailwindEntry.test.ts`, tipado pelo `tsconfig.node.json` porque lê o disco com `node:fs`) falha se outro `.css` em `src/` fizer `@import 'tailwindcss'`. Ajusta a D-30 e a §6.12. | Bug do teste manual da Fase 4: com duas folhas completas, cada uma redeclarava as camadas, e um utilitário base da folha DEV carregada depois (`.text-white`) vencia a variante `dark:` do app (`.dark:text-slate-900`), deixando o aviso "Lançamento salvo" com fundo claro e texto branco no tema escuro, só em DEV. O CSS de produção não muda. **Confirmado pelo dono.** (21/10/2026; confirmado em 21/10/2026) |
| D-44 | **Lista de lançamentos: consulta, filtros e paginação (Fase 5 — RF-04 / CA-04.6).** (a) **Consulta:** `listTransactionsInPeriod(from, to)` usa o índice `date` — `between` (período fechado), `aboveOrEqual`/`belowOrEqual` (só uma das datas) ou `orderBy('date')` (sem período) — sempre em ordem **crescente**, e inverte o array em memória antes de ordenar com `sortByRecency` (data, `createdAt`, `id` — a mesma ordem da tela inicial). Não usa `.reverse()` do Dexie porque, sem `getAll` com direção (Safari), ele abre um cursor com uma volta ao IndexedDB por registro. Tipo, tag e texto são aplicados no domínio numa única passada (`createTransactionMatcher`); o índice `tagId`/`type` não é usado por simplicidade: o custo medido é baixo e a lista é reordenada em memória por `sortByRecency` de qualquer jeito. A leitura real de 10.000 registros no Safari do iPhone, refeita pelo `useLiveQuery` a cada gravação, será medida na Fase 11 (como na D-41). Uma tag do filtro que não existe mais (excluída) vale como "Todas" e o filtro é limpo no Zustand. (b) **Período inválido** (data inicial depois da final): não é aplicado (nem na consulta nem no filtro) e o campo "Data final" mostra o aviso. (c) **Busca:** `foldText` (`src/domain/text.ts`: NFD, sem marcas combinantes, minúsculas) é a normalização única, usada também por `toTagNameKey`; a busca é por "contém" no texto sem espaços nas pontas; o campo grava no Zustand a cada tecla, mas a lista só recalcula **250 ms** depois da última tecla (`SEARCH_DEBOUNCE_MS`, hook `useDebouncedValue` sem biblioteca); apagar o texto (ou deixar só espaços) vale na hora e também zera o valor atrasado, para a busca anterior não reaparecer se o usuário redigitar antes da espera (`useDebouncedValue` com valor imediato). (d) **Paginação incremental** em vez de virtualização: monta só os primeiros dias até somar **50 lançamentos** (`LIST_PAGE_ITEM_COUNT`, dias inteiros, `countVisibleDays`) e acrescenta mais 50 quando o fim da lista chega a 600 px da tela (`IntersectionObserver`, primitivo `LoadMore`) ou pelo botão "Carregar mais" (alternativa acessível). Mudar qualquer filtro volta à 1ª página. Contagem e totais do resumo (CA-04.3) consideram o conjunto filtrado inteiro. (e) **Medição** (PC de desenvolvimento, Node/Vitest): com 10.000 lançamentos, ordenar ~6 ms e filtrar + agrupar + totalizar 1–5 ms; com os 5.000 dados de exemplo, ~5 ms e ~2 ms; a 1ª página monta ~50–60 linhas. Um teste Vitest garante < 300 ms para 10.000 (RNF-02). | Sem pacotes novos (virtualização exigiria biblioteca ou código bem mais complexo, com alturas variáveis por dia); a paginação por dias inteiros mantém os cabeçalhos dos dias corretos e poucos nós no DOM. *(Fase 5 — aguardando confirmação do dono.)* **Confirmado pelo dono.** (21/10/2026; confirmado em 22/10/2026) |
| D-45 | **Tela da lista (Fase 5 — RF-04):** (a) o campo **"Buscar na descrição"** fica sempre visível no topo (o teclado do iPhone não o cobre; "Buscar" no teclado só fecha o teclado); tipo (**Todos / Entradas / Saídas**), tag (chips com a opção **"Todas"**, reutilizando o `TagPicker`) e período (**Data inicial / Data final**) ficam num painel recolhível aberto pelo botão **"Filtros"**, que mostra quantos desses filtros estão ativos (ex.: "Filtros (2)"); o painel começa fechado ao abrir a tela; (b) **"Limpar filtros"** aparece com algum filtro preenchido (pelo texto digitado) e, depois de tocado, leva o foco ao campo de busca (RNF-06); o **resumo** ("N lançamentos encontrados", resultado com sinal, entradas e saídas) aparece com algum filtro **aplicado** (o texto só depois da espera da busca, para nunca mostrar os totais sem filtro como resultado); um período inválido conta como filtro preenchido; (c) cabeçalho do dia com a data por extenso (`formatLongDate`, `Intl` em UTC como o `formatMonthLabel`; a 1ª letra aparece maiúscula só pelo CSS) e "Entradas R$ X · Saídas R$ Y" do dia (componente `IncomeExpenseTotals`, também usado no saldo do mês do Início); as linhas reutilizam o `TransactionRow` sem a data (`showDate={false}`), que já está no cabeçalho; (d) estados vazios: "Nenhum lançamento ainda. Toque em “Novo” para lançar o primeiro." (nenhum lançamento cadastrado) e "Nenhum lançamento encontrado com esses filtros."; (e) atalho **"+ Novo"** (nome acessível "Novo lançamento") no cabeçalho da tela, para `/lancamentos/novo`; (f) os filtros ficam no Zustand (`transactionFilters`, `setFilters` parcial e `clearFilters`), sem `persist`: trocar de aba ou abrir um lançamento e voltar mantém os filtros; fechar o app zera; a página volta ao topo e à 1ª página ao reabrir a tela. | Escolhas de interface não detalhadas no RF-04, pensadas para o iPhone (toque, sem hover, pouco espaço na tela). *(Fase 5 — aguardando confirmação do dono.)* **Confirmado pelo dono.** (21/10/2026; confirmado em 22/10/2026) |
| D-46 | **Testes em dois projetos do Vitest** (`test.projects` no `vite.config.ts`, ambos com `extends: true`, herdando plugins, os aliases `@/` e `@tailwind-sources` — D-43 — e o `define` do `__APP_VERSION__`): **`unit`** roda em `environment: 'node'` com o setup mínimo `src/test/setup.unit.ts` (só `fake-indexeddb/auto` e limpeza do banco depois de cada teste; sem Testing Library nem nada de DOM) e recebe todo `src/**/*.test.ts`; **`dom`** roda em jsdom com o setup de sempre (`src/test/setup.ts`: Testing Library, polyfill do `<dialog>`, `matchMedia`, limpeza do Dexie, `localStorage`, Zustand e `<html>`) e recebe todo `*.test.tsx` mais os `*.test.ts` da lista `DOM_TEST_FILES` do `vite.config.ts` (os que usam `document`, `window`, `localStorage`, `matchMedia` ou `renderHook`). Um `*.test.ts` novo que precise de DOM falha em node (`document is not defined`) e deve entrar nessa lista. `npm test` e `npm run test:coverage` rodam os dois projetos (cobertura de `src/domain` e `src/lib` somada, limite de 90% — RNF-07); `npm run test:unit` e `npm run test:dom` rodam um só. O pool continua o padrão (`forks`): `threads` ganhou ~2 s mas quebra os testes que trocam `process.env.TZ` (o fuso é do processo, compartilhado entre as threads) e `vmThreads` já tinha ficado mais lento. Com a nova ordem de execução apareceu uma corrida que já existia no teste "chegar perto do fim (IntersectionObserver) carrega mais sozinho" (`TransactionsPage.pagination.test.tsx`, 1 falha em 10 rodadas): o disparo único do observador de mentira se perdia se a lista refizesse o observador logo depois da 1ª página; o teste passou a disparar a cada tentativa dentro do `waitFor`. O código do app não mudou. | Medido no PC de desenvolvimento (Windows, 85 arquivos, 1.725 testes): o jsdom era criado em todos os arquivos (~50–60% do tempo). Antes: 72 s, 81 s e 121 s (1ª rodada com cache frio); depois: 53 s, 53 s e 53 s (`Duration` do Vitest); 48 dos 85 arquivos rodam em node. Nenhum pacote novo. *()* **Confirmado pelo dono.** (22/10/2026; confirmado em 23/10/2026) |
| D-47 | **Formato, criptografia e repositório do backup (Fase 6 — RF-10 / §6.8).** (a) `lib/crypto.ts` monta o envelope da §6.8 (Web Crypto nativa; sal de 16 e IV de 12 bytes novos a cada exportação; chave AES-GCM 256 não extraível); a falha `OperationError` vira `BackupDecryptionError`; base64 próprio em blocos de 32 KiB; as iterações do PBKDF2 têm o padrão de produção (600.000) e só os testes passam um valor menor (o envelope grava o número usado). (b) `lib/backupFormat.ts` não importa o Dexie: a versão atual (`SCHEMA_VERSION`) chega por parâmetro. Migrações em `BACKUP_MIGRATIONS[n]` (leva da versão `n` para a `n + 1`), aplicadas em cadeia; vazio enquanto só existe a v1; faltar uma migração intermediária = "Arquivo inválido". (c) Validação dos registros pelos tipos da §6.3, com as invariantes: valores inteiros positivos e seguros (`z.int().positive()`), datas que existem, meses `YYYY-MM`, cor `#RRGGBB`, datas de criação em ISO 8601, `recurringId`/`recurringPeriod` e `installmentGroupId`/`installmentNumber` sempre em par, parcelamento com 2 a 48 parcelas, número da parcela de 1 ao `count` do seu parcelamento (§6.3 "1..n", conferido na integridade), recorrente com pelo menos um valor, o 1º `fromPeriod` igual ao `startPeriod`, `fromPeriod` estritamente crescente e `endPeriod` (se houver) não anterior ao `startPeriod`, e tag com `nameKey` igual a `toTagNameKey(name)` (outro valor furaria a unicidade do RF-03). A senha é normalizada em **NFC** antes da derivação (`password.normalize('NFC')` dentro da derivação da chave, na exportação e na importação): "é" digitado como um caractere ou como "e" + acento combinante abre o mesmo backup. Comprimentos de texto da interface (30/100 caracteres) não são conferidos. A integridade (§6.8 passo 5) também exige `nameKey` único nas tags (o índice `&nameKey` faria a gravação falhar). Envelope com iterações acima de 10.000.000 ou arquivo acima de 50 MB = "Arquivo inválido" (evita travar o aparelho com um arquivo forjado ou escolhido por engano). (d) `settings`: a exportação leva só `theme` (se nunca foi escolhido, vai `settings: []`); na importação qualquer outra chave = "Arquivo inválido"; a importação sempre grava o tema (o do backup ou `system`), atualiza o espelho do `localStorage` (D-28) e aplica o tema na hora (também se ele foi trocado na sessão); `lastBackupAt` e `persistRequested` do aparelho ficam como estão. (e) `repositories/backupRepository.ts`: leitura das 5 tabelas numa transação `r`; importação numa única transação `rw` que limpa `tags`, `transactions`, `recurrings` e `installmentGroups` e troca só o `theme` em `settings`. O hook `useLastBackupAt` fica no `settingsRepository`, para a tela inicial ler a data sem levar a criptografia e o zod do backup para o pacote principal (D-41). (f) Medição no PC de desenvolvimento (Node 22): derivar a chave com 600.000 iterações leva ~345 ms; validar o conteúdo de um backup com 10.000 lançamentos (~3 MB) leva ~130 ms. | Seguir a §6.8 com funções puras e testadas (princípio 6), importação atômica (princípio 8 / D-07) e Início leve. *(Fase 6 —)* **Confirmado pelo dono.** (22/10/2026; confirmado em 23/10/2026) |
| D-48 | **Tela de backup e lembrete (Fase 6 — RF-10).** (a) **Exportar:** "Senha" e "Confirmar senha" (`type="password"`, `autocomplete="new-password"`); erros "A senha precisa ter pelo menos 8 caracteres" e "As senhas não coincidem" enquanto digita (a confirmação é conferida também quando a senha muda); "Exportar backup" vira "Gerando backup…" durante a derivação. Resultado: "Backup exportado." (os campos são limpos); "Exportação cancelada. O backup não foi salvo." (folha fechada — `AbortError`, sem gravar `lastBackupAt`); se o navegador recusar abrir a folha por falta de um toque recente (`NotAllowedError`, possível depois da derivação demorada), aparece "O backup está pronto. Toque em “Salvar backup” para guardá-lo." e o botão **"Salvar backup"** abre a folha com o mesmo arquivo; se a folha for recusada **de novo** nesse toque (`NotAllowedError` mesmo com toque recente — ex.: o navegador do Windows não aceita o arquivo `.json` na folha do sistema), o arquivo é **baixado** com `<a download>`, como sem Web Share API (§6.8 passo 7): o download conta como backup feito (grava `lastBackupAt`) e aparece "Backup exportado."; assim todo toque em "Salvar backup" termina em compartilhado, baixado, cancelado ou erro com mensagem. Na 1ª tentativa a recusa continua pedindo "Salvar backup", porque o erro é o mesmo para "falta de toque recente" e "arquivo não aceito" e não dá para distingui-los; falha: "Não foi possível gerar o backup. Tente novamente.". Sem Web Share API com arquivo, o download conta como backup feito (não dá para saber se foi cancelado); a URL do arquivo é liberada 10 s depois. (b) **Importar:** "Arquivo do backup" (`accept="application/json,.json"`) e "Senha do backup" (só precisa estar preenchida — "Informe a senha"); "Importar backup" vira "Verificando backup…"; erros com as mensagens exatas dos CA-10.2, CA-10.3 e CA-10.5 (outra falha: "Não foi possível abrir o backup. Nenhum dado foi alterado."); o modal "Importar backup?" mostra data e hora do backup ("17/10/2026 às 15:05"), quantidades de lançamentos, tags e recorrentes e o aviso "Isso vai substituir todos os dados atuais.", com "Cancelar" e "Substituir dados" (falha: "Não foi possível importar o backup. Nenhum dado foi alterado."); depois: "Backup importado." e o formulário limpo. (c) **"Último backup"** ("nunca", "hoje", "há 1 dia", "há N dias", em dias de calendário locais; relógio atrasado conta como "hoje") aparece no topo de Ajustes → Backup e **sempre** no topo do Início (RF-10), num só lugar e nunca duas vezes: **com aviso** (RF-10 "Lembrete" — pelo menos um lançamento e nunca houve backup ou já se passaram 7 dias ou mais, D-11) aparece só a faixa discreta "Último backup: há N dias. Faça um backup para não perder seus dados." com o link "Fazer backup" para `/ajustes/backup`; **sem aviso**, uma linha discreta em texto pequeno ("Último backup: há 3 dias", "hoje", "nunca" quando ainda não há lançamentos) que também é um link para `/ajustes/backup` (alvo ≥ 44 px). Enquanto a data do último backup e a contagem de lançamentos carregam, nada aparece (sem mostrar "nunca" antes de o dado chegar). O Início continua sem criptografia nem `backupFormat` no bundle principal (D-41). (d) Novos primitivos `PasswordInput` e `FileInput` em `components/ui`; o `Button` passa a aceitar `ref`. (e) **Foco (RNF-06):** quando "Exportar backup" vira "Salvar backup", o foco vai para o botão novo; depois de exportar, cancelar ou importar, vai para a mensagem de resultado (`role="status"`, `tabIndex={-1}`), como na D-45 (b). Um erro de abertura do backup some quando o usuário troca o arquivo ou a senha. | Textos e fluxo não detalhados no RF-10, pensados para o iPhone (folha de compartilhamento exige toque recente; nada escondido em hover). O RF-10 pede "Último backup" na tela inicial sempre; o dono escolheu a opção (a): linha discreta sem aviso e, com aviso, só o aviso (que já traz a frase). A linha fica no mesmo lugar do aviso para os dois casos se trocarem sem duplicar a frase nem fazer outra consulta. *(Fase 6 —)* (22/10/2026; download quando a folha é recusada no "Salvar backup" acrescentado em 23/10/2026, após o teste manual no PC; (c) "Último backup" sempre no Início — opção (a) do dono — em 23/10/2026) **Confirmado pelo dono.** (23/10/2026) |
| D-49 | **Tela de visões por período (Fase 7 — RF-05).** (a) **Estado (§6.7 / CA-05.4):** `viewGranularity` começa em **Mês** e `viewAnchorDate` no dia em que o app abriu (só em memória, como os filtros); trocar a granularidade mantém a data de referência; as setas andam 1 dia, 7 dias, 1 mês ou 12 meses (`shiftAnchorDate`; Mês e Ano mantêm o dia quando ele existe no destino, como o `addMonthsClamped`: 31/01 → 28/02); "Hoje" volta para hoje mantendo a granularidade. Além das ações da §6.7 há **`openPeriod(granularity, anchorDate)`**, usada no detalhamento para trocar as duas coisas juntas. O detalhamento só muda o estado no Zustand, **sem nova entrada no histórico**: o "voltar" sai da tela de visões; para subir de nível, o usuário usa o seletor. (b) **Títulos:** Dia = data por extenso (`formatLongDate`); Semana = `formatDateRangeLabel` ("12 a 18 de out. de 2026"; mês e ano repetidos só quando mudam no meio da semana: "28 de set. a 4 de out. de 2026", "28 de dez. de 2026 a 3 de jan. de 2027"; abreviações fixas do pt-BR, sem o `month: 'short'` do Intl, que varia entre motores); Mês = "outubro de 2026"; Ano = "2026"; 1ª letra maiúscula pelo CSS. O título fica entre as setas ("Mês anterior"/"Próximo mês", "Semana anterior"/"Próxima semana" etc.), com `aria-live`; "Hoje" fica no cabeçalho da tela. (c) **Cartão de resumo** igual nas 4 granularidades: Entradas, Saídas e Resultado (com sinal). Na visão **Dia** os totais do dia ficam só no cartão (sem repetir a linha "Entradas · Saídas") e abaixo vem a lista dos lançamentos (mesma linha da lista, sem a data; tocar abre a edição). (d) **Linhas** tocáveis (botões ≥ 44 px) com rótulo, "Entradas R$ X", "Saídas R$ Y" e o resultado com sinal: Semana e Mês em ordem cronológica, rótulo "segunda-feira, 19/10" (`formatWeekdayDate`); Ano com o nome do mês (`formatMonthName`). Tocar num mês abre a visão Mês pelo dia 1º. Depois do detalhamento o foco vai para o título do novo período (RNF-06). (e) Estados vazios: "Nenhum lançamento neste dia." e "Nenhum lançamento neste mês."; Semana e Ano sempre mostram 7 e 12 linhas. Enquanto carrega, o cartão mostra "—" e o detalhamento não aparece. (f) **Fase 9:** "Previsto", "Realizado" e "Recorrentes pendentes" (Mês) e a coluna Previsto (Ano) entram com os recorrentes; até lá o cartão não mostra o rótulo "Realizado". (g) Consulta: `useTransactionsInRange(start, end)` (repositório) lê o intervalo do período pelo índice `date` e volta a `undefined` enquanto um período novo carrega — o `useLiveQuery` manteria o resultado do período anterior, e a tela mostraria por um instante totais de outro período com o título novo (achado da revisão); os resumos são funções puras em `src/domain/periodViews.ts` (`viewRange`, `shiftAnchorDate`, `formatViewTitle`, `summarizeDays`, `summarizeActiveDays`, `summarizeMonths`); `dates.ts` ganhou `addDays` e `datesBetween`. | Escolhas de interface não detalhadas no RF-05, pensadas para o iPhone (toque, sem hover). Mês como padrão por ser o período mais usado no controle de gastos; detalhamento sem histórico para o estado continuar só no Zustand (CA-05.4) sem duplicá-lo na URL. Nenhum pacote novo. *(Fase 7 —)* **Confirmado pelo dono.** (24/10/2026; confirmado em 24/10/2026) |
| D-50 | **Tela de gráficos (Fase 8 — RF-06).** (a) **Período (CA-06.1 — escolha do dono):** a tela usa os **mesmos controles** das Visões (seletor Dia/Semana/Mês/Ano, setas e "Hoje"), ligados ao mesmo estado no Zustand: mudar numa tela muda na outra. Por isso `GranularityPicker`, `PeriodNavigator`, `TodayButton` e `usePeriodView` saíram de `features/views` para `components/periods` (usados pelas duas features). Com **Dia** selecionado (também escolha do dono) não há gráficos: aparece o aviso "Os gráficos estão disponíveis para Semana, Mês e Ano." e o seletor continua acima dele. Período sem lançamentos: "Nenhum lançamento neste período." (CA-06.10). (b) **Pacotes:** `chart.js` **4.5.1** (a 4.6.1 tinha sido publicada havia 2 dias; preferiu-se a anterior, em uso há um ano) e `react-chartjs-2` **5.3.1**, versões fixas (§6.1 / D-20). Registro mínimo (`features/charts/chart/chartSetup.ts`): `ArcElement`, `BarElement`, `LineElement`, `PointElement`, `CategoryScale`, `LinearScale` e o plugin próprio `selectionHighlight` (faixa atrás da coluna nas barras, marcador vertical na linha); os controladores vêm dos componentes do react-chartjs-2; **Tooltip e Legend nem são registrados** e as opções ainda trazem `tooltip.enabled = false` e `legend.display = false` (CA-06.2 / CA-06.3); animações desligadas, para a seleção acompanhar o dedo. O Chart.js fica só no pacote da tela (lazy, 175,7 kB / 62,7 kB gzip); o pacote principal não mudou. (c) **Percentuais:** inteiros em décimos de ponto percentual, distribuídos pelo **maior resto** (`distributeTenths`, com BigInt para não perder precisão): a soma das fatias é sempre 100,0%; empate de resto vai para a fatia que vem antes; fatias muito pequenas podem mostrar 0,0%. Ordem das fatias: maior valor primeiro, empate pelo nome da tag (pt-BR, sem diferenciar acento). (d) **Pizzas:** fatia selecionada desloca 12 px e as outras esmaecem (~35% de opacidade); a lista fica entre o painel e o fim do cartão, um botão por tag ("● Mercado — R$ 1.230,50 · 41,2%", `aria-pressed`, item selecionado em negrito e com borda); tocar de novo na fatia ou no item limpa, assim como tocar no gráfico fora das fatias ou fora do cartão; cada pizza tem a própria seleção; painel sem seleção: "Total de saídas: R$ X" / "Total de entradas: R$ X"; sem saídas (ou entradas) no período, a pizza mostra "Nenhuma saída neste período." (ou "Nenhuma entrada neste período."). (e) **Barras:** Semana = 7 colunas ("seg. 19"), Mês = todos os dias do mês ("1" a "31"), Ano = 12 meses ("jan."); eixo Y compacto (`formatCompactBRL`: "R$ 1,2 mil", com o sinal de menos tipográfico) e com passo inteiro (`precision: 0`); como o Chart.js ainda pode gerar marcas fracionárias com faixas pequenas (ex.: saldo constante em zero), o rótulo arredonda para o centavo antes de formatar (`formatMoneyTick`, achado da revisão); a coluna selecionada ganha uma faixa da largura de uma categoria (não das marcas visíveis, que o Chart.js pula quando não cabem) e as outras esmaecem; tocar de novo não desmarca, tocar fora do cartão sim; painel sem seleção: "Período inteiro: Entradas … · Saídas … · Resultado …"; legenda "Entradas" / "Saídas" escrita abaixo do gráfico. (f) **Linha:** lê todos os lançamentos até o fim do período (`useTransactionsInRange(null, fim)`); o toque e o arraste são tratados por eventos de ponteiro no contêiner (o Chart.js não recebe eventos: `events: []`), com `touch-action: pan-y`; o ponto selecionado aumenta; painel: "15 de out.: saldo +R$ 850,00" e, sem seleção, "Saldo ao fim do período: +R$ X". (g) **Teclado (RNF-06, além do RF-06):** barras e linha são focáveis; setas esquerda/direita, Home e End escolhem o subperíodo e Esc limpa. (h) **CA-06.8:** os gráficos são recriados com outra `key` a cada período ou granularidade, então todas as seleções voltam ao início. (i) **Cores (CA-06.9):** as da paleta Tailwind do app, por tema — claro: texto slate-700, grade slate-200, entradas green-700, saídas red-700, saldo blue-700; escuro: texto slate-300, grade slate-700, entradas green-400, saídas red-400, saldo blue-400; a borda das fatias tem a cor do fundo da página. (j) **Testes:** nos testes de tela o react-chartjs-2 é trocado por um stub (`src/test/chartStubs.tsx` + `chartMock.ts`), porque o jsdom não tem canvas; o registro do Chart.js e o plugin de destaque têm testes unitários próprios; o desenho real é conferido no roteiro manual. (k) **`components/periods` (exceção à D-37, aprovada pelo dono):** é a única pasta de `src/components/` que pode importar `stores` (o `uiStore`, para granularidade e período — CA-05.4); além disso segue a D-37 (pode importar `domain`, `lib`, `repositories` e `components/ui`; nunca `features` nem `app`). | Escolhas de interface e implementação não detalhadas no RF-06, pensadas para o iPhone (toque, sem hover, sem tooltip) e para o pacote principal leve (RNF-02). *(Fase 8 —)* **Confirmado pelo dono.** (24/10/2026; (k) acrescentado e confirmado em 25/10/2026) |
| D-51 | **Recorrentes (Fase 9 — RF-07).** **Escolhas do dono:** (a) **editar** um recorrente muda só **descrição e tag** (valem para as ocorrências pendentes e futuras; lançamentos já confirmados não mudam); tipo e mês de início ficam fixos depois de criado; o valor muda por "Alterar valor" e o término por "Encerrar"; (b) o lançamento confirmado continua **no mês da ocorrência** também na edição (`/lancamentos/:id`): a data é validada como na confirmação, com a linha "Escolha um dia de <mês/ano>." e o erro "A data precisa estar em <mês/ano>." (formulário e `updateTransaction`, `OccurrenceDateOutsidePeriodError`); (c) **pular** fica na visão Mês (cada pendente tem "Confirmar" e "Pular"; depois de pular aparece "Mês pulado." com "Desfazer" por 8 s) e na tela do recorrente (status do mês atual com "Pular"/"Desfazer" e a lista "Meses pulados", cada mês com "Desfazer"); no Início só "Confirmar" (RF-02 item 4); (d) **encerrar** não pode ser antes do último mês confirmado (nem antes do início): o erro aparece no campo ("O término não pode ser antes de <mês/ano>, que já foi confirmado.") e o padrão já respeita esse limite; encerrar descarta os meses pulados e os valores que ficariam depois do término. **Implementação:** (e) `domain/recurring.ts` com as funções da §6.5 (`amountFor`, `isActiveIn`, `pendingOccurrences` — em ordem alfabética da descrição —, `setAmountFrom` — também recusa mês depois do término —, `projected`) e `occurrenceStatus`, `skipPeriod`/`unskipPeriod`, `endRecurring`, `lastConfirmedPeriod`, `recurringListStatus` e `displayAmount`; validação em `domain/recurringSchema.ts` (campos comuns com o lançamento extraídos do `transactionSchema`). (f) `repositories/recurringsRepository.ts`: toda leitura-e-gravação numa transação; **confirmar** checa o índice `[recurringId+recurringPeriod]` e grava na mesma transação (CA-07.5: duas confirmações simultâneas gravam um lançamento só), com o tipo do recorrente; só ocorrência pendente pode ser confirmada ou pulada; excluir o lançamento confirmado e pular o mês acontecem juntos (`deleteConfirmedTransaction`); as pendências de vários meses vêm de uma só leitura pelo índice composto (`anyOf`), e o hook volta a `undefined` enquanto meses novos carregam (como o `useTransactionsInRange`). (g) **Confirmar** (modal reutilizável `ConfirmOccurrenceDialog` em `components/recurrings`): título "Confirmar “<descrição>”", tipo e mês escritos, valor vigente, data padrão (hoje no mês atual; senão dia 1), "ⓘ" (`InfoPopover` em `components/ui`: abre e fecha por toque, fecha ao tocar fora ou com Esc, `aria-expanded`/`aria-controls`), a linha de ajuda (`Field.Hint`, ligada ao campo pelo `aria-describedby`), tag e descrição; ao confirmar, "Ocorrência confirmada". (h) **Telas:** `/ajustes/recorrentes` lista pela descrição com tipo, tag, valor (o vigente; antes do início o 1º; depois do término o último) e status do mês atual ("Pendente neste mês", "Confirmado neste mês", "Pulado neste mês", "Encerrado", "Começa em <mês/ano>"); "Novo recorrente" abre um modal (tipo, descrição, tag com o atalho de criar tag, valor, mês de início — padrão o atual — e término opcional, com `MonthInput` = `<input type="month">`) e, ao criar, abre os detalhes. `/ajustes/recorrentes/:id`: campos, status do mês atual com as ações, "Editar", "Alterar valor" (padrão: mês atual, ou o início se ainda não começou; erro no campo antes do início ou depois do término), "Encerrar", "Excluir" (sem confirmadas: "Excluir recorrente?"; com confirmadas: "Não é possível excluir" com o botão "Encerrar"), "Histórico de valores", "Meses pulados" e "Lançamentos confirmados". (i) **Visões:** na visão Mês o cartão separa "Realizado" (Entradas, Saídas, Resultado) e a linha "Previsto" (resultado previsto, com sinal); abaixo dos dias vem "Recorrentes pendentes", com "Não confirmada" escrito nas pendências de meses passados (CA-07.7); na visão Ano cada linha mostra "Previsto ±R$ X"; Dia e Semana não têm Previsto. (j) **Excluir lançamento confirmado:** o modal "Excluir lançamento?" explica o mês e oferece "Excluir e voltar a pendente" e "Excluir e pular este mês". (k) O backup já incluía recorrentes desde a Fase 6; um teste novo de ida e volta parte dos dados criados pelo repositório (valor alterado, mês pulado e ocorrência confirmada). (l) **Tipo travado (escolha do dono, depois da revisão):** o lançamento confirmado mantém o tipo do recorrente também na edição — o seletor Saída/Entrada fica desabilitado (`<fieldset disabled>`) com a frase "O tipo segue o do recorrente e não pode ser trocado.", e o `updateTransaction` recusa a troca (`OccurrenceTypeChangeError`). (m) **Revisão:** "Pular"/"Desfazer" ficam desabilitados enquanto a ação roda (o toque duplo não mostra erro falso), e o que outra aba mudou no meio (mês já confirmado ou pulado, término que passou a valer) aparece com a mensagem da regra em vez de "Não foi possível…". | Cinco pontos não definidos no RF-07, escolhidos pelo dono (a–d e l); o resto são escolhas de interface pensadas para o iPhone (toque, sem hover) e para manter os vínculos coerentes (lançamento sempre dentro do período e do mês do recorrente). Nenhum pacote novo. *(Fase 9 —)* **Confirmado pelo dono.** (25/10/2026; confirmado em 26/10/2026) |
| D-52 | **Vitest com no máximo 4 workers** (`test.maxWorkers: 4` no `vite.config.ts`). No PC de desenvolvimento (Windows), com o número padrão de workers, processos do Node às vezes caíam na inicialização (exit `0xC0000005`) e um arquivo qualquer falhava a cada rodada, inclusive arquivos que não tinham mudado; com 4 workers a suíte passou estável em todas as rodadas. Vale para `npm test`, `npm run test:coverage`, `test:unit` e `test:dom`. | Estabilidade dos testes acima da velocidade: a suíte completa (116 arquivos, 2.482 testes na Fase 9) passou de ~1 min 30 s para ~2 min 45 s. Nenhum pacote novo; o código do app não muda. **Confirmado pelo dono.** (26/10/2026) |

### 8.2 Pontos em aberto (perguntar ao dono antes da fase indicada)

| ID | Pergunta | Até a fase |
|---|---|---|
| Q-03 | Nome e ícone definitivos do app. | 11 |

*(Q-01 e Q-02 foram resolvidas: ver D-03 (substituída pela D-42) e D-10.)*

### 8.3 Checklist de consistência (rodar ao fim de cada fase)

- [ ] Todo valor monetário é inteiro em centavos.
- [ ] Nenhum `new Date('YYYY-MM-DD')` no código.
- [ ] Nenhum componente importa `db/database.ts` diretamente.
- [ ] Operações de múltiplos registros estão dentro de transações.
- [ ] Toda tabela nova está incluída no backup e no teste de ida e volta.
- [ ] Nenhuma requisição de rede para dados do usuário.
- [ ] Textos da interface em pt-BR; código em inglês.
- [ ] Nenhum pacote fora da seção 6.1 e da D-18 sem autorização do dono.
- [ ] Página de arquitetura e timeline atualizadas (§6.12) e ausentes do `dist/`.

---

## 9. Anexo — modelos de prompt por sessão

**Primeira sessão:**

```
Leia docs/SPEC.md inteiro. Antes de escrever código, me diga:
1) um resumo de 5 linhas do que entendeu do produto;
2) dúvidas ou contradições que encontrou na especificação.
Depois que eu responder, implemente somente a Fase 0.
```

**Sessões seguintes:**

```
Leia docs/SPEC.md. Implemente somente a Fase N, seguindo os princípios da seção 2.
Ao terminar: rode lint, typecheck e testes; marque as tarefas da fase como concluídas;
liste o roteiro de teste manual da fase; e pare.
```

**Para corrigir algo encontrado no teste:**

```
No teste da Fase N, o item X falhou: <descreva o que aconteceu>.
Corrija sem alterar o comportamento de outras fases. Se a correção exigir mudar a
especificação, proponha a alteração em docs/SPEC.md antes de mudar o código.
```

**Para mudar um requisito:**

```
Quero mudar o requisito RF-XX: <nova regra>.
Primeiro atualize docs/SPEC.md (requisito, critérios de aceite, decisões e fases afetadas)
e me mostre o diff. Só implemente depois da minha aprovação.
```
