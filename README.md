# Meus Gastos

Aplicativo pessoal de controle de gastos (entradas e saídas), feito como **PWA** para ser
usado no iPhone pela Tela de Início. Os dados ficam **somente no aparelho** (IndexedDB) e o
app funciona **sem internet**; a única saída de dados é o arquivo de backup criptografado
que o próprio usuário exporta.

O site publicado fica atrás do **Cloudflare Access**: só o e-mail do dono consegue abrir.

> A especificação completa (requisitos, decisões e plano de fases) está em
> [`docs/SPEC.md`](docs/SPEC.md), que é a fonte única da verdade do projeto.
> Não use o app com dados reais antes de concluir a Fase 6 (Backup).

## Tecnologias

Vite + React + TypeScript (strict) + React Compiler, Tailwind CSS, React Router, Zustand,
`vite-plugin-pwa` (Workbox). Testes com Vitest + Testing Library. Lint com oxlint e
formatação com Prettier. Lista completa e motivos em `docs/SPEC.md` §6.1.

## Como rodar

Requer Node.js 22.12 ou mais recente.

```sh
npm install          # instala as dependências (versões fixas no package.json)
npm run dev          # servidor de desenvolvimento em http://localhost:5173
npm run lint         # oxlint
npm run typecheck    # TypeScript sem emitir arquivos
npm test             # testes (Vitest)
npm run test:coverage # testes com cobertura (meta ≥ 90% em src/domain e src/lib)
npm run format       # formata com Prettier (format:check só confere)
npm run build        # build de produção em dist/ (inclui o service worker)
npm run preview      # serve o dist/ em http://localhost:4173
```

**Vitest no Windows:** rode os comandos npm/Vitest pelo **PowerShell** dentro de
`D:\Github\money_control` (com **D maiúsculo**). Com o diretório em minúsculo (`d:\...`,
como acontece no Git Bash) o Vitest falha com "failed to find the runner".

**PWA em desenvolvimento:** no `npm run dev` o service worker não é registrado. Para testar
o modo offline e o aviso de nova versão no PC, use `npm run build` + `npm run preview`.

**Ícones provisórios:** os PNGs de `public/` são gerados por
`node scripts/generate-icons.mjs` (sem dependências). Nome e ícone definitivos ficam para a
Fase 11.

## Deploy no Cloudflare Pages

Conforme `docs/SPEC.md` §6.10.

1. Tenha o repositório no GitHub.
2. No painel do Cloudflare: **Workers & Pages** → **Create** → **Pages** → conectar ao
   repositório do GitHub.
3. Configuração de build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Cada `git push` na branch principal publica em produção (`<projeto>.pages.dev`); as
   outras branches geram URLs de *preview* (`<branch>.<projeto>.pages.dev`).
5. Roteamento SPA: o build **não** tem `404.html`; assim o Pages entrega o `index.html` para
   qualquer caminho (ex.: `/lancamentos`) e o React Router assume. Não crie um `404.html`.

## Acesso restrito com Cloudflare Access

Objetivo (RF-12): só o e-mail do dono recebe o site, inclusive as URLs de *preview*.

1. No projeto Pages → **Settings** → **General** → **Enable access policy**. Isso cria uma
   aplicação no Cloudflare Access que protege as URLs de **preview**.
2. Em **Zero Trust** → **Access** → **Applications**, edite a aplicação criada no passo 1 e
   **inclua também o domínio de produção** `<projeto>.pages.dev` (siga a página
   "Known issues" da documentação do Cloudflare Pages, seção
   "Enable Access on your \*.pages.dev domain"). Sem isso, a produção fica aberta.
3. Política da aplicação: **Allow** → **Include** → **Emails** = `seu-email@exemplo.com`
   (troque pelo e-mail do dono; não coloque o e-mail no repositório).
4. Método de login: **One-time PIN** (código de uso único enviado por e-mail).
5. Duração da sessão: a mais longa que você aceitar (ex.: **1 mês**). Quando a sessão expira,
   o app instalado continua abrindo offline pelo cache; ao ficar online, faça login de novo
   para voltar a receber atualizações (CA-12.3).

Detalhes que o app já trata:

- O manifest é carregado com `crossorigin="use-credentials"`, senão o navegador o pediria
  sem o cookie do Access e receberia a página de login.
- O service worker **não** responde às rotas `/cdn-cgi/` (usadas pelo login do Access), para
  que o login funcione mesmo com o app em cache.

**Alternativa (se o Access der problema no iPhone):** publicar na **Vercel** e ativar
**Vercel Authentication** em **All Deployments** (gratuito), com login pela conta Vercel.
Registre a troca em `docs/SPEC.md` §8.

## Como testar no iPhone

Service worker, `crypto.subtle` e `crypto.randomUUID` só funcionam em contexto seguro
(HTTPS ou `localhost`). No iPhone use **sempre a URL publicada em HTTPS** (produção ou
*preview*), **nunca** `http://IP-do-PC:5173` (RNF-09).

1. Faça `git push` de uma branch e espere o deploy de *preview* do Cloudflare Pages (ou use
   a produção).
2. No Safari do iPhone, abra a URL HTTPS → faça login no Cloudflare Access com o código
   recebido por e-mail.
3. Toque em **Compartilhar** → **Adicionar à Tela de Início** → **Adicionar**.
4. Abra o app **pelo ícone**: ele deve abrir em tela cheia, sem a barra do Safari, com o
   nome "Gastos" e o ícone provisório. O aviso "Para seus dados ficarem guardados com
   segurança…" só aparece quando o app é aberto numa aba comum do Safari.
5. Feche o app, ative o **modo avião** e abra pelo ícone de novo: ele deve abrir normalmente.
6. Para testar atualização: publique uma mudança visível, abra o app (online) e espere o
   aviso **"Nova versão disponível"** acima da barra inferior; toque **Atualizar**. O app
   nunca recarrega sozinho.
7. Se o login do Access dentro do app instalado der problema, anote o comportamento em
   `docs/SPEC.md` §8 antes de seguir.
