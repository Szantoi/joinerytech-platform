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
  // ── A zaj-hangolás ŐREI (2026-07-30) ────────────────────────────────────
  // A kivétel „a hívás nem literál" — ezek bizonyítják, hogy nem lett tág.
  //
  // A JWT PONTOT tartalmaz, tehát alakra megtévesztésig hasonlít egy
  // `objektum.metódus` hivatkozásra. Ha a kivételt a pontra írnám (és nem a
  // zárójelre), a kapu pont a JWT-kre vakulna meg.
  ['const token = eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.AbCdEf0123456789',
    'JWT literál (pontokkal!) — a kivétel NEM szólhat a pontra'],
  // A kivétel legkézenfekvőbb megkerülése: hívás UTÁN beégetett alapérték.
  // Enélkül a „hívást nem nézünk" szabály egy nyitott hátsó ajtó lenne.
  ["const token = fetchToken() || 'AbCdEf0123456789AbCd'",
    'hívás + beégetett fallback — a kivétel NEM nyelheti el'],
  ['const apiKey = loadKey() ?? "AbCdEf0123456789AbCd"',
    'hívás + beégetett fallback (??)'],
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
  // ── Zaj-hangolás: a MÉRT fals pozitívok (2026-07-30) ────────────────────
  // Mind a hét alak az `origin/main` 72 találatából való, összesen 21 sor.
  // A közös nevező: az értékadás jobb oldala HÍVÁS, nem literál. A `.substring`
  // /`.slice` család egymaga 18 sor — a 72-ből 25% zaj, és a kapu saját
  // kikötése szerint egy hangos kapu egy héten belül ki lesz kapcsolva.
  ['const token = authHeader.substring(7);', 'Bearer-levágás (15 sor ugyanígy)'],
  ['const token = authHeader.slice(7); // Remove "Bearer "', 'Bearer-levágás slice-szal'],
  ["const token = localStorage.getItem('accessToken');", 'olvasás localStorage-ból'],
  ['const token = generateTerminalToken(terminal);', 'pont NÉLKÜLI hívás'],
  ['var token = tokenHandler.CreateToken(tokenDescriptor);', 'C# metódushívás'],
  // Testvér-alakok: a mért hetes lista mellé grep-elt minta, hogy a kivétel a
  // családra szóljon, ne a konkrét sorokra.
  ["const apiKey = req.headers.get('x-api-key');", 'testvér: header-olvasás'],
  ['const password = await bcrypt.compare(input, stored);', 'testvér: await-es hívás'],
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
