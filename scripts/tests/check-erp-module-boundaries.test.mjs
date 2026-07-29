import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = fileURLToPath(new URL('../check-erp-module-boundaries.mjs', import.meta.url))
const CATEGORY_NAMES = [
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
]
const BLOCKING_CATEGORIES = [
  'missingFrontendEntrypoints',
  'frontendParseErrors',
  'frontendNonLiteralDynamicImports',
  'frontendNonLiteralGlobImports',
  'frontendUnsafeLiteralGlobImports',
]

function emptyBaseline() {
  return Object.fromEntries(CATEGORY_NAMES.map((category) => [category, []]))
}

function configuredPath(value, separator) {
  return value.replaceAll('/', separator)
}

async function put(root, relativePath, content = '') {
  const filePath = path.join(root, ...relativePath.split('/'))
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
}

async function createFixture(separator = '/') {
  const root = await mkdtemp(path.join(tmpdir(), 'erp-boundary-'))
  await put(root, 'portal/modules/a/index.ts', "export { value } from './feature'\n")
  await put(root, 'portal/modules/a/feature.ts', 'export const value = 1\n')
  await put(root, 'portal/modules/b/index.ts', "export { other } from './private'\n")
  await put(root, 'portal/modules/b/private.ts', 'export const other = 2\n')
  await put(root, 'portal/shared/tool.ts', 'export const shared = true\n')
  await put(root, 'portal/legacy/mock.ts', 'export const mock = true\n')
  await put(root, 'portal/industry/private.ts', 'export const industry = true\n')
  await put(root, 'backend/a/src/A.csproj', '<Project Sdk="Microsoft.NET.Sdk" />\n')
  await put(root, 'backend/b/src/B.csproj', '<Project Sdk="Microsoft.NET.Sdk" />\n')
  await put(root, 'shared/Shared.csproj', '<Project Sdk="Microsoft.NET.Sdk" />\n')

  const policy = {
    schemaVersion: 2,
    modules: [
      {
        name: 'a',
        frontendRoot: configuredPath('portal/modules/a', separator),
        backendOwnershipRoots: [configuredPath('backend/a', separator)],
        backendScanRoots: [configuredPath('backend/a/src', separator)],
      },
      {
        name: 'b',
        frontendRoot: configuredPath('portal/modules/b', separator),
        backendOwnershipRoots: [configuredPath('backend/b', separator)],
        backendScanRoots: [configuredPath('backend/b/src', separator)],
      },
    ],
    frontend: {
      entrypoint: 'index.ts',
      sourceExtensions: ['.ts', '.tsx'],
      sharedRoots: [configuredPath('portal/shared/tool.ts', separator)],
      legacyShellRoots: [configuredPath('portal/legacy', separator)],
    },
    blockingCategories: [...BLOCKING_CATEGORIES],
    baseline: emptyBaseline(),
  }
  await put(root, 'policy.json', `${JSON.stringify(policy, null, 2)}\n`)
  return { root, policy }
}

function run(root, ...extraArguments) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--root', root, '--policy', 'policy.json', '--format', 'json', ...extraArguments],
    { encoding: 'utf8' },
  )
}

async function rewritePolicy(root, policy) {
  await put(root, 'policy.json', `${JSON.stringify(policy, null, 2)}\n`)
}

for (const separator of ['/', '\\']) {
  test(`clean fixture accepts ${separator === '/' ? 'POSIX' : 'Windows'} configured paths deterministically`, async () => {
    const fixture = await createFixture(separator)
    try {
      const first = run(fixture.root, '--fail-on-regression')
      const second = run(fixture.root, '--fail-on-regression')
      assert.equal(first.status, 0, first.stderr)
      assert.equal(second.status, 0, second.stderr)
      assert.equal(first.stdout, second.stdout)
      const report = JSON.parse(first.stdout)
      assert.equal(report.schemaVersion, 2)
      assert.match(report.parser, /^typescript@/)
      assert.equal(report.summary.regressionCount, 0)
      assert.equal(report.summary.findingCount, 0)
      assert.deepEqual(report.modules, ['a', 'b'])
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
    }
  })
}

test('exact reviewed debts are baseline, not regressions', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "export { other } from '../b/private'\nexport { mock } from '../../legacy/mock'\n",
    )
    await put(
      fixture.root,
      'backend/a/src/A.csproj',
      '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup>'
        + '<ProjectReference Include="../../b/src/B.csproj" />'
        + '<ProjectReference Include="../../../shared/Shared.csproj" />'
        + '</ItemGroup></Project>\n',
    )

    const discovery = run(fixture.root)
    assert.equal(discovery.status, 0, discovery.stderr)
    const discoveredReport = JSON.parse(discovery.stdout)
    assert.equal(discoveredReport.summary.regressionCount, 4)
    fixture.policy.baseline = discoveredReport.findings
    await rewritePolicy(fixture.root, fixture.policy)

    const baselined = run(fixture.root, '--fail-on-regression')
    assert.equal(baselined.status, 0, baselined.stderr)
    const report = JSON.parse(baselined.stdout)
    assert.equal(report.summary.findingCount, 4)
    assert.equal(report.summary.baselineCount, 4)
    assert.equal(report.summary.regressionCount, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('every external relative target is debt unless an exact shared root allows it', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "import { shared } from '../../shared/tool'\nimport { industry } from '../../industry/private'\nexport { shared, industry }\n",
    )
    const result = run(fixture.root)
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.findings.frontendExternalRelativeImports.length, 1)
    assert.equal(report.findings.frontendExternalRelativeImports[0].target, 'portal/industry/private')
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('file shared root allows extensionless resolution only to the exact real file', async () => {
  const fixture = await createFixture()
  try {
    await put(fixture.root, 'portal/shared/tool.js', 'export const javascriptTool = true\n')
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "import { shared } from '../../shared/tool'\n"
        + "import { javascriptTool } from '../../shared/tool.js'\n"
        + 'export { shared, javascriptTool }\n',
    )
    const result = run(fixture.root)
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.findings.frontendExternalRelativeImports.length, 1)
    assert.equal(report.findings.frontendExternalRelativeImports[0].target, 'portal/shared/tool.js')
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('literal import.meta.glob and literal dynamic import create dependency edges', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "export const pages = import.meta.glob(['../b/*.ts', './*.ts'])\nexport const lazy = import('../b/private')\n",
    )
    const result = run(fixture.root)
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.findings.frontendCrossModuleImports.length, 2)
    assert.deepEqual(
      report.findings.frontendCrossModuleImports.map((finding) => finding.syntax).sort(),
      ['dynamic-import', 'import-meta-glob'],
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('computed dynamic import and glob are mandatory blocking findings', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "const target = '../b/private'\nconst pattern = '../b/*.ts'\nexport const lazy = import(target)\nexport const pages = import.meta.glob(pattern)\n",
    )
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 2, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.findings.frontendNonLiteralDynamicImports.length, 1)
    assert.equal(report.findings.frontendNonLiteralGlobImports.length, 1)
    assert.equal(report.summary.regressionCount, 2)
    assert.equal(report.summary.debt.frontendNonLiteralDynamicImports.blocking, true)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('glob magic in a directory segment is conservatively blocking', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "export const traversal = import.meta.glob('./**/../../b/*.ts')\n"
        + "export const alternatives = import.meta.glob('./{safe,../b}/*.ts')\n",
    )
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 2, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.findings.frontendUnsafeLiteralGlobImports.length, 2)
    assert.equal(report.summary.debt.frontendUnsafeLiteralGlobImports.blocking, true)
    assert.deepEqual(
      report.findings.frontendUnsafeLiteralGlobImports.map((finding) => finding.specifier).sort(),
      ['./**/../../b/*.ts', './{safe,../b}/*.ts'].sort(),
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('TypeScript parser ignores import-like text in comments, strings, templates and regex literals', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'portal/modules/a/feature.ts',
      "// import('../b/private')\n/* export { other } from '../b/private' */\n"
        + "const text = \"import.meta.glob('../b/*.ts')\"\n"
        + "const template = `import('../b/private')`\n"
        + "const expression = /import\\(['\"]..\\/b\\/private['\"]\\)/\n"
        + 'export { text, template, expression }\n',
    )
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.summary.findingCount, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('--fail-on-regression returns exit code 2 for a new dependency edge', async () => {
  const fixture = await createFixture()
  try {
    await put(fixture.root, 'portal/modules/a/feature.ts', "export { other } from '../b/private'\n")
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 2, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.summary.regressionCount, 1)
    assert.equal(report.regressions.frontendCrossModuleImports.length, 1)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('invalid policy fails closed with deterministic machine-readable error', async () => {
  const fixture = await createFixture()
  try {
    await put(fixture.root, 'policy.json', '{ invalid json')
    const first = run(fixture.root, '--fail-on-regression')
    const second = run(fixture.root, '--fail-on-regression')
    assert.equal(first.status, 1)
    assert.equal(first.stdout, '')
    assert.equal(first.stderr, second.stderr)
    assert.deepEqual(JSON.parse(first.stderr), {
      schemaVersion: 2,
      error: { code: 'CONFIGURATION_ERROR', message: 'policy is not valid JSON' },
    })
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('ProjectReference text inside XML comments is ignored', async () => {
  const fixture = await createFixture()
  try {
    await put(
      fixture.root,
      'backend/a/src/A.csproj',
      '<Project Sdk="Microsoft.NET.Sdk">\n'
        + '  <!-- <ProjectReference Include="../../../shared/Shared.csproj" /> -->\n'
        + '  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>\n'
        + '</Project>\n',
    )
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.findings.backendRepoRelativeProjectReferences.length, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('malformed project XML fails closed', async () => {
  const fixture = await createFixture()
  try {
    await put(fixture.root, 'backend/a/src/A.csproj', '<Project><ItemGroup></Project>\n')
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 1)
    assert.match(JSON.parse(result.stderr).error.message, /malformed XML/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('nested scan roots fail closed instead of double-scanning', async () => {
  const fixture = await createFixture()
  try {
    fixture.policy.modules[0].backendScanRoots = ['backend/a', 'backend/a/src']
    await rewritePolicy(fixture.root, fixture.policy)
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 1)
    assert.match(JSON.parse(result.stderr).error.message, /backend scan roots for a overlap/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a scan root outside its module ownership fails closed', async () => {
  const fixture = await createFixture()
  try {
    fixture.policy.modules[0].backendScanRoots = ['backend/b/src']
    await rewritePolicy(fixture.root, fixture.policy)
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 1)
    assert.match(JSON.parse(result.stderr).error.message, /outside its ownership roots/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('symlink or junction escape from a scan tree fails closed', async () => {
  const fixture = await createFixture()
  const outside = await mkdtemp(path.join(tmpdir(), 'erp-boundary-outside-'))
  try {
    await put(outside, 'escaped.ts', 'export const escaped = true\n')
    const linkPath = path.join(fixture.root, 'portal', 'modules', 'a', 'escape')
    await symlink(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir')
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 1)
    assert.match(JSON.parse(result.stderr).error.message, /symlink escapes repository root/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('policy symlink or junction outside the repository root fails closed', async () => {
  const fixture = await createFixture()
  const outside = await mkdtemp(path.join(tmpdir(), 'erp-boundary-policy-outside-'))
  try {
    await put(outside, 'policy.json', `${JSON.stringify(fixture.policy, null, 2)}\n`)
    const linkPath = path.join(fixture.root, 'policy-link')
    await symlink(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir')
    const result = run(fixture.root, '--policy', 'policy-link/policy.json', '--fail-on-regression')
    assert.equal(result.status, 1)
    assert.match(JSON.parse(result.stderr).error.message, /policy path resolves outside the repository root/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('configured scan-root symlink or junction outside the repository fails closed', async () => {
  const fixture = await createFixture()
  const outside = await mkdtemp(path.join(tmpdir(), 'erp-boundary-scan-outside-'))
  try {
    await put(outside, 'A.csproj', '<Project Sdk="Microsoft.NET.Sdk" />\n')
    const linkPath = path.join(fixture.root, 'backend', 'a', 'linked-scan')
    await symlink(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir')
    fixture.policy.modules[0].backendScanRoots = ['backend/a/linked-scan']
    await rewritePolicy(fixture.root, fixture.policy)
    const result = run(fixture.root, '--fail-on-regression')
    assert.equal(result.status, 1)
    assert.match(JSON.parse(result.stderr).error.message, /backendScanRoots\[0\] resolves outside the repository root/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})
