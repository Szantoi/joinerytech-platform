#!/usr/bin/env node
/**
 * A szivárgás-kapu önellenőrzése — pozitív ÉS negatív kontroll.
 *
 * Miért kell: egy kapu, ami nem tud pirosra váltani, ugyanaz a hamis zöld, amit
 * ma többször is találtunk. És egy kapu, ami a `${{ secrets.X }}`-et megfogja,
 * egy héten belül ki lesz kapcsolva — akkor rosszabbul állunk, mint kapu nélkül
 * (doc-capture kikötése).
 *
 * A NEGATÍV korpusz fix: a frontend 6 téves találata a 2026-07-29-i
 * önellenőrzésből + a doc-capture kikötései. Ezeknek zöldnek KELL lenniük.
 * A pozitív korpusz a valódi szivárgás ALAKJA, valódi érték nélkül.
 */
import { violationOf } from './secret-scan.mjs'

const POSITIVE = [
  ['master_token: "AbCdEf0123456789AbCdEf0123456789AbCd="', 'yaml master token literállal'],
  // A VALÓDI alak idézőjeles értékkel — az első korpuszom csupasz értéket
  // használt, ezért az önteszt zöld maradt, miközben a kapu a tényleges
  // agents.yaml sorait NEM fogta meg. A pozitív korpuszt a valódi szerkezetről
  // kell mintázni, nem arról, amit elképzelünk róla.
  ['  "AbCdEf0123456789AbCdEf01": "conductor"', 'agent-token kulcsként, idézőjeles értékkel'],
  ['  "AbCdEf0123456789AbCdEf01": architect', 'agent-token kulcsként, csupasz értékkel'],
  ['const TOKEN = "AbCdEf0123456789AbCdEf01"', 'JS konstans literállal'],
  ['Authorization: Bearer AbCdEf0123456789AbCdEf01', 'Bearer literál'],
  // A legveszélyesebb alak: szabályos env-olvasásnak látszik, de a DEFAULT a
  // titok. Az első kapum ezt NEM fogta meg — sőt, a negatív kontroll (a
  // `process.env.` minta) aktívan el is nyomta. Három ágens három száma közül
  // ez volt az eltérés oka.
  ["const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || 'AbCdEf0123456789'", 'beégetett fallback (||)'],
  ['const t = process.env.API_KEY ?? "AbCdEf0123456789AbCd"', 'beégetett fallback (??)'],
  ['ssh gabor@109.122.222.198', 'VPS IP'],
  ['tailnet: 100.82.133.87', 'tailnet cím'],
]

const NEGATIVE = [
  ['NODE_AUTH_TOKEN: ${{ secrets.SPACEOS_PACKAGES_TOKEN }}', 'CI-titok hivatkozás'],
  ['//npm.pkg.github.com/:_authToken=${SPACEOS_PACKAGES_TOKEN}', '.npmrc változó'],
  ['const t = process.env.MCP_AUTH_TOKEN', 'process.env'],
  ['credential_env: MCP_AUTH_TOKEN', 'credential_env'],
  ['#   MCP_AUTH_TOKEN=xxx       -> master token', 'doksi-helykitöltő'],
  ['SpaceOS portál UI-primitívek, design-system tokenekkel.', 'a „token" szó prózában'],
  ['Authorization: Bearer <YOUR_TOKEN>', 'placeholder'],
  ['token: import.meta.env.VITE_TOKEN', 'vite env'],
]

let failed = 0
console.log('POZITÍV korpusz (mindnek BUKNIA kell):')
for (const [line, why] of POSITIVE) {
  const rule = violationOf(line)
  const ok = rule !== null
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${why}${ok ? ` → ${rule}` : ' → NEM fogta meg'}`)
  if (!ok) failed++
}

console.log('\nNEGATÍV korpusz (egyiknek SEM szabad buknia):')
for (const [line, why] of NEGATIVE) {
  const rule = violationOf(line)
  const ok = rule === null
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${why}${ok ? '' : ` → tévesen bukott: ${rule}`}`)
  if (!ok) failed++
}

console.log(failed ? `\n${failed} BUKOTT — a kapu nem megbízható` : '\nMinden PASS')
process.exit(failed ? 1 : 0)
