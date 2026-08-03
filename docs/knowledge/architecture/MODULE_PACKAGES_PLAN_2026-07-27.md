# MODULE_PACKAGES_PLAN — frontend workspace-esítés végrehajtási terve

- **Dátum:** 2026-07-27
- **Task:** `MODULE-PACKAGES` (EPIC-ERP-SEPARATION-2026Q3, E2-package-boundaries) — **1. fázis: tervezés (read-only)**
- **Készítette:** root-terminál tervező agent, kizárólag olvasó kódvizsgálattal
- **Bemenetek (mind ellenőrizve a mai fán):**
  - `docs/tasks/EPIC-ERP-SEPARATION-2026Q3/MODULE-PACKAGES.md` (task-doksi)
  - `docs/tasks/EPIC-UI-PORTAL-2026Q3/archive/MODULE-FOLDERS.md` + az EPICS.yaml MODULE-FOLDERS note-ja
  - `docs/knowledge/adr/ADR-067-module-catalog-and-lifecycle.md` (ACCEPTED 2026-07-27)
  - `docs/knowledge/adr/ADR-066-erp-module-contract-boundaries.md` (ACCEPTED 2026-07-25)
  - `scripts/check-erp-module-boundaries.mjs` + `config/erp-module-boundaries.json` (boundary-őr + baseline)
  - `src/joinerytech-portal` mai working tree (FIGYELEM: commitolatlan warehouse- és H1-szeletekkel — ld. 3.6)
- **Mutációs határ:** kizárólag ez a terv-doksi. A portál fájához az agent nem nyúlt.
- **A fizikai átalakítás előfeltétele (EPICS.yaml MODULE-PACKAGES note):** tiszta portál-fa
  (warehouse-fix + WORLDS-SHELL-H1 commit után). Ez a terv arra a tiszta fára készül.

---

## 0. Vezetői összefoglaló

A MODULE-FOLDERS (2026-07-16) után a portál már modul-mappákra van vágva tudatos publikus
`index.ts`-ekkel és külön `mocks` belépési ponttal — a csomagosítás ezért **mechanikus
mozgatás + csomaghatár-formalizálás**, nem újratervezés. A MODULE-FOLDERS-ben felsorolt három
akadályból **kettő azóta megoldódott** (kereszt-modul import, legacy seed-függések — bizonyíték
a 3. fejezetben), egy él (shell-oldali EHS-wizard-sziget, döntéssel zárandó). Új tény a
MODULE-FOLDERS óta: **két világ-frontend jött létre** (`production`, `warehouse`) — ezek az
ADR-067 world≠module elve szerint **kompozíciós csomagok**, nem ERP-modulcsomagok, és a
warehouse ma **commitolatlan, changes-requested történetű** (3.6).

Javasolt irány: **a repo-gyökér marad az egyetlen composition app**, mellé `packages/*`
kerül npm workspaces-szel; a csomagok **forrás-exportos** workspace-tagok (nincs
csomagonkénti build ebben a körben), így a Vite modulgráf — és vele a bundle-layout —
változatlan marad (a MODULE-FOLDERS byte-azonos precedensének megőrzése). A kivitelezés
**5 inkrementális fázis**, fázisonkénti zöld kapuval és fázisonkénti revert-képes committal;
a minimális első szállítható szelet a workspace-váz + a két közös csomag (`portal-ui`,
`portal-core`).

---

## 1. Workspace-topológia

### 1.1 Alapdöntés: a composition app a repo-gyökérben marad

A task szerint „a JoineryTech portál csak composition root", és a Doorstar-app kifejezetten
**nem** kerülhet ebbe a repóba (Tiltott scope + elfogadási kritérium #6). Ebből következik,
hogy **belátható időn belül egyetlen app él ebben a repóban** — külön `apps/joinerytech/`
mappa bevezetése most csak költség lenne (a `vite.config.ts`, `index.html`,
`public/mockServiceWorker.js`, `scripts/keyboard-smoke.mjs`, `.env.local`, eslint- és
vitest-configok mind költöznének, minden CI/agent-konvenció borulna). **Javaslat: a
repo-gyökér `package.json` marad a privát composition app** (`joinerytech-portal`), és a
workspace-tagok `packages/` alá kerülnek:

```
src/joinerytech-portal/
├── package.json            ← privát app + workspace-root ("workspaces": ["packages/*"])
├── vite.config.ts          ← változatlan hely, változatlan manualChunks
├── index.html, public/     ← változatlan
├── packages/
│   ├── portal-core/        ← @spaceos/portal-core   (2.2)
│   ├── portal-ui/          ← @spaceos/portal-ui    (2.2)
│   ├── module-crm/         ← @spaceos/module-crm
│   │   ├── package.json    ← exports: ".", "./mocks"
│   │   └── src/            ← a mai src/modules/crm tartalma (services/mocks/pages/index.ts)
│   ├── module-controlling/ … module-dms/  (7 ERP-modul)
│   ├── world-production/   ← @joinerytech/world-production  (kompozíció, 2.3)
│   └── world-warehouse/    ← @joinerytech/world-warehouse   (kompozíció, 2.3)
└── src/                    ← CSAK a composition app marad:
    ├── App.tsx             ← route-regisztráció + lazy import()-ok (változatlan szerkezet)
    ├── pages/              ← diszpécser-oldalak (CrmPage.tsx, …) + a ~16 legacy világ
    ├── mocks/              ← worlds.ts világ-regiszter, handlers.ts aggregátor, browser.ts,
    │                          dataMode.ts + a legacy világok seed-fájljai (ai.ts, trade.ts, …)
    ├── auth/ → átmenetileg marad, majd portal-core-ba (fázisterv szerint)
    └── components/ (shell: layout, EHS-wizard a döntésig, legacy prototípus-mappák)
```

Ha később mégis több app kell **ezen a repón belül** (nem várt), a gyökér-app egy külön,
tisztán mechanikus lépésben leköltöztethető `apps/` alá — ez a döntés nem zár be kaput.

### 1.2 Csomagfogyasztás módja: forrás-export, nincs csomagonkénti build (ebben a körben)

Két lehetőség volt:

| | (a) forrás-exportos workspace-tag | (b) csomagonkénti tsc-build → dist |
|---|---|---|
| Vite modulgráf | azonos a maival → **bundle-layout őrizhető byte-szinten** | más feloldás, más chunk-tartalom |
| dev-élmény | HMR változatlan | watch-lánc, lassabb |
| tsconfig | a mai egyetlen app-tsconfig kiterjesztése | composite + declaration ↔ ütközik a mai `noEmit`/`verbatimModuleSyntax`/`allowImportingTsExtensions` trióval |
| publikálhatóság | nem publikálható közvetlenül | GitHub Packages-re kész |

**Döntési javaslat: (a)** — a csomagok `package.json`-ja a TS-forrásra mutat
(`"exports": { ".": "./src/index.ts", "./mocks": "./src/mocks/index.ts" }`), a Vite és a
Vitest natívan feloldja. A tényleges **publikálható build (dist + d.ts) az ERPSEP-08
Maintenance-bundle-pilot hatásköre** — ott kell bevezetni a csomag-szintű `tsc`-buildet
(composite project references, `publishConfig`), és ott kell feloldani a mai
`allowImportingTsExtensions: true` ↔ `declaration` ütközést. Így a MODULE-PACKAGES kör
kockázata a csomaghatár-formalizálásra szűkül, a build-pipeline-váltásé külön körbe kerül.

**`tsc -b` következmény:** a gyökér `tsconfig.app.json` `include`-ja `["src"]` →
`["src", "packages"]` bővül; **valódi project reference (composite) ebben a körben nem
kell** és nem is fér össze a mai compiler-optókkal. A `tsconfig.json` solution-fájl
változatlan marad.

**npm-specifikumok:** workspaces hoisting miatt egyetlen react/react-dom/router példány;
biztonsági övnek `resolve.dedupe: ['react', 'react-dom']` felvehető a vite-configba, ha a
smoke bármi duplikációt jelezne. A modul-csomagok `peerDependencies`-ként deklarálják:
`react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zod` (+ ahol kell:
`msw` a `./mocks` exporthoz — dev/peer-optional), a verziótartomány a gyökér mai
verzióiból (React 19.2, Router 7.14, TanStack Query 5, zod 4, MSW 2). Ez a task
Stop-klauzulájában kért **peer-policy**: a composition app ad konkrét verziót, a csomag
csak tartományt mond.

⚠ **Lockfile-anomália (rendezendő a P0-ban):** a portálban a `package-lock.json` MELLETT
egy **követett `pnpm-lock.yaml` is van** (git ls-files igazolja). A workspace npm-alapú —
a pnpm-lock (feltehetően az Antigravity warehouse-körből) törlendő, különben két
igazságforrás él a függőség-gráfról.

### 1.3 A `./mocks` subpath export terve

A MODULE-FOLDERS tudatos döntése (mocks külön belépési pont, mert a top-level
`http.get(...)` MSW-regisztráció nem tree-shakelhető és a lazy chunkokba szivárogna) már
ma a leendő csomagalakot tükrözi: minden modulban `modules/<mod>/mocks/index.ts` él, és a
`src/mocks/handlers.ts` aggregátor ezekről importál. Csomagosítás után:

```jsonc
// packages/module-crm/package.json
{
  "name": "@spaceos/module-crm",
  "exports": {
    ".":        "./src/index.ts",       // világ-képernyők + publikus hookok — MSW-mentes
    "./mocks":  "./src/mocks/index.ts"  // MSW kontraktus-tükör + reset<Mod>Db — CSAK app/teszt fogyasztja
  }
}
```

- A `handlers.ts` aggregátor importja: `import { crmApiHandlers } from '@spaceos/module-crm/mocks'`.
- A tesztek `reset<Mod>Db` importjai ugyanígy a `/mocks` subpathról.
- **Kikényszerítés:** (1) a `"."` export tranzitív gráfjában msw-import tilos — automata őr:
  production build után a `dist/` chunk-halmazban `msw`/`MockServiceWorker` szignatúra-grep
  (a task „MSW handler ne kerüljön production entrypointba" kötelező bizonyítéka);
  (2) eslint `no-restricted-imports`: modul-csomagon belül a `../mocks` import a `pages/`
  és `services/` alól tiltott (ma sincs ilyen, az őr a jövőt védi).
- ⚠ **A warehouse ma megsérti ezt a mintát:** `src/modules/warehouse/index.ts` a gyökér-
  barrelből `export * from './mocks'`-ot csinál (a másik 8 modul nem). Ezt a csomagosítás
  ELŐTT vagy AZ ALATT javítani kell (ld. 3.6) — különben a warehouse világ lazy chunkja
  MSW-kódot hordozna.

### 1.4 Vite/bundle következmények

A chunk-vágást ma kizárólag az app-oldali dinamikus `import()`-ok (App.tsx `lazyPage`) és a
`manualChunks` (recharts, dnd-kit) vezérlik — **egyik sem költözik**, tehát a chunk-készlet
és a chunk-tartalom elvárása: **változatlan** (a fájl-áthelyezés a bundle-be nem ír bele,
mert a modulgráf azonos). Ez a MODULE-FOLDERS byte-azonos precedensének folytatása; a
konkrét őrt a 4.4 írja le.

---

## 2. Csomagnevek az ADR-067 namespace-rezsim szerint

Az ADR-067 a **ModuleId**-namespace-t rögzíti (`spaceos.*` = iparág-agnosztikus ERP,
`joinerytech.*` = faipari/ökoszisztéma, world ≠ module). Az npm-scope ennek 1:1 vetülete.

### 2.1 A 7 ERP-modul — `@spaceos/*`

| npm-csomag | Kanonikus ModuleId (ADR-067) | Mai mappa | Megjegyzés |
|---|---|---|---|
| `@spaceos/module-crm` | `spaceos.crm` | `src/modules/crm` (37 fájl) | |
| `@spaceos/module-controlling` | `spaceos.controlling` | `src/modules/controlling` (32 fájl) | angol kanonikus név (ADR-067 migrációs tábla); „Kontrolling" csak UI-címke |
| `@spaceos/module-hr` | `spaceos.hr` | `src/modules/hr` (37 fájl) | |
| `@spaceos/module-maintenance` | `spaceos.maintenance` | `src/modules/maintenance` (28 fájl) | **pilot-jelölt** (ERPSEP-08 is Maintenance-bundle-t pilotoz) |
| `@spaceos/module-qa` | `spaceos.qa` | `src/modules/qa` (29 fájl) | |
| `@spaceos/module-ehs` | `spaceos.ehs` | `src/modules/ehs` (56 fájl) | + wizard-döntés (3.4) |
| `@spaceos/module-dms` | `spaceos.dms` | `src/modules/dms` (24 fájl) | legkisebb — tartalék-pilot |

A `module-` előtag szándékos: a scope-on belül megkülönbözteti a modulcsomagot a közös
rétegektől (`portal-ui`, `portal-core`), és a csomagnévből visszafejthető a ModuleId
(`@spaceos/module-crm` ↔ `spaceos.crm`).

### 2.2 Közös rétegek — szintén `@spaceos/*`

A MODULE-FOLDERS jegyzete még `@joinerytech/ui` + `@joinerytech/core` munkanevet használt —
**ez az ADR-067 ELŐTT íródott**. Az ADR-067 namespace-szemantikája szerint a UI-primitívek
és a core-szolgáltatások iparág-agnosztikusak (semmi faipari bennük), tehát `spaceos.*`
oldalra tartoznak; a Doorstar/instance-kompozíció is ezeket fogyasztaná.

| npm-csomag | Tartalom (mai hely) | Megjegyzés |
|---|---|---|
| `@spaceos/portal-ui` | `src/components/ui/*` (39 fájl — benne a FormFields, QueryGate), `src/theme/*` (7 fájl: tokenek, statusTones, worldAccents, useTheme) | ⚠ a `worldAccents` világkulcs-térképe kompozíciós adat — hosszabb távon a térképet az app injektálja, de ez NEM blokkolja a mozgatást (a mechanizmus generikus, a kulcslista adat) |
| `@spaceos/portal-core` | `src/services/apiClient.ts`, `dateUtils.ts`, `fsmGuards.ts`, `offlineRetryService.ts`; `src/auth/*` (9 fájl); MSW-alap: `src/mocks/browser.ts`, `dataMode.ts` | az `ehsPhotoService.ts` NEM ide való (EHS-specifikus — 3.4); az auth költöztetése a fázisterv szerint halasztható (P1-ben opcionális, ld. 4.2) |

Az app-oldali `mocks/handlers.ts` (aggregátor) és `mocks/worlds.ts` (világ-regiszter)
**nem csomag** — kompozíciós felelősség, a gyökér-appban marad (ADR-067: a világ→ModuleId
leképezés a composition-réteg dolga, ERPSEP-06).

### 2.3 A két világ-frontend — `@joinerytech/*` kompozíciós csomagok

Az ADR-067 explicit: a portál `production` világkulcsa **nem modul**, hanem a
`joinerytech.cutting` + `joinerytech.joinery` kompozíciója; a `warehouse` a
`joinerytech.inventory` + `joinerytech.procurement` kompozíciója. A frontend-kódjuk viszont
ugyanazt a modul-mappaszabványt követi (services/mocks/pages/index.ts), tehát csomagolható —
de a név mondja ki, hogy **kompozíciós (világ-) csomag, nem katalógus-tétel**:

| npm-csomag | Fedett ModuleId-k | Mai mappa | Státusz |
|---|---|---|---|
| `@joinerytech/world-production` | `joinerytech.cutting` + `joinerytech.joinery` | `src/modules/production` (38 fájl) | committed, APPROVED (W1 done) |
| `@joinerytech/world-warehouse` | `joinerytech.inventory` + `joinerytech.procurement` | `src/modules/warehouse` (26 fájl) | **COMMITOLATLAN**; a FE/API-GATE/REVIEW sor `changes_requested`, a WORLDS-WAREHOUSE-FIX magát done-nak jelenti — a végleges státuszt a commit előtti root-kapu mondja ki (3.6) |

Ezek a csomagok az ADR-067 signed katalógusába **nem** kerülnek be saját ModuleId-vel — a
manifest-szintű leírás a mögöttes `joinerytech.*` modulokhoz tartozik majd (ERPSEP-05/06/08
hatáskör). Ha a jövőben a cutting/joinery FE-je szétválik, a world-csomag két
`@joinerytech/module-*` csomagra bontható — a mostani név ezt nem zárja el.

### 2.4 Ami NEM kap csomagot

- A ~16 legacy világ (`src/pages/*.tsx` + `src/mocks/<világ>.ts` seedek): ADR-067 szerint
  ModuleId-t sem kapnak, amíg nincs mögöttük backend — az appban maradnak. (Gábor 2026-07-27-i
  döntése szerint modernizálandók lesznek — az majd tranche-onként emeli be őket, ez a task
  nem nyúl hozzájuk.)
- A shell (layout, HomeScreen, WorldShell, RequireAuth-kompozíció): app-kód.
- Diszpécser-oldalak (`src/pages/CrmPage.tsx` stb.): app-kód — ezek adják a „modul-listát
  és instance-defaultot" (task 6. lépés).

### 2.5 GitHub Packages scope-kockázat (jelzés az ERPSEP-05/08-nak)

Az ADR-067 registry-döntése GitHub Packages. Ott **az npm-scope-nak a tulajdonos GitHub
user/org nevével kell egyeznie** — a repók ma a `Szantoi` user alatt élnek, tehát
`@spaceos/*` és `@joinerytech/*` publikáláshoz **`spaceos` és `joinerytech` GitHub org
kell** (vagy scope-kompromisszum). Ebben a körben nem blokkoló (workspace-belső fogyasztás,
nincs publish), de a publikálási körig Gábor-döntést igényel. Addig a scope-választást a
kódban véglegesnek tekintjük — a workspace-en belül bármikor átnevezhető, publikálás után már nem.

---

## 3. Előfeltétel-státusz — a MODULE-FOLDERS akadálylista MA

A MODULE-FOLDERS három akadályt sorolt fel. Mai állapot, bizonyítékkal:

### 3.1 ✅ MEGOLDVA: controlling → ehs kereszt-modul mély import

- Volt: `modules/controlling/pages/AdjustmentForm.tsx` → `modules/ehs/pages/formFields.tsx`.
- Zárta: **ERPSEP-FE-CROSS-MODULE-DEBT-01** (Codex, 2026-07-22, root review APPROVED) — a
  `SelectField`/`TextAreaField`/`DateField` a semleges `src/components/ui/FormFields.tsx`
  tulajdona lett, az `EmployeeOptions` EHS-en belül maradt.
- Mai bizonyíték: `rg "from '.*ehs.*'"` a `src/modules/controlling` fán → **0 találat**;
  a boundary-baseline `frontendCrossModuleImports: []`.
- Következmény a tervre: a MODULE-FOLDERS „formFields → @joinerytech/ui" teendője már
  teljesült (a FormFields a leendő `@spaceos/portal-ui` anyagában van).

### 3.2 ✅ MEGOLDVA: modul → legacy világ-mock seed-függések (mind az 5 él)

- Volt: `controlling/mocks/seed.ts → src/mocks/controlling.ts`, `crm/mocks/seed.ts →
  src/mocks/worlds.ts`, `hr/mocks/seed.ts → src/mocks/hr.ts`, `ehs
  EhsDashboard/RisksScreen → src/mocks/ehs.ts`.
- Zárta: **ERPSEP-FE-MOCK-SEED-OWNERSHIP** (Codex, 2026-07-22, root review APPROVED — CRM/HR/
  Controlling saját fixture-be, kanonikus service-típusokban) + **RISKS-5X5-FE** (portal
  `1f3ca31` — az EHS 5×5 mátrix API-migrációval a statikus `mocks/ehs.ts` függés megszűnt).
- Mai bizonyíték: `rg "\.\./\.\./\.\./mocks/"` a `src/modules` teljes fáján → **0 találat**
  (az egyetlen `../../mocks/` találat-pár a `modules/ehs/pages/__tests__/*` →
  `modules/ehs/mocks/riskMatrix` — **modulon belüli**, helyes irány); a boundary-baseline
  `frontendLegacyShellImports: []`.

### 3.3 ✅ RÉSZBEN KÉSZ (minta áll): mocks külön belépési pont

Mind a 9 modul-mappában él a `mocks/index.ts` külön barrel, a gyökér-`index.ts`-ek (a
warehouse kivételével — 3.6) NEM exportálják; a `handlers.ts` aggregátor és a tesztek ezt
fogyasztják. A `./mocks` subpath exportra fordítás tisztán mechanikus (1.3).

### 3.4 ⚠ ÉL: shell-oldali EHS-wizard-sziget — döntés kell (a task 5. lépése)

Mai állapot (fájlszinten ellenőrizve):

- `src/components/EHS/*` — a minden világból elérhető baleset-bejelentő wizard; a modul
  publikus API-ját fogyasztja (`StepDetails.tsx:3`, `StepReview.tsx:2`:
  `import { useEhsLocations } from '../../modules/ehs'`) — határsértés nincs, de a wizard
  EHS-domain-kód a shellben.
- `src/stores/incidentDraftStore.ts` — wizard-draft állapot (EHS-specifikus).
- `src/services/ehsPhotoService.ts` — EHS-specifikus fotó-upload.
- `src/services/offlineRetryService.ts` — **generikus** offline-retry (nem EHS-kötött).
- + az EHS-wizard MSW-végpontjai részben a shell `handlers.ts`-ben élnek
  (`/api/ehs/photos/presigned-url`, mock-S3 PUT — `handlers.ts:87-108`).

**Döntési javaslat (Gábornak): a wizard a modulcsomagba költözik, külön subpath exporttal.**

- **B (javasolt): modul-tulajdon** — `components/EHS/*` + `incidentDraftStore` +
  `ehsPhotoService` → `packages/module-ehs/src/wizard/`, a csomag `"./wizard"` subpath
  exportot ad (a fő `"."` entrypoint nem hízik, a wizard továbbra is külön lazy-elhető);
  az `offlineRetryService` (generikus) → `@spaceos/portal-core`; a wizard MSW-végpontjai a
  shell-handlers.ts-ből az ehs modul-mocksba. Így teljesül a task elfogadási kritériuma
  („a shell nem importál modulbelső oldalt vagy service-t") a legkevesebb kivétellel, és
  minden jövőbeli composition app (Doorstar) készen kapja a bejelentő-FAB-ot.
- **A (alternatíva): shell-feature marad ehs-függéssel** — nulla mozgatás, de az app tartósan
  EHS-domain-kódot hordoz, és a Doorstar-kompozícióban a wizard nem jönne „ingyen".
- Költségkülönbség kicsi (~15 fájl), a B a csomaghatár-elv felé mutat. A döntés a P3
  (EHS-csomag) fázis kapuja — addig a wizard maradhat a shellben, mert az importja már ma is
  a publikus modul-API-n át megy.

### 3.5 Új előfeltétel-tények a MODULE-FOLDERS óta

- **Boundary-őr éles** (ERPSEP-PACKAGE-BOUNDARY-PREFLIGHT, 2026-07-22, APPROVED):
  `scripts/check-erp-module-boundaries.mjs` + `config/erp-module-boundaries.json`. A
  baseline a kiadáskor 21 finding volt; a mai konfigban **15 finding maradt, mind
  backend-oldali** `backendRepoRelativeProjectReferences` (kernel/hosting-irányú, engedélyezett
  célú, de repo-relatív hivatkozások — az ERPSEP-05 dolga), **a frontend-kategóriák mind
  üresek** (a 3.1/3.2 zárások eredménye). A frontend tehát **tiszta lappal indul** a
  csomagosításnak.
- ⚠ Az őr configja a modulokat `src/joinerytech-portal/src/modules/<mod>` úton címzi —
  a mozgatással **egy commitban** frissítendő a `frontendRoot`/`sharedRoots` útvonal-készlet,
  különben a kapu hamis-pirosra vált (4.5).
- **ADR-067 ACCEPTED (2026-07-27)** — a task ERPSEP-02-függősége és a Stop-klauzula
  („package-név ADR nélkül ne") feloldva; a 2. fejezet nevei az ADR-rezsimből levezetettek,
  végleges kimondásuk Gábor jóváhagyása ezen terv elfogadásával.

### 3.6 ⚠ A 8.+9. modul: production committed, warehouse commitolatlan

- `src/modules/production` (38 fájl): committed, W1-mérföldkő done, designer APPROVED —
  csomagolható a többivel azonos jogon (kompozíciós néven, 2.3).
- `src/modules/warehouse` (26 fájl) + `src/pages/WarehousePage.tsx` +
  `vitest.contract.warehouse.config.ts`: **untracked a portál-fán**; az EPICS-ben a
  WORLDS-WAREHOUSE-FE/API-GATE/REVIEW sor `changes_requested` (a 2026-07-27-i root
  adversarial audit 5 P0 + 7 P1 leletével), miközben a WORLDS-WAREHOUSE-FIX sor done-t és
  „Warehouse világ APPROVED"-ot jelent — **az ellentmondást a warehouse-commit előtti
  root-kapu zárja le, nem ez a terv**. A tervben a warehouse **8. (ill. a productionnel 9.)
  csomagként szerepel, de utolsóként, és CSAK commitolt+lezárt állapotból** csomagolható.
- Ismert warehouse-adósság a csomaghatáron: a gyökér-barrel `export * from './mocks'`
  (1.3 anti-minta) és a `pages/index.ts` extra barrel (a többi modul nem tart ilyet) —
  a csomagolási fázisban a 7 ERP-modul mintájára hozandó (szűk, tudatos gyökér-index;
  mocks CSAK subpath).

---

## 4. Lépéssorrend a fizikai átalakításhoz

### 4.1 Inkrementális, rétegenként (nem egy nagy vágás, nem is modulonként egyesével)

**Javaslat: 5 fázis, réteghatáronként — mindegyik önállóan zöld, önállóan commitolható és
revertelhető.** Indoklás:

- Egy **big-bang** vágás (~370 fájl mozgatás + minden fogyasztó átírása egy commitban)
  a MODULE-FOLDERS-nél is nagyobb diff lenne úgy, hogy közben a package.json/tsconfig/
  lockfile réteg is változik — hiba esetén a bisect-elhetőség elvész.
- A **modulonként teljesen független** szeletelés (9 külön kör) viszont túl sok kapu-futást
  jelentene (9× teljes suite + bundle-diff), miközben a modulok közti csatolás már ma nulla —
  a kockázat nem a modulokban, hanem a **közös rétegek** kiemelésében van (azokra importál
  ~200 fájl). Ezért a fázishatár: előbb a közös réteg, aztán a modulok hullámokban.
- A MODULE-FOLDERS-lecke érvényes: Windowson futó Vite-watcher mellett könyvtár-rename nem
  megy — **fájlonkénti `git mv`** (történet-megőrzés) leállított dev-szerverrel.

| Fázis | Tartalom | Becsült érintés | Kapu |
|---|---|---|---|
| **P0 — workspace-váz** | gyökér package.json: `"workspaces": ["packages/*"]`; pnpm-lock.yaml törlés (1.2); üres packages/ szerkezet; lockfile-regenerálás | ~5 fájl + lockfile | `npm install` determinisztikus; build+teljes suite változatlan zöld; bundle-diff: azonos |
| **P1 — közös csomagok** | `@spaceos/portal-ui` (components/ui + theme) és `@spaceos/portal-core` (apiClient, dateUtils, fsmGuards, offlineRetryService, mocks/browser+dataMode; az auth költöztetése opcionálisan ide vagy P4-be — az auth 9 fájlját a RequireAuth/shell szorosan fogyasztja, ezért ha a diff hízik, maradhat app-oldalon P4-ig) | ~55 fájl mozgatás + ~150-200 fogyasztó-fájl importátírás (mechanikus) | tsc+build+teljes suite; **bundle-diff: azonos chunk-készlet, azonos méretek**; boundary-őr új configgal 0 új finding |
| **P2 — pilot ERP-modulcsomag** | `@spaceos/module-maintenance` (28 fájl; egyezik az ERPSEP-08 pilot-modul-választásával) — exports `"."` + `"./mocks"`, peer-deps minta; fogyasztók: MaintenancePage diszpécser + handlers.ts + tesztek | ~35 fájl | mint P1 + **MSW-leak őr** (1.3): dist-grep zöld; a minta-package.json ezzel kanonizálódik |
| **P3 — a maradék 6 ERP-modul két hullámban** | (3a) dms, qa, controlling; (3b) crm, hr, ehs + **EHS-wizard döntés végrehajtása** (3.4 — B esetén a wizard a module-ehs `./wizard` exportja alá, offlineRetryService már P1-ben a core-ban) | ~230 fájl + fogyasztók | hullámonként: mint P2 |
| **P4 — világ-csomagok + zárás** | `@joinerytech/world-production`; `@joinerytech/world-warehouse` (CSAK commitolt+lezárt warehouse-ból, a barrel-fix részeként); auth→portal-core, ha P1-ből halasztva; **tiltott-import őr** véglegesítése (4.5); boundary-config és task-doksik frissítése | ~70 fájl | teljes kapukészlet + keyboard-smoke + kontraktus-gate-ek |

### 4.2 Fogyasztó-átírás mechanikája

A modul-mappák belső importjai relatívak és **a mozgatással érintetlenek maradnak** (a mappa
egyben költözik `packages/<pkg>/src` alá). Csak a **külső** fogyasztók írandók át:

- diszpécser-oldalak: `import { ... } from '../modules/crm'` → `from '@spaceos/module-crm'`
  (modulonként 1-2 fájl);
- `mocks/handlers.ts`: 9 import a `/mocks` subpathra;
- modul→közös irány (P1-ben): `components/ui`/`theme`/`services/*` relatív útjai →
  `@spaceos/portal-ui` / `@spaceos/portal-core` — ez a legnagyobb tömeg (~450 importsor
  nagyságrend, a MODULE-FOLDERS mérése alapján), de gépi átírás + tsc-ellenőrzés fedi.

### 4.3 Rollback-stratégia

- **Fázis = commit-határ** a portál-repóban; a platform submodule-pin **csak a fázis-kapu
  zöldje után** lép. Visszaút: platform-pin visszaállítás + portál `git revert` (a mozgatások
  `git mv`-k, a revert tisztán visszaviszi őket).
- P0 után minden fázis **additív a workspace-vázra** — egy fázis reverte nem rántja vissza
  a korábbiakat.
- A lockfile minden fázisban a commit része (determinisztikus `npm ci`).
- Félbeszakadás-forgatókönyv (spend-limit/restart precedens az ADR-IMPL-WIRE körből): mivel
  egy fázison belül is `git mv`-k + gépi importátírás a munka, a fázis újraindítható a fázis
  eleji commitról; részállapot nem kerül a main-re, mert a pin csak kapu után lép.

### 4.4 Bundle-layout őrzés (a MODULE-FOLDERS byte-azonos precedense)

Kötelező kapu minden fázisban:

1. **Baseline-felvétel a tiszta fán** (a fizikai munka legelső lépése): `npm run build` +
   a `dist/assets` chunk-lista (név, méret, gzip-méret, tartalom-hash) fájlba mentve.
2. Fázis után újra-build + diff. Elvárás: **azonos chunk-készlet, azonos méretek** — mivel
   a lazy `import()`-ok és a `manualChunks` nem változnak, a Rollup/Rolldown kimenetnek
   tartalmilag azonosnak kell lennie; a fájlnév-hash eltérhet csak akkor, ha tartalom változott,
   tehát a hash-eltérés önmagában finding.
3. Ismert kivétel-kezelés: ha egy fázis szándékosan változtat (pl. EHS-wizard `./wizard`
   subpath — új lazy-határ), a diff a task-naplóban tételesen indoklandó, méret-iránnyal.

### 4.5 Tiltott-import őr (a task 7. lépése)

A csomagosítás után a határ kikényszerítése három, egymást fedő rétegben:

1. **Fizikai réteg (ingyen jön):** workspace-csomag csak deklarált dependency-t tud
   feloldani — modul→modul import csak akkor működne, ha a package.json-ba be is írnák
   (review-n azonnal látszik). A modul-csomagok dependency-listájában másik
   `@spaceos/module-*` **tilos** (ERP-modulok között), `@joinerytech/world-*`-ből
   `@spaceos/module-*` szintén tilos.
2. **Lint-réteg:** eslint `no-restricted-imports` — csomagon belülről `../../packages/`,
   ill. bármely `@spaceos/module-*` → másik `@spaceos/module-*` specifier tiltása; app-oldalon
   a `@spaceos/module-*/src/*` mély-specifier tiltása (csak a publikus exports-felület).
3. **Scanner-réteg:** a meglévő `check-erp-module-boundaries.mjs` configjának útvonal-
   frissítése (`frontendRoot: src/joinerytech-portal/packages/module-<mod>/src`,
   `sharedRoots` → a két közös csomag) + a baseline újra-emitálása **ugyanabban a commitban**,
   mint a mozgatás. A scanner marad a platform-szintű regressziókapu (a lint csak a portál-
   repón belül fut).

---

## 5. Kockázatok és kezelésük

| # | Kockázat | Mai tény | Kezelés |
|---|---|---|---|
| R1 | **Vitest-futás a workspace-ben.** A `test:pr`/`test:full`/`test:nightly` scriptek útvonal-szűrősek (`vitest run src/modules src/lib …`), a gyökér vite-config `test` blokkja ad jsdom+globals+setupFiles+`maxWorkers: 4` budgetet (STAB-FE-TEST-GATE) | a modul-tesztek a modul-mappákban élnek — költöznek a csomagokkal | a gyökér-configos egy-futásos modell megtartható: a szűrő-utak `packages/`-re frissülnek (`test:pr` → `vitest run packages src/lib src/hooks src/theme` mintára). Vitest 4 `projects` (workspace-mód) NEM kötelező ebben a körben — bevezetése külön, tudatos lépés legyen, mert worker-budget/riport-viselkedést változtat. A setupFiles/`globals` a gyökérből öröklődik, amíg egy futás van |
| R2 | **Teljes-suite konvenció (3 darab, előtérben).** A memória-jegyzet 3-darabos foreground-futást rögzít, mert a háttérfutásokat a környezet leállította | a darabok útvonal-alapúak (`src/modules …`) | a darabolás útvonalai a fázisokkal együtt frissítendők (P1-től: `packages` + maradék `src`-darabok); a konvenció maga változatlan. Frissítés: a ProcurementPage-kizárás OKAFOGYOTT — a STAB-FE-PROCUREMENT-OOM 2026-07-25-én KÉSZ (portal@13bf494), a suite kizárás nélkül 172/172 fájl / 1602 teszt zöld |
| R3 | **OOM-osztályú nehéz tesztfájlok.** A SmartFilter-hurok javítva, de a mutációja tanulság: render-hurok + `maxWorkers` interakció a suite-ot EXIT=1-be viheti 0 bukó teszt mellett | `maxWorkers: 4` budget él a gyökér-configban | a budget a gyökér-configban marad (egy futás, egy budget); fázis-kapunként a teljes suite fut, így egy mozgatás-indukált duplafutás/duplaregisztráció (pl. kétszer felvett setupFile) azonnal kibukna |
| R4 | **keyboard-smoke útvonalai.** `scripts/keyboard-smoke.mjs` maga indít vite dev-szervert a repo-gyökérről (`cwd: ..` a scripts-ből), 38 route-ot jár be | a smoke route-listája URL-alapú, nem fájl-alapú | az 1.1 döntés (app a gyökérben marad) miatt a script **változatlanul működik**; egyetlen érintés: ha az EHS-wizard subpath-ra kerül (3.4 B), a wizard-FAB útvonala újra-ellenőrzendő a smoke-ban. A smoke minden fázis-kapu része |
| R5 | **MSW-regisztráció szivárgás a production bundle-be.** A warehouse gyökér-barrel ma bizonyítottan re-exportálja a mocks-ot (1.3) | a másik 8 modul mintája helyes | `./mocks` subpath + dist-grep őr (1.3) + eslint-tiltás; warehouse-barrel javítás a P4 része |
| R6 | **Párhuzamos agent-szeletek a portál-fán.** A fán MA commitolatlan warehouse- és H1-szelet él; az ERPSEP-FE-WORLD-GATING task ugyanígy az App.tsx/worlds.ts környékét fogja érinteni | EPICS: „a portált egyszerre EGY FE-agent mutálhatja" | a fizikai munka CSAK tiszta fán indul (task-note szerint); a WORLD-GATING vagy a workspace-esítés ELŐTT zárul (kis diff, App/worlds-fókusz), vagy utána a csomag-API-kra írva — egyszerre a kettő tilos |
| R7 | **tsconfig/compiler ütközés a publikálható buildnél.** `allowImportingTsExtensions`+`noEmit`+`verbatimModuleSyntax` ↔ composite/declaration | 1.2 elemzés | ebben a körben forrás-export (nincs emit); a feloldás az ERPSEP-08 pilot explicit szállítója |
| R8 | **Lockfile-kettősség** (package-lock + követett pnpm-lock) | git ls-files bizonyítja | P0-ban rendezendő (pnpm-lock törlés vagy Gábor-döntés, ha valaki tudatosan tette be) |
| R9 | **Kontraktus-gate configok** (`vitest.contract.config.ts`, `vitest.contract.warehouse.config.ts`) modul-utakra mutatnak | production/warehouse services/contract mappák | a két config include-útja a world-csomagokkal együtt frissül (P4); env-only base-URL viselkedés változatlan |
| R10 | **GitHub Packages scope ≠ owner** publikáláskor | 2.5 | nem e kör blokkolója; ERPSEP-05/08 inputjaként rögzítve |

---

## 6. Becslés

- **Diff-nagyságrend (összesen):** ~370 fájl `git mv` (307 modul-fájl + ~55 közös réteg +
  wizard-készlet) + ~200-250 fájl importátírás + ~12 új package.json + tsconfig/eslint/
  scanner-config + lockfile-regenerálás. Ez a MODULE-FOLDERS (219 mv / 450 import / 194 fájl)
  ~1,5-2-szerese — de öt kapuzott fázisra osztva egyik szelet sem nagyobb a már bizonyítottan
  kezelt MODULE-FOLDERS-diffnél.
- **Fázisszám: 5** (P0 váz → P1 közös csomagok → P2 pilot-modul → P3 hat modul két hullámban
  → P4 világ-csomagok + őrök). Kapu mindenhol: tsc + build + teljes suite (3 darabban,
  előtérben) + bundle-diff + boundary-scanner + (P2-től) MSW-leak őr + keyboard-smoke.
- **Minimális első szállítható szelet: P0+P1** — workspace-váz + `@spaceos/portal-ui` +
  `@spaceos/portal-core`. Ez önmagában is értéket ad (a közös réteg határa fizikaivá válik,
  a 27+ fájlból importált QueryGate/FormFields/theme tulajdonviszonya csomagszinten
  rögzül), és minden későbbi modulcsomag előfeltétele. A P2 (maintenance-pilot) az első
  olyan szelet, ami a task fő elfogadási kritériumát („modulnak dokumentált publikus
  frontend-csomag API-ja van") demonstrálja — a P0+P1+P2 együtt ~1 fókuszált munkanap-
  nagyságrendű agent-munka, a teljes P0–P4 a kapu-futásokkal együtt 3-4 kör.
- **Nem része ennek a tasknak** (tiltott scope szerint): runtime Module Federation, backend,
  Doorstar-repo, vizuális változás, API-kontraktus — és az 1.2/2.5/R7 szerint a
  csomag-build+publish sáv (ERPSEP-05/08).

## 7. Nyitott döntések Gábornak

1. **Csomagnév-készlet jóváhagyása** (2. fejezet táblázatai) — az ADR-067-ből levezetett,
   de a végleges kimondás Gáboré (a task Stop-klauzulája szerint).
2. **EHS-wizard ownership** (3.4): B) modulcsomag `./wizard` subpath (javasolt) vagy
   A) shell-feature marad.
3. **pnpm-lock.yaml** (R8): törölhető-e (feltehetően warehouse-körből maradt), vagy tudatos.
4. **GitHub org a scope-okhoz** (2.5): `spaceos` + `joinerytech` org létrehozása a
   publikálási körig — nem most blokkoló, de döntés-jelölt.

---

## Döntési napló (Gábor, 2026-07-27 éjjel) — a 7. fejezet mind a 4 kérdése LEZÁRVA

1. **Csomagnév-készlet: JÓVÁHAGYVA** — @spaceos/module-{crm,controlling,hr,
   maintenance,qa,ehs,dms} + @spaceos/portal-ui + @spaceos/portal-core +
   @joinerytech/world-{production,warehouse} (kompozíciós csomagok).
2. **EHS-wizard: az EHS-modulcsomag `./wizard` subpath exportja alá** —
   a shell fogyasztó marad, a domain-tulajdon a modulé.
3. **pnpm-lock.yaml: TÖRLENDŐ, npm marad** — egy igazságforrás
   (package-lock.json); a workspaces npm-mel megy.
4. **GitHub orgok (spaceos, joinerytech): később, publikálás előtt** —
   az ERPSEP-08 pilot előfeltétele lesz, most nem blokkoló.

Ezzel a tervezési fázis LEZÁRVA. A fizikai átalakítás indítási feltétele
változatlan: tiszta portál-fa (WORLDS-WAREHOUSE-FIX + H1 commit után), az
5 fázis fázis=commit=revert-egység renddel, bundle-diff kapuval.
