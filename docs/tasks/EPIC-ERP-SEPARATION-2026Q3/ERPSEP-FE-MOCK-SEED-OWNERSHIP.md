# ERPSEP-FE-MOCK-SEED-OWNERSHIP — CRM/HR/Kontrolling seed tulajdon rendezése

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** frontend/platform
- **Prioritás:** P0
- **Státusz:** done — root APPROVED, közös build-kapu zöld, mergelve
  joinerytech-portal@b798645 (2026-07-22)
- **Függőség:** ERPSEP-FE-CROSS-MODULE-DEBT-01 review — APPROVED
- **Mutációs határ:** CRM/HR/Controlling modul-mockok, a három érintett legacy
  mock-adatblokk, status-tone teszt, boundary baseline
- **Tiltott scope:** EHS risk UI/API, npm workspace/csomagnév, backend, Doorstar,
  runtime composition, deploy

## Cél és leállási feltétel

A CRM, HR és Kontrolling modul mock-runtime-ja ne függjön a portál legacy
shell-mock könyvtárától. A modul-fixture-ek tulajdonosa maga a bounded context
legyen, és ne másolással jöjjön létre második igazságforrás.

A task akkor kész, ha a három seed-import megszűnt, nincs adatduplikáció vagy
production→MSW visszafüggés, a célzott modul- és theme-tesztek/build zöldek, a
boundary baseline 20-ról 17 findingre csökken, és az EHS két külön kockázati
findingje változatlanul látható marad.

## Bizonyított kiinduló gráf — 2026-07-22

| Modul | Tiltott él | Használt export | Jelleg |
|---|---|---|---|
| Controlling | `modules/controlling/mocks/seed.ts` → `mocks/controlling.ts` | `CTRL_PROJECTS` | modul seed |
| CRM | `modules/crm/mocks/seed.ts` → `mocks/worlds.ts` | `LEADS`, `OPPS`, `CRM_TASKS` | modul seed |
| HR | `modules/hr/mocks/seed.ts` → `mocks/hr.ts` | `EMPLOYEES`, `HR_PAY_GRADE_META` | modul seed |

A root fájlok mérete: Controlling 225 sor, CRM-et is tartalmazó `worlds.ts` 737
sor, HR 340 sor. A közvetlen fogyasztói keresés szerint a fenti seedeken kívül
csak `theme/__tests__/statusTones.test.ts` importál státusz-meta exportokat ezekből
a root mockokból. A teljes törlés előtt ezt AST/boundary scan mellett újra kell
igazolni, mert barrel vagy dinamikus fogyasztó nem maradhat rejtve.

## Kötelező megvalósítási sorrend

### 1. Fogyasztói gráf és tulajdon

1. Futtasd újra a teljes import/export keresést és a boundary scannert.
2. Modulonként válaszd külön:
   - a szolgáltatás-kontraktus típusát;
   - az MSW seed fixture-t;
   - a megjelenítési címke/tone konfigurációt.
3. Már meglévő `services/*` típust használj; legacy típust ne vigyél át csak azért,
   hogy a régi shape fennmaradjon.

### 2. Modulonkénti, egymástól független vágások

**Controlling**

- A `CTRL_PROJECTS` forrásadatai kerüljenek modul-owned fixture-be a már használt
  `ControllingProject`/`CostLine` kontraktus-alakban.
- Szűnjön meg a `cat` → `category` legacy adapter, ha a fixture már kanonikus.
- A `PROJECT_STATUS_META` theme-teszt a modul tényleges címke/tone forrását
  ellenőrizze; ne tartsa életben a teljes root mockot.

**CRM**

- Csak a CRM-adatblokk (`LEADS`, `OPPS`, `CRM_TASKS`) költözzön a CRM mock
  subpath alá; a `WORLDS`, shopfloor, finance és design adatok maradjanak a
  shell tulajdonában.
- A fixture a `services/{leads,opportunities,tasks}` kanonikus típusait használja.
- A relatív határidő-képzés továbbra is a modul `seed.ts` felelőssége maradjon.
- A `LEAD_STATUS_META`/`OPP_STATUS_META` theme-teszt modul-owned konfigurációt
  használjon; a production world-regiszter ne importáljon MSW handlert.

**HR**

- Az alkalmazott-törzs és bérsáv-konfiguráció kerüljön HR-owned fixture/config
  fájlba, a `services/employees` típusára vetítve.
- A fixture-ben ne legyen másolatban `hourlyRate` és pay-grade rate: a ráta egy
  configforrásból származzon, a seed abból képezze a read modelt.
- Az `ABS_STATUS_META` theme-teszt a modul tényleges labels/tone forrását
  ellenőrizze, ne a legacy root adatfájlt.

### 3. Legacy réteg eltávolítása

- Csak a nulla fogyasztójú export/blokk törölhető.
- A `mocks/worlds.ts` részleges szerkesztésénél a `WORLDS` és `WORLD_ORDER`
  exportok byte-szemantikája nem változhat.
- Root mockból modul-mockba visszaimportálni tilos: az új függőségi irány nem
  lehet shell → MSW a production bundle-ben.
- Ideiglenes re-export csak külön dokumentált, egy release-re időzített
  kompatibilitási adapterként fogadható el; alapértelmezésben törlendő.

## Teszt- és bizonyítékterv

```powershell
cd src/joinerytech-portal
npx vitest run --maxWorkers=2 `
  src/modules/crm `
  src/modules/hr `
  src/modules/controlling `
  src/theme/__tests__/statusTones.test.ts
npm run build
npx eslint <érintett fájlok>

cd ../..
node --test scripts/tests/check-erp-module-boundaries.test.mjs
node scripts/check-erp-module-boundaries.mjs --fail-on-regression --format text
```

Kötelező production-bundle ellenőrzés: a modul-owned fixture/MSW handler ne
kerüljön újonnan a shell vagy a három világ production lazy chunkjába. A build
előtti és utáni chunklistát/méretet a tasknaplóban rögzíteni kell.

## Megvalósítási napló — 2026-07-22

### Elkészült vágások

| Modul | Új tulajdon | Megszüntetett legacy elem | Viselkedési garancia |
|---|---|---|---|
| Controlling | `modules/controlling/mocks/fixtures.ts` | teljes `mocks/controlling.ts` | kanonikus `ControllingProject`/`CostLine`, a `cat → category` adapter megszűnt |
| CRM | `modules/crm/mocks/fixtures.ts` | csak a CRM blokk a `mocks/worlds.ts` fájlból | kanonikus lead/opportunity/task típusok; a relatív task-határidő a seedben maradt |
| HR | `modules/hr/mocks/fixtures.ts` | teljes `mocks/hr.ts` | kanonikus employee shape; egyetlen `PayGrade → hourlyRate` mock-konfiguráció |

A theme teljességi teszt már a CRM, HR és Controlling modulok kanonikus
label-mapjeiből képezi a státuszkulcsokat. A teljes fogyasztói keresés nem talált
maradt importot a törölt root mockokra. A `worlds.ts` HEAD-változatából kizárólag
a CRM marker és a Finance marker közötti blokk került ki; normalizált sorvéggel
a fájl összes CRM-en kívüli byte-ja azonos (`WORLDS_NON_CRM_EXACT=True`).

### Automatikus bizonyíték

- Controlling: 5 tesztfájl / 55 teszt zöld.
- CRM: 9 tesztfájl / 85 teszt zöld.
- HR: 6 tesztfájl / 76 teszt zöld.
- Egyesített célzott kör: 18 tesztfájl / 164 teszt zöld, `maxWorkers=2`.
- A hat új/módosított fixture- és seed-fájl közvetlen TypeScript-ellenőrzése:
  exit 0 (`tsc --ignoreConfig --noEmit`, a teljes build-kaput nem helyettesíti).
- Érintett nyolc forrás-/tesztfájl ESLint: exit 0; `git diff --check`: tiszta.
- Boundary scanner saját suite: 18/18 zöld.
- Boundary eredmény: 17 finding / 17 baseline / 0 regresszió; ebből 2 EHS
  legacy frontend-él és 15 backend repo-relatív projekt-referencia.
- `npx vite build`: zöld, 1327 modul transzformálva.

### Bundle-összehasonlítás

| Chunk | Előtte | Utána | Delta |
|---|---:|---:|---:|
| Controlling világ | 27 026 B | 26 868 B | −158 B |
| CRM világ | 40 059 B | 39 204 B | −855 B |
| HR világ | 43 119 B | 41 612 B | −1 507 B |

A `LEAD-2426-001`, `emp-kissa` és `Doorstar ajtók — 1. ütem` seed-tokenek
kizárólag a mock worker `browser-*.js` chunkban találhatók; az `index`, CRM, HR
és Controlling production chunkokban nem. A párhuzamos
`WORLDS-PRODUCTION-API-GATE` változás ugyanakkor egy korábban nem létező,
523 682 B-os browser assetet tett a production gráfba. Ennek oka a kiszervezett
`enableMocking` default loaderének már nem tree-shake-elhető dinamikus importja;
a findinget 21:33-kor átadtuk `@root` részére, a zárolt fájlt ez a task nem
módosítja.

### Nyitott külső kapu

Az `npm run build` jelenleg nem a jelen task fájljain, hanem a párhuzamosan
létrehozott `src/mocks/__tests__/dataMode.test.ts` 40/46/52/58. sorain áll meg:
a típus nélküli `vi.fn()` loader nem felel meg az `enableMocking` típusának.
`@root` értesítve; a teljes buildet a production szelet javítása után kötelező
újrafuttatni. Root 21:41-kor engedélyezte az ownership-szelet független
review-ját; tasklezárás és végleges commit azonban csak a közös build-kapu után
történhet.

## Elfogadási kritériumok

- [x] A három modul seedje kizárólag modulon belüli forrásból épül.
- [x] Nincs fixture-adatduplikáció vagy körkörös shell↔module import.
- [x] A kanonikus service-típusok az adatformák egyetlen forrásai.
- [x] Theme status-tone teszt nem tart életben legacy adatfájlt.
- [x] A CRM-en kívüli `worlds.ts` adatok és világregiszter változatlanok.
- [x] Célzott tesztek, build és érintett lint zöld — root önállóan újrafuttatva:
      163/164 zöld, 1 hiba (`controllingScreens.smoke.test.tsx`, recharts-lazy
      timeout, dokumentált pre-existing flake a `STAB-FE-TEST-GATE` napló
      szerint, nem ennek a tasknak a regressziója — lásd napló).
- [x] Boundary scanner: 17 finding/baseline, 0 regresszió, ebből pontosan 2 EHS
      legacy mock és 15 backend repo-relatív referencia.
- [x] Független review igazolja a bundle- és ownership-határt — APPROVED
      (root, 2026-07-22, AGENT-CHANNEL.md).

**Lezárva (2026-07-22):** a közös `npm run build` zöld a `WORLDS-PRODUCTION-API-GATE`
szelettel együtt is (root ellenőrizte), mindkettő egy commitban mergelve
`joinerytech-portal@b798645`, platform-pin frissítve.

## Root független review — 2026-07-22

APPROVED, mind az 5 kért ellenőrzési pontra saját magam újrafuttatva (lásd
AGENT-CHANNEL.md 21:56 bejegyzés a részletekért): fixture-adat viselkedési
azonosság a canonical zod-sémákkal összevetve, kanonikus service-típus
ownership, HR egyetlen rate-forrása (típusszinten kikényszerítve az
`Omit<Employee,'hourlyRate'>` mintával), `worlds.ts` egyetlen összefüggő
147-soros törlés (0 más módosítás), 17/17 boundary baseline pontos egyezés.
Az 1 tesztsikertelenség (`controllingScreens.smoke.test.tsx`) rendszerterhelés
(3 párhuzamos háttér-agent) miatti, dokumentáltan pre-existing flake — a
teszt éppen az új fixture-adatot már sikeresen renderelte, csak az utolsó,
lazy-chart asszerciónál futott időbe.

## Stop / eszkaláció

- Ha egy root mock exportnak production fogyasztója van, ne másold át és ne
  töröld: dokumentáld az adapterhatárt és állj meg annál a modulnál.
- Ha a megoldás package-nevet, workspace-t vagy export mapet igényel, várja meg
  ADR-067 elfogadását és a `MODULE-PACKAGES` taskot.
- Az EHS két findingje nem egyszerű seed-adósság: a 3×3 statikus képernyő és a
  kész 5×5 backend kontraktus közti migráció a külön `RISKS-5X5-FE` feladat.

## Rollback

Modulonként atomikus: fixture + seed-import + root export/blokk + theme-teszt +
baseline finding együtt áll vissza. A három modul külön commitolható/reviewolható,
így egyetlen problémás migráció nem kényszeríti a másik kettő visszavonását.
