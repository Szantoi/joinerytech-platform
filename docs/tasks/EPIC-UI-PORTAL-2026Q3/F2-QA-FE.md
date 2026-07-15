# F2-QA-FE — QA modul-képernyők + adatréteg (Fázis 2, 6. modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-15) · **Fázis:** F2
- **Előfeltétel:** F2-MAINTENANCE-FE (érett adatréteg-sablon, 5. iteráció), F2-HR-FE (calc-tükör + M1 config-lecke), F2-EHS/CRM-FE (`services/fsmGuards`), F1 primitívek
- **Akcent:** lime — a portál `quality` világ-kulcsa a `worldAccents.ts`-ben a spec kanonikus `qa` nevére képződik (`[data-world="qa"]`, light+dark tokenek az index.css-ben készen álltak)

## Feladat

A QA (minőségbiztosítás: átvizsgálás + hibajegy-követés) modul portál-oldali
kiépítése a bevált adatréteg-mintára. **F0-előzmény:** a portál QA-oldala ÜRES
volt (EndpointPending bannerek `GET /quality/api/ncrs` fantom-végpontokkal), és
a mock-enumja hibás (angol `open/under_review/closed/rejected` — nem a backend
és nem a spec készlete).

1. **Adatréteg** (`src/services/qa/`): zod + TanStack Query + KÉT szigorú FSM
   (átvizsgálás + hibajegy) a közös `services/fsmGuards`-szal; SZÁMÍTOTT
   `blocking`/`openTickets` mezők + QA-metrikák calc-tükörrel.
2. **Képernyők:** Áttekintés (KPI-k + súlyosság-eloszlás), Átvizsgálások
   (lista + checklist-es detail-SlideOver), Hibajegyek (FSM + eszkaláció),
   Trend (heti megfelelési trend + hibatípus-eloszlás, sr-only alternatívával).
3. **Tesztek** + teljes suite + build + tsc + lint.

### ⚠️ Backend-gap (follow-up a backend terminálnak)

A backend QA domain TELJES (`src/qa` — Inspection + Ticket + QACheckpoint
aggregátum, FSM-táblákkal), de az endpoint-réteg részleges:

- **Ticket: NINCS REST végpont.** A Command/Query réteg kész (Create/Assign/
  Start/Resolve/Reject/Reopen/EscalatePriority + queryk, validátorok,
  repository), de `TicketEndpoints.cs` nem létezik — a teljes
  `/api/qa/tickets` útvonal-készlet MSW-FIRST előkép
  (`src/mocks/qaApi/handlers.tickets.ts`), a Command-nevek tükrében.
- **204 → frissített DTO:** az Inspection átmenet-végpontok
  (`POST /api/qa/inspections/:id/{start|complete/pass|complete/fail}`) 204-et
  adnak; a UI-kontraktus (optimista frissítés + detail-cache írás) a frissített
  **InspectionDto** visszaadását várja (Maintenance-precedens).
- **Checklist a detailben:** az `InspectionDto` nem hordozza a checkpoint
  ellenőrzési szempontjait (criteria — azok a `QACheckpointDto`-ban élnek); a
  kliens-kontraktus denormalizálva beemeli (`inspection.criteria`), különben a
  detail-képernyő külön checkpoint-fetch-re kényszerülne.
- **Spec ↔ backend FSM-eltérés:** a design-spec `qaEllenorzes` készletének
  `javitasra` (rework-hurok) ága és a backend `InspectionResult.Conditional`
  értéke NEM átvezethető — az aggregátumban nincs rework-átmenet
  (Completed terminális, immutable audit-trail) és nincs
  `CompleteWithConditional()`. A kliens-FSM a szigorúbb backendet tükrözi
  (Maintenance-lecke: az aggregátum az irányadó); a feloldás ADR-döntés.
- **`GetQAMetricsQuery` endpoint nélkül:** a QAMetricsDto (pass rate, átlagos
  megoldási idő) lekérdezés kész, de nincs kivezetve — a dashboard/trend most
  a lista-válaszokból számol a `services/qa/calc` tükörrel; endpoint után
  átállítandó.
- **`qa.manage` jogosultság UI-STUB** (`permissions.ts`): auth-bekötéskor csak
  a `useQaPermissions` belseje cserélendő.
- **Scope-on kívül maradt:** QACheckpoint-adminisztráció (a
  `/api/qa/checkpoints` CRUD létezik a backendben — törzsadat-képernyő külön
  task), `POST /:id/failure-notes` utólagos hibajegyzet-rögzítés (audit-ág),
  rendelés-szintű blokkoló nézet (`GET /order/:id/blocking`).

## Kivitelezés

### 1. Adatréteg (`src/services/qa/` — ld. `services/qa/README.md`)
- `fsm.ts`: **KÉT FSM egy modulban**, mindkettő az EGYETLEN átmenet-forrás UI
  és MSW alá (közös `services/fsmGuards`):
  - **INSPECTION_FSM** — `nyitott → folyamatban → megfelelt | selejt` = a
    backend `Start()/CompleteWithPass()/CompleteWithFail()` 1:1 tükre; a
    backend külön státusz+eredmény mezőit a kliens a fsmTones `qaEllenorzes`
    kanonikus kulcsaiba vonja össze. Nevesített guardok:
    `INSPECTION_OPEN/DONE_STATUSES` (KPI-k), `failNotesBlockReason`
    (selejtezés min. 1 hibajegyzettel — UI-beküldés + MSW 400 közös feltétele).
  - **TICKET_FSM** — `bejelentve → kiosztva → folyamatban → megoldva`
    (+`elutasitva` CSAK folyamatban-ból, `reopen`-nel vissza) = a backend
    `TicketStatusTransitions` 1:1 tükre; a megoldva terminális. Nevesített
    guardok: `TICKET_OPEN_STATUSES`/`isTicketOpen` (KPI + `openTickets`
    számláló), `resolveActionsBlockReason` (megoldás min. 1 intézkedéssel),
    `escalateStatusBlockReason` + `escalatePriorityBlockReason` +
    `TICKET_PRIORITY_RANK` (eszkaláció: nem terminálison, csak FELFELÉ —
    `EscalatePriority()` tükör, nem-FSM guardolt akció az assign-minta szerint).
- `calc.ts`: a backend lekérdezés-logikáinak tükre — `isInspectionBlocking`
  (`GetBlockingInspectionsQuery`: kritikus ponton selejt BLOKKOLJA a
  gyártást; a mező SZÁMÍTOTT, az MSW kiszolgáláskor adja, a kliens csak
  megjeleníti), `calcQaMetrics` (`QAMetricsDto`: pass rate = megfelelt/ÖSSZES,
  átlagos megoldási idő órában), `weeklyInspectionTrend` (heti bontás a
  trend-nézethez, ablak a configból). **Ugyanezt futtatja a UI és az MSW.**
- `inspections.ts` / `tickets.ts`: zod-sémák + fetcherek + hookok; mindkét
  átmenet **optimista** (detail-cache azonnal, 409-nél rollback + hiba-toast);
  külön `escalateTicket` (guardolt, nem FSM) + `createTicket`
  (CreateTicketCommand-tükör, kapcsolt átvizsgálással).
- **Rule-6 invalidálás:** hibajegy-mutáció → `tickets` + `ticket` (detail —
  KÜLÖN prefix!) + **`inspections` + `inspection` kereszt-invalidálás** — az
  átvizsgálás `openTickets` mezője a kapcsolt hibajegyekből derivált.
  Átvizsgálás-átmenet → csak a saját két prefixe (hibajegyet nem módosít).
- `keys.ts` (hierarchikus kulcs-gyár, detail-csapda dokumentálva),
  `permissions.ts` (`qa.manage` stub), `config.ts`
  (`QA_API_BASE`, `PASS_RATE_WARN_THRESHOLD`, `TREND_WINDOW_WEEKS` —
  QUALITY.md 3. + HR-review M1-lecke: a KPI-küszöb sosem literál a UI-ban).

### 2. MSW kontraktus-tükör (`src/mocks/qaApi/`)
- Állapottartó store (`db.ts`, `resetQaDb()`), közös `guardTransition` →
  tiltott FSM-átmenet **409**; selejtezés hibajegyzet nélkül / megoldás
  intézkedés nélkül / hiányzó indok-felelős / rövid cím-leírás **400**
  (aggregátum-validáció tükrök); eszkaláció terminálison vagy nem-magasabb
  rangra **409**; ismeretlen id **404**.
- `seed.ts`: a régi `mocks/quality.ts` faipari NCR/sablon-törzse
  újrahasznosítva KANONIKUS kulcsokkal — 3 ellenőrzési pont (kritikus/
  jelentős/enyhe, vizuális/méretes/funkcionális szempontokkal), 8 átvizsgálás
  (2 nyitott + 4 megfelelt + 2 selejt, több hétre szórt lezárásokkal a
  trendhez; a kritikus ponton selejt → blocking), 6 hibajegy (státuszonként
  legalább egy + 2 átvizsgáláshoz kapcsolt); dátumok a „mához" képest relatív
  eltolással (`seedDay`), stabil `QA_SEED_IDS`.
- A `blocking`/`openTickets` kiszolgáláskor számítódik
  (`serveInspection` — `services/qa/calc` + nyitott-guard, egy igazságforrás);
  `reopen` a backend `Reopen()`-tükreként törli a
  hozzárendelést/kezdést/megjegyzést; a `reject` indoka a `resolutionNotes`-ba
  kerül (backend-tükör).

### 3. Képernyők (`src/pages/qa/`; `QualityPage.tsx` 222 soros üres-mock oldal → 37 soros diszpécser; worlds-config: `ncr/templates/audits` fülök → **inspections/tickets/trend**, sub+badge frissítve)
- **Áttekintés** (`QaDashboard`): 4 KPI (nyitott hibajegy/kritikus,
  átvizsgálási arány, megfelelési arány — alcím és riasztás a config-küszöbből,
  gyártás-blokkoló) + súlyosság-eloszlás sáv-vizualizáció (szín+szöveg,
  sr-only összefoglalóval), nyitott átvizsgálások és nyitott hibajegyek
  prioritás-sorrendben — minden érték a hookokból.
- **Átvizsgálások** (`InspectionsScreen` + `InspectionDetailSlideOver`):
  DataTable kettős render, SZERVER-oldali státusz-chipek (S2-minta: pipa +
  font-semibold + 44 px touch-cél); pont-típus/kritikusság pillek, blocking
  ikon szöveges címkével; detail: **FsmStepper** (nyitott → folyamatban →
  megfelelt; selejt mellékállapotként), **checklist** (a pont ellenőrzési
  szempontjai soronkénti aria-labellel), átmenet-gombsor — tiltott akció
  `disabledReason`-nel (aria-disabled + tooltip, SOSEM rejtett), indok-lánc:
  folyamatban → `qa.manage` → FSM-guard; űrlapos akciók: megfelelt-lezárás
  (opcionális megjegyzés), selejtezés (**hibajegyzet-építő** — min. 1 tétel a
  `CompleteWithFail()` tükreként a beküldés-guardban); selejt állapotban
  hibajegyzet-lista + **kapcsolt hibajegy nyitása** (előtöltött űrlap, a
  create a rule-6 kereszt-invalidálással frissíti az `openTickets` számlálót).
- **Hibajegyek** (`TicketsScreen` + `TicketDetailSlideOver`): DataTable
  státusz-chipekkel (a „Nyitott" a nevesített open-guard szerver-oldali
  tükre); detail: **FsmStepper** (bejelentve → kiosztva → folyamatban →
  megoldva; elutasítva mellékállapot), űrlapos akciók: kiosztás (felelős),
  megoldás (**intézkedés-építő** — típus+leírás+költség, min. 1 tétel),
  elutasítás (kötelező indok), újranyitás; **eszkaláció** külön guardolt
  gombbal — csak magasabb prioritás választható, kritikuson magyarázottan
  tiltott; intézkedés-lista költségekkel, elutasítás-indok megjelenítés.
- **Trend** (`TrendScreen`): heti megfelelési trend a config-ablakban
  (megfelelt=kitöltött / selejt=keretes oszlop — forma+szín, jelmagyarázattal)
  **saját görgethető régióban** (`role="region"` + `aria-label` + `tabIndex` —
  S1-lecke) + **sr-only táblázat-alternatíva** (M3-lecke); hibatípus-eloszlás
  a hibajegyzetekből (sr-only összefoglalóval); metrika-összesítő kártyák
  (QAMetricsDto-tükör: pass rate, átlagos megoldási idő).

## Eredmény

- A QA a **hatodik modul** a típusos adatréteg-mintán — először fut KÉT FSM
  egy modulban közös guard-infrastruktúrán, és először tükröz a kliens
  aggregátum-szintű payload-guardokat (min. 1 hibajegyzet / intézkedés) a
  beküldés-gomb `disabledReason`-jában ÉS az MSW 400-válaszában ugyanabból a
  függvényből.
- F0-hiány lezárva: az üres QA-oldal (EndpointPending) helyett élő, MSW+Query
  vezérelt világ; a hibás angol enum helyett a backend/spec kanonikus kulcsai
  (a régi `mocks/quality.ts` megmaradt — a statusTones-teszt alias-forrása,
  már csak onnan hivatkozott).
- Build zöld; a QA lazy chunk 48,03 kB raw / 10,50 kB gzip.

## Fájlok

**ÚJ** — adatréteg: `src/services/qa/{config,keys,fsm,calc,permissions,inspections,tickets,index}.ts` + `README.md`
**ÚJ** — MSW: `src/mocks/qaApi/{seed,db,handlers.inspections,handlers.tickets,index}.ts`
**ÚJ** — képernyők: `src/pages/qa/{labels.ts,QaDashboard,InspectionsScreen,InspectionDetailSlideOver,TicketsScreen,TicketDetailSlideOver,TrendScreen}.tsx`
**MÓDOSÍTVA:** `src/pages/QualityPage.tsx` (222→37 sor diszpécser), `src/mocks/handlers.ts` (+qaApiHandlers, csak bővítés), `src/mocks/worlds.ts` (quality képernyők: ncr/templates/audits→inspections/tickets/trend, sub+badge — csak a saját világ-sor)
**TESZT:** ÚJ `src/services/qa/__tests__/{inspectionFsm,ticketFsm,calc,qaApi}.test.ts`, `src/pages/qa/__tests__/{qaTestUtils.tsx,qaScreens.smoke.test.tsx,qaFlow.test.tsx}`; ÚJRAÍRVA `src/pages/__tests__/QualityPage.test.tsx` → `QaPage.test.tsx` (EndpointPending-asszertek helyett MSW + route-diszpécser)
**VÁLTOZATLAN:** `src/mocks/quality.ts` (a theme/statusTones-teszt alias-forrása — csak a régi oldal importja szűnt meg) · Maintenance/HR/CRM/EHS/Kontrolling fájlok (zároltak — csak import irányban használva) · `App.tsx` (a `/w/quality` route már élt, nem kellett hozzányúlni)

## Tesztek

- **QA-scope: 65/65 zöld** (7 fájl):
  - `inspectionFsm.test.ts` (8): fő út + selejt-ág + MINDKÉT terminális
    (nincs rework — backend-tükör, a spec `javitasra`-ága dokumentált gap) +
    blockReason-szöveg + nevesített guardok (open/done/failNotes).
  - `ticketFsm.test.ts` (9): fő út + reject-csak-folyamatban + reopen-csak-
    elutasítva + terminális megoldva + státusz-ugrás tiltás + eszkaláció-
    guardok (terminális / csak szigorúan magasabb rang).
  - `calc.test.ts` (11): dátum-helperek (hónap-határ, hét-eleje, óra-diff,
    pct-null), gyártás-blokkolás mind az ágakon, QAMetricsDto-tükör (pass
    rate a TELJES nevezővel, nyitott-guard, átlagos megoldási idő + null-ág),
    heti trend (ablak-határ, hetekre bontás, null vs 0 megkülönböztetés).
  - `qaApi.test.ts` (18, msw/node + `resetQaDb`): lista-szűrők
    (status/open/q, priority/inspectionId) + 404; SZÁMÍTOTT blocking (kritikus
    vs enyhe pont) és openTickets; átvizsgálás-FSM (start/pass/fail lánc, 409
    guardok, terminálisok, **fail hibajegyzet nélkül 400**); hibajegy-create
    (denormalizált inspectionRef + cím/leírás-validáció 400 + 404); hibajegy-
    FSM (assign/resolve/reject/reopen + mező-törlés, **resolve intézkedés
    nélkül 400**, indok→resolutionNotes tükör); eszkaláció (409-utak + 400);
    **rule-6 a kontraktusban** (kapcsolt hibajegy létrehozása növeli, megoldása
    csökkenti az átvizsgálás openTickets-ét).
  - UI (19): smoke mind a 4 képernyőre (KPI-k, szerver-szűrők, S2-chipek,
    checklist aria, blocking-pill, S1-régió + sr-only tábla, hibatípus-
    eloszlás); **FSM-folyam** (tiltott gomb aria-disabled + tooltip + elnyelt
    kattintás mindkét FSM-en; start-folyam gomb-átbillenéssel; selejtezés-
    építő guardja + rule-6 lista-pill; kapcsolt hibajegy-nyitás →
    openTickets kereszt-frissülés a detailben; assign→start→resolve lánc az
    intézkedés-építővel + nyitott-lista frissülés; eszkaláció kritikuson
    tiltott / közepesről csak felfelé; `qa.manage` letiltva → jogosultsági
    indok); QaPage route-teszt (6 eset, SlideOver-nyitásokkal).
- **Teljes suite:** `npx vitest run` → **1370 passed / 19 failed (1389)** — a
  19 bukás a dokumentált, QA-tól független pre-existing készlet
  (BOMPreviewCard×2, configurator/wizard×3, catalogFilterPersistence,
  ProcurementPage, WorkOrderSummary); QA-fájl nincs köztük, új bukás nincs
  (baseline: 1315/19 — a delta +55 = 65 új teszt − 10 törölt régi
  QualityPage-teszt).
- **Build:** `npm run build` ✅ (QA chunk 48,03 kB / 10,50 kB gzip) ·
  **tsc -b** tiszta · **ESLint** az érintett fájlokra tiszta.

## Nyitott kérdések / follow-up

1. **Ticket REST végpontok (G-QA):** a `TicketEndpoints.cs` megírása a
   `mocks/qaApi/handlers.tickets.ts` route-készlet + `services/qa` zod-sémák
   kontraktus-előképe szerint (assign/start/resolve/reject/reopen/escalate +
   create/lista/detail).
2. **Inspection végpontok 204 → frissített DTO** + a `criteria` denormalizáció
   (vagy külön checkpoint-fetch kontraktus) rendezése.
3. **Spec ↔ backend FSM-egyeztetés:** `javitasra` rework-hurok és a
   `Conditional` eredmény sorsa (ADR: backend-bővítés vagy spec-szűkítés);
   a fsmTones `qaEllenorzes.javitasra` kulcsa addig kihasználatlan.
4. **`GetQAMetricsQuery` kivezetése** (`GET /api/qa/metrics?from&to`) — utána
   a dashboard/trend a szerver-metrikára áll át (a `calcQaMetrics` marad
   teszt-tükörnek).
5. **Hibajegy-státusz tónuskészlet a specbe:** a `TICKET_STATUS_META` lokális
   Tone-térkép (labels.ts) — designer-döntés kell a spec 1.5 bővítéséről
   (`qaHibajegy` készlet a FSM_TONES-ba).
6. **QACheckpoint törzsadat-képernyő** (a backend CRUD kész) — külön task.
7. **`qa.manage` claim-forrás:** auth-bekötés (a `useQaPermissions` belseje).
8. **Közös date-utils kiemelés:** immár HÁROM modul (hr, maintenance, qa)
   hordoz azonos dátum-helpereket → `services/dateUtils.ts` (F2-MAINTENANCE-FE
   6. follow-up megerősítve).
