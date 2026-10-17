#!/usr/bin/env node
// Checklist de consistência automático (docs/SPEC.md §8.3 + princípios da §2).
// Uso: node .claude/skills/verificar-fase/check-consistency.mjs
// Sai com código 1 se encontrar algum candidato a violação.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const srcDir = join(root, 'src');

if (!existsSync(srcDir)) {
  console.log('Pasta src/ não encontrada — nada a verificar.');
  process.exit(0);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const isTest = (p) => /\.(test|spec)\.tsx?$/.test(p) || p.includes(`${sep}test${sep}`);
const inDir = (p, ...dirs) => dirs.some((d) => p.startsWith(join(srcDir, d) + sep));

const rules = [
  {
    id: '§2.2 / §8.3',
    desc: 'new Date() com string de data (interpreta como UTC)',
    pattern: /new Date\(\s*(['"`]\d{4}-\d{2}|[a-zA-Z_$][\w$.]*(date|Date|day|Day)\b\s*\))/,
    applies: (p) => !isTest(p),
  },
  {
    id: '§2.7 / §8.3',
    desc: 'componente importando o banco Dexie diretamente',
    pattern: /from\s+['"](@\/db\/database|(\.\.?\/)+.*db\/database)['"]/,
    applies: (p) => inDir(p, 'app', 'components', 'features'),
  },
  {
    id: '§2.1 / §8.3',
    desc: 'parseFloat/toFixed/Number.parseFloat (dinheiro deve ser inteiro em centavos)',
    pattern: /\b(parseFloat|toFixed)\s*\(/,
    applies: (p) => !isTest(p),
  },
  {
    id: '§2.9',
    desc: 'Math.random (IDs devem usar crypto.randomUUID)',
    pattern: /Math\.random\s*\(/,
    applies: (p) => !isTest(p) && !p.includes(`${sep}dev`),
  },
  {
    id: '§2.5 / §8.3',
    desc: 'requisição de rede (fetch/XMLHttpRequest/axios) — app é local-first',
    pattern: /\b(fetch\s*\(|XMLHttpRequest|axios)/,
    applies: (p) => !isTest(p),
  },
  {
    id: '§2.3',
    desc: 'weekStartsOn diferente de 1',
    pattern: /weekStartsOn\s*:\s*[02-6]/,
    applies: () => true,
  },
  {
    id: '§2.15 / CA-06.2',
    desc: 'tooltip do Chart.js habilitado',
    pattern: /tooltip\s*:\s*\{[^}]*enabled\s*:\s*true/,
    applies: () => true,
  },
  {
    id: '§2.13',
    desc: 'variável VITE_ com cara de segredo',
    pattern: /VITE_\w*(SECRET|PASSWORD|PASS|KEY|TOKEN)\w*/i,
    applies: () => true,
  },
  {
    id: '§2.12',
    desc: 'uso explícito de any',
    pattern: /(:\s*any\b|as\s+any\b|<any>)/,
    applies: (p) => !isTest(p),
  },
];

const findings = [];
for (const file of walk(srcDir)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  for (const rule of rules) {
    if (!rule.applies(file)) continue;
    lines.forEach((line, i) => {
      if (line.trim().startsWith('//')) return;
      if (rule.pattern.test(line)) {
        findings.push({ file: relative(root, file), line: i + 1, rule, text: line.trim() });
      }
    });
  }
}

// Verifica strict no tsconfig da aplicação (§2.12)
const tsconfigApp = join(root, 'tsconfig.app.json');
if (existsSync(tsconfigApp) && !/"strict"\s*:\s*true/.test(readFileSync(tsconfigApp, 'utf8'))) {
  findings.push({
    file: 'tsconfig.app.json',
    line: 1,
    rule: { id: '§2.12', desc: '"strict": true ausente' },
    text: '',
  });
}

if (findings.length === 0) {
  console.log('✓ Nenhum candidato a violação encontrado (checklist automático §8.3).');
  console.log('  Lembre-se de conferir manualmente: transações em escritas múltiplas, tabelas no backup, textos pt-BR.');
  process.exit(0);
}

console.log(`✗ ${findings.length} candidato(s) a violação — confirme cada um no código:\n`);
for (const f of findings) {
  console.log(`${f.file}:${f.line}  [${f.rule.id}] ${f.rule.desc}`);
  if (f.text) console.log(`    ${f.text}`);
}
process.exit(1);
