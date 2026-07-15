# F2-KONTROLLING-REVIEW — Kontrolling modul designer review (Fázis 2, 3. modul)

> **Kiadta:** designer terminál — 2026-07-15
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-KONTROLLING-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (Kontrolling: accent slate, 5 képernyő, életciklus-címkék — NEM FSM, terv 70. sor), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`, precedensek: `docs/knowledge/qa/F2_EHS_DESIGN_REVIEW_2026-07-14.md`, `docs/knowledge/qa/F2_CRM_DESIGN_REVIEW_2026-07-14.md`
> **Vizsgált kód:** `src/joinerytech-portal` working tree (F2-KONTROLLING-FE: `src/services/controlling/`, `src/mocks/controllingApi/`, `src/pages/controlling/`, `src/pages/ControllingPage.tsx` + tesztek)
> **Módszer:** teljes Kontrolling-diff átolvasás a spec + az EHS/CRM-precedensek ellen, tesztfuttatás (Kontrolling-scope-ú vitest: **35/35 zöld**, 5 fájl — egyezik a task-jelentéssel). A HR-fájlokat (párhuzamos frontend-munka: `src/pages/hr`, `src/services/hr`, `src/mocks/hrApi`, `HrPage.tsx`) NEM érintettem.

---

## Összesített verdikt: ⚠️ CHANGES REQUESTED (szűk körű)

Az F2-KONTROLLING munka a sablon **harmadik, érett iterációja** — a `calc.ts`
számítás-tükör (a `validity.ts` FSM-mentes megfelelője) **helyes és elegáns**
megoldás, az MSW-kontraktus a backend-invariánsokat hűen tükrözi, a totális
invalidálás itt **indokolt és jól dokumentált**, az 5 képernyő terv-hű, a
nyerspaletta-fegyelem tiszta (az EHS S1-osztályú hiba nem ismétlődött meg,
minden szöveg-szín dark-páros). **Két hiba blokkol**, mindkettő kicsi
(összesen ~20 perc fix): a projekt-részlet SlideOver kategória-táblája mobilon
saját scroll-konténer nélkül csordul túl (S1), és a portfólió státusz-chipek a
CRM-ben már egyszer kijavított chip-leckét ismétlik (S2).

| Terület | Verdikt |
|---|---|
| 1. `calc.ts` backend-tükör (EAC/variance/fedezet) | ✅ APPROVED — a minta FSM-mentes modulra is bevált |
| 2. Adatréteg (`services/controlling/`) + kulcs-gyár | ✅ APPROVED |
| 3. MSW kontraktus-tükör (`mocks/controllingApi/`) | ✅ APPROVED |
| 4. Invalidálás (rule-6 totális) | ✅ APPROVED — itt ez a helyes stratégia |
| 5. Képernyők vs terv (5 képernyő) | ⚠️ **CHANGES REQUESTED** (S1 — SlideOver-tábla mobil) |
| 6. Életciklus-címkék (StatusPill, NEM FSM) | ✅ APPROVED |
| 7. Tokenek / dark / a11y | ⚠️ **CHANGES REQUESTED** (S2 — szűrő-chipek) |
| 8. Korrekció-űrlap (disabledReason) + toast | ✅ APPROVED |
| 9. Tesztek | ✅ 35/35 zöld, precedens szerinti lefedés |

---

## Blokkoló hibák

### S1 — ProjectDetailSlideOver: a kategória-bontás tábla mobilon saját scroll-konténer nélkül → az egész bottom sheet vízszintesen csúszik

`src/pages/controlling/ProjectDetailSlideOver.tsx:61-94`

A kategória-bontás nyers `<table className="w-full">` — 5 oszlop (Kategória +
Terv/Tény/EAC/Eltérés), a cellák `formatHuf` Ft-összegei nem törhetők (a
`toLocaleString('hu-HU')` ezres-elválasztója NBSP), így a tábla minimális
szélessége ~450–500 px. A SlideOver `< md` **teljes szélességű bottom sheet**
(~360–400 px): a tábla túlcsordul, és mivel a köztes konténereken nincs
`overflow-x-auto`, a görgetés a SlideOver **teljes tartalom-divjére** esik
(`SlideOver.tsx:105` — az `overflow-y-auto` miatt az overflow-x is `auto`-ra
számítódik) → a kulcsszám-grid, a fedezet-sáv és a korrekció-lista is együtt
csúszik oldalra, mindenféle affordancia nélkül.

A spec 2.4 checklist kifejezett előírása: „Vízszintesen túlcsorduló tábla
**saját** `overflow-x-auto` konténerben görög, `tabIndex={0}` + `role="region"`
+ `aria-label` a konténeren" — a DataTable primitív pontosan ezt teszi
(`components/ui/DataTable.tsx:114-119`), a kézi tábla nem.

**Fix (pár sor):** a `<table>` köré
`<div role="region" aria-label="Kategória-bontás" tabIndex={0} className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-world-ring …">`
(a DataTable-recept másolata) — desktopon (600 px panel) nem változik semmi.

### S2 — PortfolioScreen státusz-chipek: aktív állapot csak színnel + 28 px-es érintőfelület — a CRM-ben már kijavított lecke ismétlése

`src/pages/controlling/PortfolioScreen.tsx:75-88`

Az aktív chip jelzése kizárólag szín-inverzió (`bg-world text-world-fg` vs.
`bg-surface-2 text-ink-muted`), forma/ikon/súly-különbség nélkül, és a chip
`h-7` (28 px) — mindkettő a spec kifejezett szabálya ellen:

- 3.3: „az aktív chip **nem csak színnel** jelöl (pl. pipa-ikon)";
- 2. fejezet közös szabály: touch-elérésű interaktív elem **min. 44×44 px**.

Ez PONTOSAN a CRM review M2-találata, amelyet a CRM fix-köre már megoldott —
a másolható minta készen áll a repóban (`src/pages/crm/LeadsScreen.tsx:79-95`:
check-ikon `aria-hidden` + `font-semibold` az aktív chipen, `before:inset-x-0
before:-inset-y-2` pszeudó a 44 px-es függőleges célfelülethez a vizuális méret
változatlanul hagyásával). Az EHS→CRM precedens (dokumentált lecke ismétlése →
blokkolóvá emelés, ld. CRM S2) itt is érvényes. Ami jó és megmarad:
`role="group"` + `aria-label` a soron, `aria-pressed` a chipeken ✔.

**Fix:** a CRM-minta átemelése (pár sor osztálylista).

---

## Jóváhagyott területek (részletek)

### 1. `calc.ts` backend-tükör ✅ — a minta számítás-nehéz modulra is jól illik

`src/services/controlling/calc.ts` — a backend `ProjectCostCalculation`
tiszta-függvény tükre, és a megközelítés **helytálló**:

- **EAC = Σ kategóriánkénti MAX(terv, tény)** (`calc.ts:102,115`) — a backend
  `CategoryCost.Projected` szemantikája; korrekt konzervatív vetítés (a tervnél
  olcsóbban futó kategória EAC-je a terv marad, a túlfutó a tény).
- **A korrekció csak a TÉNY-t tolja** (`calc.ts:95-97`) — a terv és az EAC-alap
  érintetlen; negatív korrekció terv nélküli kategórián 0-ra vágott vetítést ad
  (a `Math.max(p, a)` fedi, tesztelt).
- Élhelyzetek rendben: 0 árbevétel → `marginPct` null (`calc.ts:65-67`), 0
  tervösszeg → `variancePct` null (`calc.ts:124`); csak-korrekciós kategória is
  megjelenik a bontásban (`calc.ts:99`); kanonikus kategória-sorrend ✔.
- **Egy igazságforrás igazoltan:** a UI (MarginVisuals a `marginBand`-del) és
  az MSW handlerek (`handlers.projects.ts:23,45-49`, `handlers.portfolio.ts`)
  ugyanazt a modult futtatják — a mock sosem térhet el a megjelenítéstől.
  A fedezet-küszöbök konfig-vezéreltek (`config.ts:15-16`).
- A kategória-kulcs térkép (magyar ↔ backend `CostCategory` enum) a fájlban
  dokumentált — a leendő OpenAPI-hoz rögzítendő előkép ✔.

### 2. Adatréteg-minta konformancia ✅

- Zod-lefedettség teljes (minden válasz `apiFetch({ schema })`-n megy át);
  a portfólió-sor **szerver-számított** összegzést hoz — nincs kliens-oldali
  N+1 (`projects.ts:56-67`) ✔
- Kulcs-gyár hierarchikus, minden kulcs a `['controlling']` prefix ALATT él —
  a detail-kulcsok (`project`, `projectCalc`) is (`keys.ts:16-17`), így az
  EHS M1 / CRM S2 detail-invalidálási csapda szerkezetileg kizárt ✔
- Toast a mutáció-hookban (siker + szerver-üzenetes hiba), a komponens csak
  hív (`adjustments.ts:83-113`) ✔
- ÁTMENETI user-név (`config.ts:32`) az EHS `CURRENT_EMPLOYEE_ID` mintájára,
  Keycloak-follow-uppal dokumentálva ✔
- README rögzíti a modul-sajátosságokat (nincs FSM, calc-tükör, totális
  invalidálás, kategória-térkép) ✔

### 3. MSW kontraktus-tükör ✅

- Állapottartó store + `resetControllingDb()`, determinisztikus seed a meglévő
  `mocks/controlling.ts` újrahasznosításával (`cat`→`category` átképzés) + 2 új
  projekt, hogy mind az 5 címke és a kockázat-KPI élő adaton látszódjon ✔
- Backend-invariáns validációk tükre: kötelező indok / nem-nulla összeg /
  hatály↔projectId → **400**, ismeretlen projekt → **404**, soft-delete →
  **204**, dupla törlés → **409** (`handlers.adjustments.ts:25-32,77-85`) ✔
- A portfólió-hatályú korrekció az összesenbe **egyszer** számít
  (`handlers.portfolio.ts:23-29`), a trend utolsó pontja a store-ból számított
  → mindig konzisztens a KPI-kkal (`handlers.portfolio.ts:61-68`) ✔
- Variance: kategória-bontás projekt drill-down sorokkal, eltérés szerint
  rendezve; a portfólió-korrekció kizárása dokumentált döntés
  (`handlers.portfolio.ts:12-14`) ✔

### 4. Invalidálás — a rule-6 totális alkalmazása ITT helyes ✅

A review-kérdésre a válasz: **igen, indokolt.** A Kontrolling minden olvasata
ugyanabból a két bemenetből (költségsorok + élő korrekciók) SZÁMÍTOTT — egy
korrekció-mutáció a lista-összegzést, a detail-kalkulációt, a vezetői KPI-kat
és a variance-t egyszerre érvényteleníti. A szelektív invalidálás itt csak
hibalehetőséget adna hozzá (pont a CRM S2-osztályú kihagyásokat); a
`controllingKeys.all` prefix-invalidálás a kulcs-gyárban indokolt és
dokumentált (`keys.ts:7-11`, `adjustments.ts:77-81`). Optimista frissítés
nincs (a korrekció-hatás nem determinisztikus kliens-oldalon — több nézetet
érint), ez is helyes óvatosság. A mutáció-teszt a frissülést végigköveti ✔.

### 5. Képernyők vs terv ✅ (mind az 5 — az S1-en túl)

- **Worlds-config:** dash / portfolio (ÚJ) / projects / variance (ÚJ) /
  adjustments (ÚJ) — az 5 terv-képernyő fül megvan (`mocks/worlds.ts:304-310`),
  `ControllingPage` 37 soros diszpécser route-tesztekkel ✔
- **Vezetői áttekintés:** 4 KPI kizárólag a hookból (portfólió-érték,
  EAC-fedezet terv/tény albontással, kockázatos projekt, EAC-túllépés db +
  összeg), kockázatos projektek listája MarginPill-lel + portfólió-link ✔;
  **fedezet-trend recharts SAJÁT lazy chunkban** (`DashboardScreen.tsx:13` —
  a recharts csak megnyitáskor töltődik) ✔
- **Portfólió:** DataTable kettős render (title-oszlop valódi fókuszálható
  `<button>` → SlideOver), szerver-oldali státusz-szűrő, érték/EAC/fedezet-pill/
  eltérés-pill oszlopok, sorszám+összérték összesítő ✔
- **Projekt-fedezet:** kártyák MarginBar-ral (EAC-alapon), terv/tény/EAC
  fedezet-%, kategória mini-sávok — az `aria-hidden` sávok mellett a terv/tény
  értékek szövegként is ott vannak sr-only címkékkel (`MarginScreen.tsx:29-34`)
  — a „nem csak szín" elv adat-szinten teljesül ✔
- **Eltérés-elemzés:** CSS-sávok (nem recharts — a chunk nem nő ✔),
  kategóriánként lenyitható projekt drill-down `aria-expanded`-del,
  portfólió-összesen lábléc előjellel ÉS színnel (dark-párral) ✔
- **Utókalkuláció:** korrekció-lista DataTable-ben (hatály-pill + projektnév,
  előjeles összeg + / − karakterrel is), üres állapot elsődleges akcióval,
  új-korrekció SlideOver-űrlap ✔

### 6. Életciklus-címkék — helyesen NEM FSM-stílusú ✅

A terv 70. sora szerinti döntés hiánytalanul érvényesül: nincs `fsm.ts`, nincs
transition-végpont, nincs FsmStepper/TransitionPanel a Kontrollingban — a
címke a projekt-törzs adata, a UI csak megjeleníti. A `StatusPill
fsm="kontrollingProjekt"` a `theme/fsmTones.ts:60-63` visszafogott készletét
használja (neutral/progress/info/success/warn — nincs danger/terminal dráma),
a Portfólió alcíme explicit kimondja: „nem szigorú FSM" ✔. A tónusválasztás a
spec 1.5 térképével betűre egyezik ✔.

### 7. Tokenek / dark / a11y ✅ (az S2-n túl)

- **Nyerspaletta-fegyelem:** a `pages/controlling` fa MINDEN szöveg-színű nyers
  paletta-osztálya dark-páros (`text-rose-700 dark:text-rose-400` /
  `text-emerald-700 dark:text-emerald-400` — 6 előfordulás, mind ✔). Az EHS S1
  hiba nem ismétlődött meg. A maradék nyers osztály kizárólag dekoratív,
  `aria-hidden` sáv-kitöltés (-400/-500 közép-lépcsők, dark felületen is
  láthatók) — ld. N3.
- Világ-akcent: `accent: 'slate'` a worlds-configban, a chipek/gombok/
  fókusz-ringek `world-*` tokenből oldódnak fel ✔
- SlideOver: F1-es primitív (fókusz-csapda, inert háttér, mobil bottom sheet
  + „Vissza" gomb, safe-area) — helyes használat mindhárom helyen ✔
- DataTable: caption, `th[scope]` + `aria-sort` + aria-live rendezés-bejelentés,
  mobilon kártya-lista címkézett rendezés-selecttel; a „Művelet" oszlop
  `mobile: 'meta'` → a törlés-akció kártya-nézetben is elérhető ✔
- Billentyűzet: minden interakció natív `<button>`/`<select>`; drill-down
  `aria-expanded`; QueryGate skeleton `aria-busy` / hiba `role="alert"` + Újra ✔
- Trend-diagram: `aria-hidden` + sr-only összefoglaló + szöveges jelmagyarázat,
  ahol a terv-vonal **szaggatott** (nem csak szín különbözteti meg) ✔

### 8. Korrekció-űrlap (disabledReason) + toast ✅

`AdjustmentForm.tsx` — a backend-invariánsok kliens-oldali tükre pontosan a
plan 3. vezérelv szellemében: a tiltott beküldés NEM rejtett, hanem
`disabledReason`-nel magyarázott, prioritásos üzenet-lánccal („Rögzítés
folyamatban…" → „Válassz projektet." → „Adj meg nullától eltérő összeget." →
„Az indok kötelező (audit trail).", `AdjustmentForm.tsx:27-35`) — az üzenetek
az MSW 400-as guard-üzeneteivel tartalmilag egyezők ✔. Mezők az EHS
`formFields` címkézett primitívjeivel; hatály-váltásnál a payload helyesen
nullázza a projectId-t (`AdjustmentForm.tsx:43`); siker/hiba toast a
mutáció-hookban (szerver-üzenettel) ✔. A mutáció-folyam teszt a tiltott
beküldést (aria-disabled + tooltip), a 201-et, a toastot és a store-t is
asszertálja ✔.

---

## Kért javítások (nem blokkoló) és megjegyzések

- **M1 — AdjustmentsScreen: közös törlés-mutation fagyasztja az összes sort**
  (`src/pages/controlling/AdjustmentsScreen.tsx:16,60-71`): egy
  `useDeleteAdjustment` példány van a listára — törlés közben MINDEN sor
  „Törlés folyamatban…" disabledReason-t kap. Ez a CRM M1 lecke ismétlése; a
  soronkénti mutation-példány mintája készen áll (EHS `PpeScreen`, CRM
  `TaskRow` — `src/pages/crm/TasksScreen.tsx:16-48`). Kérve az S-körrel együtt.
- **M2 — Dashboard: hardcode-olt kockázati küszöb** 
  (`src/pages/controlling/DashboardScreen.tsx:53,55`): az EAC-fedezet KPI
  tónusa `< 0.15` literállal dönt, a felirat „a 15%-os küszöb alatt" fix
  szöveg — miközben a küszöb konfig-vezérelt (`config.ts:15,22`,
  `MARGIN_WEAK_THRESHOLD`/`AT_RISK_MARGIN_THRESHOLD`). Küszöb-módosításnál a
  KPI és a szöveg elszakadna a tényleges (MSW-oldali) besorolástól — QUALITY.md
  3. pont (config-vezéreltség). Fix: import + `formatPct` a feliratba.
- **M3 — Trend-diagram sr-only alternatívája túl vékony**
  (`src/pages/controlling/MarginTrendChart.tsx:46-49`): a rejtett összefoglaló
  csak a pontok számát és az utolsó hónapot mondja el — a 6 havi trend maga nem
  hozzáférhető SR-felhasználónak. A CRM Forecast precedense (teljes
  hozzáférhető táblázat-nézet caption + th scope-pal) a követendő minta; kérve,
  nem blokkoló.
- **N1 — Trend-diagram dark-mód:** a rács/tengely/tooltip light hexek
  (`MarginTrendChart.tsx:27-38`) és a jelmagyarázat-sávok dark-pár nélkül
  (`:51-53`) — a task follow-up 5. pontja dokumentálja, a CRM N1-gyel közös
  tokenszintű dark-epic tétel → **elfogadva tracked backlogként**.
- **N2 — Világ-kártya badge elavult** (`src/mocks/worlds.ts:303`): „4 projekt"
  — a seed már 6 projektet ad. Kozmetikai (statikus Home-rács adat).
- **N3 — Mini-sávok szín-only megkülönböztetése** (`MarginScreen.tsx:25`,
  `VarianceScreen.tsx:31`): a terv feletti tény sáv `bg-rose-400`, egyébként
  `bg-slate-500` — hasonló világosságú hue-k, színtévesztőnek nehezen elváló.
  A sávok `aria-hidden` dekorációk és az értékek szövegként mellettük állnak
  (+ VariancePill), ezért nem blokkoló; az S-körben megfontolható a terv
  feletti sávra extra forma-jelzés (pl. a VarianceScreen mintájára a
  fejléc-magyarázat mellett textúra/ikon).
- **N4 — Törlés megerősítés nélkül:** az utókalkulációs (audit trail) tétel
  egy kattintással törölhető — a backend-oldali soft-delete miatt
  visszaállítható, és a CRM N4 precedens szerint UX-megfontolásként rögzítve,
  nem kérve.
- **N5 — Portfólió-korrekció a nézetek között:** a vezetői KPI-k tartalmazzák
  a portfólió-hatályú korrekciót, az Eltérés-elemzés összesenje (projekt-alapú)
  nem — a döntés a handlerben dokumentált (`handlers.portfolio.ts:12-14`),
  de a variance-lábléc mellé egy rövid megjegyzés („projekt-hatályú tételek")
  megelőzné a vezetői „miért nem egyezik?" kérdést. Opcionális.
- **N6 — `QueryGate` továbbra is az EHS-ből importált** — a promótálás
  tracked follow-up (immár 3 modul importálja), a CRM N5-tel közös mini-task ✔.

---

## Tesztek

Kontrolling-scope-ú futtatás (`npx vitest run src/services/controlling
src/pages/controlling src/pages/__tests__/ControllingPage.test.tsx`):
**5 fájl / 35 teszt — mind zöld** (egyezik a task-jelentéssel). Lefedik: a
calc tiszta függvényeit (EAC=MAX, korrekció csak tény, 0-vágott vetítés,
küszöbök, null-ágak); az MSW-kontraktust (lista+szűrő, kalkuláció
korrekcióval, create→azonnali tükröződés, 400/404/409/204 ágak, portfólió-KPI
konzisztencia a trend-ponttal, variance drill-down); a UI-t (smoke mind az 5
képernyőre, mutáció-folyam aria-disabled+tooltip→201+toast→lista-frissülés,
törlés-folyam, route-diszpécser).

Megjegyzés: az S1/S2 fixhez teszt is jár — S1: a kategória-tábla konténere
`role="region"` + `aria-label` asszertálható; S2: az aktív chip check-ikonja
a meglévő smoke-tesztbe illeszthető (a CRM `pipelineStageMove` affordancia-
asszertjeinek mintájára).

---

## Kért javítások összefoglalva (re-review scope)

| # | Fájl | Mi | Súly |
|---|---|---|---|
| S1 | `src/pages/controlling/ProjectDetailSlideOver.tsx:61-94` | Kategória-tábla saját `overflow-x-auto` + `role="region"` + `aria-label` + `tabIndex={0}` konténerbe (spec 2.4; DataTable.tsx:114-119 recept) | blokkoló |
| S2 | `src/pages/controlling/PortfolioScreen.tsx:75-88` | Aktív chip nem-szín jelzés (check-ikon + font-semibold) + 44 px-es touch-célfelület (`before:` pszeudó) — a CRM-fix mintája (`LeadsScreen.tsx:79-95`) | blokkoló |
| M1 | `src/pages/controlling/AdjustmentsScreen.tsx:16,60-71` | Soronkénti delete-mutation (EHS PpeScreen / CRM TaskRow minta) | kérve, nem blokkoló |
| M2 | `src/pages/controlling/DashboardScreen.tsx:53,55` | Küszöb a configból (`MARGIN_WEAK_THRESHOLD`), felirat számítva | kérve, nem blokkoló |
| M3 | `src/pages/controlling/MarginTrendChart.tsx:46-49` | Teljes hozzáférhető adat-alternatíva a trendhez (CRM Forecast minta) | kérve, nem blokkoló |
| N1–N6 | ld. fent | apróságok / tracked backlog | opcionális |

Az S1+S2 javítás után a Kontrolling ✅ APPROVED-ra váltható — a re-review a két
fix célzott ellenőrzésére korlátozódik (mobil bottom sheet + chip-affordanciák),
az adatréteg/calc/MSW mag újranyitása nélkül. A `calc.ts` számítás-tükör minta
**már most ajánlott sablon** a hátralévő számítás-nehéz képernyőkhöz
(Maintenance állásidő, QA statisztika). A repo-gyökér `CLAUDE.md` Kontrolling
sora a régi prototípus-review APPROVED-ját őrzi — a jelen review a
PORTÁL-implementációra vonatkozik, a CLAUDE.md-t nem módosítottam.

---

_Designer terminál — JoineryTech sziget. Re-review: az S1/S2 fix után jelezz a designer mailboxba._
