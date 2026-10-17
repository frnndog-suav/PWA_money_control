#!/usr/bin/env node
// Varre src/ e gera o grafo de módulos usado pela página de arquitetura (docs/SPEC.md §6.12).
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
const ASSET_EXTS = ['.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.json', '.woff2'];
const COMMIT_LIMIT = 300;

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
const sourceFiles = allFiles.filter(
  (f) => SOURCE_EXTS.includes(extname(f)) && !f.endsWith('.d.ts') && f !== outAbs,
);
const knownIds = new Set(allFiles.map(toId));

// ---------- classificação ----------

const LAYERS = ['app', 'components', 'features', 'domain', 'db', 'repositories', 'lib', 'stores', 'test', 'dev', 'assets'];

function layerOf(id) {
  const parts = id.split('/'); // ['src', 'features', 'home', 'X.tsx']
  if (parts.length <= 2) return 'entry';
  return LAYERS.includes(parts[1]) ? parts[1] : 'other';
}

function featureOf(id) {
  const parts = id.split('/');
  return parts[1] === 'features' && parts.length > 3 ? parts[2] : null;
}

const isTestFile = (id) => /\.(test|spec)\.tsx?$/.test(id);

// Regras de dependência entre camadas (princípios 6 e 7 da SPEC §2).
const FORBIDDEN = [
  { from: ['app', 'components', 'features'], to: ['db'], rule: '§2.7 componentes não acessam o Dexie diretamente' },
  { from: ['domain'], to: ['db', 'repositories', 'stores', 'components', 'features', 'app'], rule: '§2.6 domínio é puro' },
  { from: ['lib'], to: ['db', 'repositories', 'stores', 'components', 'features', 'app'], rule: '§2.6 lib é pura' },
  { from: ['components'], to: ['features', 'app'], rule: 'components/ui não conhece features' },
  { from: ['repositories', 'db'], to: ['components', 'features', 'app'], rule: 'acesso a dados não conhece a interface' },
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
  let base;
  if (spec.startsWith('@/')) base = join(srcDir, spec.slice(2));
  else if (spec.startsWith('.')) base = join(dirname(fromAbs), spec);
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

const DEXIE_WRITE = new Set(['add', 'put', 'update', 'delete', 'bulkAdd', 'bulkPut', 'bulkDelete', 'bulkUpdate', 'clear', 'modify']);
const DEXIE_NON_TABLE = new Set(['transaction', 'version', 'open', 'close', 'tables', 'table', 'on', 'delete', 'isOpen', 'name', 'verno']);

function analyze(abs) {
  const id = toId(abs);
  const raw = readFileSync(abs, 'utf8');
  const code = stripComments(raw);
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

  const isTsx = id.endsWith('.tsx');
  const components = isTsx ? exports.filter((n) => /^[A-Z]/.test(n) && !/Props$|Context$|Type$/.test(n)) : [];
  const hooksDefined = exports.filter((n) => /^use[A-Z]/.test(n));
  const hooksUsed = unique(matchAll(code, /\b(use[A-Z][\w$]*)\s*\(/g)).filter((h) => !hooksDefined.includes(h));
  const jsxUsed = isTsx ? unique(matchAll(code, /<([A-Z][\w$]*(?:\.[A-Z][\w$]*)*)[\s/>]/g)) : [];

  const dexieOps = {};
  for (const m of code.matchAll(/\bdb\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (DEXIE_NON_TABLE.has(m[1])) continue;
    const entry = (dexieOps[m[1]] ??= { reads: [], writes: [] });
    (DEXIE_WRITE.has(m[2]) ? entry.writes : entry.reads).push(m[2]);
  }
  for (const t of Object.keys(dexieOps)) {
    dexieOps[t].reads = unique(dexieOps[t].reads);
    dexieOps[t].writes = unique(dexieOps[t].writes);
  }

  const routes = unique([
    ...matchAll(code, /\bpath\s*:\s*['"`]([^'"`]+)['"`]/g),
    ...matchAll(code, /<Route\b[^>]*\bpath=["'{`]+([^"'}`]+)/g),
  ]);

  const kinds = [];
  if (isTestFile(id)) kinds.push('test');
  if (components.length) kinds.push('component');
  if (hooksDefined.length) kinds.push('hook');
  if (/create\s*(<[^>]*>)?\s*\(/.test(code) && external.some((e) => e.package === 'zustand')) kinds.push('store');
  if (/extends\s+Dexie\b|new\s+Dexie\s*\(/.test(code)) kinds.push('database');
  if (routes.length) kinds.push('routing');
  if (!kinds.length) kinds.push(/\b(interface|type)\s+\w+/.test(code) && !/\bfunction\b|=>/.test(code) ? 'types' : 'module');

  return {
    id,
    layer: layerOf(id),
    feature: featureOf(id),
    kinds,
    loc: raw.split(/\r?\n/).filter((l) => l.trim()).length,
    exports,
    defaultExport,
    components,
    hooksDefined,
    hooksUsed,
    jsxUsed,
    storesUsed: unique(matchAll(code, /\b(use[A-Z]\w*Store)\b/g)),
    dexieTables: dexieOps,
    usesTransaction: /\.transaction\s*\(/.test(code),
    usesLiveQuery: /\buseLiveQuery\s*\(/.test(code),
    devOnly: /import\.meta\.env\.DEV/.test(code) || id.startsWith('src/dev/'),
    lazyImports: internal.filter((i) => i.kind === 'dynamic').map((i) => i.to),
    routes,
    requirementRefs: unique(matchAll(raw, /\b((?:RF|RNF|CA|D|Q)-\d+(?:\.\d+)?)\b/g)),
    internal,
    external,
  };
}

const modules = sourceFiles.map(analyze).sort((a, b) => a.id.localeCompare(b.id));
const byId = new Map(modules.map((m) => [m.id, m]));

// ---------- arestas, dependentes, testes ----------

const edges = [];
const assets = new Map();
for (const m of modules) {
  for (const imp of m.internal) {
    if (ASSET_EXTS.includes(extname(imp.to))) {
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
  m.assets = unique(m.internal.filter((i) => ASSET_EXTS.includes(extname(i.to))).map((i) => i.to));
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

// ---------- pacotes ----------

const pkgJson = existsSync(join(root, 'package.json')) ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) : {};
const declared = { ...(pkgJson.dependencies ?? {}), ...(pkgJson.devDependencies ?? {}) };
const packages = {};
for (const m of modules) {
  for (const ext of m.external) {
    const p = (packages[ext.package] ??= {
      version: declared[ext.package] ?? null,
      dev: Boolean(pkgJson.devDependencies?.[ext.package]),
      builtin: ext.package.startsWith('node:') || ext.package.startsWith('virtual:'),
      importedBy: [],
    });
    p.importedBy.push(m.id);
  }
}
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
    phases.push({
      number: Number(number),
      title: title.trim(),
      requirements: body.match(/\*\*Requisitos:\*\*\s*([^\n]+)/)?.[1]?.trim() ?? '',
      tasks,
      done: tasks.filter((t) => t.done).length,
      total: tasks.length,
    });
  }
  return { specVersion, phases };
}

// ---------- git ----------

function gitCommits() {
  try {
    const sep = '\u001f';
    const out = execSync(`git log -n ${COMMIT_LIMIT} --date=iso-strict --name-status --pretty=format:"@@${sep}%H${sep}%ad${sep}%an${sep}%s"`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
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
  } catch {
    return [];
  }
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

const routesIndex = modules.flatMap((m) => m.routes.map((path) => ({ path, definedIn: m.id }))).sort((a, b) => a.path.localeCompare(b.path));

const layerSummary = {};
for (const m of modules) {
  const s = (layerSummary[m.layer] ??= { modules: 0, loc: 0, components: 0, hooks: 0, tests: 0 });
  s.modules++;
  s.loc += m.loc;
  s.components += m.components.length;
  s.hooks += m.hooksDefined.length;
  if (isTestFile(m.id)) s.tests++;
}

const result = {
  $comment: 'Gerado por .claude/skills/atualizar-arquitetura/scan-architecture.mjs — não edite à mão.',
  generatedAt: new Date().toISOString(),
  totals: {
    modules: modules.length,
    loc: modules.reduce((n, m) => n + m.loc, 0),
    components: modules.reduce((n, m) => n + m.components.length, 0),
    hooks: modules.reduce((n, m) => n + m.hooksDefined.length, 0),
    tests: modules.filter((m) => isTestFile(m.id)).length,
    edges: edges.length,
  },
  layerSummary,
  ...parsePhases(),
  modules,
  edges,
  assets: Object.fromEntries([...assets].map(([k, v]) => [k, unique(v)])),
  packages,
  tables: tablesIndex,
  routes: routesIndex,
  violations,
  cycles: findCycles(),
  commits: gitCommits(),
};

const json = JSON.stringify(result, null, 2) + '\n';
if (toStdout) {
  process.stdout.write(json);
} else {
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, json);
  console.log(`✓ ${posix.normalize(outPath)} — ${result.totals.modules} módulos, ${result.totals.edges} arestas, ${violations.length} violação(ões), ${result.cycles.length} ciclo(s).`);
}
