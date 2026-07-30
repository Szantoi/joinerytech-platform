#!/usr/bin/env node
/**
 * .NET build-kapu — ratchet a platform-saját teszt-projektekre.
 *
 * KIVÁLTÓ OK (mérve 2026-07-30): a platform-repóban `dotnet test` SEHOL nem fut
 * CI-ből (`grep -rl "dotnet test" .github/` = 0 találat), miközben 27 .NET
 * teszt-projekt létezik. Vagyis minden zöld szám, amit leírunk, csak azért zöld,
 * mert valaki kézzel elindította. Ez ugyanaz a hibaosztály, mint a kézzel írt
 * RLS-tükör, egy szinttel feljebb: a tükör zöld marad, ha az eredeti elromlik —
 * egy suite, amit semmi nem futtat, még ennyit sem mond, nincs is állapota.
 *
 * MIÉRT BUILD-KAPU ÉS NEM TESZT-KAPU (mérve, nem választva):
 * a 15 platform-saját teszt-projektből **14 igényel Dockert** (Testcontainers,
 * közvetlenül vagy tranzitívan a RlsFixtures-ön át). A „Docker-mentes első kör"
 * tehát 15-ből 1-et kapuzna, és a lefedettség látszatát adná. A build-kapu
 * viszont Docker nélkül fut, gyors, és pont azt az osztályt fogja, ami
 * 2026-07-30-án átcsúszott: egy HAMIS „0 warning" állítást.
 *
 * MIÉRT RATCHET ÉS NEM „legyen nulla”:
 * ma 13/15 fordul és 15 warning van. Egy „legyen nulla” kapu az első naptól
 * piros lenne — és egy piros kapu, amit senki nem tud zöldre hozni, egy héten
 * belül ki lesz kapcsolva. Ezért a kapu a ROMLÁST fogja meg. A JAVULÁS
 * (kevesebb warning, hirtelen forduló projekt) SOSEM bukhat.
 *
 * Futtatás:
 *   node scripts/dotnet-build-gate.mjs            # mér és értékel
 *   node scripts/dotnet-build-gate.mjs --selftest # adatbázis/build nélkül bizonyítja, hogy harap
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const here = dirname(fileURLToPath(import.meta.url))
const BASELINE = resolve(here, '../config/dotnet-build-baseline.json')

/**
 * TISZTA KIÉRTÉKELÉS — nincs I/O, ezért build nélkül tesztelhető, és ezért lehet
 * öntesztje. (Ugyanaz a szerkezet, mint a szerep-jogosultság kapunál.)
 *
 * @param {Array<{path:string,builds:boolean,warnings:number}>} measured
 * @param {object} baseline
 * @returns {{ok:boolean, findings:Array<{kind:string,project:string,detail:string}>}}
 */
export function evaluate(measured, baseline) {
  const findings = []
  const expected = new Map(baseline.projects.map((p) => [p.path, p]))
  const seen = new Set()

  for (const m of measured) {
    seen.add(m.path)
    const exp = expected.get(m.path)

    if (!exp) {
      // Egy listán kívüli projekt NEM hallgatható el: pont ez a mód, ahogy egy új
      // modul csendben kimarad a mérésből. A „15 projekt lefut" akkor is igaz
      // lenne, ha közben 16 létezik.
      findings.push({
        kind: 'listan-kivuli-projekt',
        project: m.path,
        detail: 'Nincs a config/dotnet-build-baseline.json-ban. Vedd fel MÉRT alapállapottal — ha kimarad, csendben kiesik a kapu alól.',
      })
      continue
    }

    if (exp.builds && !m.builds) {
      findings.push({
        kind: 'romlas-nem-fordul',
        project: m.path,
        detail: 'Az alapállapot szerint FORDULT, most nem. Ez regresszió.',
      })
    }

    // A warning-szám a ROMLÁS irányában bukik. A csökkenés javulás — sosem bukhat.
    if (m.warnings > exp.maxWarnings) {
      findings.push({
        kind: 'romlas-warning-no',
        project: m.path,
        detail: `warning: ${m.warnings} > alapállapot ${exp.maxWarnings}. ${exp.why ? 'Alapállapot indoka: ' + exp.why : ''}`,
      })
    }
  }

  // Az `eltunt-projekt` szabaly csak a MERT halmazra nezhet: a --ci mod
  // szandekosan kevesebbet mer, es ott a kimaradok nem "eltuntek".
  for (const exp of (baseline._evaluateOnly || baseline.projects)) {
    if (!seen.has(exp.path)) {
      // Egy eltűnt projekt lehet átnevezés is — és egy átnevezett projekt mellett
      // a régi nevű baseline-sor csendben semmit nem őriz.
      findings.push({
        kind: 'eltunt-projekt',
        project: exp.path,
        detail: 'A baseline szerint létezik, de a mérés nem találta. Átnevezés? Akkor a baseline-sor erre a névre csendben semmit nem őriz.',
      })
    }
  }

  return { ok: findings.length === 0, findings }
}

/** A `dotnet build` kimenetéből a warning-szám. `null`, ha nem olvasható ki. */
export function parseWarnings(output) {
  const m = /(\d+)\s+Warning\(s\)/.exec(output)
  return m ? Number(m[1]) : null
}

function measureProject(path) {
  let output = ''
  let builds = false
  try {
    output = execFileSync('dotnet', ['build', path, '--nologo', '-v', 'q'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    builds = true
  } catch (err) {
    output = String(err.stdout || '') + String(err.stderr || '')
    builds = false
  }
  const w = parseWarnings(output)
  return { path, builds, warnings: w ?? 0, warningsReadable: w !== null }
}

function selfTest(baseline) {
  const st = baseline._selftest
  if (!st) throw new Error('A baseline-ban nincs `_selftest` korpusz — a kapu nem bizonyítható.')
  let failures = 0

  for (const c of st.mustFail) {
    const v = evaluate([{ path: c.path, builds: c.builds, warnings: c.warnings }], baseline)
    // Csak a VIZSGÁLT projektre szóló leletet fogadjuk el bizonyítéknak: egyetlen
    // elemet adunk át, tehát a többi baseline-projekt definíció szerint „eltűnt”,
    // és azok találatai nem erről az esetről szólnak. Enélkül a kapu öntesztje
    // hamis zöldet adna a saját mutációjára — ez a hiba 2026-07-30-án egyszer
    // már megtörtént a szerep-kapunál.
    const own = v.findings.filter((f) => f.project === c.path)
    if (own.length === 0) {
      console.log(`  [FAIL] ATENGEDTE, pedig bukni kellett volna: ${c.case}`)
      failures++
    } else {
      console.log(`  [PASS] harap: ${c.case} -> ${own.map((f) => f.kind).join(',')}`)
    }
  }

  for (const c of st.mustPass) {
    const v = evaluate([{ path: c.path, builds: c.builds, warnings: c.warnings }], baseline)
    const own = v.findings.filter((f) => f.project === c.path)
    if (own.length > 0) {
      console.log(`  [FAIL] VAKLARMA: ${c.case} -> ${own.map((f) => f.kind).join(',')}`)
      failures++
    } else {
      console.log(`  [PASS] nem vaklarma: ${c.case}`)
    }
  }

  return failures
}

// ---------------------------------------------------------------------------

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))

if (process.argv.includes('--selftest')) {
  console.log('.NET build-kapu — ONTESZT (build nelkul)')
  const f = selfTest(baseline)
  if (f > 0) {
    console.log(`\nONTESZT BUKOTT: ${f} eset. A kapu NEM hasznalhato, amig ez piros.`)
    process.exit(1)
  }
  console.log('\nONTESZT: minden PASS — a kapu harap es nem vaklarma.')
  process.exit(0)
}

// A `--ci` mod SZANDEKOSAN kisebb: 9/15 projekt tranzitivan submodule-ban elo
// projektre hivatkozik (8 a privat `spaceos-kernel`-re), amihez a CI-nek PAT
// kellene -- az Gabor-dontes. Egy kapu, ami 6-ot mer es 15-nek latszik, rosszabb
// a kapu nelkuli allapotnal, ezert a kimenet KIMONDJA, mennyit hagyott ki.
const ciMode = process.argv.includes('--ci')
const selected = ciMode ? baseline.projects.filter((p) => p.ciRunnable) : baseline.projects
const skipped = baseline.projects.filter((p) => !selected.includes(p))

console.log(`.NET build-kapu — ${selected.length}/${baseline.projects.length} platform-sajat teszt-projekt${ciMode ? '  (--ci mod)' : ''}`)
console.log('⚠ A submodule-ok (kernel · cutting · inventory · procurement · joinery · contracts ·')
console.log('  nesting) NEM reszei ennek a futasnak: kulon repo, sajat CI. Ez NEM "minden projekt".')
if (skipped.length) {
  console.log('')
  console.log(`⚠ ${skipped.length} PROJEKT KIMARAD ebbol a futasbol — nevesitve, mert a kimaradas`)
  console.log('  elhallgatasa ugyanaz a hamis zold, amit ez a kapu zarni akar:')
  for (const p of skipped) console.log(`    ${p.path}\n      ${p.ciWhy || '(indok nincs megadva — ez maga is lelet)'}`)
}
console.log('')

const measured = []
for (const p of selected) {
  const r = measureProject(p.path)
  measured.push(r)
  const flag = r.builds ? 'OK    ' : 'BUKOTT'
  const wtxt = r.warningsReadable ? String(r.warnings) : '?'
  console.log(`  ${flag}  w=${wtxt.padEnd(3)}  ${p.path}`)
}

const unreadable = measured.filter((m) => !m.warningsReadable)
if (unreadable.length) {
  // Egy kiolvashatatlan warning-szam nem "0": az a MERES hibaja, es zoldnek
  // latszana. Kimondjuk.
  console.log('')
  console.log(`⚠ ${unreadable.length} projektnel a warning-szam NEM volt kiolvashato — ezt NEM vesszuk 0-nak:`)
  for (const m of unreadable) console.log(`    ${m.path}`)
}

// A kiertekeles csak a most MERT projektekre nezze az \eltunt\ szabalyt.
const verdict = evaluate(measured, { ...baseline, _evaluateOnly: selected })

console.log('')
if (verdict.ok && unreadable.length === 0) {
  console.log('TISZTA: nincs romlas az alapallapothoz kepest.')
  process.exit(0)
}

for (const f of verdict.findings) {
  console.log(`  [${f.kind}] ${f.project}`)
  console.log(`      ${f.detail}`)
}
console.log('')
console.log('A javitas NEM az, hogy a baseline-t igazitjuk a valosaghoz — eloszor el kell donteni, hogy a valosag jo-e.')
process.exit(1)
