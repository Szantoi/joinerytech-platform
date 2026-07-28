#!/usr/bin/env node

/**
 * ERP module-boundary preflight gate.
 *
 * Read-only scanner. TypeScript supplies the real frontend parser; all policy,
 * containment and baseline decisions remain in the versioned JSON config.
 */

import { createRequire } from 'node:module'
import { readFile, readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const TOOL_ROOT = path.resolve(SCRIPT_DIR, '..')
const DEFAULT_POLICY = 'config/erp-module-boundaries.json'
const PORTAL_PACKAGE = path.join(TOOL_ROOT, 'src', 'joinerytech-portal', 'package.json')

export const CATEGORIES = Object.freeze([
  'missingFrontendEntrypoints',
  'frontendParseErrors',
  'frontendCrossModuleImports',
  'frontendLegacyShellImports',
  'frontendExternalRelativeImports',
  'frontendNonLiteralDynamicImports',
  'frontendNonLiteralGlobImports',
  'frontendUnsafeLiteralGlobImports',
  'backendCrossModuleProjectReferences',
  'backendRepoRelativeProjectReferences',
])

const MANDATORY_BLOCKING_CATEGORIES = Object.freeze([
  'missingFrontendEntrypoints',
  'frontendParseErrors',
  'frontendNonLiteralDynamicImports',
  'frontendNonLiteralGlobImports',
  'frontendUnsafeLiteralGlobImports',
])

const FINDING_FIELDS = Object.freeze({
  missingFrontendEntrypoints: ['module', 'path'],
  frontendParseErrors: ['module', 'source', 'position', 'message'],
  frontendCrossModuleImports: ['module', 'source', 'syntax', 'specifier', 'target', 'targetModule'],
  frontendLegacyShellImports: ['module', 'source', 'syntax', 'specifier', 'target', 'legacyRoot'],
  frontendExternalRelativeImports: ['module', 'source', 'syntax', 'specifier', 'target'],
  frontendNonLiteralDynamicImports: ['module', 'source', 'syntax', 'expression', 'position'],
  frontendNonLiteralGlobImports: ['module', 'source', 'syntax', 'expression', 'position'],
  frontendUnsafeLiteralGlobImports: ['module', 'source', 'syntax', 'specifier', 'position'],
  backendCrossModuleProjectReferences: ['module', 'source', 'include', 'target', 'targetModule'],
  backendRepoRelativeProjectReferences: ['module', 'source', 'include', 'target'],
})

class ConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function toPortablePath(value) {
  return value.replaceAll('\\', '/').replaceAll(path.sep, '/')
}

function toNativeConfiguredPath(value) {
  return value.replace(/[\\/]+/g, path.sep)
}

function isAbsoluteOnAnyPlatform(value) {
  return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\')
}

function isWithin(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

function relativeToRoot(root, absolutePath) {
  return toPortablePath(path.relative(root, absolutePath))
}

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConfigurationError(`${label} must be an object`)
  }
  return value
}

function requireExactKeys(value, expectedKeys, label) {
  const actualKeys = Object.keys(value).sort(compareText)
  const sortedExpected = [...expectedKeys].sort(compareText)
  if (actualKeys.join('\0') !== sortedExpected.join('\0')) {
    throw new ConfigurationError(`${label} must contain exactly: ${expectedKeys.join(', ')}`)
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigurationError(`${label} must be a non-empty string`)
  }
  return value
}

function requireStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new ConfigurationError(`${label} must be ${allowEmpty ? 'an' : 'a non-empty'} array`)
  }
  value.forEach((entry, index) => requireString(entry, `${label}[${index}]`))
  if (new Set(value).size !== value.length) {
    throw new ConfigurationError(`${label} contains duplicate entries`)
  }
  return value
}

async function readJson(filePath, label) {
  let content
  try {
    content = await readFile(filePath, 'utf8')
  } catch {
    throw new ConfigurationError(`${label} cannot be read`)
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new ConfigurationError(`${label} is not valid JSON`)
  }
}

async function existingRealPath(candidate, label) {
  try {
    return await realpath(candidate)
  } catch {
    throw new ConfigurationError(`${label} does not exist or cannot be resolved`)
  }
}

async function directoryRealPath(candidate, label) {
  const resolved = await existingRealPath(candidate, label)
  const info = await stat(resolved)
  if (!info.isDirectory()) {
    throw new ConfigurationError(`${label} must point to a directory`)
  }
  return resolved
}

async function resolveConfiguredEntry(root, configuredPath, label, expectedKind = 'any') {
  if (typeof configuredPath !== 'string' || configuredPath.trim() === '') {
    throw new ConfigurationError(`${label} must be a non-empty relative path`)
  }
  if (isAbsoluteOnAnyPlatform(configuredPath)) {
    throw new ConfigurationError(`${label} must be relative to the repository root`)
  }

  const lexical = path.resolve(root, toNativeConfiguredPath(configuredPath))
  if (!isWithin(root, lexical)) {
    throw new ConfigurationError(`${label} escapes the repository root`)
  }
  const resolved = await existingRealPath(lexical, label)
  if (!isWithin(root, resolved)) {
    throw new ConfigurationError(`${label} resolves outside the repository root`)
  }

  const info = await stat(resolved)
  if (expectedKind === 'directory' && !info.isDirectory()) {
    throw new ConfigurationError(`${label} must point to a directory`)
  }
  if (expectedKind === 'file' && !info.isFile()) {
    throw new ConfigurationError(`${label} must point to a file`)
  }
  return { lexical, real: resolved, isDirectory: info.isDirectory() }
}

function assertNoOverlaps(entries, label, describe) {
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex]
      const right = entries[rightIndex]
      if (isWithin(left.real, right.real) || isWithin(right.real, left.real)) {
        throw new ConfigurationError(`${label} overlap: ${describe(left)} and ${describe(right)}`)
      }
    }
  }
}

function createEmptyCategories() {
  return Object.fromEntries(CATEGORIES.map((category) => [category, []]))
}

function validateFinding(category, finding, label) {
  requireObject(finding, label)
  const expectedFields = FINDING_FIELDS[category]
  requireExactKeys(finding, expectedFields, label)
  expectedFields.forEach((field) => requireString(finding[field], `${label}.${field}`))
}

function findingFingerprint(category, finding) {
  return FINDING_FIELDS[category].map((field) => finding[field]).join('\0')
}

function sortFindings(category, findings) {
  return [...findings].sort((left, right) =>
    compareText(findingFingerprint(category, left), findingFingerprint(category, right)),
  )
}

export async function loadPolicy({ root = TOOL_ROOT, policyPath = DEFAULT_POLICY } = {}) {
  const requestedRoot = path.resolve(root)
  const actualRoot = await directoryRealPath(requestedRoot, 'repository root')
  const policyEntry = await resolveConfiguredEntry(actualRoot, policyPath, 'policy path', 'file')
  const raw = requireObject(await readJson(policyEntry.real, 'policy'), 'policy')
  requireExactKeys(
    raw,
    ['schemaVersion', 'modules', 'frontend', 'blockingCategories', 'baseline'],
    'policy',
  )
  if (raw.schemaVersion !== 2) {
    throw new ConfigurationError('policy.schemaVersion must equal 2')
  }

  const blockingCategories = requireStringArray(raw.blockingCategories, 'policy.blockingCategories')
  for (const category of blockingCategories) {
    if (!CATEGORIES.includes(category)) {
      throw new ConfigurationError(`policy.blockingCategories contains unknown category: ${category}`)
    }
  }
  for (const category of MANDATORY_BLOCKING_CATEGORIES) {
    if (!blockingCategories.includes(category)) {
      throw new ConfigurationError(`policy.blockingCategories must include ${category}`)
    }
  }

  if (!Array.isArray(raw.modules) || raw.modules.length === 0) {
    throw new ConfigurationError('policy.modules must be a non-empty array')
  }
  const names = new Set()
  const modules = []
  for (const [index, rawModule] of raw.modules.entries()) {
    const moduleConfig = requireObject(rawModule, `policy.modules[${index}]`)
    requireExactKeys(
      moduleConfig,
      ['name', 'frontendRoot', 'backendOwnershipRoots', 'backendScanRoots'],
      `policy.modules[${index}]`,
    )
    const name = requireString(moduleConfig.name, `policy.modules[${index}].name`)
    if (names.has(name)) {
      throw new ConfigurationError(`policy.modules contains duplicate module name: ${name}`)
    }
    names.add(name)

    const frontendRoot = await resolveConfiguredEntry(
      actualRoot,
      moduleConfig.frontendRoot,
      `policy.modules[${index}].frontendRoot`,
      'directory',
    )
    const ownershipRoots = []
    for (const [rootIndex, entry] of requireStringArray(
      moduleConfig.backendOwnershipRoots,
      `policy.modules[${index}].backendOwnershipRoots`,
    ).entries()) {
      ownershipRoots.push(await resolveConfiguredEntry(
        actualRoot,
        entry,
        `policy.modules[${index}].backendOwnershipRoots[${rootIndex}]`,
        'directory',
      ))
    }
    const scanRoots = []
    for (const [rootIndex, entry] of requireStringArray(
      moduleConfig.backendScanRoots,
      `policy.modules[${index}].backendScanRoots`,
    ).entries()) {
      const scanRoot = await resolveConfiguredEntry(
        actualRoot,
        entry,
        `policy.modules[${index}].backendScanRoots[${rootIndex}]`,
        'directory',
      )
      if (!ownershipRoots.some((ownerRoot) => isWithin(ownerRoot.real, scanRoot.real))) {
        throw new ConfigurationError(`backend scan root ${rootIndex} for ${name} is outside its ownership roots`)
      }
      scanRoots.push(scanRoot)
    }
    assertNoOverlaps(scanRoots, `backend scan roots for ${name}`, (entry) => relativeToRoot(actualRoot, entry.real))
    modules.push({ name, frontendRoot, ownershipRoots, scanRoots })
  }

  assertNoOverlaps(
    modules.map((moduleConfig) => ({ ...moduleConfig.frontendRoot, module: moduleConfig.name })),
    'frontend module roots',
    (entry) => entry.module,
  )
  const allOwnershipRoots = modules.flatMap((moduleConfig) =>
    moduleConfig.ownershipRoots.map((entry) => ({ ...entry, module: moduleConfig.name })))
  assertNoOverlaps(allOwnershipRoots, 'backend ownership roots', (entry) => entry.module)
  const allScanRoots = modules.flatMap((moduleConfig) =>
    moduleConfig.scanRoots.map((entry) => ({ ...entry, module: moduleConfig.name })))
  assertNoOverlaps(
    allScanRoots,
    'backend scan roots',
    (entry) => `${entry.module}:${relativeToRoot(actualRoot, entry.real)}`,
  )

  const frontend = requireObject(raw.frontend, 'policy.frontend')
  requireExactKeys(frontend, ['entrypoint', 'sourceExtensions', 'sharedRoots', 'legacyShellRoots'], 'policy.frontend')
  const entrypoint = requireString(frontend.entrypoint, 'policy.frontend.entrypoint')
  if (isAbsoluteOnAnyPlatform(entrypoint) || entrypoint.includes('/') || entrypoint.includes('\\')) {
    throw new ConfigurationError('policy.frontend.entrypoint must be a file name')
  }
  const sourceExtensions = requireStringArray(frontend.sourceExtensions, 'policy.frontend.sourceExtensions')
  if (sourceExtensions.some((extension) => !extension.startsWith('.'))) {
    throw new ConfigurationError('policy.frontend.sourceExtensions entries must start with a dot')
  }

  const sharedRoots = []
  for (const [index, entry] of requireStringArray(
    frontend.sharedRoots,
    'policy.frontend.sharedRoots',
    { allowEmpty: true },
  ).entries()) {
    sharedRoots.push(await resolveConfiguredEntry(actualRoot, entry, `policy.frontend.sharedRoots[${index}]`))
  }
  const legacyShellRoots = []
  for (const [index, entry] of requireStringArray(
    frontend.legacyShellRoots,
    'policy.frontend.legacyShellRoots',
    { allowEmpty: true },
  ).entries()) {
    legacyShellRoots.push(await resolveConfiguredEntry(
      actualRoot,
      entry,
      `policy.frontend.legacyShellRoots[${index}]`,
      'directory',
    ))
  }
  assertNoOverlaps(sharedRoots, 'frontend shared roots', (entry) => relativeToRoot(actualRoot, entry.real))
  assertNoOverlaps(legacyShellRoots, 'frontend legacy shell roots', (entry) => relativeToRoot(actualRoot, entry.real))
  for (const sharedRoot of sharedRoots) {
    if (legacyShellRoots.some((legacyRoot) =>
      isWithin(sharedRoot.real, legacyRoot.real) || isWithin(legacyRoot.real, sharedRoot.real))) {
      throw new ConfigurationError('frontend shared roots must not overlap legacy shell roots')
    }
  }

  const baseline = requireObject(raw.baseline, 'policy.baseline')
  requireExactKeys(baseline, CATEGORIES, 'policy.baseline')
  const normalizedBaseline = createEmptyCategories()
  for (const category of CATEGORIES) {
    const entries = baseline[category]
    if (!Array.isArray(entries)) {
      throw new ConfigurationError(`policy.baseline.${category} must be an array`)
    }
    if (blockingCategories.includes(category) && entries.length > 0) {
      throw new ConfigurationError(`policy.baseline.${category} must stay empty because the category is blocking`)
    }
    entries.forEach((entry, index) => validateFinding(category, entry, `policy.baseline.${category}[${index}]`))
    const sorted = sortFindings(category, entries)
    const fingerprints = sorted.map((entry) => findingFingerprint(category, entry))
    if (new Set(fingerprints).size !== fingerprints.length) {
      throw new ConfigurationError(`policy.baseline.${category} contains duplicate findings`)
    }
    for (const entry of sorted) {
      if (!names.has(entry.module)) {
        throw new ConfigurationError(`policy.baseline.${category} references unknown module: ${entry.module}`)
      }
      if ('targetModule' in entry && !names.has(entry.targetModule)) {
        throw new ConfigurationError(
          `policy.baseline.${category} references unknown target module: ${entry.targetModule}`,
        )
      }
    }
    normalizedBaseline[category] = sorted
  }

  return {
    root: actualRoot,
    policyPath: policyEntry.real,
    policyDisplayPath: relativeToRoot(actualRoot, policyEntry.real),
    modules,
    frontend: { entrypoint, sourceExtensions, sharedRoots, legacyShellRoots },
    blockingCategories,
    baseline: normalizedBaseline,
  }
}

async function walkFiles(rootEntry, predicate, repositoryRoot, visitedDirectories = new Set()) {
  const directoryReal = await existingRealPath(rootEntry.real, 'scan directory')
  if (!isWithin(repositoryRoot, directoryReal)) {
    throw new ConfigurationError(`scan directory resolves outside the repository root: ${rootEntry.lexical}`)
  }
  if (visitedDirectories.has(directoryReal)) return []
  visitedDirectories.add(directoryReal)

  const files = []
  const entries = (await readdir(directoryReal, { withFileTypes: true }))
    .sort((left, right) => compareText(left.name, right.name))
  for (const entry of entries) {
    const lexical = path.join(directoryReal, entry.name)
    if (entry.isSymbolicLink()) {
      const linkedReal = await existingRealPath(lexical, `symlink ${relativeToRoot(repositoryRoot, lexical)}`)
      if (!isWithin(repositoryRoot, linkedReal)) {
        throw new ConfigurationError(`symlink escapes repository root: ${relativeToRoot(repositoryRoot, lexical)}`)
      }
      const linkedInfo = await stat(linkedReal)
      if (linkedInfo.isDirectory()) {
        files.push(...(await walkFiles(
          { lexical, real: linkedReal },
          predicate,
          repositoryRoot,
          visitedDirectories,
        )))
      } else if (linkedInfo.isFile() && predicate(linkedReal)) {
        files.push(linkedReal)
      }
    } else if (entry.isDirectory()) {
      const childReal = await existingRealPath(lexical, `directory ${relativeToRoot(repositoryRoot, lexical)}`)
      files.push(...(await walkFiles(
        { lexical, real: childReal },
        predicate,
        repositoryRoot,
        visitedDirectories,
      )))
    } else if (entry.isFile() && predicate(lexical)) {
      files.push(lexical)
    }
  }
  return files.sort(compareText)
}

let typescript
function getTypescript() {
  if (typescript) return typescript
  try {
    const portalRequire = createRequire(PORTAL_PACKAGE)
    typescript = portalRequire('typescript')
    return typescript
  } catch {
    throw new ConfigurationError('TypeScript parser is unavailable; install joinerytech-portal dependencies first')
  }
}

function sourcePosition(ts, sourceFile, node) {
  const point = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false))
  return `${point.line + 1}:${point.character + 1}`
}

function nodeExpression(node, sourceFile) {
  return node.getText(sourceFile).replace(/\s+/g, ' ').trim()
}

function isImportMetaGlob(ts, expression) {
  return ts.isPropertyAccessExpression(expression)
    && ['glob', 'globEager'].includes(expression.name.text)
    && ts.isMetaProperty(expression.expression)
    && expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword
    && expression.expression.name.text === 'meta'
}

function isProvablySafeLiteralGlob(specifier) {
  const normalized = (specifier.startsWith('!') ? specifier.slice(1) : specifier).replaceAll('\\', '/')
  if (!(normalized.startsWith('./') || normalized.startsWith('../'))) return false
  const segments = normalized.split('/')
  if (segments.some((segment) => segment === '')) return false
  const directorySegments = segments.slice(0, -1)
  return directorySegments.every((segment) => !/[*?[{(]/.test(segment))
}

function collectFrontendDependencies(ts, sourceFile, moduleName, source, findings) {
  const dependencies = []
  const seenDependencies = new Set()

  function addDependency(specifier, syntax) {
    const key = `${syntax}\0${specifier}`
    if (!seenDependencies.has(key)) {
      seenDependencies.add(key)
      dependencies.push({ specifier, syntax })
    }
  }

  function addNonLiteral(category, syntax, node) {
    findings[category].push({
      module: moduleName,
      source,
      syntax,
      expression: nodeExpression(node, sourceFile),
      position: sourcePosition(ts, sourceFile, node),
    })
  }

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        addDependency(node.moduleSpecifier.text, ts.isImportDeclaration(node) ? 'static-import' : 're-export')
      }
    } else if (ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression) {
      if (ts.isStringLiteral(node.moduleReference.expression)) {
        addDependency(node.moduleReference.expression.text, 'import-equals')
      } else {
        addNonLiteral('frontendNonLiteralDynamicImports', 'import-equals', node.moduleReference.expression)
      }
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument
      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)) {
        addDependency(argument.literal.text, 'import-type')
      } else {
        addNonLiteral('frontendNonLiteralDynamicImports', 'import-type', argument)
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
        addDependency(node.arguments[0].text, 'dynamic-import')
      } else {
        addNonLiteral('frontendNonLiteralDynamicImports', 'dynamic-import', node)
      }
    } else if (ts.isCallExpression(node) && isImportMetaGlob(ts, node.expression)) {
      const firstArgument = node.arguments[0]
      const literals = firstArgument && ts.isStringLiteral(firstArgument)
        ? [firstArgument]
        : firstArgument && ts.isArrayLiteralExpression(firstArgument)
          && firstArgument.elements.every((element) => ts.isStringLiteral(element))
          ? [...firstArgument.elements]
          : null
      if (literals === null) {
        addNonLiteral('frontendNonLiteralGlobImports', 'import-meta-glob', node)
      } else {
        for (const literal of literals) {
          if (isProvablySafeLiteralGlob(literal.text)) {
            addDependency(literal.text, 'import-meta-glob')
          } else {
            findings.frontendUnsafeLiteralGlobImports.push({
              module: moduleName,
              source,
              syntax: 'import-meta-glob',
              specifier: literal.text,
              position: sourcePosition(ts, sourceFile, literal),
            })
          }
        }
      }
    } else if (ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'require') {
      if (node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
        addDependency(node.arguments[0].text, 'require')
      } else {
        addNonLiteral('frontendNonLiteralDynamicImports', 'require', node)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return dependencies.sort((left, right) => compareText(`${left.syntax}\0${left.specifier}`, `${right.syntax}\0${right.specifier}`))
}

function staticGlobPrefix(specifier) {
  const normalized = specifier.startsWith('!') ? specifier.slice(1) : specifier
  const wildcard = normalized.search(/[*?[{]/)
  if (wildcard < 0) return normalized
  const prefix = normalized.slice(0, wildcard)
  return prefix.endsWith('/') || prefix.endsWith('\\') ? prefix.slice(0, -1) : prefix
}

async function assertTargetContained(repositoryRoot, target, source, specifier, sourceExtensions) {
  const resolutionCandidates = [
    target,
    ...sourceExtensions.map((extension) => `${target}${extension}`),
    ...sourceExtensions.map((extension) => path.join(target, `index${extension}`)),
  ]
  for (const candidate of resolutionCandidates) {
    try {
      const actual = await realpath(candidate)
      if (!isWithin(repositoryRoot, actual)) {
        throw new ConfigurationError(`frontend import resolves outside repository root: ${source} -> ${specifier}`)
      }
      return actual
    } catch (error) {
      if (error instanceof ConfigurationError) throw error
    }
  }

  let existingAncestor = target
  while (true) {
    try {
      const actual = await realpath(existingAncestor)
      if (!isWithin(repositoryRoot, actual)) {
        throw new ConfigurationError(`frontend import resolves outside repository root: ${source} -> ${specifier}`)
      }
      return actual
    } catch (error) {
      if (error instanceof ConfigurationError) throw error
      const parent = path.dirname(existingAncestor)
      if (parent === existingAncestor) {
        throw new ConfigurationError(`frontend import target cannot be contained: ${source} -> ${specifier}`)
      }
      existingAncestor = parent
    }
  }
}

function configuredRootContains(rootEntry, lexicalTarget, realTarget) {
  if (rootEntry.isDirectory) {
    return isWithin(rootEntry.lexical, lexicalTarget) && isWithin(rootEntry.real, realTarget)
  }
  return path.relative(rootEntry.real, realTarget) === ''
}

function findOwningModule(modules, target, rootField) {
  for (const moduleConfig of modules) {
    const roots = rootField === 'frontendRoot' ? [moduleConfig.frontendRoot] : moduleConfig.ownershipRoots
    if (roots.some((root) => isWithin(root.real, target))) return moduleConfig
  }
  return null
}

async function scanFrontend(policy, findings) {
  const ts = getTypescript()
  const extensions = new Set(policy.frontend.sourceExtensions)
  for (const moduleConfig of policy.modules) {
    const entrypoint = path.join(moduleConfig.frontendRoot.real, policy.frontend.entrypoint)
    try {
      const info = await stat(entrypoint)
      if (!info.isFile()) throw new Error('not a file')
    } catch {
      findings.missingFrontendEntrypoints.push({
        module: moduleConfig.name,
        path: relativeToRoot(policy.root, entrypoint),
      })
    }

    const sourceFiles = await walkFiles(
      moduleConfig.frontendRoot,
      (file) => extensions.has(path.extname(file)),
      policy.root,
    )
    for (const sourceFile of sourceFiles) {
      const source = relativeToRoot(policy.root, sourceFile)
      const sourceText = await readFile(sourceFile, 'utf8')
      const scriptKind = path.extname(sourceFile).toLowerCase() === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      const parsed = ts.createSourceFile(sourceFile, sourceText, ts.ScriptTarget.Latest, true, scriptKind)
      if (parsed.parseDiagnostics.length > 0) {
        for (const diagnostic of parsed.parseDiagnostics) {
          const start = diagnostic.start ?? 0
          const point = parsed.getLineAndCharacterOfPosition(start)
          findings.frontendParseErrors.push({
            module: moduleConfig.name,
            source,
            position: `${point.line + 1}:${point.character + 1}`,
            message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
          })
        }
        continue
      }

      const dependencies = collectFrontendDependencies(ts, parsed, moduleConfig.name, source, findings)
      for (const dependency of dependencies) {
        if (!dependency.specifier.startsWith('.')) continue
        const targetSpecifier = dependency.syntax === 'import-meta-glob'
          ? staticGlobPrefix(dependency.specifier)
          : dependency.specifier
        const targetPath = path.resolve(path.dirname(sourceFile), toNativeConfiguredPath(targetSpecifier))
        const targetReal = await assertTargetContained(
          policy.root,
          targetPath,
          source,
          dependency.specifier,
          policy.frontend.sourceExtensions,
        )

        const targetModule = findOwningModule(policy.modules, targetReal, 'frontendRoot')
        if (targetModule?.name === moduleConfig.name) continue

        const findingBase = {
          module: moduleConfig.name,
          source,
          syntax: dependency.syntax,
          specifier: toPortablePath(dependency.specifier),
          target: relativeToRoot(policy.root, targetPath),
        }
        if (targetModule) {
          findings.frontendCrossModuleImports.push({ ...findingBase, targetModule: targetModule.name })
          continue
        }

        const sharedRoot = policy.frontend.sharedRoots.find((root) =>
          configuredRootContains(root, targetPath, targetReal))
        if (sharedRoot) continue

        const legacyRoot = policy.frontend.legacyShellRoots.find((root) =>
          configuredRootContains(root, targetPath, targetReal))
        if (legacyRoot) {
          findings.frontendLegacyShellImports.push({
            ...findingBase,
            legacyRoot: relativeToRoot(policy.root, legacyRoot.real),
          })
        } else {
          findings.frontendExternalRelativeImports.push(findingBase)
        }
      }
    }
  }
}

function decodeXmlEntities(value, source) {
  if (/&(?!#x[0-9A-Fa-f]+;|#[0-9]+;|amp;|quot;|apos;|lt;|gt;)/.test(value)) {
    throw new ConfigurationError(`malformed XML in ${source}: invalid or unescaped entity`)
  }
  return value.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|amp|quot|apos|lt|gt);/g, (entity, name) => {
    if (name === 'amp') return '&'
    if (name === 'quot') return '"'
    if (name === 'apos') return "'"
    if (name === 'lt') return '<'
    if (name === 'gt') return '>'
    const codePoint = name.startsWith('#x')
      ? Number.parseInt(name.slice(2), 16)
      : Number.parseInt(name.slice(1), 10)
    if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
      throw new ConfigurationError(`malformed XML in ${source}: invalid character entity &${name};`)
    }
    return String.fromCodePoint(codePoint)
  })
}

function validateXmlText(value, source) {
  if (value.includes(']]>') || /&(?!#x[0-9A-Fa-f]+;|#[0-9]+;|amp;|quot;|apos;|lt;|gt;)/.test(value)) {
    throw new ConfigurationError(`malformed XML in ${source}: invalid text content`)
  }
}

function parseXmlStartTag(content, source) {
  let index = 0
  const nameMatch = /^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(content)
  if (!nameMatch) throw new ConfigurationError(`malformed XML in ${source}: invalid element name`)
  const name = nameMatch[0]
  index = name.length
  const attributes = new Map()
  let selfClosing = false

  while (index < content.length) {
    while (/\s/.test(content[index] ?? '')) index += 1
    if (index >= content.length) break
    if (content[index] === '/') {
      selfClosing = true
      index += 1
      while (/\s/.test(content[index] ?? '')) index += 1
      if (index !== content.length) {
        throw new ConfigurationError(`malformed XML in ${source}: unexpected content after /`)
      }
      break
    }
    const attributeMatch = /^[A-Za-z_:][A-Za-z0-9_.:-]*/.exec(content.slice(index))
    if (!attributeMatch) throw new ConfigurationError(`malformed XML in ${source}: invalid attribute`)
    const attributeName = attributeMatch[0]
    if (attributes.has(attributeName)) {
      throw new ConfigurationError(`malformed XML in ${source}: duplicate attribute ${attributeName}`)
    }
    index += attributeName.length
    while (/\s/.test(content[index] ?? '')) index += 1
    if (content[index] !== '=') {
      throw new ConfigurationError(`malformed XML in ${source}: attribute ${attributeName} has no value`)
    }
    index += 1
    while (/\s/.test(content[index] ?? '')) index += 1
    const quote = content[index]
    if (quote !== '"' && quote !== "'") {
      throw new ConfigurationError(`malformed XML in ${source}: attribute ${attributeName} is not quoted`)
    }
    index += 1
    const valueStart = index
    while (index < content.length && content[index] !== quote) index += 1
    if (index >= content.length) {
      throw new ConfigurationError(`malformed XML in ${source}: unterminated attribute ${attributeName}`)
    }
    attributes.set(attributeName, decodeXmlEntities(content.slice(valueStart, index), source))
    index += 1
  }
  return { name, attributes, selfClosing }
}

function findMarkupEnd(xml, start, source) {
  let quote = null
  for (let index = start; index < xml.length; index += 1) {
    const character = xml[index]
    if (quote) {
      if (character === quote) quote = null
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return index
    }
  }
  throw new ConfigurationError(`malformed XML in ${source}: unterminated tag`)
}

function extractProjectReferences(projectText, source) {
  const references = new Set()
  const stack = []
  let rootSeen = false
  let cursor = 0

  while (cursor < projectText.length) {
    const opening = projectText.indexOf('<', cursor)
    const textEnd = opening < 0 ? projectText.length : opening
    const textContent = projectText.slice(cursor, textEnd)
    validateXmlText(textContent, source)
    if (stack.length === 0 && textContent.trim() !== '') {
      throw new ConfigurationError(`malformed XML in ${source}: text outside root element`)
    }
    if (opening < 0) break

    if (projectText.startsWith('<!--', opening)) {
      const end = projectText.indexOf('-->', opening + 4)
      const nested = projectText.indexOf('<!--', opening + 4)
      if (end < 0 || (nested >= 0 && nested < end)) {
        throw new ConfigurationError(`malformed XML in ${source}: invalid or unterminated comment`)
      }
      if (projectText.slice(opening + 4, end).includes('--')) {
        throw new ConfigurationError(`malformed XML in ${source}: comment contains --`)
      }
      cursor = end + 3
      continue
    }
    if (projectText.startsWith('<![CDATA[', opening)) {
      const end = projectText.indexOf(']]>', opening + 9)
      if (end < 0) throw new ConfigurationError(`malformed XML in ${source}: unterminated CDATA`)
      cursor = end + 3
      continue
    }
    if (projectText.startsWith('<?', opening)) {
      const end = projectText.indexOf('?>', opening + 2)
      if (end < 0) throw new ConfigurationError(`malformed XML in ${source}: unterminated processing instruction`)
      cursor = end + 2
      continue
    }
    if (projectText.startsWith('<!', opening)) {
      throw new ConfigurationError(`malformed XML in ${source}: unsupported declaration`)
    }

    const end = findMarkupEnd(projectText, opening + 1, source)
    const rawContent = projectText.slice(opening + 1, end).trim()
    if (rawContent.startsWith('/')) {
      const closingName = rawContent.slice(1).trim()
      if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(closingName)) {
        throw new ConfigurationError(`malformed XML in ${source}: invalid closing tag`)
      }
      const expected = stack.pop()
      if (expected !== closingName) {
        throw new ConfigurationError(`malformed XML in ${source}: closing tag ${closingName} does not match ${expected ?? 'none'}`)
      }
    } else {
      const tag = parseXmlStartTag(rawContent, source)
      if (stack.length === 0) {
        if (rootSeen) throw new ConfigurationError(`malformed XML in ${source}: multiple root elements`)
        rootSeen = true
      }
      if (tag.name.split(':').at(-1) === 'ProjectReference' && tag.attributes.has('Include')) {
        references.add(tag.attributes.get('Include'))
      }
      if (!tag.selfClosing) stack.push(tag.name)
    }
    cursor = end + 1
  }

  if (!rootSeen) throw new ConfigurationError(`malformed XML in ${source}: root element missing`)
  if (stack.length > 0) {
    throw new ConfigurationError(`malformed XML in ${source}: unclosed element ${stack.at(-1)}`)
  }
  return [...references].sort(compareText)
}

async function scanBackend(policy, findings) {
  for (const moduleConfig of policy.modules) {
    const projectFiles = []
    const visitedDirectories = new Set()
    for (const scanRoot of moduleConfig.scanRoots) {
      projectFiles.push(...(await walkFiles(
        scanRoot,
        (file) => path.extname(file).toLowerCase() === '.csproj',
        policy.root,
        visitedDirectories,
      )))
    }
    projectFiles.sort(compareText)

    for (const projectFile of projectFiles) {
      const projectText = await readFile(projectFile, 'utf8')
      const source = relativeToRoot(policy.root, projectFile)
      for (const include of extractProjectReferences(projectText, source)) {
        const lexicalTarget = path.resolve(path.dirname(projectFile), toNativeConfiguredPath(include))
        const realTarget = await existingRealPath(lexicalTarget, `ProjectReference ${source} -> ${include}`)
        if (!isWithin(policy.root, realTarget)) {
          throw new ConfigurationError(`ProjectReference resolves outside repository root: ${source} -> ${include}`)
        }
        const targetModule = findOwningModule(policy.modules, realTarget, 'ownershipRoots')
        if (targetModule?.name === moduleConfig.name) continue

        const findingBase = {
          module: moduleConfig.name,
          source,
          include: toPortablePath(include),
          target: relativeToRoot(policy.root, realTarget),
        }
        if (targetModule) {
          findings.backendCrossModuleProjectReferences.push({ ...findingBase, targetModule: targetModule.name })
        } else {
          findings.backendRepoRelativeProjectReferences.push(findingBase)
        }
      }
    }
  }
}

function compareWithBaseline(policy, findings) {
  const regressions = createEmptyCategories()
  const resolvedBaseline = createEmptyCategories()
  const debt = {}
  for (const category of CATEGORIES) {
    const current = sortFindings(category, findings[category])
    const baseline = policy.baseline[category]
    const baselineFingerprints = new Set(baseline.map((finding) => findingFingerprint(category, finding)))
    const currentFingerprints = new Set(current.map((finding) => findingFingerprint(category, finding)))
    regressions[category] = policy.blockingCategories.includes(category)
      ? current
      : current.filter((finding) => !baselineFingerprints.has(findingFingerprint(category, finding)))
    resolvedBaseline[category] = baseline.filter(
      (finding) => !currentFingerprints.has(findingFingerprint(category, finding)),
    )
    findings[category] = current
    debt[category] = {
      blocking: policy.blockingCategories.includes(category),
      baseline: baseline.length,
      current: current.length,
      new: regressions[category].length,
      resolved: resolvedBaseline[category].length,
    }
  }
  return { debt, regressions, resolvedBaseline }
}

function totalFindings(categories) {
  return CATEGORIES.reduce((total, category) => total + categories[category].length, 0)
}

export async function runScan(options = {}) {
  const policy = await loadPolicy(options)
  const findings = createEmptyCategories()
  await scanFrontend(policy, findings)
  await scanBackend(policy, findings)
  const comparison = compareWithBaseline(policy, findings)
  const regressionCount = totalFindings(comparison.regressions)
  return {
    schemaVersion: 2,
    policy: policy.policyDisplayPath,
    parser: `typescript@${getTypescript().version}`,
    modules: policy.modules.map((moduleConfig) => moduleConfig.name).sort(compareText),
    blockingCategories: [...policy.blockingCategories].sort(compareText),
    summary: {
      moduleCount: policy.modules.length,
      findingCount: totalFindings(findings),
      baselineCount: CATEGORIES.reduce((total, category) => total + policy.baseline[category].length, 0),
      regressionCount,
      resolvedBaselineCount: totalFindings(comparison.resolvedBaseline),
      debt: comparison.debt,
    },
    findings,
    regressions: comparison.regressions,
    resolvedBaseline: comparison.resolvedBaseline,
  }
}

function parseArguments(argv) {
  const options = { root: TOOL_ROOT, policyPath: DEFAULT_POLICY, format: 'json', failOnRegression: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--root' || argument === '--policy' || argument === '--format') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new ConfigurationError(`${argument} requires a value`)
      index += 1
      if (argument === '--root') options.root = value
      if (argument === '--policy') options.policyPath = value
      if (argument === '--format') options.format = value
    } else if (argument === '--fail-on-regression') {
      options.failOnRegression = true
    } else {
      throw new ConfigurationError(`unknown argument: ${argument}`)
    }
  }
  if (!['json', 'text'].includes(options.format)) {
    throw new ConfigurationError('--format must be json or text')
  }
  return options
}

function renderText(report) {
  const lines = [
    `ERP module-boundary preflight: ${report.summary.regressionCount === 0 ? 'PASS' : 'REGRESSION'}`,
    `Parser: ${report.parser}`,
    `Modules: ${report.summary.moduleCount}`,
    `Findings: ${report.summary.findingCount} (baseline ${report.summary.baselineCount})`,
  ]
  for (const category of CATEGORIES) {
    const debt = report.summary.debt[category]
    lines.push(
      `${category}: blocking=${debt.blocking}, current=${debt.current}, baseline=${debt.baseline}, new=${debt.new}, resolved=${debt.resolved}`,
    )
  }
  return `${lines.join('\n')}\n`
}

function renderConfigurationError(error) {
  return `${JSON.stringify({
    schemaVersion: 2,
    error: { code: 'CONFIGURATION_ERROR', message: error.message },
  }, null, 2)}\n`
}

export async function main(argv = process.argv.slice(2)) {
  let options
  try {
    options = parseArguments(argv)
    const report = await runScan({ root: options.root, policyPath: options.policyPath })
    process.stdout.write(options.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderText(report))
    return options.failOnRegression && report.summary.regressionCount > 0 ? 2 : 0
  } catch (error) {
    const normalizedError = error instanceof ConfigurationError
      ? error
      : new ConfigurationError(`scan failed: ${error instanceof Error ? error.message : String(error)}`)
    process.stderr.write(renderConfigurationError(normalizedError))
    return 1
  }
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invokedAsScript) process.exitCode = await main()
