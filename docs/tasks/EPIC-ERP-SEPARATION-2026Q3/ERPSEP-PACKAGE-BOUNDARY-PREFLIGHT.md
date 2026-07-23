# ERPSEP-PACKAGE-BOUNDARY-PREFLIGHT — frontend/backend csomaghatár regressziós kapu

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** tooling/architecture
- **Prioritás:** P0
- **Státusz:** done — final independent review APPROVED
- **Függőség:** ERPSEP-01, MODULE-FOLDERS
- **Mutációs határ:** gyökérszintű scanner, policy, fixture-tesztek és ez a task
- **Tiltott scope:** portal/backend forrásmódosítás, végleges ModuleId vagy
  package-név, manifest, runtime composition, DB/migráció, Doorstar

## Cél

A hét horizontális ERP-modul frontend- és backend-függőségi határát egy
konfigurációvezérelt, read-only kapu tegye mérhetővé. A már ismert technikai
adósság pontos finding-fingerprintként szerepel a baseline-ban; új tiltott él
`--fail-on-regression` mellett nem nulla exit kódot ad.

Ez a task nem kezdi el a blokkolt `MODULE-PACKAGES` vagy `ERPSEP-05`
implementációját. Döntésfüggetlen bizonyítékot és regressziós kaput készít azok
későbbi végrehajtásához.

## Szerződés

### Bemenet

- `config/erp-module-boundaries.json`
- a portal hét `src/modules/<modul>` fája;
- a hét kanonikus ERP-backend produktív `src`/`host` projektfája;
- pontos, kategóriánként elkülönített baseline-findingok.

### Kimenet

A scanner időbélyeg és abszolút gépútvonal nélküli, determinisztikus JSON-t ad:

- hiányzó frontend publikus entrypointok;
- frontend keresztmodul-importok;
- frontend modul → legacy shell/mock importok;
- minden más, modulon kívüli relatív frontend import;
- TypeScript parse-hibák;
- nem literális dinamikus importok és `import.meta.glob` hívások;
- statikusan nem bizonyítható, könyvtárszegmensben glob-magicet használó
  literal `import.meta.glob` hívások;
- backend ERP → ERP `ProjectReference` élek;
- backend repo-relatív, modulon kívüli `ProjectReference` élek;
- kategóriánként baseline/current/new/resolved számlálók;
- az új és a már megszűnt baseline-findingok teljes listája.

Exit kódok:

- `0`: a config érvényes; regresszió nincs, vagy nincs bekapcsolva a szigorú kapu;
- `1`: hibás/hiányos config vagy be nem olvasható scan-root — fail-closed;
- `2`: `--fail-on-regression` mellett legalább egy új finding.

## Megvalósítás

1. Node.js ESM scanner készült a portal már telepített TypeScript
   devDependency-jének valódi AST-parserével. Ha a parser nem érhető el, a gate
   fail-closed hibával áll meg.
2. Minden konfigurált fájlút Windows `\` és POSIX `/` elválasztóval is
   feldolgozható; a kimenet mindig `/` alakú.
3. A konfiguráció relatív repo-útvonalakat fogad. A policy, a module/scan rootok,
   valamint a bejárt symlink/junction célok `realpath` után is a repo gyökerén
   belül kell maradjanak.
4. A frontend valódi AST-ből vizsgálja a static import, re-export,
   `import =`, import type, dinamikus import, `require` és literal
   `import.meta.glob` éleket. Komment, string, template vagy regex tartalma nem
   lehet false positive.
5. A backend a produktív `.csproj` fájlok `ProjectReference` éleit vizsgálja;
   az azonos modul ownership-rootján belüli élek nem adósságok.
6. Az összevetés pontos fingerprinttel történik: a findingek számának puszta
   egyezése nem rejthet el kicserélt regressziót.
7. A baseline csökkenése `resolvedBaseline`, nem hiba; új finding külön
   `regressions` kategóriába kerül.
8. A hiányzó entrypoint, parse-hiba, computed dynamic import, computed glob és
   unsafe literal glob kötelező blokkoló kategória; ezekhez baseline-adósság
   nem adható. Literal glob csak akkor bizonyítható biztonságosnak, ha minden
   könyvtárszegmense glob-magic nélküli; a magic kizárólag a végső fájlnévben
   lehet.
9. Minden modulon kívüli relatív frontend cél finding. Kivétel kizárólag a
   configban tételesen felsorolt shared root lehet.

### Reviewzott shared rootok

Az allowlist nem tartalmaz app-shell, industry, production, mocks, hooks vagy
teljes `services/` gyökeret. Kizárólag a `MODULE-FOLDERS` által közös UI/core
csomagba kijelölt elemeket tartalmazza:

- `components/ui/`;
- `theme/`;
- pontosan `services/apiClient.ts`;
- pontosan `services/dateUtils.ts`;
- pontosan `services/fsmGuards.ts`.

Más relatív cél — beleértve a legacy mock, industry, production vagy app-shell
fát — finding marad.

A fájl-szintű shared root kizárólag ugyanarra a `realpath` fájlra enged:
extensionless import feloldható a kijelölt `.ts` fájlra, de az azonos törzsnevű
`.js` vagy más kiterjesztésű fájl nem örökli az allowlistet.

## Tesztkapu

```powershell
node --test scripts/tests/check-erp-module-boundaries.test.mjs
node scripts/check-erp-module-boundaries.mjs --format json --fail-on-regression
```

Kötelező bizonyíték:

- tiszta fixture POSIX és Windows config-útvonalakkal;
- byte-azonos/determinisztikus ismételt JSON;
- meglévő, pontosan baseline-olt adósság nem regresszió;
- új frontend vagy backend él exit `2`;
- literal glob/dynamic import élként jelenik meg;
- computed dynamic/glob kötelező blokkoló finding;
- komment/string/template/regex import-szerű szövege nem finding;
- malformed config, nested scan-root, ownership-határsértés és symlink/junction
  escape exit `1`;
- XML-kommentbe írt `ProjectReference` nem finding, malformed `.csproj` XML
  fail-closed exit `1`;
- a valós munkafa baseline-jához képest nulla új finding.

## Stop / eszkaláció

- Ha a gate-hez végleges ModuleId, npm/NuGet package-név, trust-root,
  entitlement-owner, outbox-csatorna vagy runtime composition döntés kellene,
  a task megáll; ezek ADR-066/067/068 elfogadási körébe tartoznak.
- A task nem javítja a feltárt adósságot és nem ír a portal/backend fáiba.
- Párhuzamos portal/backend módosítás után a valós baseline-scan újrafuttatandó;
  findinget automatikusan baseline-ba emelni tilos.

## Végrehajtási napló

**2026-07-22 — első implementáció:** a scanner, a konfiguráció és a
fixture-suite a kijelölt új fájlhatárban elkészült.
Portal- vagy backend-alkalmazáskód nem módosult; végleges ModuleId/package-név,
manifest vagy runtime composition nem készült.

**Független review:** `CHANGES REQUESTED`. A reviewer bizonyította, hogy a
regex-alapú importfelismerés komment/string false positive-ot okozhat, nem látta
az `import.meta.glob` és computed dinamikus éleket, a tetszőleges modulon kívüli
relatív célokat, továbbá hiányzott a realpath/symlink és nested scan-root kapu.

**Javítás:** policy schema v2 + TypeScript AST, új external/parse/non-literal
kategóriák, kötelező blocking category-k, tételes shared-root allowlist,
realpath containment és overlap-elutasítás. A valós scan során ideiglenesen
láthatóvá vált 61 közös core-import; ezek közül csak az öt fent dokumentált,
`MODULE-FOLDERS` által kijelölt shared root kapott kivételt. Új baseline-adósság
nem került elrejtésre.

**Második független re-review:** `CHANGES REQUESTED`. Három bypass került
bizonyításra: glob-magic utáni `..`/brace alternatíva saját modul-prefixként
félreminősülhetett; egy fájl-allowlist extensionless összevetése az azonos
törzsnevű `.js` fájlt is engedte; a regexes `.csproj` olvasó XML-kommentben lévő
hamis `ProjectReference`-et is findingnek vette és nem validálta az XML-t.

**Második javítás:** új mandatory-blocking
`frontendUnsafeLiteralGlobImports`; konzervatív globkönyvtár-szabály; file
shared rootnál pontos real-file egyezés; XML-komment/CDATA/processing-instruction
tudatos, tag/attribútum/stack-validáló `.csproj` parser. Malformed XML
`CONFIGURATION_ERROR`, exit `1`.

**Fixture-kapu:**

```text
node --test scripts/tests/check-erp-module-boundaries.test.mjs
tests 18 · pass 18 · fail 0
```

A tizennyolc teszt lefedi a POSIX/Windows konfigurációs útvonalakat, az ismételt
JSON determinisztikusságát, a pontos baseline összevetést, external/shared
elkülönítést, literal glob/dynamic éleket, computed blokkolást,
komment/string/template/regex false-positive védelmet, nested és idegen
ownership scan-rootot, valamint a policy-, konfigurált scan-root- és bejárt
scan-fa symlink/junction escape-et. Külön teszt fedi a glob-traversal és brace
alternatíva bypassokat, a `tool.ts` vs. `tool.js` exact-real-file allowlistet,
az XML-kommentet és a malformed XML fail-closed viselkedést.

**Valós munkafa:**

```text
node scripts/check-erp-module-boundaries.mjs --format json --fail-on-regression
exit 0 · deterministic true · parser typescript@6.0.3
modules 7 · findings 21 · baseline 21 · regressions 0 · resolved 0
```

Kategóriák:

| Kategória | Current | Baseline | New | Resolved |
|---|---:|---:|---:|---:|
| hiányzó frontend entrypoint | 0 | 0 | 0 | 0 |
| frontend parse-hiba | 0 | 0 | 0 | 0 |
| frontend cross-module import | 1 | 1 | 0 | 0 |
| frontend modul → legacy shell/mock | 5 | 5 | 0 | 0 |
| egyéb frontend external relative import | 0 | 0 | 0 | 0 |
| computed dynamic import | 0 | 0 | 0 | 0 |
| computed `import.meta.glob` | 0 | 0 | 0 | 0 |
| unsafe literal `import.meta.glob` | 0 | 0 | 0 | 0 |
| backend ERP → ERP `ProjectReference` | 0 | 0 | 0 | 0 |
| backend repo-relatív `ProjectReference` | 15 | 15 | 0 | 0 |

Az eredményt két egymást követő valós scan byte-azonos JSON-kimenettel adta.

**Végső független re-review:** `APPROVED`, P0–P3 finding nélkül. A reviewer a
suite-tól külön újrajátszotta a glob-traversal és brace-alternatíva bypassokat,
az exact `tool.ts`/külön `tool.js` esetet, az XML-kommentet és a malformed XML-t.
Eredmény: unsafe glob exit `2`, külön `.js` external finding, kommentelt
`ProjectReference` 0 backend finding, malformed XML exit `1`.

## Elfogadási kritériumok

- [x] A fixture-tesztek zöldek.
- [x] A valós scan determinisztikus és regressziómentes.
- [x] A baseline külön mutatja az 1 frontend cross-module, 5 legacy shell és
      15 backend repo-relatív findinget.
- [x] Hibás config fail-closed.
- [x] Minden nem allowlistelt external relatív cél finding; literal glob és
      dinamikus import látható, computed változat blokkoló.
- [x] Glob-magic utáni traversal/alternatíva kötelező blokkoló; file shared
      root csak pontos real fájlt enged.
- [x] AST-parser miatt komment/string/template/regex nem okoz false positive-ot.
- [x] Realpath escape és nested/overlap scan-root fail-closed.
- [x] XML-komment nem hoz létre backend élt; malformed `.csproj` fail-closed.
- [x] Portal vagy backend alkalmazáskód nem módosult.
- [x] Friss kontextusú reviewer ellenőrizte, hogy a baseline nem rejt el új élt.
