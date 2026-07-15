# F2-QA-REVIEW — QA modul designer review (Fázis 2, 6. modul)

> **Kiadta:** designer terminál — 2026-07-15
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-QA-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (QA: accent lime — 17. sor; ellenőrzés-lista + státusz-tábla + checklist+NCR — 42. sor; FSM: `nyitott → folyamatban → megfelelt` +`javitasra`/`selejt` — 67. sor), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`, precedensek: EHS/CRM/Kontrolling/HR/Maintenance review-k (`docs/knowledge/qa/`)
> **Vizsgált kód:** `src/joinerytech-portal` main@`ea2e551` (F2-QA-FE: `src/services/qa/`, `src/mocks/qaApi/`, `src/pages/qa/`, `src/pages/QualityPage.tsx` + tesztek)
> **Módszer:** teljes QA-diff átolvasás a terv + az öt korábbi modul-review érett szempontrendszere ellen, tesztfuttatás (QA-scope-ú vitest: **7 fájl / 65 teszt — mind zöld**, bontás lent) + a Maintenance-review 3 vállalt utóellenőrzése. A DMS-fájlokat (párhuzamos frontend-munka) NEM érintettem, portal-fájl nem módosult.

---

## Összesített verdikt: ✅ APPROVED

Az F2-QA a sablon **hatodik iterációja, sorozatban a harmadik fix-kör
nélküli modul** — és az első, amelyben KÉT FSM fut egy modulban a közös
`services/fsmGuards` infrastruktúrán. A review-szempont magja hiánytalan:
mindkét FSM-tábla (`INSPECTION_FSM` + `TICKET_FSM`) az EGYETLEN
átmenet-forrás a UI és az MSW alatt, és — először a sorozatban — az
aggregátum-szintű PAYLOAD-guardok (`failNotesBlockReason`: selejtezés min.
1 hibajegyzettel; `resolveActionsBlockReason`: megoldás min. 1
intézkedéssel) SZÓ SZERINT ugyanabból a függvényből adják a UI
beküldés-gomb `disabledReason`-jét ÉS az MSW 400-válaszát. Az eszkaláció
kettős guardja (státusz + szigorúan-felfelé rang) szintén közös forrásból
él mindkét oldalon. A rule-6 kereszt-invalidálás (tickets + ticket +
inspections + inspection — az `openTickets` derivált mező miatt)
kontraktus- ÉS UI-tesztben fedett; a `blocking`/`openTickets` mezőt a
kliens sosem számolja, az MSW kiszolgáláskor adja ugyanabból a calc-ból.
**Blokkoló hiba nincs**; egy fontos tétel (M1: a QueryGate-promótálás a
vállalás szerint M-szintre emelve — a QA már a 6. importőr) és négy apró
follow-upként rögzítve.

| Terület | Verdikt |
|---|---|
| 1. KÉT FSM egy igazságforrásból (`fsm.ts` + közös `fsmGuards`; UI ÉS MSW) | ✅ APPROVED |
| 2. Payload-guardok: failNotes + resolveActions UI-beküldés ↔ MSW 400 közös fv. | ✅ APPROVED |
| 3. Eszkaláció: státusz-guard + rang-guard (csak felfelé) UI ↔ MSW 409 | ✅ APPROVED |
| 4. `calc.ts` tükör (GetBlockingInspections + QAMetricsDto + heti trend) | ✅ APPROVED |
| 5. Rule-6 invalidálás: `tickets` + `ticket` + `inspections` + `inspection` kereszt | ✅ APPROVED |
| 6. MSW kontraktus-tükör (`mocks/qaApi/`): 409 FSM, 400 payload, 404, 201 | ✅ APPROVED |
| 7. Képernyők vs terv (4 képernyő + 2 SlideOver, lime akcent) | ✅ APPROVED |
| 8. S1-osztály: trend-rács saját régióban + sr-only táblázat (M3) | ✅ APPROVED |
| 9. S2-osztály: chip-affordanciák (pipa + 44 px touch-cél, 2 képernyőn) | ✅ APPROVED |
| 10. Eloszlások: szín + szöveg + sr-only összefoglaló (súlyosság, hibatípus) | ✅ APPROVED |
| 11. Tokenek / lime / dark / nyerspaletta-fegyelem | ✅ APPROVED |
| 12. Config-küszöbök (PASS_RATE_WARN_THRESHOLD, TREND_WINDOW_WEEKS) — nincs literál | ✅ APPROVED |
| 13. Loading/empty/error + magyar címkék (labels.ts) | ✅ APPROVED |
| 14. Tesztek | ✅ 65/65 zöld (7 fájl) |

---

## Blokkoló hibák

**Nincs.** (Harmadszor egymás után a Fázis 2-ben — a sablon érett.)

---

## Jóváhagyott területek (részletek)

### 1. FSM-integritás ✅ — KÉT FSM, mindkettő az EGYETLEN átmenet-forrás

`src/services/qa/fsm.ts` — a backend QA domain (src/qa: Inspection + Ticket
aggregátum) 1:1 tükre, a közös `services/fsmGuards`-ra építve:

- **INSPECTION_FSM** (`fsm.ts:44-48`): `nyitott → folyamatban → megfelelt |
  selejt` — a `Start()/CompleteWithPass()/CompleteWithFail()` tükre; a
  backend külön státusz+eredmény mezőit a kliens a fsmTones `qaEllenorzes`
  kanonikus kulcsaiba vonja össze, a megfelelt/selejt terminális (immutable
  audit-trail). A terv 67. sorának `javitasra` rework-hurka és a backend
  `Conditional` eredménye NEM átvezethető — a fájl-fejkommentben DOKUMENTÁLT
  döntés (`fsm.ts:20-24`): a szigorúbb aggregátum az irányadó
  (Maintenance-lecke), a feloldás ADR/follow-up. Jó ADR-gyakorlat.
- **TICKET_FSM** (`fsm.ts:91-97`): `bejelentve → kiosztva → folyamatban →
  megoldva` (+`elutasitva` csak folyamatban-ból, `reopen`-nel vissza) — a
  `TicketStatusTransitions` tükre, a megoldva terminális.
- **UI:** mindkét SlideOver indok-lánca: pending → `qa.manage` jogosultság →
  `transitionBlockReason` az FSM-táblából (`InspectionDetailSlideOver.tsx:213-216`,
  `TicketDetailSlideOver.tsx:165-168`); a tiltott gomb `disabledReason`-t kap
  (aria-disabled + tooltip, a Button primitívvel), SOSEM rejtett. Mind a
  4 (inspection: 3 FSM + hibajegy-nyitás) és mind a 6 (ticket: 5 FSM +
  eszkaláció) akció-gomb mindig látszik.
- **MSW:** ugyanaz a `canTransition` dönt a közös `guardTransition` helperen
  át (`mocks/qaApi/db.ts:70-81`) — tiltott átmenet → 409 a szabálysértést
  leíró üzenettel; minden átmenet-handler ezen megy át.
- **Nevesített guardok** (isOppOpen/isWorkOrderOpen-minta):
  `INSPECTION_OPEN/DONE_STATUSES` (`fsm.ts:58-73` — dashboard KPI-k +
  szerver-oldali `open=true` szűrő + trend-szűrés közös feltétele),
  `TICKET_OPEN_STATUSES`/`isTicketOpen` (`fsm.ts:108-114` — KPI, az
  átvizsgálás `openTickets` számlálója ÉS az MSW `open=true` szűrő közös
  feltétele).

### 2. A review-szempont magja: payload-guardok UI ↔ MSW közös forrásból ✅

Először a sorozatban a kliens aggregátum-szintű PAYLOAD-guardokat tükröz:

- **`failNotesBlockReason`** (`fsm.ts:80-84`, a `CompleteWithFail()` tükre):
  a selejtezés-űrlap beküldés-gombjának `disabledReason`-je
  (`InspectionDetailSlideOver.tsx:112`) ÉS az MSW fail-handler 400-a
  (`handlers.inspections.ts:91-92`) — ugyanaz a függvény adja az üzenetet.
  UI-tesztelt (qaFlow: „hibajegyzet nélkül magyarázottan tiltott beküldés").
- **`resolveActionsBlockReason`** (`fsm.ts:121-125`, a `Resolve()` tükre):
  a megoldás-űrlap gombja (`TicketDetailSlideOver.tsx:134`) ↔ MSW 400
  (`handlers.tickets.ts:151-152`) — szintén közös függvény, UI-tesztelt.
- **Eszkaláció** (nem-FSM guardolt akció, az assign-minta folytatása):
  `escalateStatusBlockReason` (`fsm.ts:141-143` — terminálison tiltott) a UI
  indok-lánc tagja (`TicketDetailSlideOver.tsx:171-175`) ÉS az MSW 409-e
  (`handlers.tickets.ts:206-207`); a rang-guard
  (`escalatePriorityBlockReason` + `TICKET_PRIORITY_RANK`, `fsm.ts:133-156`)
  a UI-ban a választható opciók szűrése (`TicketDetailSlideOver.tsx:155-157`
  — csak SZIGORÚAN magasabb fokozat listázódik; kritikuson magyarázott
  tiltás), az MSW-ben 409 (`handlers.tickets.ts:213-214`). Mindkét ág
  tesztelt (qaApi 409-utak + qaFlow kritikus-tiltás és közepes→magas folyam).

### 3. Adatréteg-minta konformancia ✅

- Zod-lefedettség teljes (státusz/típus/kritikusság/hibatípus/intézkedés
  enum-tükrök); kulcs-gyár hierarchikus, a detail-kulcsok (`inspection`,
  `ticket`) NEM a lista-prefix alatt — a fejkomment explicit figyelmeztet a
  CRM S2-leckére (`keys.ts:6-8`) ✔
- **Optimista átmenet helyesen, MINDKÉT FSM-en:** onMutate a detail cache-t
  a célállapotra billenti, hibánál rollback + a szerver guard-üzenete
  toastban, onSuccess a friss DTO-t cache-eli, onSettled mindig invalidál
  (`inspections.ts:192-226`, `tickets.ts:207-241`) ✔
- FSM-akció = dedikált végpont (nincs generikus PATCH, EHS README 2.
  szabály); az eszkaláció KÜLÖN fetcher/hook, kommentben megkülönböztetve
  („guardolt, de NEM FSM-átmenet", `tickets.ts:152-159,244`) ✔
- Típusos akció-payload térképek (`InspectionTransitionPayloads`,
  `TicketTransitionPayloads`) — a Command/Request-tükrök típusszinten
  kikényszerítettek ✔
- `qa.manage` UI-STUB dokumentált bekötési ponttal (`permissions.ts` —
  auth-nál csak a hook belseje cserélendő); a jogosultság-hiány is
  disabledReason, nem rejtett gomb — TESZTELT (qaFlow: „qa.manage nélkül
  minden akció jogosultsági indokkal tiltott") ✔
- Backend-gapek (Ticket REST-készlet hiányzik → MSW-first előkép, 204→DTO,
  criteria-denormalizáció, GetQAMetrics endpoint) a task-fájlban ÉS a
  config/fsm/inspections fejkommentjeiben dokumentáltak ✔

### 4. `calc.ts` tükör ✅ — a lekérdezés-logikák egy igazságforrásból

- `isInspectionBlocking` (`calc.ts:83-85`): kritikus ponton selejt →
  gyártás-blokkoló (a `GetBlockingInspectionsQuery` ága); **a kliens sosem
  számolja** — az MSW kiszolgáláskor adja (`db.ts:46-54` `serveInspection`:
  `blocking` + `openTickets` mind számított, a seed NEM tartalmazza őket —
  `db.ts:20` Omit-típussal kikényszerítve) ✔
- `calcQaMetrics` (`calc.ts:112-135`): QAMetricsDto-tükör (pass rate a
  TELJES nevezővel — backend-hű; átlagos megoldási idő órában, null-ággal);
  `weeklyInspectionTrend` (`calc.ts:159-184`): heti bontás, az ablak
  KIZÁRÓLAG configból (`TREND_WINDOW_WEEKS`), null vs 0 megkülönböztetéssel ✔
- A seed dátumai a mához képest relatív eltolással (`seedDay`), stabil
  `QA_SEED_IDS`-szel — a blocking mindkét ága (kritikus vs enyhe ponton
  selejt), minden ticket-státusz és a több-hetes trend determinisztikusan
  előáll (`seed.ts:25-43`) ✔

### 5. Rule-6 kereszt-invalidálás ✅ — a review-kérdés magja rendben

`tickets.ts:185-193` (`useInvalidateTickets`): a hibajegy-mutáció a
`tickets` lista-prefixet, a `ticket` DETAIL-prefixet (külön él!) ÉS az
`inspections` + `inspection` prefixeket invalidálja — az átvizsgálás
`openTickets` mezője a kapcsolt hibajegyekből DERIVÁLT (létrehozás/megoldás/
újranyitás átbillenti). Mindhárom mutáció-hook (transition, escalate,
create) ezt a közös invalidátort használja. A fordított irány helyesen
ASZIMMETRIKUS: az átvizsgálás-átmenet csak a saját két prefixét invalidálja
(`inspections.ts:167-178` — kommentben indokolva: hibajegyet nem módosít).
A keresztkötés a KONTRAKTUS-tesztben fedett (qaApi: „kapcsolt hibajegy
létrehozása növeli, megoldása csökkenti az openTickets-t") ÉS a UI-folyam
tesztben is (qaFlow: hibajegy-nyitás → openTickets kereszt-frissül a
detailben; resolve → a sor kikerül a Nyitott listából) ✔

### 6. MSW kontraktus-tükör ✅

- Állapottartó store + `resetQaDb()` (`db.ts`); a seed a régi statikus
  `mocks/quality.ts` faipari NCR-törzsét hasznosítja újra KANONIKUS magyar
  kulcsokkal (az F0-ban feltárt hibás angol enum kiváltva) ✔
- Backend-invariánsok: tiltott FSM-átmenet → **409** (közös guard),
  selejtezés hibajegyzet nélkül / megoldás intézkedés nélkül / üres
  leírás-tétel / hiányzó felelős-indok / rövid cím-leírás → **400**
  (aggregátum-validáció tükrök), eszkaláció terminálison vagy nem-magasabb
  rangra → **409**, ismeretlen id → **404**, create → **201**; a reopen a
  backend `Reopen()`-tükreként törli a hozzárendelést/kezdést/megjegyzést
  (`handlers.tickets.ts:187-199`); a reject indoka a `resolutionNotes`-ba
  kerül (backend-tükör, `handlers.tickets.ts:180-181`) ✔
- Szerver-oldali szűrők: status/open/q (átvizsgálások),
  status/priority/inspectionId/open/q (hibajegyek); rendezettség dokumentált
  kommentekkel (legfrissebb tervezés ill. bejelentés elöl) ✔

### 7. Képernyők vs terv ✅ (mind a 4 + 2 SlideOver)

- **Worlds-config:** dash / inspections / tickets / trend
  (`mocks/worlds.ts:195-206`), `accent: 'lime'` — a terv 17. sora szerint;
  a `QualityPage` 37 soros vékony diszpécser route-tesztekkel; a világ-kulcs
  (`quality`) → spec-név (`qa`) leképezés a `worldAccents.ts:17`-ben
  dokumentált ✔. A világ-kártya badge („4 nyitott") a seeddel EGYEZIK
  (4 nyitott státuszú hibajegy: 2 bejelentve + 1 kiosztva + 1 folyamatban) —
  a Kontrolling N2 hiba nem ismétlődött ✔
- **Áttekintés:** 4 KPI kizárólag hookokból (nyitott hibajegy/kritikus,
  átvizsgálási arány, megfelelési arány — alcím ÉS riasztás a
  config-küszöbből, gyártás-blokkoló); súlyosság-eloszlás sáv-vizualizáció
  szín+szöveg párral és sr-only összefoglalóval (a vizuális lista
  `aria-hidden`); nyitott átvizsgálások + nyitott hibajegyek
  prioritás-sorrendben (nevesített `TICKET_PRIORITY_ORDER`),
  képernyő-linkek, sor-kattintásra SlideOver ✔
- **Átvizsgálások:** DataTable kettős render, SZERVER-oldali státusz-chipek
  (a „Nyitott (aktív)" a nevesített open-guard tükre: `open=true`),
  pont-típus/kritikusság pillek, blocking-ikon `aria-label`+`title` párossal ✔
- **Átvizsgálás-detail:** FsmStepper a fő úton (selejt mellékág
  `sideLabel`-lel), **checklist** soronkénti aria-labellel
  (`InspectionDetailSlideOver.tsx:358-369`), űrlapos akciók:
  megfelelt-lezárás (opcionális megjegyzés), selejtezés
  (**hibajegyzet-építő** — tétel-lista törlés-gombokkal, beküldés-guard =
  `failNotesBlockReason`); selejt állapotban hibajegyzet-lista + **kapcsolt
  hibajegy nyitása** (előtöltött cím/leírás/prioritás a hibajegyzetből és a
  kritikusságból, kliens-oldali CreateTicketCommand-validáció ↔ MSW 400
  párban — `InspectionDetailSlideOver.tsx:142-148`) ✔
- **Hibajegyek:** DataTable + státusz-chipek (alapértelmezett szűrő: nyitott),
  típus/súlyosság pillek, kapcsolt átvizsgálás oszlop ✔
- **Hibajegy-detail:** FsmStepper (elutasitva mellékág), 6 akció-gomb
  indok-lánccal, űrlapos akciók: kiosztás (kötelező felelős), megoldás
  (**intézkedés-építő** típus+leírás+költség tételekkel), elutasítás
  (KÖTELEZŐ indok — kliens disabledReason ↔ MSW 400 párban), újranyitás;
  eszkaláció-űrlap csak magasabb fokozatokkal; intézkedés-lista költségekkel
  (formatHuf), elutasítás-indok kontextusfüggő címkével
  (`TicketDetailSlideOver.tsx:375-382`) ✔
- **Trend:** ld. 8. és 10. pont ✔

### 8–9. A korábbi review-k hibaosztályai — mind megelőzve ✅

- **S1-osztály (görgethető rács):** a heti trend-rács
  (`TrendScreen.tsx:94-99`) SAJÁT `overflow-x-auto` + `role="region"` +
  `aria-label` + `tabIndex={0}` + fókusz-ring konténerben él (Kontrolling
  S1-recept), **plusz sr-only `<table>` alternatíva** `caption`-nel és
  `th[scope]`-pal (`TrendScreen.tsx:137-159` — a Kontrolling M3-lecke).
  TESZTELT (smoke: „saját görgethető régió (S1-minta) + sr-only
  táblázat-alternatíva") ✔
- **S2-osztály (chipek):** mindkét chip-soron (Átvizsgálások
  `InspectionsScreen.tsx:106-127`, Hibajegyek `TicketsScreen.tsx:102-123`)
  az aktív chip pipa-ikon (`aria-hidden`) + `font-semibold` nem-szín jelzést
  kap, a pill körül `before:-inset-y-2` pszeudó adja a 44 px-es touch-célt,
  `aria-pressed` + `role="group"` — a Kontrolling S2-fix mintája ✔

### 10. Eloszlások és trend: nem csak szín hordozza az információt ✅

- Trend-oszloppár: megfelelt = kitöltött lime (`bg-world`), selejt =
  KERETES rose (forma+szín megkülönböztetés, `TrendScreen.tsx:107-115`);
  minden hét-oszlop alatt LÁTHATÓ számpár („2 ok · 1 selejt") és
  százalék-felirat; jelmagyarázat szín + SZÖVEG párokkal („megfelelt
  (kitöltött)" / „selejt (keretes)", `TrendScreen.tsx:127-134`) ✔
- Súlyosság-eloszlás (dashboard) és hibatípus-eloszlás (trend): a vizuális
  sáv-listák `aria-hidden`, előttük sr-only szöveges összefoglaló
  (`QaDashboard.tsx:119-124`, `TrendScreen.tsx:169-174`); a darabszám
  minden soron LÁTHATÓ szövegként ✔

### 11. Tokenek / lime / dark / a11y ✅

- **Lime akcent tokenből:** `[data-world="qa"]` light+dark változó-készlet
  (`index.css:146-157`; dark `--world-fg` = lime-950 — a chip-kontraszt
  rendben); a képernyők KIZÁRÓLAG `world-*` tokent használnak (bg-world,
  world-ring, world-soft-fg) — nyers lime-osztály akcent-célra SEHOL ✔
- **Nyerspaletta-fegyelem:** a `pages/qa` fa nyers paletta-osztályai MIND
  szemantikus jelzőszínek (rose a hibához): a szöveg-színek dark-párosak
  (KPI-riasztás `QaDashboard.tsx:99`, blocking-ikon
  `InspectionsScreen.tsx:87`, hibatípus-címke
  `InspectionDetailSlideOver.tsx:390` — mind rose-600/rose-400); a
  trend/eloszlás sáv-kitöltések rose-500 (ld. N2 megjegyzés) ✔
- SlideOver (F1 primitív) helyes használat mindkét detailben; loading
  skeleton `aria-busy`, hiba `role="alert"`, QueryGate minden képernyőn
  Újra-gombbal; üres állapotok magyar szöveggel („Nincs a szűrésnek
  megfelelő átvizsgálás/hibajegy", „Nincs rögzített hibajegyzet") ✔
- Magyar címkék központi `labels.ts`-ben (státusz/akció/típus/kritikusság/
  hibatípus/intézkedés + formázók); az átvizsgálás-pill a `theme/fsmTones.ts`
  `qaEllenorzes` térképéből; a hibajegy-státusz tónuskészlet lokális
  Tone-térkép dokumentált spec-follow-uppal (a spec 1.5 `qaHibajegy`
  bővítése — designer-döntés, a FE task 5. follow-upja) ✔

### 12. Config-küszöbök ✅ — a HR-M1 minta NEM ismétlődött

Minden „állítható" érték a `config.ts`-ben (`PASS_RATE_WARN_THRESHOLD=90`,
`TREND_WINDOW_WEEKS=6`); a dashboard „Megfelelési arány" KPI-alcíme a
configból SZÁMÍTOTT sablon-string (`labels.ts:137` `PASS_RATE_TARGET_LABEL`)
ÉS a riasztó tónus is a config-küszöbbel hasonlít (`QaDashboard.tsx:70` —
`passRateOfDone < PASS_RATE_WARN_THRESHOLD`, nem literál). Számliterál-küszöb
a `pages/qa` fában nincs ✔

---

## A Maintenance-review 3 vállalt utóellenőrzése (státusz-jelentés)

1. **QueryGate-promótálás (N-osztály → M1):** a `QueryGate` a QA-ban is a
   `pages/ehs`-ből importált (`QaDashboard.tsx:7`, `InspectionsScreen.tsx:5`,
   `TicketsScreen.tsx:5`, `TrendScreen.tsx:7`) — **a QA immár a 6. importőr
   modul** (ehs, crm, controlling, hr, maintenance, qa — összesen 27
   importáló fájl). A Maintenance-review vállalása szerint („a következő
   modul (QA) előtt érdemes lezárni, ne legyen 6. importőr") a tétel
   **M-szintre emelve** — ld. M1 lent. NEM a QA-munka hibája (a lezárt
   sablont követte), de a promótálás tovább nem halasztható: a DMS előtt
   zárandó, különben 7. importőr születik.
2. **HR-M1-THRESHOLD (`HrDashboard.tsx:212` `pct > 85` literál):**
   **VÁLTOZATLAN** — a hardcode-olt küszöb még mindig a kódban van
   (most újra ellenőrizve). A backlog-tétel nyitva, a következő HR-t érintő
   fix-körrel esedékes. (Nem a QA hibája — státusz-jelentés.)
3. **Maintenance M1 (`labels.ts` `new Date(iso)` UTC-parse):**
   **VÁLTOZATLAN** — a `src/pages/maintenance/labels.ts:106,143,149` még a
   `new Date(iso)` konstruktorral parszol. A tétel nyitva, a közös
   `services/dateUtils.ts` kiemeléssel együtt esedékes (immár HÁROM modul
   hordoz azonos dátum-helpereket). (Nem a QA hibája — státusz-jelentés.
   Megjegyzés: a QA `labels.ts` formázói datetime-stringeket kapnak
   (`YYYY-MM-DDTHH:mm` — helyi idejű parse), így a Maintenance-hibaminta a
   QA-ban jelenleg NEM áll fenn; a dateUtils-kiemelésnél a QA is álljon át,
   nehogy date-only kulccsal latens TZ-hiba szülessen.)

---

## Kért javítások (nem blokkoló) és megjegyzések

- **M1 — QueryGate promótálás `components/ui`-ba** (`pages/ehs/QueryGate` →
  27 importáló fájl, 6 modul): a CRM N5 / Kontrolling N6 / HR N1 /
  Maintenance N1 közös tétele a Maintenance-review vállalása szerint
  M-szintre emelve. Mechanikus mozgatás + import-átírás (a komponens maga
  jó); a DMS-FE lezárása UTÁN, a DMS-review ELŐTT végrehajtandó külön
  mini-taskként (a DMS-fájlok most párhuzamos munkában zároltak), hogy a
  DMS-review már a promótált importot ellenőrizhesse. A soron következő
  review-ban ellenőrzöm.
- **N1 — Két „megfelelési arány" két nevezővel, azonos cél-felirattal:** a
  dashboard KPI a LEZÁRTAKRA vetít (`QaDashboard.tsx:36` `passRateOfDone`),
  a Trend metrika-kártya a backend-hű ÖSSZES-nevezős pass rate-et mutatja
  (`TrendScreen.tsx:49-52`, „(backend-metrika)" jelöléssel) — mindkettő a
  `PASS_RATE_TARGET_LABEL` („cél: legalább 90%") alcímet viseli, pedig a két
  szám eltérhet (a nyitott átvizsgálások a backend-metrikát húzzák le). A
  megkülönböztetés dokumentált és címkézett, ezért nit — de a
  GetQAMetrics-endpoint bekötésekor (FE task 4. follow-up) döntendő el, a
  kettő közül melyik a kanonikus KPI, és az alcím tegye egyértelművé a
  nevezőt (pl. „a lezártakra vetítve").
- **N2 — Trend/eloszlás sáv-kitöltések dark-pár nélkül**
  (`TrendScreen.tsx:113,132,183` — `border-rose-500`, `bg-rose-500/30`,
  `bg-rose-500`): grafikus (nem szöveg) elemként a rose-500 mindkét témában
  elfogadható kontrasztú, de a modul minden más nyers paletta-használata
  dark-páros — konzisztencia-nit (pl. `dark:bg-rose-400`), a HR/Maintenance
  „minden nyers osztály dark-páros" fegyelméhez igazítandó.
- **N3 — Átmenet-űrlapok kézi inputokkal** (`InspectionDetailSlideOver.tsx:28-29`,
  `TicketDetailSlideOver.tsx:33-34` közös `inputCls` + 6 űrlap): címkézettek
  (`htmlFor`), fókusz-ringesek, működnek — de nem az EHS `formFields`
  primitívjeit használják (a HR N2 / Maintenance N2 nit harmadik
  ismétlődése); a kötelező-jelölő `*` `aria-hidden`, `aria-required` nélkül.
  A submit-gombok disabledReason-je kompenzál — nit, de a formFields-re
  állás a dateUtils-hoz hasonló közös kiemelés-jelölt.
- **N4 — Eszkaláció `elutasitva` státuszból engedélyezett**
  (`fsm.ts:141-143`: a státusz-guard csak a `megoldva`-t tiltja): egy
  elutasított hibajegy prioritása eszkalálható, ami domain-szinten kérdéses
  (az elutasított jegy inaktív — előbb reopen járna). A kliens a backend
  `EscalatePriority()` dokumentált tükre, ezért nem kliens-hiba — a Ticket
  REST-endpointok megírásakor (backend follow-up 1.) tisztázandó, hogy a
  backend guardja tiltsa-e az elutasított státuszt is.

---

## Tesztek

QA-scope-ú futtatás (`npx vitest run src/pages/qa src/services/qa
src/pages/__tests__/QaPage.test.tsx`): **7 fájl / 65 teszt — mind zöld**
(egyezik az F2-QA-FE task-jelentés 65/65-ével). Bontás:

| Fájl | Teszt | Fókusz |
|---|---|---|
| `services/qa/__tests__/inspectionFsm.test.ts` | 8 | átmenet-tábla + selejt-ág, MINDKÉT terminális (nincs rework — backend-tükör), blockReason, nevesített guardok (open/done/failNotes) |
| `services/qa/__tests__/ticketFsm.test.ts` | 9 | fő út + reject-csak-folyamatban + reopen-csak-elutasítva + terminális megoldva + státusz-ugrás tiltás + eszkaláció-guardok |
| `services/qa/__tests__/calc.test.ts` | 11 | dátum-helperek, gyártás-blokkolás ágai, QAMetricsDto-tükör (teljes nevező, null-ág), heti trend (ablak-határ, null vs 0) |
| `services/qa/__tests__/qaApi.test.ts` | 18 | MSW-kontraktus: szűrők, SZÁMÍTOTT blocking/openTickets, FSM-láncok, 409/400/404, fail/resolve payload-guard 400, reopen mező-törlés, eszkaláció-utak, RULE-6 keresztkötés |
| `pages/qa/__tests__/qaScreens.smoke.test.tsx` | 5 | 4 képernyő + detail; S2 chipek, checklist + blocking-pill, S1 régió + sr-only tábla, eloszlások |
| `pages/qa/__tests__/qaFlow.test.tsx` | 8 | tiltott gombok aria-disabled+tooltip+elnyelt kattintás MINDKÉT FSM-en, selejtezés-építő guard + rule-6 lista-frissülés, kapcsolt hibajegy → openTickets kereszt-frissülés, assign→start→resolve lánc, eszkaláció-guardok, qa.manage-tiltás |
| `pages/__tests__/QaPage.test.tsx` | 6 | route-diszpécser + SlideOver-nyitások |

A lefedés a precedens-szerinti (calc tiszta függvények + MSW-kontraktus +
UI-folyamok), és — először a sorozatban — az **aggregátum-szintű
payload-guardok** (min. 1 hibajegyzet / intézkedés) mindhárom rétegben
(fsm-teszt, MSW 400, UI-beküldés-tooltip) asszertáltak, a rule-6
keresztkötés pedig kontraktus- ÉS UI-szinten is.

---

## Findings összefoglalva

| # | Fájl | Mi | Súly |
|---|---|---|---|
| M1 | `pages/ehs/QueryGate` importok (27 fájl, 6 modul) | QueryGate promótálás `components/ui`-ba — a Maintenance-review vállalása szerint M-szintre emelve (6. importőr); a DMS-review előtt zárandó | kérve, nem blokkoló |
| N1 | `QaDashboard.tsx:36` ↔ `TrendScreen.tsx:49-52` | Két eltérő nevezőjű megfelelési-arány azonos cél-felirattal — a GetQAMetrics-bekötésnél kanonizálandó | megjegyzés |
| N2 | `TrendScreen.tsx:113,132,183` | rose-500 sáv-kitöltések dark-pár nélkül (grafikus elem — konzisztencia-nit) | opcionális |
| N3 | `InspectionDetailSlideOver.tsx:28-29`, `TicketDetailSlideOver.tsx:33-34` | Űrlap-inputok a közös formFields primitívekkel (HR N2 3. ismétlődés); `aria-required` hiánya | opcionális |
| N4 | `fsm.ts:141-143` + `handlers.tickets.ts:206-207` | Eszkaláció elutasított jegyen engedélyezett (backend-tükör) — a Ticket-endpointok megírásakor tisztázandó | megjegyzés (backend) |
| — | `HrDashboard.tsx:212` | HR-M1-THRESHOLD literál még javítatlan (utóellenőrzés — nem QA-hiba) | backlog nyitva |
| — | `pages/maintenance/labels.ts:106,143,149` | Maintenance M1 UTC-parse még javítatlan (utóellenőrzés — nem QA-hiba) | backlog nyitva |

**Döntés: ✅ APPROVED.** Blokkoló hiba nincs — a QA a harmadik egymást
követő modul, amely fix-kör nélkül megy át, és az első, amely két FSM-et
és aggregátum-szintű payload-guardokat futtat a közös guard-infrastruktúrán
hibátlanul. Az öt korábbi review minden leckéje (S1+sr-only, S2, CRM S2
detail-kulcs, rule-6, FSM-egy-igazságforrás, config-küszöbök) beépült; a
HR-M1 és Maintenance-M1 hibaminták NEM ismétlődtek. Az M1
(QueryGate-promótálás) a DMS-review előtti mini-task; N1–N4 tracked
backlog. A `qa` felkerül a `modules_done` listára; a következő modul (DMS)
review-jában az M1 végrehajtását, a HR-M1-THRESHOLD és a Maintenance-M1
zárását újra ellenőrzöm.

---

_Designer terminál — JoineryTech sziget. F2-QA review lezárva: ✅ APPROVED._
