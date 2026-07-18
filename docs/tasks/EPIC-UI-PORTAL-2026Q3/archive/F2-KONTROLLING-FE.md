# F2-KONTROLLING-FE — Kontrolling modul-képernyők + adatréteg (Fázis 2, 3. modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F2
- **Előfeltétel:** F2-EHS-FE (adatréteg-minta: `src/services/ehs/README.md`) · F2-CRM-FE (MSW-first minta, `fsmGuards`) · F1 primitívek (DataTable, StatusPill+FSM_TONES, SlideOver, Button disabledReason, Toast)
- **Akcent:** slate (worlds-config `kontrolling` + `[data-world]` tokenek — F1-A óta készen)

## Feladat

A Kontrolling modul portál-oldali kiépítése az EHS/CRM-ben rögzített adatréteg-mintára:
1. **Adatréteg** (`src/services/controlling/`): zod sémák + fetcherek + TanStack Query hookok — portfólió (életciklus-címkével), projekt-fedezet (terv/tény/EAC kategória-bontással), eltérés-elemzés, költség-korrekciók (utókalkuláció); MSW tükör állapottartó store-ral, determinisztikus seeddel.
2. **Képernyők** (terv szerint): Vezetői áttekintés, Portfólió, Projekt-fedezet, Eltérés-elemzés, Utókalkuláció.
3. **Tesztek** + teljes suite + build + lint.

### ⚠️ Backend-gap (follow-up a backend terminálnak)

- **Nincs futtatható Kontrolling host/OpenAPI** (F0 API-kontraktus-audit blocker **G0.1**, Kontrolling-specifikusan **G3.2**) — a `spaceos-modules-kontrolling` domain/Application rétege **KÉSZ** (EAC, variance, cost-adjustment, overhead), a `MapKontrollingEndpoints()` definiált, de sehol nincs host-ba kötve. A kontraktus ezért **MSW-FIRST** tükör (`src/mocks/controllingApi/`), a backend `/api/kontrolling` route-jaira és DTO-elnevezéseire igazítva (EAC = kategóriánkénti `MAX(terv, tény)` — `CategoryCost.Projected`; `CostAdjustment` invariánsok: kötelező indok, nem-nulla összeg, scope↔projectId, soft-delete).
- **Projekt-lista endpoint hiányzik a backendből (G3.1)**: a backend a projektet külső entitásként kezeli (`IIntegrationDataProvider`), a `draft/active/install/done/on_hold` címkék csak a portal-mockban élnek — a `GET /api/kontrolling/projects` MSW-kontraktusa (számított összegzéssel) a rögzítendő előkép; a projekt-státusz gazdájáról root-döntés kell.
- Kategória-kulcs térkép (kanonikus magyar ↔ backend `CostCategory` enum): anyag=Material, munka=Labor, bermunka=Subcontracting, szallitas=Logistics, beszallito=Supplier, rezsi=Overhead — a leendő OpenAPI-ban rögzítendő.

### Megjegyzés: nincs FSM

A terv (70. sor) szerint a projekt-címkék **nem szigorú FSM-t** alkotnak — ezért itt nincs `fsm.ts`, nincs transition-végpont, és a `services/fsmGuards.ts` nem alkalmazható (nem is erőltettük). A címkék tónusai a `theme/fsmTones.ts` meglévő `kontrollingProjekt` készletéből jönnek (neutral/progress/info/success/warn — visszafogott skála).

## Kivitelezés

### 1. Adatréteg (`src/services/controlling/` — az EHS-minta másolata, ld. `services/controlling/README.md`)
- `config.ts`: API base (`/api/kontrolling` — a backend route-tükör), fedezet-küszöbök (`MARGIN_WEAK=0.15`, `MARGIN_GOOD=0.30`), kockázati küszöb, trend-hossz; ÁTMENETI user-név a korrekció-audithoz.
- `calc.ts`: a backend `ProjectCostCalculation` **számítás-tükre tiszta függvényekként** (az EHS `validity.ts` megfelelője): kategóriánkénti terv/tény összegzés + korrekció-hatás, **EAC = Σ MAX(terv, tény)**, variance(+%), fedezet-százalékok, fedezet-sáv besorolás. **Ugyanezt futtatja a UI és az MSW mock** — egy igazságforrás.
- `projects.ts`: projekt/portfólió-sor/kalkuláció sémák + `useProjects` (státusz-szűrő), `useProject`, `useProjectCalc`; a portfólió-sor a szerver-számított összegzést hozza (nincs kliens-oldali N+1).
- `portfolio.ts`: vezetői összegzés séma (KPI-k: portfólió-érték, fedezetek, kockázatos projektek listával, EAC-túllépés darab+összeg, fedezet-trend) + `usePortfolioSummary`.
- `variance.ts`: kategóriánkénti terv/tény/eltérés + projektenkénti drill-down sorok + `useVariance`.
- `adjustments.ts`: korrekció-séma (előjeles összeg, kötelező indok, projekt/portfólió hatály) + `useAdjustments`, `useCreateAdjustment`, `useDeleteAdjustment` (toast a hookban).
- `keys.ts`: hierarchikus kulcs-gyár. **Kereszt-invalidálás (EHS README 6. szabály) itt totális:** a korrekció a kategória tény-költségét módosítja, ami MINDEN számított olvasatot érint (lista, detail-kalkuláció, KPI-k, variance) → a mutációk a `controllingKeys.all` prefixet invalidálják (dokumentálva a kulcs-gyárban).

### 2. MSW kontraktus-tükör (`src/mocks/controllingApi/`)
- Állapottartó store (`db.ts`, `resetControllingDb()`); minden számított válasz a `services/controlling/calc.ts`-szel készül.
- `seed.ts`: a meglévő `mocks/controlling.ts` CTRL_PROJECTS-et **újrahasznosítja** (a `cat`→`category` kulcs-átképezéssel), kiegészítve 2 új projekttel (draft + on_hold), hogy mind az 5 címke és a „kockázatos projekt" KPI élő adaton látszódjon; 3 seed-korrekció (projekt-jóváírás, projekt-többlet, portfólió-hatályú) + determinisztikus fedezet-trend előzmény; stabil `CONTROLLING_SEED_IDS`.
- Handlerek: projekt lista(+`status` szűrő, számított összegzéssel)/detail/`cost-calculation`; `portfolio/cost-calculation` (a portfólió-hatályú korrekció **egyszer** számít az összesenbe; a trend utolsó pontja a store-ból számított → mindig konzisztens a KPI-kkal); `variance` (projekt-drill-down, eltérés szerint rendezve); korrekció lista(+`projectId` szűrő)/create (backend-invariáns validációk → **400**, ismeretlen projekt → **404**)/delete (soft-delete → **204**, dupla törlés → **409**).
- Bekötve a globális `mocks/handlers.ts`-be.

### 3. Képernyők (`src/pages/controlling/`, `ControllingPage.tsx` vékony diszpécser; worlds-config: dash / **portfolio (ÚJ)** / projects / **variance (ÚJ)** / **adjustments (ÚJ)**)
- **Vezetői áttekintés** (`DashboardScreen`): 4 KPI — portfólió-érték (+db, számlázva), EAC-fedezet (terv/tény albontással), kockázatos projekt (küszöb alatt), EAC-túllépés (db + terv feletti összeg) — + **fedezet-trend diagram** (recharts vonaldiagram, terv szaggatott/tény slate; **saját lazy chunk**: `MarginTrendChart` `React.lazy()`-vel, a recharts csak megnyitáskor töltődik) + kockázatos projektek listája (link a portfólióra).
- **Portfólió** (`PortfolioScreen`): DataTable (≥md tábla / <md kártya kettős render) — életciklus **StatusPill** (`kontrollingProjekt` tónus-készlet, címke-térkép, NEM FSM), érték/EAC-költség/fedezet-pill/eltérés-pill oszlopok, státusz-chip szűrő (szerver-oldali); sor-cím → detail SlideOver.
- **Projekt-részlet SlideOver** (`ProjectDetailSlideOver`): címke + fedezet-pill, kulcsszámok (érték/számlázott/terv/tény/EAC/eltérés), **MarginBar**, kategória-bontás tábla (terv/tény/EAC/eltérés + összesen), a projekt élő korrekcióinak listája.
- **Projekt-fedezet** (`MarginScreen`): projektenkénti kártyák — MarginBar (EAC alapon), terv/tény/EAC fedezet-%, **kategória-bontás mini-sávokkal** (halvány=terv, színes=tény, piros ha terv feletti); kattintásra SlideOver.
- **Eltérés-elemzés** (`VarianceScreen`): kategóriánkénti terv vs. tény sávok (CSS, nem recharts — nem nő a chunk) + eltérés-pill, kategóriánként lenyitható **projekt drill-down** (aria-expanded), portfólió-összesen lábléc.
- **Utókalkuláció** (`AdjustmentsScreen` + `AdjustmentForm`): korrekció-lista DataTable-ben (hatály-pill + projektnév, kategória, előjeles összeg, dátum+rögzítő, törlés) + **új-korrekció űrlap** SlideOverben — a backend-invariánsok kliens-oldali tükrével: a tiltott beküldés NEM rejtett, hanem `disabledReason`-nel magyarázott (aria-disabled + tooltip: „Válassz projektet." / „nullától eltérő összeg" / „indok kötelező"); siker/hiba toast a mutáció-hookban.
- Közös: `labels.ts` (címke-térképek + formázók), `MarginVisuals.tsx` (MarginBar/MarginPill/VariancePill — a fedezet-sávok a `calc.marginBand`-ből); a `QueryGate` az EHS-ből importált (promótálása follow-up, ahogy a CRM-nél).

## Eredmény

- A Kontrolling a **harmadik modul** a típusos adatréteg-mintán — a minta FSM nélküli, **számítás-nehéz** modulra is jól illik (a `calc.ts` tükör-modul a `validity.ts` szerepét veszi át).
- A gap-analízis Kontrolling-hiányai lezárva: adatréteg ✅ (MSW+Query, korrekció-mutáció perzisztál és minden nézetet frissít), dedikált eltérés-képernyő ✅, EAC/utókalkuláció a UI-ban ✅ (a backend domain-képességei végre látszanak), portfólió-tábla kártya-renderrel ✅ (DataTable), vezetői trend-diagram ✅.
- Build zöld; a Kontrolling lazy chunkja ~26,5 kB raw / ~6,9 kB gzip, a trend-diagram külön chunk (`MarginTrendChart`), a recharts a megosztott lazy vendor-chunkban.

## Fájlok

**ÚJ** — adatréteg: `src/services/controlling/{README.md,index.ts,config.ts,keys.ts,calc.ts,projects.ts,portfolio.ts,variance.ts,adjustments.ts}`
**ÚJ** — MSW: `src/mocks/controllingApi/{index.ts,db.ts,seed.ts,handlers.projects.ts,handlers.portfolio.ts,handlers.adjustments.ts}`
**ÚJ** — UI: `src/pages/controlling/{labels.ts,MarginVisuals.tsx,MarginTrendChart.tsx,DashboardScreen.tsx,PortfolioScreen.tsx,MarginScreen.tsx,VarianceScreen.tsx,AdjustmentsScreen.tsx,AdjustmentForm.tsx,ProjectDetailSlideOver.tsx}`
**MÓDOSÍTVA:** `src/pages/ControllingPage.tsx` (292→~37 sor diszpécser), `src/mocks/handlers.ts` (controllingApiHandlers bekötés), `src/mocks/worlds.ts` (kontrolling képernyő-fülek: +portfolio/+variance/+adjustments)
**TESZT:** ÚJ `src/services/controlling/__tests__/{calc,controllingApi}.test.ts`, `src/pages/controlling/__tests__/{controllingTestUtils.tsx,controllingScreens.smoke.test.tsx,adjustmentFlow.test.tsx}`; ÚJRAÍRVA `src/pages/__tests__/ControllingPage.test.tsx` (statikus-mock helyett MSW + route-diszpécser)
**VÁLTOZATLAN:** `src/mocks/controlling.ts` (seed-forrásként újrahasznosítva; a `theme/__tests__/statusTones.test.ts` is importálja) · CRM/EHS fájlok (párhuzamos designer-review miatt zárolva — csak import irányban használtuk őket)

## Tesztek

- **Új/frissített Kontrolling-tesztek: 35/35 zöld** (5 fájl):
  - `calc.test.ts` (tiszta függvények): kategória-összegzés, EAC=MAX(terv,tény), korrekció csak a tényt tolja, terv nélküli kategóriára adott negatív korrekció (vetítés 0-ra vágva), kanonikus sorrend, összesenek+fedezetek, 0 árbevétel → null, fedezet-sáv küszöbök.
  - `controllingApi.test.ts` (msw/node + `resetControllingDb`): lista (6 projekt, számított összegzés konkrét Ft-értékekkel), státusz-szűrő, 404; kalkuláció a projekt-korrekcióval; korrekció-lista+szűrő; create → a kalkuláció azonnal tükrözi; validációk (indok/nulla/hatály-invariáns → 400), ismeretlen projekt → 404; soft-delete → kalkuláció visszaáll, dupla törlés → 409; portfólió KPI-k (portfólió-korrekció EGYSZER; kockázatos=1, EAC-túllépés=5), trend utolsó pontja = számított aktuális hónap; variance kategória-összesenek + drill-down + portfólió-korrekció kizárva.
  - UI: smoke render mind az 5 képernyőre (KPI-k, kettős render + címke-pillek + szűrő-működés, fedezet-kártyák, drill-down lenyitás, korrekció-lista); **mutáció-folyam** (tiltott beküldés aria-disabled+tooltip → kitöltés → 201 + toast + lista-frissülés + store-ellenőrzés; törlés → toast + eltűnés + soft-delete a store-ban); ControllingPage route-teszt (6 eset, SlideOver-nyitással).
- **Teljes suite:** `npx vitest run` → **1232 passed / 19 failed (1251)** — a 19 hiba a dokumentált, Kontrollingtól független pre-existing készlet (BOMPreviewCard, catalogFilterPersistence, configurator, WorkOrderSummary, ProcurementPage); Kontrolling-fájl nincs köztük. (A smoke tesztek a teljes-suite párhuzamos terhelésre bő timeoutot kaptak.)
- **Build:** `npm run build` ✅ (tsc -b + vite) · **ESLint:** módosított/új fájlok tiszták.

## Nyitott kérdések / follow-up

1. **Backend Kontrolling host + Swagger (G0.1/G3.2)**: a `mocks/controllingApi` route-készlet + `services/controlling` zod-sémák a rögzítendő kontraktus-előkép; a `GET /projects` (címke-forrás, G3.1) backend-oldali gazdájáról root-döntés kell.
2. **Fedezet-trend endpoint**: a backendben nincs történeti trend-query — az MSW-kontraktus a `portfolio/cost-calculation` válaszában adja (`marginTrend`); backend-oldalon havi zárás/snapshot mechanizmus kell hozzá.
3. **`QueryGate` promótálás** `components/ui`-ba (a CRM-follow-up-pal közös — most már 3 modul importálja az EHS-ből).
4. **Overhead-konfiguráció UI**: a backend `overhead-config` végpontjai (allokációs módszer + ráta + szabályok) még nem kaptak képernyőt — a mock-seed fix 12%-os rezsisorokkal dolgozik; külön mini-task.
5. **Trend-diagram dark-mode**: a recharts rács/tengely színei light-tokenek (a CRM Forecast-tal közös epic-elem).
