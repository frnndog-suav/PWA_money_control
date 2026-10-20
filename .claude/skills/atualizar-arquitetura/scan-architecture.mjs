#!/usr/bin/env node
// Varre src/ (e os arquivos de configuração da raiz) e gera o grafo de módulos usado pela
// página de arquitetura (docs/SPEC.md §6.12).
// Sem dependências externas: análise por expressões regulares (suficiente para o código do projeto).
//
// Uso:
//   node .claude/skills/atualizar-arquitetura/scan-architecture.mjs            # grava o JSON padrão
//   node .claude/skills/atualizar-arquitetura/scan-architecture.mjs --stdout   # imprime em vez de gravar
//   node .claude/skills/atualizar-arquitetura/scan-architecture.mjs --out <arquivo.json>

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, posix, extname, basename } from 'node:path';
import { execSync } from 'node:child_process';

const DEFAULT_OUT = 'src/dev/architecture/data/module-graph.json';
const SOURCE_EXTS = ['.ts', '.tsx'];
const ASSET_EXTS = ['.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.json', '.woff2', '.html'];
const COMMIT_LIMIT = 300;
// Arquivos de dados escritos à mão para a página de arquitetura: contêm nomes de hooks,
// rotas e IDs de requisito dentro de strings, o que geraria falsos positivos na análise.
const DATA_ONLY_PREFIX = 'src/dev/architecture/data/';
// Arquivos de configuração da raiz mostrados na página (camada "config").
const ROOT_CONFIG_FILES = [
  'index.html',
  'vite.config.ts',
  'package.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  '.oxlintrc.json',
  '.prettierrc.json',
  '.prettierignore',
  '.gitignore',
];

const args = process.argv.slice(2);
const toStdout = args.includes('--stdout');
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : DEFAULT_OUT;

const root = process.cwd();
const srcDir = join(root, 'src');
const toId = (abs) => relative(root, abs).split('\\').join('/');

if (!existsSync(srcDir)) {
  console.error('Pasta src/ não encontrada. Rode o script na raiz do projeto.');
  process.exit(1);
}

// ---------- coleta de arquivos ----------

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const allFiles = walk(srcDir);
const outAbs = join(root, outPath);
const configFiles = ROOT_CONFIG_FILES.map((f) => join(root, f)).filter((f) => existsSync(f));
// Scripts de apoio (ex.: scripts/generate-icons.mjs) entram na camada "config".
const SCRIPT_EXTS = ['.mjs', '.js', '.cjs', '.ts'];
const scriptsDir = join(root, 'scripts');
const scriptFiles = existsSync(scriptsDir) ? walk(scriptsDir).filter((f) => SCRIPT_EXTS.includes(extname(f))) : [];
// Arquivos estáticos copiados como estão para o dist/ (ícones do PWA, favicon).
const publicDir = join(root, 'public');
const publicFileIds = existsSync(publicDir) ? walk(publicDir).map(toId).sort() : [];
const sourceFiles = allFiles.filter(
  (f) => SOURCE_EXTS.includes(extname(f)) && !f.endsWith('.d.ts') && f !== outAbs,
);
// O JSON gerado conta como existente mesmo na primeira execução (a página o importa).
const knownIds = new Set([...allFiles, ...configFiles, ...scriptFiles, outAbs].map(toId));

// ---------- classificação ----------

const LAYERS = ['app', 'components', 'features', 'domain', 'db', 'repositories', 'lib', 'stores', 'test', 'dev', 'assets'];

function layerOf(id) {
  if (!id.startsWith('src/')) return 'config';
  const parts = id.split('/'); // ['src', 'features', 'home', 'X.tsx']
  if (parts.length <= 2) return 'entry';
  return LAYERS.includes(parts[1]) ? parts[1] : 'other';
}

function featureOf(id) {
  const parts = id.split('/');
  return parts[1] === 'features' && parts.length > 3 ? parts[2] : null;
}

/** Subpasta usada para agrupar módulos no grafo (ex.: app/theme, features/settings). */
function groupOf(id) {
  if (!id.startsWith('src/')) return 'config';
  const parts = id.split('/');
  return parts.length > 3 ? parts.slice(1, 3).join('/') : parts.slice(1, -1).join('/') || 'src';
}

const isTestFile = (id) => /\.(test|spec)\.tsx?$/.test(id);

// Regras de dependência entre camadas (princípios 6 e 7 da SPEC §2, §6.12 e "Qualidade de código").
const FORBIDDEN = [
  { from: ['app', 'components', 'features'], to: ['db'], rule: '§2.7 componentes não acessam o Dexie diretamente' },
  { from: ['domain'], to: ['db', 'repositories', 'stores', 'components', 'features', 'app', 'dev'], rule: '§2.6 domínio é puro' },
  { from: ['lib'], to: ['db', 'repositories', 'stores', 'components', 'features', 'app', 'dev'], rule: '§2.6 lib é pura' },
  { from: ['components'], to: ['features', 'app'], rule: 'D-37 components (ui e <entidade>) não conhecem features nem app' },
  { from: ['features'], to: ['app'], rule: 'D-22 features não importam de src/app/ (dívida quitada na Fase 2)' },
  { from: ['repositories', 'db'], to: ['components', 'features', 'app'], rule: 'acesso a dados não conhece a interface' },
];
// Regras por caminho de origem, mais finas que a camada (D-37): dentro de src/components/, só
// src/components/<entidade>/ pode usar repositórios; os primitivos de components/ui são genéricos.
const FORBIDDEN_PATHS = [
  { fromPrefix: 'src/components/ui/', to: ['repositories'], rule: 'D-37 components/ui não acessa repositórios (só components/<entidade>/)' },
];
const FORBIDDEN_PACKAGES = [
  { from: ['domain', 'lib'], pkg: /^(react|react-dom|dexie|dexie-react-hooks|zustand)$/, rule: '§2.6 domínio/lib sem React e sem Dexie' },
];

// ---------- análise de cada arquivo ----------

const unique = (arr) => [...new Set(arr)].sort();
const matchAll = (text, re, group = 1) => [...text.matchAll(re)].map((m) => m[group]);

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function resolveSpecifier(spec, fromAbs) {
  const clean = spec.replace(/\?.*$/, ''); // ex.: '../index.html?raw'
  let base;
  if (clean.startsWith('@/')) base = join(srcDir, clean.slice(2));
  else if (clean.startsWith('.')) base = join(dirname(fromAbs), clean);
  else return null;
  const candidates = [base, ...SOURCE_EXTS.map((e) => base + e), ...SOURCE_EXTS.map((e) => join(base, 'index' + e))];
  for (const c of candidates) {
    const id = toId(c);
    if (knownIds.has(id) && !statSync(c).isDirectory()) return id;
  }
  return toId(base) + ' (não encontrado)';
}

function packageName(spec) {
  if (spec.startsWith('virtual:')) return spec;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function parseNamed(clause) {
  if (!clause) return [];
  const names = [];
  const def = clause.match(/^\s*(?:type\s+)?([A-Za-z_$][\w$]*)\s*(,|$)/);
  if (def) names.push(`default as ${def[1]}`);
  const ns = clause.match(/\*\s+as\s+([\w$]+)/);
  if (ns) names.push(`* as ${ns[1]}`);
  const braces = clause.match(/\{([^}]*)\}/);
  if (braces) {
    for (const part of braces[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '');
      if (name) names.push(name);
    }
  }
  return names;
}

/** Lê a partir de `start` (um '(') até o ')' correspondente; devolve o índice do ')'. */
function matchParen(code, start) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

const squash = (text) => text.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/,\s*\)/g, ')').trim();

/** Assinaturas das funções exportadas: `name<T>(params): Return`. */
function exportedFunctions(code) {
  const result = [];
  for (const m of code.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(<[^(]*>)?\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const close = matchParen(code, open);
    if (close < 0) continue;
    const params = code.slice(open + 1, close);
    const after = code.slice(close + 1).match(/^\s*:\s*([^{]+?)\s*\{/);
    result.push({
      name: m[1],
      signature: squash(`${m[1]}${m[2] ?? ''}(${params})${after ? `: ${after[1]}` : ''}`),
    });
  }
  return result;
}

/** Número de membros de cada `interface XProps { ... }` (componentes com muitas props). */
function propsCounts(code) {
  const counts = {};
  for (const m of code.matchAll(/interface\s+([A-Za-z_$][\w$]*Props)\s*(?:<[^{]*>)?\s*\{([^}]*)\}/g)) {
    counts[m[1]] = m[2].split(/\r?\n|;/).filter((l) => /^\s*(readonly\s+)?[A-Za-z_$][\w$]*\??\s*:/.test(l)).length;
  }
  return counts;
}

/** `const X = lazy(() => import('...'))` → { X: módulo resolvido }. */
function lazyDeclarations(code, abs) {
  const map = {};
  for (const m of code.matchAll(/(?:export\s+)?const\s+([A-Z][\w$]*)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    map[m[1]] = resolveSpecifier(m[2], abs);
  }
  return map;
}

const DEXIE_WRITE = new Set(['add', 'put', 'update', 'delete', 'bulkAdd', 'bulkPut', 'bulkDelete', 'bulkUpdate', 'clear', 'modify']);
const DEXIE_NON_TABLE = new Set(['transaction', 'version', 'open', 'close', 'tables', 'table', 'on', 'delete', 'isOpen', 'name', 'verno']);

function analyzeImports(code, abs) {
  const imports = [];
  const importRe = /^\s*import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;
  for (const m of code.matchAll(importRe)) imports.push({ spec: m[3], kind: m[1] ? 'type' : 'static', names: parseNamed(m[2]) });
  for (const m of code.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) imports.push({ spec: m[1], kind: 'side-effect', names: [] });
  for (const m of code.matchAll(/^\s*export\s+(type\s+)?(\*|\{[^}]*\})(?:\s+as\s+\w+)?\s+from\s+['"]([^'"]+)['"]/gm))
    imports.push({ spec: m[3], kind: 'reexport', names: parseNamed(m[2]) });
  for (const m of code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) imports.push({ spec: m[1], kind: 'dynamic', names: [] });

  const internal = [];
  const external = [];
  for (const imp of imports) {
    const target = resolveSpecifier(imp.spec, abs);
    if (target) internal.push({ to: target, kind: imp.kind, names: imp.names, specifier: imp.spec });
    else external.push({ package: packageName(imp.spec), specifier: imp.spec, kind: imp.kind, names: imp.names });
  }
  return { internal, external };
}

function analyze(abs) {
  const id = toId(abs);
  const raw = readFileSync(abs, 'utf8');
  const code = stripComments(raw);
  const isDataOnly = id.startsWith(DATA_ONLY_PREFIX);
  const { internal, external } = analyzeImports(code, abs);

  const defaultExport =
    code.match(/export\s+default\s+(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/)?.[1] ??
    code.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/m)?.[1] ??
    null;
  const exports = unique([
    ...matchAll(code, /export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g),
    ...(defaultExport ? [defaultExport] : []),
    ...[...code.matchAll(/^\s*export\s+(?:type\s+)?\{([^}]*)\}\s*;?\s*$/gm)].flatMap((m) =>
      m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean),
    ),
  ]);
  const typeExports = unique(matchAll(code, /export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/g));

  const isTsx = id.endsWith('.tsx');
  const lazy = lazyDeclarations(code, abs);
  const components = isTsx ? exports.filter((n) => /^[A-Z]/.test(n) && !/Props$|Context$|Type$/.test(n) && !typeExports.includes(n)) : [];
  const hooksDefined = exports.filter((n) => /^use[A-Z]/.test(n));
  const analyzed = !isDataOnly;
  const hooksUsed = analyzed ? unique(matchAll(code, /\b(use[A-Z][\w$]*)\s*\(/g)).filter((h) => !hooksDefined.includes(h)) : [];
  // `<Name` só é JSX quando não vem colado a um identificador (genérico `fn<T>`) nem é seguido de `(`.
  const jsxUsed =
    isTsx && analyzed
      ? unique(
          [...code.matchAll(/(?<![\w$.])<([A-Z][\w$]*(?:\.[A-Z][\w$]*)*)(?=[\s/>])(?!>\s*\()/g)].map((m) => m[1]),
        )
      : [];

  // `db.<tabela>.<op>(` ou `database.<tabela>.<op>(` (instância recebida por parâmetro, como nos
  // dados de exemplo da tela Sobre — D-30).
  const dexieOps = {};
  if (analyzed) {
    for (const m of code.matchAll(/\b(?:db|database)\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (DEXIE_NON_TABLE.has(m[1])) continue;
      const entry = (dexieOps[m[1]] ??= { reads: [], writes: [] });
      (DEXIE_WRITE.has(m[2]) ? entry.writes : entry.reads).push(m[2]);
    }
  }
  for (const t of Object.keys(dexieOps)) {
    dexieOps[t].reads = unique(dexieOps[t].reads);
    dexieOps[t].writes = unique(dexieOps[t].writes);
  }

  const routeDefs = analyzed && !isTestFile(id) ? extractRoutes(code) : [];
  const routes = unique(routeDefs.map((r) => r.path));

  const kinds = [];
  if (isTestFile(id)) kinds.push('test');
  if (components.length) kinds.push('component');
  if (/^src\/(features|dev)\/.*Page\.tsx$/.test(id) && components.length) kinds.push('page');
  if (Object.keys(lazy).length) kinds.push('lazy');
  if (hooksDefined.length) kinds.push('hook');
  const isStore = /create\s*(<[^>]*>)?\s*\(/.test(code) && external.some((e) => e.package === 'zustand');
  if (isStore) kinds.push('store');
  if (/extends\s+Dexie\b|new\s+Dexie\s*\(/.test(code)) kinds.push('database');
  if (routes.length) kinds.push('routing');
  if (/\bcreateContext\s*[<(]/.test(code)) kinds.push('context');
  if (isDataOnly) kinds.push('data');
  if (!kinds.length) kinds.push(/\b(interface|type)\s+\w+/.test(code) && !/\bfunction\b|=>/.test(code) ? 'types' : 'module');

  return {
    id,
    layer: layerOf(id),
    feature: featureOf(id),
    group: groupOf(id),
    kinds,
    loc: raw.split(/\r?\n/).filter((l) => l.trim()).length,
    exports,
    typeExports,
    defaultExport,
    functions: exportedFunctions(code),
    components,
    props: propsCounts(code),
    hooksDefined,
    hooksUsed,
    jsxUsed,
    storesUsed: analyzed ? unique(matchAll(code, /\b(use[A-Z]\w*Store)\b/g)) : [],
    dexieTables: dexieOps,
    usesTransaction: analyzed && /\.transaction\s*\(/.test(code),
    usesLiveQuery: analyzed && /\buseLiveQuery\s*\(/.test(code),
    devOnly: /import\.meta\.env\.DEV/.test(code) || id.startsWith('src/dev/'),
    lazyImports: internal.filter((i) => i.kind === 'dynamic').map((i) => i.to),
    lazyComponents: lazy,
    routes,
    routeDefs,
    ...(isStore ? { store: storeShape(code) } : {}),
    storeMembersUsed: [],
    code: analyzed ? code : '',
    requirementRefs: analyzed ? unique(matchAll(raw, /\b((?:RF|RNF|CA|D|Q)-\d+(?:\.\d+)?)\b/g)) : [],
    internal,
    external,
  };
}

/** Chaves das interfaces `*State` e `*Actions` de uma store Zustand (§6.7). */
function storeShape(code) {
  const keysOf = (suffix) =>
    [...code.matchAll(new RegExp(`interface\\s+\\w*${suffix}\\s*\\{`, 'g'))].flatMap((m) =>
      matchAll(balancedSlice(code, m.index + m[0].length - 1, '{', '}'), /^\s*([A-Za-z_$][\w$]*)\??\s*:/gm),
    );
  return { state: unique(keysOf('State')), actions: unique(keysOf('Actions')) };
}

/** Objetos de rota `{ path: 'x', element: <Comp /> }` / `{ index: true, element: <Comp /> }`. */
function extractRoutes(code) {
  const defs = [];
  // element: <X /> | <X>...</X> | ( ...JSX em várias linhas... )
  const re =
    /\{\s*(?:path\s*:\s*['"`]([^'"`]+)['"`]|index\s*:\s*(true))\s*,\s*element\s*:\s*\(?\s*(<([A-Z][\w$]*)[\s\S]*?(?:\/>|<\/\4>))\s*\)?\s*,?\s*\}/g;
  for (const m of code.matchAll(re)) {
    const tags = matchAll(m[3], /<([A-Z][\w$]*)/g);
    defs.push({ path: m[1] ?? '(index)', index: Boolean(m[2]), elements: tags });
  }
  // Rotas de layout: `{ element: <Layout />, children: [...] }`.
  for (const m of code.matchAll(/\{\s*element\s*:\s*<([A-Z][\w$]*)[^>]*\/>\s*,\s*children\s*:/g)) {
    defs.push({ path: '(layout)', index: false, elements: [m[1]] });
  }
  return defs;
}

// ---------- arquivos de configuração da raiz ----------

/** JSON com comentários (tsconfig): remove comentários fora de strings antes de interpretar. */
function readJsonLoose(text) {
  const withoutComments = text.replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/.*$/gm, (_, str) => str ?? '');
  try {
    return JSON.parse(withoutComments);
  } catch {
    return null;
  }
}

/** Trecho entre `open` (no índice `start`) e o fechamento correspondente. */
function balancedSlice(code, start, open, close) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === open) depth++;
    else if (code[i] === close && --depth === 0) return code.slice(start + 1, i);
  }
  return '';
}

function configDetails(id, raw) {
  if (id === 'index.html') {
    return {
      title: raw.match(/<title>([^<]*)<\/title>/)?.[1] ?? null,
      lang: raw.match(/<html[^>]*\blang="([^"]+)"/)?.[1] ?? null,
      inlineScripts: matchAll(raw, /<script>([\s\S]*?)<\/script>/g, 0).length,
      moduleScripts: matchAll(raw, /<script\s+type="module"\s+src="([^"]+)"/g),
      metas: matchAll(raw, /<meta\s+name="([^"]+)"/g),
      links: matchAll(raw, /<link\s+rel="([^"]+)"/g),
    };
  }
  if (id === 'vite.config.ts') {
    const pluginsAt = raw.search(/plugins\s*:\s*\[/);
    const plugins = pluginsAt < 0 ? '' : balancedSlice(raw, raw.indexOf('[', pluginsAt), '[', ']');
    return {
      plugins: matchAll(plugins, /\b([A-Za-z_$][\w$]*)\s*\(/g).filter((n) => !/Preset$/.test(n)),
      aliases: matchAll(raw, /['"](@[^'"]*)['"]\s*:/g),
      testEnvironment: raw.match(/environment\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null,
      coverageInclude: matchAll(raw.match(/coverage\s*:\s*\{[\s\S]*?include\s*:\s*\[([^\]]*)\]/)?.[1] ?? '', /['"]([^'"]+)['"]/g),
    };
  }
  if (id.endsWith('.json')) {
    const json = readJsonLoose(raw);
    if (!json) return {};
    if (id === 'package.json') return { scripts: Object.keys(json.scripts ?? {}) };
    if (id.startsWith('tsconfig')) {
      const o = json.compilerOptions ?? {};
      return {
        strict: o.strict ?? null,
        paths: Object.keys(o.paths ?? {}),
        include: json.include ?? [],
        references: (json.references ?? []).map((r) => r.path),
      };
    }
    if (id === '.oxlintrc.json') return { plugins: json.plugins ?? [], rules: Object.keys(json.rules ?? {}) };
    return { options: Object.keys(json) };
  }
  return { entries: raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')) };
}

function analyzeConfig(abs) {
  const id = toId(abs);
  if (id.endsWith('.ts')) {
    const m = analyze(abs);
    return { ...m, kinds: ['config'], config: configDetails(id, readFileSync(abs, 'utf8')) };
  }
  const raw = readFileSync(abs, 'utf8');
  const internal = [];
  if (id === 'index.html') {
    for (const src of matchAll(raw, /<script\s+type="module"\s+src="\/([^"]+)"/g)) {
      internal.push({ to: toId(join(root, src)), kind: 'static', names: [], specifier: '/' + src });
    }
  }
  return {
    id,
    layer: 'config',
    feature: null,
    group: 'config',
    kinds: id === 'index.html' ? ['config', 'html'] : ['config'],
    loc: raw.split(/\r?\n/).filter((l) => l.trim()).length,
    exports: [],
    typeExports: [],
    defaultExport: null,
    functions: [],
    components: [],
    props: {},
    hooksDefined: [],
    hooksUsed: [],
    jsxUsed: [],
    storesUsed: [],
    dexieTables: {},
    usesTransaction: false,
    usesLiveQuery: false,
    devOnly: false,
    lazyImports: [],
    lazyComponents: {},
    routes: [],
    routeDefs: [],
    storeMembersUsed: [],
    code: raw,
    requirementRefs: unique(matchAll(raw, /\b((?:RF|RNF|CA|D|Q)-\d+(?:\.\d+)?)\b/g)),
    internal,
    external: [],
    config: configDetails(id, raw),
  };
}

/** Script de apoio (scripts/): arquivos que ele grava, ex. `{ file: 'x.png' }` + `new URL('../public/')`. */
function analyzeScript(abs) {
  const m = analyze(abs);
  const outDir = m.code.match(/['"]\.\.\/([\w-]+)\/['"]/)?.[1] ?? null;
  const generates = outDir ? unique(matchAll(m.code, /\bfile:\s*['"]([^'"]+)['"]/g).map((f) => `${outDir}/${f}`)) : [];
  return {
    ...m,
    layer: 'config',
    group: 'scripts',
    kinds: ['config'],
    config: { script: true, generates, builtinsOnly: m.external.every((e) => e.package.startsWith('node:')) },
  };
}

const modules = [...sourceFiles.map(analyze), ...configFiles.map(analyzeConfig), ...scriptFiles.map(analyzeScript)].sort((a, b) =>
  a.id.localeCompare(b.id),
);
const byId = new Map(modules.map((m) => [m.id, m]));

// ---------- arestas, dependentes, testes ----------

const isAsset = (id) => ASSET_EXTS.includes(extname(id)) && !byId.has(id);
const edges = [];
const assets = new Map();
for (const m of modules) {
  for (const imp of m.internal) {
    if (isAsset(imp.to)) {
      (assets.get(imp.to) ?? assets.set(imp.to, []).get(imp.to)).push(m.id);
      continue;
    }
    edges.push({ from: m.id, to: imp.to, kind: imp.kind, names: imp.names });
  }
}
edges.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));

for (const m of modules) {
  m.importedBy = unique(edges.filter((e) => e.to === m.id).map((e) => e.from));
  m.imports = unique(edges.filter((e) => e.from === m.id).map((e) => e.to));
  m.assets = unique(m.internal.filter((i) => isAsset(i.to)).map((i) => i.to));
  delete m.internal;
}

for (const m of modules.filter((x) => !isTestFile(x.id))) {
  const stem = basename(m.id).replace(/\.tsx?$/, '');
  m.testedBy = modules
    .filter((t) => isTestFile(t.id) && (t.imports.includes(m.id) || basename(t.id).replace(/\.(test|spec)\.tsx?$/, '') === stem))
    .map((t) => t.id);
}

// ---------- violações de camada ----------

const violations = [];
for (const e of edges) {
  const from = byId.get(e.from);
  if (!from || isTestFile(from.id)) continue;
  const toLayer = layerOf(e.to);
  for (const r of FORBIDDEN) {
    if (r.from.includes(from.layer) && r.to.includes(toLayer) && e.kind !== 'type') {
      violations.push({ from: e.from, to: e.to, rule: r.rule });
    }
  }
  for (const r of FORBIDDEN_PATHS) {
    if (from.id.startsWith(r.fromPrefix) && r.to.includes(toLayer) && e.kind !== 'type') {
      violations.push({ from: e.from, to: e.to, rule: r.rule });
    }
  }
  const toFeature = featureOf(e.to);
  if (from.feature && toFeature && from.feature !== toFeature && e.kind !== 'type') {
    violations.push({ from: e.from, to: e.to, rule: 'uma feature não importa internos de outra feature' });
  }
  // §6.12 — código de src/dev só entra por import dinâmico, atrás do guard de DEV.
  if (toLayer === 'dev' && from.layer !== 'dev' && e.kind !== 'dynamic' && e.kind !== 'type') {
    violations.push({ from: e.from, to: e.to, rule: '§6.12 src/dev só pode ser carregado por import dinâmico' });
  }
  if (e.to.endsWith('(não encontrado)')) violations.push({ from: e.from, to: e.to, rule: 'import não resolvido' });
}
for (const m of modules) {
  if (isTestFile(m.id)) continue;
  for (const ext of m.external) {
    for (const r of FORBIDDEN_PACKAGES) {
      if (r.from.includes(m.layer) && r.pkg.test(ext.package) && ext.kind !== 'type') {
        violations.push({ from: m.id, to: ext.package, rule: r.rule });
      }
    }
  }
}

const unresolved = edges.filter((e) => e.to.endsWith('(não encontrado)')).map((e) => ({ from: e.from, to: e.to }));

// ---------- ciclos (Tarjan) ----------

function findCycles() {
  let index = 0;
  const stack = [];
  const meta = new Map();
  const cycles = [];
  const adj = new Map(modules.map((m) => [m.id, edges.filter((e) => e.from === m.id && e.kind !== 'type').map((e) => e.to)]));
  function strong(v) {
    meta.set(v, { index, low: index, onStack: true });
    index++;
    stack.push(v);
    for (const w of adj.get(v) ?? []) {
      if (!adj.has(w)) continue;
      if (!meta.has(w)) {
        strong(w);
        meta.get(v).low = Math.min(meta.get(v).low, meta.get(w).low);
      } else if (meta.get(w).onStack) {
        meta.get(v).low = Math.min(meta.get(v).low, meta.get(w).index);
      }
    }
    if (meta.get(v).low === meta.get(v).index) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        meta.get(w).onStack = false;
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) cycles.push(comp.sort());
    }
  }
  for (const m of modules) if (!meta.has(m.id)) strong(m.id);
  return cycles;
}

// ---------- rotas (com o componente de cada uma) ----------

/** Componentes que só envolvem a tela no `element` (o componente da rota é o de dentro). */
const ROUTE_WRAPPERS = new Set(['Suspense', 'StrictMode']);

/** Componente usado como `element` → módulo que o define e se é carregado com React.lazy. */
function resolveElement(name, mod) {
  if (mod.lazyComponents[name]) return { module: mod.lazyComponents[name], lazy: true };
  const edge = edges.find((e) => e.from === mod.id && e.names.includes(name));
  if (!edge) return { module: null, lazy: false };
  const target = byId.get(edge.to);
  if (target?.lazyComponents[name]) return { module: target.lazyComponents[name], lazy: true, via: target.id };
  return { module: edge.to, lazy: false };
}

const routesIndex = modules
  .filter((m) => !isTestFile(m.id))
  .flatMap((m) =>
    m.routeDefs.map((r) => {
      const main = r.elements.find((e) => !ROUTE_WRAPPERS.has(e)) ?? r.elements[0] ?? null;
      const resolved = main ? resolveElement(main, m) : { module: null, lazy: false };
      const fullPath = r.index ? '/' : r.path === '(layout)' || r.path === '*' || r.path.startsWith('/') ? r.path : '/' + r.path;
      return {
        path: fullPath,
        definedIn: m.id,
        element: main,
        elements: r.elements,
        module: resolved.module,
        lazyVia: resolved.via ?? null,
        lazy: resolved.lazy,
        devOnly: m.devOnly,
        layout: r.path === '(layout)',
      };
    }),
  )
  .sort((a, b) => a.path.localeCompare(b.path));
for (const m of modules) delete m.routeDefs;

// ---------- stores Zustand: quem usa cada campo/ação (§6.7) ----------

const storeModules = modules.filter((m) => m.store);
for (const m of modules) {
  const used = storeModules
    .filter((s) => s.id !== m.id && m.imports.includes(s.id))
    .flatMap((s) => [...s.store.state, ...s.store.actions])
    .filter((name) => new RegExp(`\\b${name}\\b`).test(m.code));
  m.storeMembersUsed = unique(used);
}

// ---------- public/, PWA e artefatos do build ----------

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Quem cita cada arquivo de public/ (ex.: index.html, opções do PWA) e quem o gera (scripts/). */
const publicFiles = Object.fromEntries(
  publicFileIds.map((id) => {
    const name = id.slice('public/'.length);
    const literal = new RegExp(`['"\`/]${escapeRegExp(name)}['"\`]`);
    const citing = modules.filter((m) => !isTestFile(m.id) && !m.devOnly && m.group !== 'scripts' && literal.test(m.code));
    return [
      id,
      {
        referencedBy: unique(citing.map((m) => m.id)),
        generatedBy: unique(modules.filter((m) => m.config?.generates?.includes(id)).map((m) => m.id)),
      },
    ];
  }),
);

/** Valor literal de `key: 'texto' | true | false` (booleanos viram boolean). */
function literalOf(code, key) {
  const value = code
    .match(new RegExp(`\\b${key}\\s*:\\s*(?:'([^']*)'|"([^"]*)"|(true|false))`))
    ?.slice(1)
    .find((v) => v !== undefined);
  if (value === 'true' || value === 'false') return value === 'true';
  return value ?? null;
}
const sliceAfter = (code, key, open, close) => {
  const at = code.search(new RegExp(`\\b${key}\\s*:\\s*\\${open}`));
  return at < 0 ? '' : balancedSlice(code, code.indexOf(open, at), open, close);
};
const stringsIn = (text) => matchAll(text, /['"]([^'"]+)['"]/g);

/** Opções do vite-plugin-pwa, lidas do módulo que exporta o objeto tipado como VitePWAOptions. */
function pwaInfo() {
  const optionsModule = modules.find((m) => !isTestFile(m.id) && /\bVitePWAOptions\b/.test(m.code) && /export\s+const/.test(m.code));
  if (!optionsModule) return null;
  // Só comentários de linha inteira: stripComments cortaria regex como /^\/cdn-cgi\//.
  const code = readFileSync(join(root, optionsModule.id), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const manifest = sliceAfter(code, 'manifest', '{', '}');
  const workbox = sliceAfter(code, 'workbox', '{', '}');
  const icons = [...sliceAfter(manifest, 'icons', '[', ']').matchAll(/\{([^}]*)\}/g)].map(([, body]) => ({
    src: literalOf(body, 'src'),
    sizes: literalOf(body, 'sizes'),
    purpose: literalOf(body, 'purpose'),
  }));
  return {
    optionsModule: optionsModule.id,
    usedBy: optionsModule.importedBy,
    registeredBy: modules.filter((m) => m.external.some((e) => e.package === 'virtual:pwa-register')).map((m) => m.id),
    registerType: literalOf(code, 'registerType'),
    injectRegister: literalOf(code, 'injectRegister'),
    useCredentials: literalOf(code, 'useCredentials'),
    includeManifestIcons: literalOf(code, 'includeManifestIcons'),
    manifest: Object.fromEntries(
      ['name', 'short_name', 'lang', 'display', 'start_url', 'scope'].map((key) => [key, literalOf(manifest, key)]),
    ),
    icons,
    globPatterns: stringsIn(sliceAfter(workbox, 'globPatterns', '[', ']')),
    navigateFallback: literalOf(workbox, 'navigateFallback'),
    navigateFallbackDenylist: matchAll(sliceAfter(workbox, 'navigateFallbackDenylist', '[', ']'), /(\/(?:\\\/|[^/\n])+\/[a-z]*)/g),
  };
}

// Marcas do código DEV que nunca podem aparecer no build de produção: esta página (§6.12 / D-17)
// e as ferramentas de dados de exemplo da tela Sobre (§6.11 / D-30).
const DEV_MARKERS = /ArchitecturePage|module-graph|__dev|arquitetura|sampleData|SampleData/;

/** Último `npm run build` (dist/), se existir: service worker, precache e vazamentos da página DEV. */
function buildInfo() {
  const distDir = join(root, 'dist');
  const swPath = join(distDir, 'sw.js');
  if (!existsSync(distDir)) return null;
  const files = walk(distDir).map((f) => ({ id: toId(f).slice('dist/'.length), abs: f }));
  const textFiles = files.filter((f) => /\.(js|css|html|webmanifest|json)$/.test(f.id));
  const sw = existsSync(swPath) ? readFileSync(swPath, 'utf8') : '';
  const indexHtml = existsSync(join(distDir, 'index.html')) ? readFileSync(join(distDir, 'index.html'), 'utf8') : '';
  return {
    builtAt: statSync(existsSync(swPath) ? swPath : distDir).mtime.toISOString(),
    serviceWorker: existsSync(swPath) ? 'sw.js' : null,
    workboxRuntime: files.find((f) => /^workbox-[\w-]+\.js$/.test(f.id))?.id ?? null,
    manifest: files.find((f) => f.id.endsWith('.webmanifest'))?.id ?? null,
    manifestLink: indexHtml.match(/<link rel="manifest"[^>]*>/)?.[0] ?? null,
    precache: unique(matchAll(sw, /url:"([^"]+)"/g)),
    navigationRoute: /NavigationRoute/.test(sw),
    css: files.filter((f) => f.id.endsWith('.css')).map((f) => ({ file: f.id, bytes: statSync(f.abs).size })),
    // Chunks JS de assets/ (o service worker e o runtime do Workbox ficam de fora), do maior para o menor.
    js: files
      .filter((f) => /^assets\/.*\.js$/.test(f.id))
      .map((f) => ({ file: f.id, bytes: statSync(f.abs).size }))
      .sort((a, b) => b.bytes - a.bytes),
    totalBytes: files.reduce((n, f) => n + statSync(f.abs).size, 0),
    devLeaks: textFiles.filter((f) => DEV_MARKERS.test(readFileSync(f.abs, 'utf8'))).map((f) => f.id),
  };
}

/**
 * §6.4 — esquema Dexie declarado na classe do banco: cada `version(n).stores({...})`, o
 * `SCHEMA_VERSION` exportado e o nome do banco (null enquanto não houver classe Dexie).
 */
function dexieSchema() {
  const dbModule = modules.find((m) => m.kinds.includes('database') && !isTestFile(m.id));
  if (!dbModule) return null;
  const code = dbModule.code;
  const versions = [...code.matchAll(/\.version\(\s*(\d+)\s*\)\s*\.stores\(\s*\{([\s\S]*?)\}\s*\)/g)].map((m) => ({
    version: Number(m[1]),
    stores: Object.fromEntries([...m[2].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*['"]([^'"]*)['"]/g)].map((t) => [t[1], t[2]])),
  }));
  const schemaVersion = code.match(/export\s+const\s+SCHEMA_VERSION\s*=\s*(\d+)/)?.[1];
  return {
    module: dbModule.id,
    databaseName:
      code.match(/DATABASE_NAME\s*=\s*['"]([^'"]+)['"]/)?.[1] ?? code.match(/super\(\s*['"]([^'"]+)['"]/)?.[1] ?? null,
    schemaVersion: schemaVersion ? Number(schemaVersion) : null,
    versions,
  };
}

const pwa = pwaInfo();
const build = buildInfo();
const schema = dexieSchema();
for (const m of modules) delete m.code;

// ---------- pacotes ----------

const pkgJson = existsSync(join(root, 'package.json')) ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) : {};
const declared = { ...(pkgJson.dependencies ?? {}), ...(pkgJson.devDependencies ?? {}) };

function installedVersion(name) {
  const p = join(root, 'node_modules', ...name.split('/'), 'package.json');
  return existsSync(p) ? (readJsonLoose(readFileSync(p, 'utf8'))?.version ?? null) : null;
}

const packages = {};
const ensurePackage = (name) =>
  (packages[name] ??= {
    version: declared[name] ?? null,
    installed: name.startsWith('node:') || name.startsWith('virtual:') ? null : installedVersion(name),
    declared: name in declared,
    dev: Boolean(pkgJson.devDependencies?.[name]),
    builtin: name.startsWith('node:') || name.startsWith('virtual:'),
    importedBy: [],
  });
for (const name of Object.keys(declared)) ensurePackage(name);
for (const m of modules) for (const ext of m.external) ensurePackage(ext.package).importedBy.push(m.id);
// Folhas de estilo: parte do CSS importado pelo código e segue os `@import` relativos
// (CSS → CSS). Registra pacotes (`@import 'tailwindcss'`), `source(none)` e as diretivas
// `@source` / `@source not` do Tailwind v4 (caminhos relativos ao arquivo CSS).
const stylesheets = {};
const cssQueue = [...assets.keys()].filter((id) => id.endsWith('.css'));
while (cssQueue.length) {
  const cssId = cssQueue.shift();
  if (stylesheets[cssId] || !existsSync(join(root, cssId))) continue;
  const css = readFileSync(join(root, cssId), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const sheet = { imports: [], packages: [], sourceNone: false, sources: [], sourceNot: [] };
  for (const [, spec, rest] of css.matchAll(/@import\s+['"]([^'"]+)['"]([^;]*);/g)) {
    if (spec.startsWith('.')) {
      const target = toId(join(dirname(join(root, cssId)), spec));
      sheet.imports.push(target);
      (assets.get(target) ?? assets.set(target, []).get(target)).push(cssId);
      cssQueue.push(target);
    } else {
      const name = packageName(spec);
      sheet.packages.push(name);
      ensurePackage(name).importedBy.push(cssId);
      if (/source\(\s*none\s*\)/.test(rest)) sheet.sourceNone = true;
    }
  }
  for (const [, not, spec] of css.matchAll(/@source\s+(not\s+)?['"]([^'"]+)['"]/g)) {
    const target = toId(join(dirname(join(root, cssId)), spec)) || '.';
    (not ? sheet.sourceNot : sheet.sources).push(target);
  }
  stylesheets[cssId] = sheet;
}
for (const [id, sheet] of Object.entries(stylesheets)) sheet.importedBy = unique(assets.get(id) ?? []);
for (const p of Object.values(packages)) p.importedBy = unique(p.importedBy);

// ---------- progresso das fases (SPEC §7) ----------

function parsePhases() {
  const specPath = join(root, 'docs', 'SPEC.md');
  if (!existsSync(specPath)) return { specVersion: null, phases: [] };
  const spec = readFileSync(specPath, 'utf8');
  const specVersion = spec.match(/\*\*Versão do documento:\*\*\s*([^\n]+)/)?.[1]?.trim() ?? null;
  const phases = [];
  const blocks = spec.split(/^### Fase /m).slice(1);
  for (const block of blocks) {
    const header = block.split('\n')[0];
    const [, number, title] = header.match(/^(\d+)\s*[—-]\s*(.+)$/) ?? [];
    if (number === undefined) continue;
    const body = block.split(/^---$/m)[0];
    const tasks = [...body.matchAll(/^- \[( |x)\] (.+)$/gm)].map((m) => ({ done: m[1] === 'x', text: m[2].trim(), human: /\(Humano\)/.test(m[2]) }));
    // "Acesso restrito *(opcional — depois da Fase 11)*" → título sem marcação + optional: true
    const cleanTitle = title.replace(/\*/g, '').trim();
    phases.push({
      number: Number(number),
      title: cleanTitle,
      optional: /\(opcional\b/i.test(cleanTitle),
      requirements: body.match(/\*\*Requisitos:\*\*\s*([^\n]+)/)?.[1]?.trim() ?? '',
      tasks,
      done: tasks.filter((t) => t.done).length,
      total: tasks.length,
    });
  }
  return { specVersion, phases };
}

// ---------- git ----------

function git(command) {
  try {
    return execSync(`git ${command}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function gitCommits() {
  const sep = '\u001f';
  const out = git(`log -n ${COMMIT_LIMIT} --date=iso-strict --name-status --pretty=format:"@@${sep}%H${sep}%ad${sep}%an${sep}%s"`);
  return out
    .split('@@' + sep)
    .filter(Boolean)
    .map((chunk) => {
      const [head, ...rest] = chunk.trim().split('\n');
      const [hash, date, author, subject] = head.split(sep);
      const files = rest.filter(Boolean).map((l) => {
        const [status, ...paths] = l.split('\t');
        return { status: status[0], path: paths[paths.length - 1] };
      });
      return { hash: hash.slice(0, 7), date, author, subject, refs: unique(matchAll(subject, /\b((?:RF|RNF|CA|D)-\d+(?:\.\d+)?)\b/g)), files };
    });
}

function gitState() {
  const workingTree = git('status --porcelain=v1 -uall')
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim() || '?', path: line.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, '') }))
    .filter((f) => f.path !== outPath);
  return {
    branch: git('rev-parse --abbrev-ref HEAD').trim() || null,
    head: git('rev-parse --short HEAD').trim() || null,
    workingTree,
  };
}

/** Todos os arquivos versionados ou não ignorados que existem no disco (índice de existência). */
function repoFiles() {
  return unique(
    git('ls-files --cached --others --exclude-standard')
      .split('\n')
      .map((l) => l.trim())
      .filter((p) => p && existsSync(join(root, p))),
  );
}

// ---------- saída ----------

const tablesIndex = {};
for (const m of modules) {
  for (const [table, ops] of Object.entries(m.dexieTables)) {
    const t = (tablesIndex[table] ??= { readers: [], writers: [] });
    if (ops.reads.length) t.readers.push(m.id);
    if (ops.writes.length) t.writers.push(m.id);
  }
}

const layerSummary = {};
for (const m of modules) {
  const s = (layerSummary[m.layer] ??= { modules: 0, loc: 0, components: 0, hooks: 0, tests: 0 });
  s.modules++;
  s.loc += m.loc;
  s.components += m.components.length;
  s.hooks += m.hooksDefined.length;
  if (isTestFile(m.id)) s.tests++;
}

const srcModules = modules.filter((m) => m.layer !== 'config');
const result = {
  $comment: 'Gerado por .claude/skills/atualizar-arquitetura/scan-architecture.mjs — não edite à mão.',
  generatedAt: new Date().toISOString(),
  totals: {
    modules: srcModules.length,
    loc: srcModules.reduce((n, m) => n + m.loc, 0),
    components: srcModules.reduce((n, m) => n + m.components.length, 0),
    hooks: srcModules.reduce((n, m) => n + m.hooksDefined.length, 0),
    tests: srcModules.filter((m) => isTestFile(m.id)).length,
    edges: edges.length,
    configFiles: modules.length - srcModules.length,
  },
  layerSummary,
  ...parsePhases(),
  modules,
  edges,
  assets: Object.fromEntries([...assets].map(([k, v]) => [k, unique(v)])),
  stylesheets,
  packages,
  tables: tablesIndex,
  schema,
  routes: routesIndex,
  publicFiles,
  pwa,
  build,
  violations,
  unresolved,
  cycles: findCycles(),
  git: gitState(),
  commits: gitCommits(),
  repoFiles: repoFiles(),
};

const json = JSON.stringify(result, null, 2) + '\n';
if (toStdout) {
  process.stdout.write(json);
} else {
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, json);
  console.log(`✓ ${posix.normalize(outPath)} — ${result.totals.modules} módulos (+${result.totals.configFiles} de configuração), ${result.totals.edges} arestas, ${violations.length} violação(ões), ${result.cycles.length} ciclo(s).`);
}
