# Especificação — App de Controle de Gastos (PWA)

> **Versão do documento:** 1.12 — 20/10/2026 (D-32 a D-34 confirmadas; limite do nome da tag em UTF-16 — D-35) · 1.11 — 20/10/2026 (Fase 3: D-32 a D-34 aguardando confirmação) · 1.10 — 19/10/2026 (D-24 ampliada: procura de versão nova ao abrir, foco, online e a cada 30 min) · 1.9 — 19/10/2026 (exemplo do CA-05.3 corrigido; limite de 10 dígitos — D-31; D-27 a D-30 confirmadas) · 1.8 — 19/10/2026 (Fase 2: D-27 a D-30 aguardando confirmação) · 1.7 — 19/10/2026 (D-23 a D-25 confirmadas) · 1.6 — 19/10/2026 (acesso restrito vira a Fase 12, opcional — D-26) · 1.5 — 18/10/2026 (Fase 1: D-23 a D-25 aguardando confirmação) · 1.4 — 17/10/2026 (oxlint + Prettier — D-19; react-router e versões fixas — D-20; rota desconhecida → Início — D-21; tema sai de app/ na Fase 2 — D-22)
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

---

## 3. Glossário

| Termo (UI) | Termo (código) | Definição |
|---|---|---|
| Lançamento | `Transaction` | Registro de uma entrada ou saída de dinheiro em uma data. |
| Entrada | `income` | Lançamento que aumenta o saldo. |
| Saída / Gasto | `expense` | Lançamento que diminui o saldo. |
| Tag | `Tag` | Rótulo com nome e cor. Todo lançamento tem exatamente uma tag. |
| Saldo geral | `overallBalance` | Entradas − saídas de **todos** os lançamentos com data até hoje (inclusive). |
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

1. **Saldo geral** (destaque principal): entradas − saídas de todos os lançamentos com data ≤ hoje.
2. **Saldo do mês corrente**: valor do resultado do mês (entradas − saídas do mês, só realizado) e, em texto menor, entradas e saídas do mês.
3. **Formulário de lançamento rápido** (RF-01): tipo (alternador Saída/Entrada), valor, data (padrão hoje), tag, descrição e botão **"Lançar"**.
4. **Recorrentes pendentes do mês** (RF-07): lista compacta com botão "Confirmar" em cada item. Oculta se não houver pendências.
5. **Últimos lançamentos**: os 5 mais recentes (por data, depois por criação), com link "Ver todos".

**Critérios de aceite:**

- **CA-02.1** Valores positivos são exibidos em verde e negativos em vermelho, com sinal explícito (`+R$ 120,00` / `−R$ 45,90`). Zero é neutro. A cor nunca é o único indicador (o sinal também aparece).
- **CA-02.2** DADO que o app é aberto em qualquer dia, ENTÃO a data do formulário é sempre a data de hoje, e o usuário pode trocá-la.
- **CA-02.3** Lançamentos com data futura **não** entram no saldo geral, mas entram no saldo do mês se estiverem no mês corrente. *(Ver decisão D-03.)*
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
| Evolução do saldo | Linha | Mês (por dia), Ano (por mês) | Saldo acumulado geral ao fim de cada subperíodo. |

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
- Parcelas futuras aparecem nos meses futuros e **não** entram no saldo geral até chegar a data (D-03).

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
- `overallBalance(transactions, today)` → resultado de todos os lançamentos com `date <= today`.
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
  // ações: setGranularity, goPrev, goNext, goToday, setFilters, clearFilters, setUpdateAvailable
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
| Unitário | Vitest | Tudo em `domain/` e `lib/` (dinheiro, datas, saldos, recorrentes, parcelas, cripto, formato de backup). |
| Integração de dados | Vitest + fake-indexeddb | Repositórios: CRUD, unicidade de tag, bloqueio de exclusão, transações de parcelas, importação atômica. |
| Componente | Testing Library | MoneyInput, formulário de lançamento, formulário de tag, confirmação de recorrente. |
| Manual | iPhone | Roteiro de teste de cada fase (seção 7). |

Casos obrigatórios de teste unitário (mínimo): todos os exemplos numéricos dos CAs (ex.: CA-01.3, CA-07.3, CA-08.1), anos bissextos em `addMonthsClamped`, virada de ano em semanas, valores grandes (limite de 10 dígitos — D-31), soma de parcelas igual ao total para vários totais e números de parcelas.

**Dados de teste:** criar um script/ação **somente em desenvolvimento** (`import.meta.env.DEV`) para gerar dados de exemplo (ex.: 12 tags, 5.000 lançamentos em 3 anos, 4 recorrentes, 3 parcelamentos) e outro para apagar tudo. Não incluir no build de produção.

### 6.12 Página de arquitetura e timeline (somente desenvolvimento)

Ferramenta interna para o desenvolvedor, mantida pelo agente `architecture-mapper` (`.claude/agents/architecture-mapper.md`). Não é funcionalidade do produto.

- **Rota:** `/__dev/arquitetura`, registrada somente quando `import.meta.env.DEV` é verdadeiro e carregada com `React.lazy`. Sem link na barra inferior nem em Ajustes. **Nada desta página entra no build de produção** (verificar no `dist/`).
- **Conteúdo:** a topologia da aplicação inteira — camadas e direções de dependência permitidas, grafo de módulos com inspetor, rotas e telas, árvore de composição de componentes, fluxos de dados e interações por funcionalidade (diagramas de sequência), modelo de dados (tabelas Dexie, índices, quem lê/escreve), estado do Zustand, funções de domínio, rastreabilidade requisito → código → teste, dependências externas, saúde da arquitetura (violações, ciclos, órfãos) — e a **linha do tempo** das implementações (data, fase, commits, requisitos, decisões e arquivos de cada entrega).
- **Dados:** `src/dev/architecture/data/module-graph.json` é **gerado** por `.claude/skills/atualizar-arquitetura/scan-architecture.mjs` a partir do código (não editar à mão); fluxos, explicações e timeline são escritos pelo agente em `curated.ts` e `timeline.ts`, com um teste Vitest que garante que toda referência aponta para um módulo existente.
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

- [ ] Componentes `MoneyInput` (máscara, teclado numérico) e `DateInput`.
- [ ] Repositório de lançamentos (CRUD) e hooks de saldo geral e saldo do mês.
- [ ] Formulário de lançamento (React Hook Form + Zod) reutilizado na tela inicial e em `/lancamentos/novo` e `/lancamentos/:id`.
- [ ] Tela inicial: saldo geral, saldo do mês, formulário rápido, últimos 5 lançamentos.
- [ ] Atalho para criar tag a partir do formulário (CA-01.7).
- [ ] Testes de componente do `MoneyInput` e do formulário.

**Roteiro de teste (iPhone, app instalado):**
1. Digitar `1999` no valor → aparece `R$ 19,99`; o teclado é numérico.
2. Lançar uma entrada de R$ 1.000,00 (Salário) e uma saída de R$ 250,00 (Mercado) hoje → saldo geral `+R$ 750,00`; saldo do mês `+R$ 750,00`.
3. Lançar uma saída com data de amanhã → saldo do mês muda, saldo geral **não** muda.
4. Editar o valor de um lançamento → os saldos se atualizam.
5. Excluir um lançamento → os saldos se atualizam.
6. Tentar excluir a tag "Mercado" (em uso) → bloqueado com a contagem.
7. Fechar o app completamente, abrir de novo → os dados continuam lá e a data do formulário é hoje.

---

### Fase 5 — Lista, busca e filtros

**Requisitos:** RF-04

- [ ] Lista agrupada por dia com totais diários.
- [ ] Filtros (texto, tipo, tag, período) no Zustand; totais do conjunto filtrado; "Limpar filtros".
- [ ] Paginação ou virtualização (CA-04.6).

**Roteiro de teste:**
1. Gerar dados de exemplo (ferramenta de DEV, no PC) e verificar que a rolagem é fluida.
2. Buscar "merc" → encontra "Mercado" e "mercado do bairro".
3. Combinar tag + período → totais batem com a soma manual de alguns itens.
4. Trocar de aba e voltar → filtros mantidos; fechar o app → filtros zerados.

---

### Fase 6 — Backup (exportar e importar)

**Requisitos:** RF-10

> ⚠️ A partir do fim desta fase o app pode ser usado com dados reais.

- [ ] `lib/crypto.ts` (PBKDF2 + AES-GCM) com testes (ida e volta, senha errada, adulteração do texto cifrado).
- [ ] `lib/backupFormat.ts`: schemas zod, verificação de versão, estrutura de migrações (vazia por enquanto).
- [ ] `lib/share.ts`: Web Share API com arquivo e fallback de download.
- [ ] Tela `/ajustes/backup`: exportar (senha + confirmação), importar (arquivo + senha + resumo + confirmação), "Último backup: há N dias".
- [ ] Aviso de backup na tela inicial (regra dos 7 dias).
- [ ] Teste de integração: exportar → limpar banco → importar → dados idênticos.

**Roteiro de teste (iPhone):**
1. Exportar com uma senha → folha de compartilhamento → "Salvar em Arquivos" → iCloud Drive.
2. Abrir o arquivo no app Arquivos → conteúdo ilegível (sem descrições nem valores visíveis).
3. Importar com senha errada → erro, nada muda.
4. Remover o app da tela de início, adicionar de novo (app vazio) → importar o backup → todos os dados voltam.
5. Conferir "Último backup: hoje".

---

### Fase 7 — Visões por período

**Requisitos:** RF-05 (sem a parte de recorrentes, que entra na Fase 9)

- [ ] Seletor Dia/Semana/Mês/Ano, setas e "Hoje" (Zustand).
- [ ] Cartão de resumo e detalhamento de cada granularidade.
- [ ] Navegação de detalhamento (Ano → Mês → Dia; Semana → Dia).
- [ ] Testes de `weekRange` e de virada de mês/ano.

**Roteiro de teste:**
1. Visão Dia de hoje → totais de entrada e saída corretos.
2. Visão Semana → 7 linhas de segunda a domingo; o título mostra o intervalo.
3. Visão Mês → só os dias com movimento; tocar num dia abre a visão Dia.
4. Visão Ano → 12 meses; tocar num mês abre a visão Mês.
5. Navegar para dezembro → janeiro (virada de ano) sem erros.

---

### Fase 8 — Gráficos

**Requisitos:** RF-06

- [ ] Registrar somente os componentes necessários do Chart.js (para reduzir o tamanho do pacote).
- [ ] Pizza de saídas por tag, pizza de entradas por tag, barras entradas × saídas, linha de evolução do saldo.
- [ ] Desativar tooltip e legenda nativos; componente `ChartDetailPanel` (painel fixo abaixo do gráfico, `aria-live`).
- [ ] Legenda em lista das pizzas, com seleção sincronizada entre fatia e item (CA-06.3).
- [ ] Seleção por coluna nas barras (CA-06.4) e marcador arrastável na linha (CA-06.5).
- [ ] Cores das tags, tema claro/escuro, estados vazios, limpeza da seleção ao trocar de período.
- [ ] Funções puras para os dados dos gráficos (agrupamento, percentuais que somam 100% com arredondamento consistente) com testes.

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

- [ ] `domain/recurring.ts` com testes (valor vigente, ativo no mês, pendências, alteração de valor, meses pulados).
- [ ] Repositório de recorrentes; confirmar ocorrência (cria lançamento vinculado); pular/desfazer; alterar valor a partir de um mês; encerrar; excluir (com regra).
- [ ] Telas `/ajustes/recorrentes` e `/ajustes/recorrentes/:id`.
- [ ] Modal de confirmação de ocorrência (data dentro do mês da ocorrência), com o ícone "ⓘ", o balão explicativo e a linha de ajuda (CA-07.8).
- [ ] Componente reutilizável `InfoPopover` (abre e fecha por toque, acessível por teclado, `aria-expanded`).
- [ ] Pendentes do mês na tela inicial; "Previsto" e seção de pendentes na visão Mês; coluna Previsto na visão Ano.
- [ ] Exclusão de lançamento confirmado: perguntar "voltar a pendente" ou "pular este mês".
- [ ] Atualizar backup (exportação/importação incluem recorrentes) e teste de ida e volta.

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
2. A parcela 1 (hoje ou passada) entra no saldo geral; as futuras aparecem nos meses seguintes e não entram no saldo geral.
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
| D-03 | **Saldo geral** considera somente lançamentos com data **≤ hoje**. Lançamentos futuros (inclusive parcelas) aparecem nos seus meses, mas só entram no saldo geral quando a data chega. | Evita que parcelas futuras distorçam o saldo atual. **Confirmado pelo dono.** |
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
| D-30 | **Ferramentas DEV de dados de exemplo** (§6.11) em `src/dev/sampleData/`, carregadas com `lazy()` atrás de `import.meta.env.DEV` como uma seção extra em Ajustes → Sobre, com CSS próprio (como a página de arquitetura). Gerador com semente (mulberry32) e data de referência; os IDs são UUID v4 derivados do gerador (não `crypto.randomUUID`) para os dados serem determinísticos. "Gerar dados de exemplo" **substitui** tags, lançamentos, recorrentes e parcelamentos; "Apagar todos os dados" apaga essas quatro tabelas e **mantém** `settings` (tema, `persistRequested`). As duas ações pedem confirmação (`window.confirm`) e gravam numa única transação. Essas ferramentas (`src/dev/sampleData/useSampleDataTools.ts` e `sampleDataStore.ts`) acessam o `db` diretamente: exceção consciente ao princípio 7, válida só para `src/dev`, que fica fora do build de produção. | Ferramenta só de desenvolvimento; dados reprodutíveis para medir desempenho (RNF-02) e conferir telas; manter o tema evita "piscar" ao limpar. **Confirmado pelo dono.** (19/10/2026; confirmado em 19/10/2026) |
| D-31 | O campo de valor aceita no máximo **10 dígitos** (`MAX_AMOUNT_DIGITS = 10`), o mesmo limite do valor máximo do RF-01 (R$ 99.999.999,99 = 9.999.999.999 centavos). Assim a máscara nunca permite digitar um valor acima do teto. Corrige a divergência entre o RF-01 (10 dígitos) e o texto antigo da §6.5/§6.11 (11 dígitos). | Opção escolhida pelo dono entre limitar a máscara ou validar só no formulário. **Confirmado pelo dono.** (19/10/2026) |
| D-32 | **Paleta de 12 cores sugeridas das tags** (RF-03), em `src/domain/tags.ts` (`SUGGESTED_TAG_COLORS`), com nome em pt-BR para o rótulo acessível: Vermelho `#DC2626`, Laranja `#EA580C`, Amarelo `#CA8A04`, Verde-limão `#65A30D`, Verde `#16A34A`, Verde-água `#0D9488`, Ciano `#0891B2`, Azul `#2563EB`, Anil `#4F46E5`, Roxo `#9333EA`, Rosa `#DB2777`, Cinza `#64748B`. Tag nova já vem com a 1ª cor marcada (o usuário troca). A cor é gravada em maiúsculas (`#RRGGBB`); o `<input type="color">` devolve minúsculas e é normalizado. | A spec não definia as cores. Tons médios, distintos entre si e visíveis nos temas claro e escuro; com o texto de `readableTextColor` todas passam do contraste AA (4,5:1), conferido em teste. Uma só grafia da cor evita duplicidade e facilita comparar com a paleta. **Confirmado pelo dono.** (20/10/2026) |
| D-33 | **Modais com o `<dialog>` nativo** (`showModal()`), no primitivo composto `Modal` (`Modal.Body`, `Modal.Actions`) em `src/components/ui/`, com a prop `title` **obrigatória** (título visível e `aria-labelledby`, sempre renderizado, para o modal nunca ficar sem nome acessível). O conteúdo só existe enquanto o modal está aberto. Na tela de tags: tocar numa tag abre o modal de edição, que tem o botão "Excluir tag"; antes de pedir a confirmação o app confere o uso e, se a tag estiver em uso, mostra direto o aviso de bloqueio com as contagens; a exclusão confere de novo na mesma transação (D-02). Se conferir o uso ou excluir falhar (erro do IndexedDB), o modal aberto mostra uma mensagem em pt-BR e "Excluir tag"/"Excluir" ficam desabilitados enquanto a operação está pendente. Nos testes, o jsdom (que não implementa `showModal`/`close`) recebe um substituto mínimo em `src/test/dialog.ts`. | O navegador já prende o foco, fecha com Esc, marca `aria-modal`, deixa o fundo inerte, devolve o foco ao fechar e põe o modal na camada superior (nunca atrás da barra inferior nem do aviso de versão), sem biblioteca. Conferir o uso antes evita pedir confirmação de algo que será bloqueado. **Confirmado pelo dono.** (20/10/2026) |
| D-34 | **Versões da Fase 3:** `react-hook-form` 7.90.0, `zod` 4.6.7 e `@hookform/resolvers` **5.9.2** (e não a 6.0.0, publicada um dia antes da fase, versão principal nova). Nos testes de componente, o tempo de espera do `findBy` passa de 1 s para 3 s (`src/test/setup.ts`), porque com a cobertura ligada a primeira importação de uma tela `lazy` pode passar de 1 s. Os testes de tela preparam dados das tabelas sem repositório ainda por `src/test/seedDatabase.ts`. | Evitar uma versão principal recém-lançada; testes estáveis no Windows; testes de tela sem importar o Dexie (princípio 7). **Confirmado pelo dono.** (20/10/2026) |
| D-35 | O limite de **30 caracteres** do nome da tag (RF-03) é contado em **unidades UTF-16** (`String.length`, `.max(30)` do Zod): um emoji simples conta como 2. Para nomes com letras do português (NFC, como o teclado do iPhone gera) não há diferença. | Mais simples e suficiente para o uso real; contar grafemas com `Intl.Segmenter` foi considerado e descartado. **Confirmado pelo dono.** (20/10/2026) |

### 8.2 Pontos em aberto (perguntar ao dono antes da fase indicada)

| ID | Pergunta | Até a fase |
|---|---|---|
| Q-03 | Nome e ícone definitivos do app. | 11 |

*(Q-01 e Q-02 foram resolvidas: ver D-03 e D-10.)*

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
