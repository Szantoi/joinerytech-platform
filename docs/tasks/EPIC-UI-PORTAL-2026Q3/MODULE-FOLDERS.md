# MODULE-FOLDERS — Frontend modul-konszolidáció (1. lépcső a MODULE-PACKAGES felé)

**Státusz:** ✅ KÉSZ (2026-07-16, frontend terminál)
**Cél:** a 7 modul (crm, controlling, dms, ehs, hr, maintenance, qa) csomagolható
egységekbe rendezése a portal frontendben, hogy a MODULE-PACKAGES lépésben npm
workspace-csomagként kiszervezhetők legyenek (alap ERP-projekt / Doorstar-instans).

---

## Mi történt

### Új struktúra

```
src/modules/<mod>/
  ├── services/   ← volt: src/services/<mod>/     (adatréteg: kliens + TanStack Query hookok + FSM + config)
  ├── mocks/      ← volt: src/mocks/<mod>Api/     (MSW kontraktus-tükör, állapottartó db + seed)
  ├── pages/      ← volt: src/pages/<mod>/        (világ-képernyők + labels + __tests__)
  └── index.ts    ← ÚJ: tudatos PUBLIKUS API (csak amit a shell/más modul ténylegesen használ)
```

- **219 fájl** mozgatva `git mv`-vel (történet megőrizve): ehs 41, crm 35, hr 35,
  controlling 30, qa 28, maintenance 27, dms 23. A könyvtárnevek a valóságot
  követték: a Kontrolling mappaneve `controlling`, a mocks mappák `<mod>Api`
  formájúak voltak (pl. `qaApi`) — mind egységesen `modules/<mod>/mocks` lett.
- **450 import átírva 194 fájlban** mechanikusan (régi hely szerint feloldás →
  új helyről relatív út újraszámolás), majd a külső fogyasztók kézzel a modul
  indexére állítva. Alias-konvenció (`@/…`) NINCS a kódbázisban, ezért relatív
  importok maradtak — a modulon belüliek változatlanul relatívak.
- A fájlmozgatás a futó Vite dev szerver mellett történt (Windows: a watcher
  miatt könyvtár-rename nem megy, fájlonkénti `git mv` igen).

### Publikus API-k (index.ts) — export-darabszám

| Modul | Exportok | Tartalom |
|---|---|---|
| controlling | 5 | 5 világ-képernyő |
| crm | 6 | 6 világ-képernyő |
| dms | 3 | 3 világ-képernyő |
| ehs | 8 | 6 világ-képernyő + `ehsKeys` + `useEhsLocations` (a shell-oldali EHS wizardnak) |
| hr | 6 | 6 világ-képernyő |
| maintenance | 4 | 4 világ-képernyő |
| qa | 4 | 4 világ-képernyő |

A diszpécser-oldalak (`src/pages/CrmPage.tsx`, `EhsPage.tsx`, …, `DocsPage.tsx`)
és a `src/components/EHS` wizard kizárólag a modul-indexen át importálnak.
Viselkedés-változás nulla: minden re-export a mai nevén fut.

### Mocks: KÜLÖN belépési pont (tudatos döntés)

Az MSW kontraktus-tükör NEM része a gyökér-indexnek, hanem saját belépési
pontja van: `modules/<mod>/mocks` (a meglévő mock-barrel). Így importál a
`src/mocks/handlers.ts` aggregátor és az összes teszt (`<mod>ApiHandlers`,
`reset<Mod>Db`). Ok: ha a gyökér-index re-exportálná a mockokat, a msw-handler
regisztráció (top-level `http.get(...)` hívások, nem tree-shakelhetők) a világok
lazy chunkjaiba szivárogna. **MODULE-PACKAGES-ben ez `"./mocks"` subpath export
lesz a package.json-ban** — a minta már most ezt tükrözi.

## Kereszt-modul importok (MODULE-PACKAGES előfeltétel-lista)

1. **controlling → ehs:** `modules/controlling/pages/AdjustmentForm.tsx` importálja
   a `SelectField`/`TextAreaField` űrlap-segédeket a `modules/ehs/pages/formFields.tsx`-ből.
   Ez az EGYETLEN kereszt-modul import a kódbázisban. Szándékosan MÉLY import
   maradt (nem az ehs index): a barrel-en át a teljes EHS világ közös chunkba
   emelkedne (mérve: +50 kB a controlling világnak; a baseline-ban csak az
   1,67 kB-os `formFields` chunk osztott). **Teendő a MODULE-PACKAGES-ben:** a
   formFields (SelectField, TextAreaField, DateField, EmployeeOptions) kiemelése
   a @joinerytech/ui-ba — ezzel a kivétel megszűnik.

2. **Modul → legacy világ-mockok** (seed-adat függések a régi prototípus-rétegre):
   - `modules/controlling/mocks/seed.ts` → `src/mocks/controlling.ts` (`CTRL_PROJECTS`)
   - `modules/crm/mocks/seed.ts` → `src/mocks/worlds.ts` (`LEADS`, `OPPS`, `CRM_TASKS`)
   - `modules/hr/mocks/seed.ts` → `src/mocks/hr.ts` (`EMPLOYEES`, `HR_PAY_GRADE_META`)
   - `modules/ehs/pages/EhsDashboard.tsx` + `RisksScreen.tsx` → `src/mocks/ehs.ts`
     (statikus dashboard/kockázat-adatok, amiknek még nincs érett adatrétege)
   **Teendő:** a seed-adatok bemásolása a modulba VAGY a legacy mock-réteg
   kivezetése, mielőtt a modul önálló csomag lesz.

3. **Shell-oldali EHS-sziget:** a minden világból elérhető baleset-bejelentő
   wizard a shellben él, de EHS-specifikus: `src/components/EHS/*` +
   `src/stores/incidentDraftStore.ts` + `src/services/ehsPhotoService.ts` +
   `src/services/offlineRetryService.ts`. Ma az ehs modul publikus API-ját
   használja (`useEhsLocations`, tesztben `modules/ehs/mocks`). **Teendő:**
   MODULE-PACKAGES-ben eldönteni — az ehs csomag exportálja a wizardot, vagy
   shell-feature marad ehs-függéssel (az offlineRetryService generikus, az
   inkább @joinerytech/core).

## Mi tartozik majd hova a 2. lépcsőben (nem mozdult, jegyzet)

- **@joinerytech/ui:** `components/ui/*` (primitívek), `theme/*` (tokenek,
  statusTones, worldAccents, useTheme), + az ehs `formFields` kiemelve (1. pont).
- **@joinerytech/core:** `services/apiClient.ts`, `services/fsmGuards.ts`,
  `services/dateUtils.ts`, `services/offlineRetryService.ts`, `auth/*`,
  MSW-alap (`mocks/browser.ts` + handlers-kompozíció mint kompozíciós gyökér).
- **Instans-app (apps/…):** diszpécser-oldalak (`src/pages/<Mod>Page.tsx`),
  `App.tsx` route-ok + lazy import()-ok, `mocks/worlds.ts` világ-regisztráció,
  `mocks/handlers.ts` aggregátor — ezek adják a modul-listát + configot.

## Ellenőrzés (mind zöld)

- `npx tsc -b` tiszta; `npm run build` zöld.
- **Bundle-layout byte-azonos a baseline-nal** (chunk-készlet diffelve): a 7 világ
  lazy chunkja változatlan méretű — ControllingPage 27,05 / DocsPage 28,16 /
  MaintenancePage 37,61 / CrmPage 40,06 / HrPage 43,11 / QualityPage 47,80 /
  EhsPage 152,80 kB; shell index 374,95 kB; `formFields` osztott chunk 1,67 kB.
- Teljes `npx vitest run`: **1418 passed / 19 failed (1437)** — a 19 bukó a
  jegyzett pre-existing készlet (configurator/BOM/procurement, FIX-PREEXISTING-TESTS
  backlog), modul-teszt nem bukik, új bukás nincs. Log a session scratchpadban
  (`vitest-module-folders.log`), nem a portal fában.
- Célzott eslint az érintett fájlokra: 0 hiba (a környéken talált 12 hiba mind
  NEM módosított fájlban lévő pre-existing lint-adósság).

_Frontend terminál, 2026-07-16 — commit a root terminál döntése után._
