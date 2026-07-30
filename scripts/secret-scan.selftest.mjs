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
  // ── A LEFEDETTSÉG két vak pontja (root-kiosztás, 2026-07-30) ────────────
  // A root mérte ki a hangolt kapun: (1) a JSON-idézőjeles kulcs záró `"`-je
  // beékelődik a kulcs és a `:` közé; (2) a `\b` elbukik a `_`-on, tehát a
  // PREFIXELT kulcsnév (GITHUB_TOKEN, BRAVE_API_KEY) sosem illeszkedik.
  // Ez a legelterjedtebb env-elnevezés és minden JSON-konfig — két valódi
  // Brave-kulcs volt kint emiatt, amit HÁROM leltár hagyott ki.
  // Az alakok a VALÓDI szerkezetről mintázva (rotáció előtti .mcp.json,
  // appsettings.json, CI-YAML, .env), nem elképzelt formákról.
  ['      "BRAVE_API_KEY": "BSAAbCdEf0123456789AbCdEf01234"',
    '.mcp.json env-blokk: prefixelt kulcs + literál (a Brave-kulcs alakja)'],
  ['GITHUB_TOKEN=ghp_AbCdEf0123456789AbCdEf0123456789AbCd',
    '.env alak: prefixelt env-név + literál'],
  ['  "ApiKey": "AbCdEf0123456789AbCdEf01"',
    'appsettings.json: camelCase kulcs idézőjelben'],
  ['      GITHUB_TOKEN: ghp_AbCdEf0123456789AbCdEf0123456789AbCd',
    'CI-YAML env-mapping: prefixelt kulcs + literál'],
  ['  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI4K7MDENG2bPxRfiCY0"',
    'közbenső kulcsszó (SECRET a név belsejében)'],
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
  // ── A vak-pont-javítás NAIV alakjának ismert áldozatai ──────────────────
  // A doccapture mérte a platform követett fáján: a naiv prefixelt szabály
  // 37 hamis pozitívot ad (30 egyedi érték), és köztük van PONT A HELYES,
  // token-mentes referencia-fájl (`agents.example.yaml`). Ezek a sorok a
  // valódi fáról származnak — a szabály SOSEM foghatja meg őket.
  ['credential_env: MCP_TOKEN_CONDUCTOR',
    'a LEGITIM minta: env-VÁLTOZÓNÉV értékként (nincs számjegye)'],
  ['credential_source: "environment-or-service-manager"',
    'konfig-kulcsszó szöveges értékkel (nincs számjegye)'],
  ['public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>',
    'C# osztálynév TOKEN-nel a belsejében'],
  ['  "BRAVE_API_KEY": "${BRAVE_API_KEY}"',
    'a rotáció UTÁNI helyes alak: env-referencia a .mcp.json-ban'],
  ['      AUTH_TOKEN: ${{ secrets.MCP_AUTH_TOKEN }}',
    'CI-YAML: secrets-referencia prefixelt kulcson'],
  ['SPACEOS_PACKAGES_TOKEN=xxx', 'doksi-helykitöltő prefixelt néven'],
  ['  "AUTH_TOKEN_TIMEOUT_MS": "1800000"',
    'számjegyes, de RÖVID konfig-érték (nem éri el a 16-ot)'],
  ['cache_key: node-modules-v2-lock-2026-07-30',
    'CI cache-kulcs: számjegyes érték, de a kulcsnév önmagában álló "key" — nem titok-gyanús összetétel'],
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
