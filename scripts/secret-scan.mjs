#!/usr/bin/env node
/**
 * Szivárgás-kapu — titkok a PUBLIKÁLT állapotban.
 *
 * Kiváltó ok: 2026-07-29, élő MCP-tokenek a publikus repóban (doc-capture
 * eszkaláció). A rendszer jól volt tervezve (env-alapú futásidő), csak a régi
 * fájlokat és a doksi példáit nem törölte le senki — „két igazság ugyanarról",
 * és az elavult igazság szivárgott.
 *
 * ⚠ MIÉRT A REF-ET MÉRI ÉS NEM A MUNKAFÁT (a doc-capture döntő mérése):
 * a helyi fa 39 committel előrébb járt, és részben már javítva volt —
 * commitolatlanul. Ugyanarra a tokenre: `origin/main` 6 fájl, munkafa 4.
 * Egy munkafa fölött futó kapu ZÖLDET adott volna, miközben a token kint van.
 * A kapu maga lett volna a következő hamis zöld.
 *
 * ⚠ MIÉRT NEM ÍRJA KI SOSEM AZ ÉRTÉKET: a szelet közben egy „majd maszkolom"
 * regex elhasalt egy `=`/`+` karaktert tartalmazó tokenen, és kiírta a titkot.
 * Ezért itt a kimenet fájl:sor + szabálynév, érték NÉLKÜL. Aki javítja, nyissa
 * meg a fájlt — a kapu nem terjeszti tovább.
 *
 * Futtatás:
 *   node scripts/secret-scan.mjs                 # origin/main
 *   node scripts/secret-scan.mjs <ref>           # tetszőleges ref (pl. HEAD)
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const ref = process.argv[2] ?? 'origin/main'

/**
 * SZABÁLYOK.
 *
 * Mindegyik LITERÁL értékre szól. A változó-hivatkozás soha nem bukhat — egy
 * kapu, ami a `${{ secrets.X }}`-et megfogja, egy héten belül ki lesz kapcsolva,
 * és akkor rosszabbul állunk, mint kapu nélkül (doc-capture kikötése).
 */
export const RULES = [
  {
    name: 'token-kulcs literál értékkel',
    // `master_token: "…"`, `token = '…'`, `apiKey: …` — legalább 16 karakter.
    //
    // ZAJ-HANGOLÁS (2026-07-30, @root kérése): az `origin/main` 72 találatából
    // **21 fals pozitív** volt, mind ugyanabban az osztályban — az értékadás
    // jobb oldala HÍVÁS, nem literál (`const token = authHeader.substring(7)`
    // egymaga 18 sor). Ez 25% zaj, a kapu saját kikötése szerint pedig egy
    // hangos kapu egy héten belül ki lesz kapcsolva.
    //
    // A kivétel a ZÁRÓJELRE szól, NEM a pontra. Egy JWT pontokat tartalmaz
    // (`eyJ….eyJ….sig`), tehát alakra megtévesztésig hasonlít egy
    // `objektum.metódus` hivatkozásra — a pontra írt kivétel pont a JWT-kre
    // vakította volna meg a kaput. Zárójel viszont a titkok ábécéjében
    // elvileg sem fordul elő.
    //
    // A `(?![A-Za-z0-9+/=_.\-])` a maximális falást kényszeríti ki: nélküle a
    // motor visszalépne egy rövidebb futamra, amit már nem követ zárójel, és a
    // kivétel hatástalan lenne.
    //
    // ⚠ A kivétel a SZABÁLYON belül van, NEM a negatív kontrollban. A
    // `SAFE_PATTERNS` az egész SORT mentesíti — ott ugyanaz a hiba jött volna
    // vissza, ami tegnap a `process.env.`-vel: egy hívás a sorban elnyomta
    // volna a mellette álló valódi titkot is. Ld. az `ALWAYS_UNSAFE` alatti
    // „hívás + beégetett alapérték" szabályt, ami épp ezt az utat zárja.
    pattern: new RegExp(
      String.raw`\b(master_token|auth_?token|api_?key|secret|password|passwd|token)\b\s*[:=]\s*` +
      String.raw`(?:"[A-Za-z0-9+/=_.\-]{16,}"` +          // idézőjeles literál
      String.raw`|'[A-Za-z0-9+/=_.\-]{16,}'` +
      String.raw`|[A-Za-z0-9+/=_.\-]{16,}(?![A-Za-z0-9+/=_.\-])(?!\s*\())`, // csupasz, de nem hívás
      'i',
    ),
  },
  {
    // A LEFEDETTSÉG két vak pontja (root-kiosztás, 2026-07-30): az előző
    // szabály `\b`-je elbukik a `_`-on, és a JSON-kulcs záró `"`-je beékelődik
    // a kulcsnév és a `:` közé — tehát a PREFIXELT kulcsnév (`GITHUB_TOKEN`,
    // `"BRAVE_API_KEY"`) SOSEM illeszkedett. Ez a legelterjedtebb
    // env-elnevezés és minden JSON-konfig; két valódi Brave-kulcs volt kint
    // emiatt, amit három kézi leltár hagyott ki.
    //
    // ⚠ A NAIV javítás túlkorrigál — a doccapture mérte a platform követett
    // fáján: 37 hamis pozitív (köztük a `credential_env: MCP_TOKEN_CONDUCTOR`,
    // vagyis PONT a helyes, token-mentes referencia-fájl bukott volna). Ezért
    // két érték-őr:
    //   1. SZÁMJEGY kötelező az értékben (base64/API-kulcs gyakorlatilag
    //      mindig tartalmaz; az `MCP_TOKEN_CONDUCTOR`, az
    //      `environment-or-service-manager` és az `IEntityTypeConfiguration`
    //      nem — mindhárom valódi, mért fals pozitív volt);
    //   2. env-VÁLTOZÓNÉV kizárva: csupa-nagybetű + `_` (pl. az 1. őrön
    //      átcsúszó `MCP_TOKEN_V2` alak). Ez az ellenőrzés KÖTELEZŐEN
    //      case-sensitive — egy `/i`-s regexben a [A-Z] a `ghp_…`-t is
    //      "env-névnek" látná, és pont a GitHub-tokenre vakulna vissza.
    //      Ezért ez a szabály függvény, nem regex.
    // A hívás-kivétel (zárójel az érték után) a zaj-hangolás örököse.
    // A `token` után az `iz|is` kizárva: a `tokenizer/tokenize` konfig-nevek
    // nem titok-kulcsok.
    name: 'prefixelt titok-kulcs literál értékkel (JSON/env/YAML)',
    pattern: {
      test(line) {
        const m = line.match(
          /["']?[A-Za-z0-9_]*(?:token(?!i[zs])|api_?key|secret|passw(?:or)?d)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?([A-Za-z0-9+/=_.\-]{16,})["']?/i,
        )
        if (!m) return false
        const value = m[1]
        if (!/[0-9]/.test(value)) return false                    // 1. őr
        if (/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(value)) return false // 2. őr (case-sensitive!)
        const rest = line.slice(m.index + m[0].length)
        if (rest.startsWith('(')) return false                     // hívás-kivétel
        return true
      },
    },
  },
  {
    // A `config/agents.yaml` alakja: a TOKEN a kulcs, az agent neve az érték.
    // Az önteszt hozta ki, hogy az érték-oldali szabályok ezt nem fogják meg —
    // vagyis a kapu pont a legfontosabb fájlt hagyta volna ki.
    name: 'titok kulcsként (token → név leképezés)',
    // A kulcs hosszú base64-szerű string, az ÉRTÉK egy RÖVID, egyszerű név
    // (idézőjellel vagy anélkül): `"<token>": "conductor"`.
    //
    // Két hibán át jutottam ide, és mindkettő tanulságos:
    // 1. érték-vizsgálat nélkül 366 találat jött, ebből 290 a `package-lock.json`
    //    integritás-hash-e — egy ilyen hangos kapu egy héten belül kikapcsolna;
    // 2. amikor az idézőjeles értékeket kizártam, kilőttem a VALÓDI jelet is
    //    (az agents.yaml értékei idézőjelesek). A megkülönböztetés nem az
    //    idézőjel, hanem hogy az érték RÖVID NÉV-e, nem objektum/tömb.
    // A kulcsnak SZÁMJEGYET is kell tartalmaznia, és az érték nem lehet
    // logikai/null: enélkül a hosszú camelCase konfig-kulcsok is bukták
    // (`"noFallthroughCasesInSwitch": true` — mérve a portál repóján).
    // Base64-token gyakorlatilag mindig tartalmaz számjegyet, egy szavakból
    // álló konfig-kulcs jellemzően nem.
    pattern: /^\s*["'](?=[A-Za-z0-9+/=_.\-]*[0-9])[A-Za-z0-9+/=_.\-]{20,}["']\s*:\s*["']?(?!true|false|null|undefined\b)[A-Za-z_][A-Za-z0-9_.\-]{0,39}["']?\s*(#.*)?$/,
  },
  {
    name: 'VPS/tailnet cím',
    pattern: /\b(109\.122\.222\.198|100\.82\.133\.87)\b/,
  },
  {
    name: 'Bearer literál',
    pattern: /\bBearer\s+[A-Za-z0-9+/=_.\-]{16,}/,
  },
]

/**
 * NEGATÍV KONTROLL — ezek SOSEM bukhatnak.
 *
 * Fix korpusz: a frontend saját 6 téves találata a mai önellenőrzésből, plusz a
 * doc-capture kikötései. Ha egy szabály ezekre is illeszkedik, a szabály rossz.
 */
export const SAFE_PATTERNS = [
  /\$\{\{\s*secrets\./,        // ${{ secrets.SPACEOS_PACKAGES_TOKEN }}
  /\$\{[A-Z_][A-Z0-9_]*\}/,    // ${SPACEOS_PACKAGES_TOKEN}
  /process\.env\./,            // process.env.MCP_AUTH_TOKEN
  /credential_env\s*:/,        // credential_env: MCP_AUTH_TOKEN
  /\bimport\.meta\.env\./,     // import.meta.env.VITE_…
  /=\s*xxx\b/i,                // MCP_AUTH_TOKEN=xxx  (doksi-helykitöltő)
  /<[A-Z_]+>/,                 // <YOUR_TOKEN>
]

/**
 * SOSEM BIZTONSÁGOS — a negatív kontroll ELŐTT fut.
 *
 * Miért kell külön kategória: az első változatomban a `process.env.` szerepelt
 * a biztonságos minták közt, és ezzel **elnyomtam egy valódi szivárgást** — a
 * `bin/stdio-bridge.js` alakját:
 *
 *     const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '<literál>'
 *
 * Ez a legveszélyesebb alak: úgy néz ki, mint szabályos env-alapú konfiguráció,
 * közben **a default maga a titok**. A negatív kontroll az egész SORT
 * biztonságosnak vette egyetlen `process.env.` előfordulás miatt.
 *
 * Tanulság a kapu-tervezéshez: a „biztonságos minta" nem mentesítheti a sort,
 * ha ugyanabban a sorban ott van a titok is. Ezért van precedencia.
 */
export const ALWAYS_UNSAFE = [
  {
    name: 'hardcoded-fallback (env-olvasás literál alapértékkel)',
    // Csak TITOK-GYANÚS néven: az első változat 88 találatot adott, mert a
    // `process.env.NODE_ENV || 'development'` alakú, teljesen jóindulatú
    // alapértékeket is fogta. A megkülönböztetés a NÉV: token/key/secret/
    // password/auth/credential — vagy a célváltozóban, vagy az env-kulcsban.
    pattern: /(?:[A-Za-z_][A-Za-z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD|PASSWD|AUTH|CREDENTIAL)[A-Za-z0-9_]*\s*=\s*)?process\.env\.[A-Za-z_]*(?:TOKEN|KEY|SECRET|PASSWORD|PASSWD|AUTH|CREDENTIAL)[A-Za-z0-9_]*\s*(?:\|\||\?\?)\s*["'][^"']{8,}["']/i,
  },
  {
    // A ZAJ-HANGOLÁS PÁRJA (2026-07-30). A fenti szabály csak a `process.env.`
    // alakot ismeri, ezért a `const token = fetchToken() || '<literál>'` sort
    // ma SEM fogja meg senki — ezt az öntesztem pozitív korpusza mérte ki,
    // MIELŐTT a kivételt megírtam volna.
    //
    // Miért kötelező ez a szabály a kivétel mellé: a „hívás nem literál"
    // kivétel enélkül nyitott hátsó ajtó lenne — pont a hívás mögé lehetne
    // beégetni a titkot. A kivétel és az őre EGYÜTT megy be.
    //
    // Zaj ellen két szűkítés: a CÉL neve titok-gyanús kell legyen (különben
    // `const mode = getMode() || 'development'` is bukna), és az alapérték
    // legalább 16 karakter, SZÁMJEGGYEL — a `'development'` így kiesik, egy
    // base64-token viszont gyakorlatilag mindig tartalmaz számjegyet.
    name: 'hardcoded-fallback (hívás literál alapértékkel)',
    // A célnév „TARTALMAZZA a kulcsszót" alakja előretekintéssel megy, nem
    // előtag+kulcsszó összefűzéssel: az utóbbi a CSUPASZ `token`/`secret`
    // nevet kihagyta (előtagot követelt elé), és az öntesztem `||`-ös esete
    // pont ezen bukott — miközben a `??`-es, `apiKey` nevű párja átment.
    // Ugyanaz a hiba két alakban: egy zöld eset nem igazolja a másikat.
    pattern: /\b(?=[A-Za-z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD|PASSWD|AUTH|CREDENTIAL))[A-Za-z_][A-Za-z0-9_]*\s*[:=]\s*[^"'\n]*?\)\s*(?:\|\||\?\?)\s*["'](?=[A-Za-z0-9+/=_.\-]*[0-9])[A-Za-z0-9+/=_.\-]{16,}["']/i,
  },
]

export function isSafeLine(line) {
  if (ALWAYS_UNSAFE.some((r) => r.pattern.test(line))) return false
  return SAFE_PATTERNS.some((p) => p.test(line))
}

/** Egy sor megsérti-e valamelyik szabályt (a negatív kontroll figyelembevételével). */
export function violationOf(line) {
  // A „sosem biztonságos" ELŐBB dönt, mint a negatív kontroll.
  const forced = ALWAYS_UNSAFE.find((r) => r.pattern.test(line))
  if (forced) return forced.name
  if (isSafeLine(line)) return null
  const hit = RULES.find((r) => r.pattern.test(line))
  return hit ? hit.name : null
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function main() {
  let files = []
  const submodules = []
  try {
    // `-z`: NUL-elválasztás, idézőjelezés és oktális escape NÉLKÜL. A sima
    // `--name-only` a nem-ASCII utakat idézőjelezi és escape-eli, amitől a
    // `git show ref:"…"` elbukik rajtuk — az ékezetes nevű fájlok CSENDBEN
    // kimaradtak a vizsgálatból (doc-capture mérése).
    //
    // Típussal együtt kérjük, mert a `commit` típusú bejegyzés (submodule
    // gitlink) NEM blob: nem olvasható, és nem is hiba — de lefedettségi
    // HATÁR, amit ki kell mondani.
    for (const entry of git(['ls-tree', '-r', '-z', ref]).split('\0').filter(Boolean)) {
      const [meta, path] = entry.split('\t')
      const type = meta.split(' ')[1]
      if (type === 'commit') submodules.push(path)
      else if (type === 'blob') files.push(path)
    }
  } catch {
    console.error(`A ref nem olvasható: ${ref}. Futtass "git fetch origin"-t.`)
    process.exit(2)
  }

  // Bináris és lock-fájlok kihagyása — zajt hoznak, titkot nem.
  // A lock-fájlok integritás-hash-ei szerkezetileg megkülönböztethetetlenek a
  // titkoktól, viszont sosem azok — és 290 hamis találatot adtak.
  const skip = /\.(png|jpe?g|gif|svg|ico|woff2?|ttf|pdf|zip|tgz)$|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$|(^|\/)dist\//i
  const scanned = files.filter((f) => !skip.test(f))

  const findings = []
  // A kihagyott fájlokat SZÁMOLJUK és kiírjuk. A korábbi `catch { continue }`
  // minden olvasási hibát elnyelt, miközben az összesítő azt írta, „N fájl
  // átvizsgálva" — a kimaradt fájl megkülönböztethetetlen volt a tisztától.
  // Ez a saját „üresen zöld számláló" mintánk, a kapu belsejében.
  const unreadable = []
  for (const file of scanned) {
    let content
    try { content = git(['show', `${ref}:${file}`]) } catch { unreadable.push(file); continue }
    content.split('\n').forEach((line, i) => {
      const rule = violationOf(line)
      if (rule) findings.push({ file, line: i + 1, rule })
    })
  }

  const read = scanned.length - unreadable.length
  console.log(`Szivárgás-kapu — ref: ${ref} · ${read}/${scanned.length} fájl átvizsgálva`)

  if (submodules.length > 0) {
    // A submodule-ok külön publikált repók. Három ágens kézzel mérte végig
    // őket, és közben egy PUBLIKUS repó (cabinet) kimaradt, mert nincs
    // inicializálva — a kézi lefedettség pont ott hiányos, ahol nem látszik.
    // Ezért itt gépi a besorolás: mérhető / NEM mérhető, felsorolva.
    const measurable = []
    const missing = []
    for (const s of submodules) {
      // Inicializált-e: van-e SAJÁT repója a lemezen.
      //
      // ⚠ Csapda: a `git -C <út> rev-parse --git-dir` egy NEM inicializált
      // submodule-ban is sikerrel jár, mert felfelé megtalálja a SZÜLŐ repót.
      // Az első változatom emiatt mind a 14-et „mérhetőnek" mondta, köztük a
      // `cabinet`-et, amiről a backend külön jelezte, hogy nincs a lemezen.
      // Ezért a tényleges gyökeret hasonlítjuk a submodule útjához.
      try {
        const top = execFileSync('git', ['-C', s, 'rev-parse', '--show-toplevel'],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
        const own = resolve(process.cwd(), s).replace(/\\/g, '/').toLowerCase()
        if (top.replace(/\\/g, '/').toLowerCase() === own) measurable.push(s)
        else missing.push(s)
      } catch { missing.push(s) }
    }
    console.log(`\nⓘ ${submodules.length} submodule NEM része ennek a futásnak (külön repó, külön ref):`)
    if (measurable.length) {
      console.log(`  mérhető itt helyben (${measurable.length}) — futtasd bennük is:`)
      for (const s of measurable) console.log(`    ${s}`)
    }
    if (missing.length) {
      // Ez a veszélyes kategória: nincs a lemezen, tehát egy kézi körben
      // csendben kimarad — és ha publikus, akkor se zöld, se piros.
      console.error(`  ⚠ NINCS inicializálva, tehát MEG SEM MÉRHETŐ (${missing.length}):`)
      for (const s of missing) console.error(`    ${s}`)
      console.error('  Ezek titok-szempontból se zöldek, se pirosak. Inicializáld, vagy mérd a saját CI-jükben.')
    }
  }

  if (unreadable.length > 0) {
    // NEM csendes kihagyás: a nem olvasható fájl lefedetlen terület.
    console.error(`\n⚠ ${unreadable.length} fájlt NEM sikerült elolvasni — ezek lefedetlenek:`)
    for (const f of unreadable.slice(0, 10)) console.error(`  ${f}`)
    if (unreadable.length > 10) console.error(`  … és további ${unreadable.length - 10}`)
    console.error('A csend nem lefedettség: amíg ez fennáll, a kapu eredménye részleges.')
    process.exitCode = 1
  }

  if (findings.length === 0) {
    if (unreadable.length === 0) console.log('Nincs találat.')
    return
  }
  // ÉRTÉK NÉLKÜL. Aki javítja, nyissa meg a fájlt.
  console.error(`\n${findings.length} SZIVÁRGÁS-GYANÚ (az értéket szándékosan nem írjuk ki):\n`)
  for (const f of findings) console.error(`  ${f.file}:${f.line}  — ${f.rule}`)
  console.error('\nA rotáció ELŐBBRE való a fájltörlésnél: a történet publikus marad.')
  process.exit(1)
}

// Csak közvetlen futtatáskor scanneljünk — teszt importálhatja a szabályokat.
if (process.argv[1] && process.argv[1].endsWith('secret-scan.mjs')) main()
