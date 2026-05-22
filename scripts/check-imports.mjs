import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");
const CONFIG_PATH = path.join(ROOT, "tsconfig.app.json");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const RESOLUTION_EXTENSIONS = [...SOURCE_EXTENSIONS, ".d.ts", ".json", ".css"];

const toPosix = (value) => value.split(path.sep).join("/");
const rel = (value) => toPosix(path.relative(ROOT, value));
const isLocalSpecifier = (specifier) => specifier.startsWith("@/") || specifier.startsWith("./") || specifier.startsWith("../");
const hasTsExtension = (specifier) => /\.(ts|tsx)$/.test(specifier);
const isSourceFile = (filePath) => SOURCE_EXTENSIONS.some((extension) => filePath.endsWith(extension));

const config = ts.readConfigFile(CONFIG_PATH, ts.sys.readFile);
if (config.error) {
  const message = ts.flattenDiagnosticMessageText(config.error.messageText, "\n");
  console.error(`❌ Não foi possível ler tsconfig.app.json: ${message}`);
  process.exit(1);
}

const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
const sourceFiles = parsed.fileNames.filter((fileName) => fileName.startsWith(SRC_ROOT) && isSourceFile(fileName));
const program = ts.createProgram(sourceFiles, parsed.options);
const checker = program.getTypeChecker();

const errors = [];
const warnings = [];
const localEdges = new Map();
const importVariants = new Map();

function pathExistsExact(absolutePath) {
  const normalized = path.resolve(absolutePath);
  const relative = path.relative(ROOT, normalized);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return { ok: fs.existsSync(normalized) };

  let current = ROOT;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) return { ok: false };
    const entries = fs.readdirSync(current);
    if (!entries.includes(segment)) {
      const caseInsensitiveMatch = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
      return {
        ok: false,
        mismatch: caseInsensitiveMatch ? path.join(current, caseInsensitiveMatch) : undefined,
        expected: path.join(current, segment),
      };
    }
    current = path.join(current, segment);
  }

  return { ok: fs.existsSync(normalized) };
}

function caseInsensitiveCandidate(absolutePath) {
  const normalized = path.resolve(absolutePath);
  const relative = path.relative(ROOT, normalized);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  let current = ROOT;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) return null;
    const entries = fs.readdirSync(current);
    const exact = entries.find((entry) => entry === segment);
    if (exact) {
      current = path.join(current, exact);
      continue;
    }
    const loose = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
    if (!loose) return null;
    current = path.join(current, loose);
  }

  return fs.existsSync(current) ? current : null;
}

function candidatePaths(basePath) {
  if (path.extname(basePath)) return [basePath];

  const candidates = [];
  for (const extension of RESOLUTION_EXTENSIONS) candidates.push(`${basePath}${extension}`);
  for (const extension of RESOLUTION_EXTENSIONS) candidates.push(path.join(basePath, `index${extension}`));
  return candidates;
}

function resolveLocal(specifier, importer) {
  const basePath = specifier.startsWith("@/")
    ? path.join(SRC_ROOT, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);

  for (const candidate of candidatePaths(basePath)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const exactCase = pathExistsExact(candidate);
      return { resolved: candidate, exactCase };
    }
  }

  for (const candidate of candidatePaths(basePath)) {
    const looseCandidate = caseInsensitiveCandidate(candidate);
    if (looseCandidate && fs.statSync(looseCandidate).isFile()) {
      return {
        resolved: null,
        exactCase: { ok: false, mismatch: looseCandidate, expected: candidate },
      };
    }
  }

  return { resolved: null, exactCase: { ok: false } };
}

function getModuleExports(resolvedFile) {
  const sourceFile = program.getSourceFile(resolvedFile);
  if (!sourceFile) return null;

  const symbol = checker.getSymbolAtLocation(sourceFile);
  if (!symbol) return new Set();

  return new Set(checker.getExportsOfModule(symbol).map((exportSymbol) => String(exportSymbol.escapedName)));
}

function addImportVariant(importer, resolved, specifier) {
  const key = `${importer} -> ${resolved}`;
  const variants = importVariants.get(key) ?? new Set();
  variants.add(specifier);
  importVariants.set(key, variants);
}

function recordEdge(importer, resolved, typeOnly) {
  if (typeOnly || !isSourceFile(resolved)) return;
  const current = localEdges.get(importer) ?? new Set();
  current.add(resolved);
  localEdges.set(importer, current);
}

function validateNamedExport(exportsSet, importName, context) {
  if (!exportsSet || exportsSet.has(importName)) return;
  errors.push(`${context.file}: export nomeado inexistente "${importName}" em "${context.specifier}".`);
}

function validateImportExports(node, importer, resolved, specifier) {
  if (!isSourceFile(resolved)) return;
  const exportsSet = getModuleExports(resolved);
  if (!exportsSet) return;

  const context = { file: rel(importer), specifier };

  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (!clause) return;

    if (clause.name && !exportsSet.has("default")) {
      errors.push(`${context.file}: default export inexistente em "${specifier}".`);
    }

    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        const importedName = (element.propertyName ?? element.name).text;
        validateNamedExport(exportsSet, importedName, context);
      }
    }
  }

  if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const element of node.exportClause.elements) {
      const exportedFromName = (element.propertyName ?? element.name).text;
      validateNamedExport(exportsSet, exportedFromName, context);
    }
  }
}

function isTypeOnlyImport(node) {
  if (ts.isExportDeclaration(node)) return Boolean(node.isTypeOnly);
  if (!ts.isImportDeclaration(node) || !node.importClause) return false;
  if (node.importClause.isTypeOnly) return true;
  const bindings = node.importClause.namedBindings;
  return Boolean(bindings && ts.isNamedImports(bindings) && bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly));
}

function inspectSpecifier(specifier, importer, node) {
  if (!isLocalSpecifier(specifier)) return;

  if (hasTsExtension(specifier)) {
    errors.push(`${rel(importer)}: import com extensão TypeScript não portátil "${specifier}". Use o caminho sem .ts/.tsx.`);
  }

  const result = resolveLocal(specifier, importer);
  if (!result.resolved) {
    const detail = result.exactCase.mismatch
      ? `case-sensitive mismatch: existe "${rel(result.exactCase.mismatch)}"`
      : "arquivo não encontrado";
    errors.push(`${rel(importer)}: import quebrado "${specifier}" (${detail}).`);
    return;
  }

  if (!result.exactCase.ok) {
    errors.push(`${rel(importer)}: case-sensitive mismatch em "${specifier}" -> "${rel(result.resolved)}".`);
  }

  addImportVariant(importer, result.resolved, specifier);
  recordEdge(importer, result.resolved, isTypeOnlyImport(node));
  validateImportExports(node, importer, result.resolved, specifier);
}

function inspectSourceFile(sourceFile) {
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      inspectSpecifier(node.moduleSpecifier.text, sourceFile.fileName, node);
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      inspectSpecifier(node.arguments[0].text, sourceFile.fileName, node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function detectCircularImports() {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycleKeys = new Set();

  function dfs(file) {
    if (visiting.has(file)) {
      const start = stack.indexOf(file);
      const cycle = [...stack.slice(start), file];
      const key = cycle.map(rel).join(" -> ");
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        errors.push(`ciclo de import detectado: ${key}`);
      }
      return;
    }

    if (visited.has(file)) return;
    visiting.add(file);
    stack.push(file);
    for (const next of localEdges.get(file) ?? []) dfs(next);
    stack.pop();
    visiting.delete(file);
    visited.add(file);
  }

  for (const file of sourceFiles) dfs(file);
}

function detectDuplicateModules() {
  const lowerCasePaths = new Map();
  for (const file of sourceFiles) {
    const key = rel(file).toLowerCase();
    const existing = lowerCasePaths.get(key);
    if (existing && existing !== file) {
      errors.push(`módulo duplicado por case mismatch: "${rel(existing)}" e "${rel(file)}".`);
    }
    lowerCasePaths.set(key, file);
  }

  for (const [key, variants] of importVariants) {
    if (variants.size > 1) {
      warnings.push(`import duplicado com múltiplos caminhos (${key.split(" -> ").map(rel).join(" -> ")}): ${[...variants].join(", ")}`);
    }
  }
}

for (const sourceFile of program.getSourceFiles()) {
  if (sourceFiles.includes(sourceFile.fileName)) inspectSourceFile(sourceFile);
}

detectCircularImports();
detectDuplicateModules();

if (warnings.length > 0) {
  console.warn(`⚠️ Import checker encontrou ${warnings.length} aviso(s):`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
}

if (errors.length > 0) {
  console.error(`❌ Import checker bloqueou o build com ${errors.length} erro(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✅ Import checker aprovado: ${sourceFiles.length} arquivos, imports locais resolvidos, exports válidos, sem ciclos críticos.`);