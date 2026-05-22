#!/usr/bin/env node
/**
 * validate-paths.mjs
 * ------------------
 * Verificação focada em ENOENT: percorre todos os arquivos do front-end
 * (src/**) e valida que cada import local aponta para um arquivo que
 * EXISTE em disco, respeitando case-sensitivity (Linux/Vite/Rollup).
 *
 * Diferente do check-imports.mjs (que usa o compilador TypeScript completo
 * e valida também exports/ciclos), este script é leve, rápido e dedicado
 * exclusivamente a detectar caminhos quebrados — ideal para rodar em
 * pre-commit, CI ou localmente em segundos.
 *
 * Saída:
 *   - exit 0 → todos os caminhos resolvem
 *   - exit 1 → existe ao menos um ENOENT ou mismatch de case
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const RESOLVE_EXTS = [...EXTS, ".d.ts", ".json", ".css"];

const toPosix = (p) => p.split(path.sep).join("/");
const rel = (p) => toPosix(path.relative(ROOT, p));
const isLocal = (s) => s.startsWith("@/") || s.startsWith("./") || s.startsWith("../");

// Cache de listagens de diretório para acelerar verificação case-sensitive
const dirCache = new Map();
function readDirCached(dir) {
  if (dirCache.has(dir)) return dirCache.get(dir);
  let entries = null;
  try {
    if (fs.statSync(dir).isDirectory()) entries = fs.readdirSync(dir);
  } catch {
    entries = null;
  }
  dirCache.set(dir, entries);
  return entries;
}

// Coleta recursiva de arquivos-fonte do front-end
function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else if (EXTS.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

// Verifica se um caminho existe EXATAMENTE como escrito (case-sensitive)
function existsExactCase(absolutePath) {
  const relativeFromRoot = path.relative(ROOT, absolutePath);
  if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
    return { ok: fs.existsSync(absolutePath) };
  }
  let current = ROOT;
  for (const segment of relativeFromRoot.split(path.sep).filter(Boolean)) {
    const entries = readDirCached(current);
    if (!entries) return { ok: false };
    if (entries.includes(segment)) {
      current = path.join(current, segment);
      continue;
    }
    const loose = entries.find((e) => e.toLowerCase() === segment.toLowerCase());
    return {
      ok: false,
      mismatch: loose ? path.join(current, loose) : null,
      expected: path.join(current, segment),
    };
  }
  return { ok: true };
}

// Gera candidatos de resolução (com/sem extensão, index)
function candidates(base) {
  if (path.extname(base)) return [base];
  const out = [];
  for (const ext of RESOLVE_EXTS) out.push(base + ext);
  for (const ext of RESOLVE_EXTS) out.push(path.join(base, "index" + ext));
  return out;
}

// Resolve um specifier local em um caminho absoluto
function resolveLocal(specifier, importerFile) {
  const base = specifier.startsWith("@/")
    ? path.join(SRC, specifier.slice(2))
    : path.resolve(path.dirname(importerFile), specifier);

  for (const c of candidates(base)) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return { resolved: c, exact: existsExactCase(c) };
    }
  }
  return { resolved: null };
}

// Regex que extrai specifiers de import/export/dynamic import
const IMPORT_REGEX =
  /(?:^|\s|;)(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?["'`]([^"'`]+)["'`]|import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

function extractSpecifiers(content) {
  const out = [];
  let match;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const spec = match[1] || match[2];
    if (spec) out.push(spec);
  }
  return out;
}

// ----- Execução -----
const files = walk(SRC);
const errors = [];
let importsChecked = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const specifier of extractSpecifiers(content)) {
    if (!isLocal(specifier)) continue;
    importsChecked++;

    if (/\.(ts|tsx)$/.test(specifier)) {
      errors.push(
        `${rel(file)}: import com extensão TS não portátil "${specifier}" (remova .ts/.tsx).`
      );
      continue;
    }

    const { resolved, exact } = resolveLocal(specifier, file);
    if (!resolved) {
      errors.push(`${rel(file)}: ENOENT em "${specifier}" — arquivo não encontrado.`);
      continue;
    }
    if (exact && !exact.ok) {
      const detail = exact.mismatch
        ? `existe como "${rel(exact.mismatch)}" mas foi importado com case diferente`
        : "case-sensitive mismatch";
      errors.push(`${rel(file)}: "${specifier}" → ${detail}.`);
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ Validação de caminhos falhou (${errors.length} problema(s)):`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    `\nArquivos analisados: ${files.length} | Imports locais verificados: ${importsChecked}`
  );
  process.exit(1);
}

console.log(
  `✅ Caminhos OK: ${files.length} arquivos, ${importsChecked} imports locais — zero ENOENT, zero case mismatch.`
);
