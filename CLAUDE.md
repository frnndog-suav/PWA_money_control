# CLAUDE.md — App de Controle de Gastos (PWA)

**Leia `docs/SPEC.md` antes de qualquer tarefa.** Ele é a fonte única da verdade. Não implemente nada que não esteja descrito lá; se algo estiver ambíguo, contraditório ou faltando, **pare e pergunte** antes de supor.

## Fluxo de trabalho (spec-driven)

- **Uma fase por sessão** (SPEC §7). Use a skill `/implementar-fase N`.
- Ao terminar uma fase: `npm run lint`, `npm run typecheck` e `npm test` sem erros → marcar `[x]` na §7 → rodar o checklist da §8.3 (`/verificar-fase N`) → entregar o "Roteiro de teste" da fase → **parar**. Só comece a próxima fase depois que o humano confirmar.
- Mudança de comportamento pedida pelo humano: **primeiro atualize `docs/SPEC.md`**, mostre o diff, espere aprovação, depois mude o código (`/mudar-requisito`).
- Bug encontrado no teste manual: `/corrigir-teste`.
- Decisão de implementação relevante e não coberta pela spec: registre na §8.1 com data (`/registrar-decisao`).
- Cite IDs de requisito em commits e comentários de teste (ex.: `// RF-04 / CA-04.3`).
- Não use o app com dados reais antes de concluir a Fase 6 (Backup).
- **Dependências:** só instale sem perguntar as bibliotecas citadas na spec (§6.1/§6.11) e as pré-autorizadas na D-18 (`@tailwindcss/vite`, `jsdom`, `@vitest/coverage-v8`, `react-router-dom`). Lista completa em "Política de dependências" de `.claude/agents/spec-implementer.md`. Qualquer outra lib externa exige autorização do usuário antes do `npm install`.
- **Qualidade:** código o mais otimizado possível e legível, com componentes estruturados por composição (regras em "Qualidade de código" de `.claude/agents/spec-implementer.md`).
- **Testes:** sempre com **Vitest** (Testing Library sobre o Vitest para componentes). Nada de Jest ou outro runner.

## Agentes disponíveis (`.claude/agents/`)

- `spec-implementer` — implementa as tarefas de **uma** fase seguindo a spec.
- `domain-test-writer` — escreve testes unitários/integração de `src/domain/`, `src/lib/` e `src/repositories/` a partir dos CAs.
- `spec-reviewer` — revisão somente leitura do trabalho de uma fase contra a spec, a §2 e a §8.3.
- `architecture-mapper` — mantém a página secreta de arquitetura e timeline (`/__dev/arquitetura`, somente em DEV — SPEC §6.12). Skill: `/atualizar-arquitetura`. Roda ao fim de cada fase.

## Princípios do projeto ("constituição" — SPEC §2)

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
14. **Escopo fechado.** Não adicionar funcionalidades, bibliotecas ou telas que não estejam na especificação sem perguntar.
15. **Nada depende de "passar o mouse".** No iPhone não existe *hover*. Toda explicação ou detalhe é exibido como texto visível ou aberto por **toque**.

## Notas do repositório

- Import alias já configurado: `@/` → `src/` (em `tsconfig.app.json` e `vite.config.ts`). Prefira `@/...` a caminhos relativos longos.
- O projeto já foi criado com Vite 8 + React 19 + TypeScript 6 + React Compiler. Ainda faltam, para a Fase 0: `strict: true`, scripts `typecheck`/`test`, Tailwind, Vitest etc.
- **Divergência a resolver na Fase 0:** a spec pede ESLint + Prettier; o repositório hoje usa **oxlint** (`.oxlintrc.json`). Pergunte ao humano antes de trocar ou manter.
- Ambiente de desenvolvimento: Windows. Scripts auxiliares devem ser em Node (`.mjs`), não em bash nem Python.
