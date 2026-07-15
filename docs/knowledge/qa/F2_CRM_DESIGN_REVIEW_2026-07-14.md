# F2-CRM-REVIEW — CRM modul designer review (Fázis 2, 2. modul)

> **Kiadta:** designer terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-CRM-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (CRM spec: 6 képernyő, Lead+Opportunity kettős FSM, accent blue), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`, EHS-precedens: `docs/knowledge/qa/F2_EHS_DESIGN_REVIEW_2026-07-14.md`
> **Vizsgált kód:** `src/joinerytech-portal` working tree (F2-CRM-FE: `src/services/crm/`, `src/services/fsmGuards.ts`, `src/mocks/crmApi/`, `src/pages/crm/`, `src/pages/CrmPage.tsx` + tesztek)
> **Módszer:** teljes CRM-diff átolvasás a spec + az EHS-sablon ellen, tesztfuttatás (CRM-scope-ú vitest: **60/60 zöld**, 7 fájl). A Kontrolling-fájlokat (párhuzamos frontend-munka) NEM érintettem.

---

## Összesített verdikt: ⚠️ CHANGES REQUESTED (szűk körű)

Az F2-CRM munka az EHS-sablon **hűséges és magas minőségű másolata** — a `fsmGuards.ts`
kiemelés tiszta generalizáció, az adatréteg (zod + kulcs-gyár + FSM egy-igazságforrás +
MSW-tükör) sablon-konform, a 6 képernyő terv-hű, a slideover FSM-panelek a plan 3.
vezérelvét (tiltott átmenet = látható + aria-disabled + tooltip) hozzák, a tokenhasználat
tiszta (az EHS S1-osztályú nyerspaletta-hiba NEM ismétlődött meg). **Három hiba blokkol**,
mindhárom kicsi (összesen ~30 perc fix): az ajánlat-csonk gomb lezárt lehetőségen is
engedélyezettként renderel (S1), a detail-cache invalidálás az EHS M1-lecke ellenére
hiányos (S2), és a kanban vízszintes sáv nem hozza a spec 3.3 kötelező mintáját (S3).

| Terület | Verdikt |
|---|---|
| 1. `services/fsmGuards.ts` generalizáció | ✅ APPROVED — tiszta kiemelés |
| 2. Adatréteg (`services/crm/`) | ⚠️ **CHANGES REQUESTED** (S2 — detail-invalidálás) |
| 3. MSW kontraktus-tükör (`mocks/crmApi/`) | ✅ APPROVED |
| 4. Képernyők vs terv (6 képernyő + tasks fül) | ✅ APPROVED |
| 5. FSM UI (Lead/Opp SlideOver + panelek) | ⚠️ **CHANGES REQUESTED** (S1 — quote-gomb guard) |
| 6. Pipeline kanban + mobil | ⚠️ **CHANGES REQUESTED** (S3 — spec 3.3) |
| 7. Tokenek / dark / a11y | ✅ APPROVED (N-megjegyzésekkel) |
| 8. Tesztek | ✅ 60/60 zöld, EHS-precedens szerinti lefedés |

---

## Blokkoló hibák

### S1 — OppDetailSlideOver: az „Ajánlat-piszkozat létrehozása" gomb lezárt lehetőségen engedélyezettként renderel → kattintás = 409-toast

`src/pages/crm/OppDetailSlideOver.tsx:155-167`

A gomb csak `createQuote.isPending`-re kap `disabledReason`-t — a **lezárt** (megnyert/
elveszett, quoteId nélküli) lehetőségen engedélyezettnek látszik, kattintásra az MSW
kontraktus-guard 409-et ad („Lezárt lehetőséghez nem hozható létre ajánlat.",
`src/mocks/crmApi/handlers.opps.ts:97-99`). A guard három helyen létezik (MSW handler,
adatréteg-teszt `oppFsm.test.ts:108`), csak a UI nem tükrözi — ez pont a plan 3.
vezérelvének (FSM-szigor: tiltott akció = **látható, de letiltott + tooltip**, nem
„engedélyezett, aztán hibázik") megsértése, és a seed-adattal azonnal reprodukálható:
`OPP-2426-006` (elveszett, nincs quoteId) megnyitása → aktív gomb → 409.

**Fix (pár sor):** a gombra
`disabledReason={!OPP_OPEN_STAGES.includes(opp.status) ? 'Lezárt lehetőséghez nem hozható létre ajánlat.' : createQuote.isPending ? 'Folyamatban…' : undefined}`
— így a viselkedés a slideover többi átmenet-gombjával konzisztens.

### S2 — Az EHS M1-lecke (detail-kulcs invalidálás) NEM került át: 409-rollback után a SlideOver nem szinkronizál újra a szerverrel

`src/services/crm/leads.ts:136-142` (`useInvalidateLeads`), `src/services/crm/opportunities.ts:137-143` (`useInvalidateOpps`)

Mindkét invalidáló helper csak a **lista**-prefixet (`['crm','leads']` / `['crm','opps']`)
és az `activities-recent`-et invalidálja. A detail-kulcsok viszont KÜLÖN prefix alatt
élnek (`crmKeys.lead(id)` = `['crm','lead',id]`, `crmKeys.opp(id)` = `['crm','opp',id]`,
ld. `keys.ts:12,15`) — ezeket az `onSettled` sosem éri el. Következmény: 409-es
(konkurens módosítás miatti) hibánál az optimista rollback a **kliens elavult** állapotát
állítja vissza, a listák frissülnek a szerverről, de a nyitva lévő SlideOver nem —
inkonzisztens UI (tábla már az új státuszt mutatja, a detail a régit). Ugyanez érinti a
`useConvertLead` dupla-convert 409-ágát.

Ez PONTOSAN az a csapda, amit az EHS M1 review-találat után a sablon README 6. szabálya
rögzített (`src/services/ehs/README.md:32-37`: „a detail kulcs … NEM a lista-prefix alatt
él, külön invalidálandó — 409-rollback után is így szinkronizál újra a szerverrel"), és
amit az EHS a fix-körben implementált (`src/services/ehs/incidents.ts:169-175`). A CRM
README kimondja, hogy „az EHS README szabályai érvényesek" — a 6. szabály tehát a saját
deklarált kontraktusa. A lecke **fele** átjött (a kereszt-domain link megvan: convert →
`opps`-invalidálás, `leads.ts:201` ✔), a detail-prefix fele nem.

**Fix (2×1 sor):** a `useInvalidateLeads`-be `[...crmKeys.all, 'lead']`, a
`useInvalidateOpps`-ba `[...crmKeys.all, 'opp']` invalidálás.

### S3 — Pipeline kanban: a vízszintesen görgő sáv nem hozza a spec 3.3 kötelező mintáját

`src/pages/crm/PipelineScreen.tsx:72` (konténer), `:76` (oszlop)

A kanban-sáv `flex gap-3 overflow-x-auto pb-4` — a DESIGN_SYSTEM_SPEC_V1 3.3 („Közös
szabályok minden vízszintesen görgő sávra … CRM-kanban") előírásaiból hiányzik:

- **görgetési affordancia**: nincs edge-fade maszk — a levágott tartalom jelzése a spec
  kifejezett követelménye; a minta a repóban készen van (`components/ui/Tabs.tsx:109`
  ugyanezt a `mask-image` receptet használja);
- **snap**: nincs `snap-x snap-mandatory` + oszlopokon `snap-start` (mobilon az oszlopok
  „félbe" állnak meg);
- **billentyűzet-elérés**: a konténer nem fókuszálható (`tabIndex={0}` + `role="region"`
  + `aria-label`) — amíg minden oszlopban van kártya, a belső gombokkal görgethető, de
  egy **üres oszlop** (pl. minden kártya továbbléptetve) nem hozható képernyőre
  billentyűzettel;
- **oszlop-szélesség**: `w-60` = 240 px < a spec 280 px kanban-minimuma;
- **oszlop-fejléc darabszám**: a `section` aria-label-je csak a fázisnév — a spec
  `aria-label="Ajánlat, 4 elem"` formát ír elő (a szám most csak vizuális);
- `touch-pan-x` nincs a sávon (függőleges swipe-ellopás kockázata).

Ami JÓ és megmarad: az oszlopok `<section aria-label>` = region szemantika ✔, a
fázis-léptetés validált FSM-átmenet (nem drag&drop — a spec 3.3 kanban-szabályával
konzisztens döntés, @dnd-kit kihagyása indokolt) ✔, kártya-koppintás → SlideOver ✔,
terminális kártyán nincs léptetés-gomb ✔ (tesztelt: `pipelineStageMove.test.tsx`).

---

## Jóváhagyott területek (részletek)

### 1. `fsmGuards.ts` generalizáció ✅ — tiszta kiemelés

`src/services/fsmGuards.ts` — a `FsmRule<S extends string>` + `canTransition` +
`transitionBlockReason` pontosan az EHS-ben bevált szerződés, modul-függetlenné téve:
a lokalizált címkék paraméterként jönnek (`statusLabels`), így a réteg nyelvfüggetlen
marad; a generikus `S` a státusz-uniókat típusbiztosan köti (a `LEAD_FSM`/`OPP_FSM`
`satisfies Record<string, FsmRule<...>>`-szal). Az EHS saját példányának érintetlenül
hagyása és follow-upként rögzítése (APPROVED fájlok stabilitása) helyes döntés — a
fejkomment dokumentálja. README-be felvéve ✔.

### 2. Adatréteg-minta konformancia (az S2-n túl) ✅

- **Zod-lefedettség teljes**: minden válasz sémán megy át (`apiFetch({ schema })`),
  a transition/convert/quote eredmények is dedikált sémával ✔
- **FSM-akció = dedikált végpont** (nincs generikus PATCH), route-térkép a services és
  az MSW oldalon tükörben ✔
- **Egy igazságforrás**: a `services/crm/fsm.ts` tábláit importálja a UI
  (`transitionBlockReason`) ÉS az MSW guard (409) ✔
- **Optimista frissítés** determinisztikus célállapotnál (lead/opp transition):
  onMutate cache-átírás → onError rollback + szerver-üzenetes toast → onSettled
  invalidálás ✔ (a rollback utáni re-sync az S2 fixszel lesz teljes)
- **Kulcs-gyár** hierarchikus, szűrő-paraméteres ✔; **toast a hookban** él, a komponens
  csak hív ✔; `sla.ts` SZÁMÍTOTT mező tiszta függvényként, nap-vége szabállyal,
  konfig-vezérelt ablakkal (`TASK_SLA_SOON_DAYS`) ✔
- Kereszt-domain: convert → opps-lista invalidálás + siker-toast az új opp-azonosítóval ✔
- README: szerkezet + FSM-referencia + backend-gap (hiányzó `nurturing` a backend
  Lead-domainben) világosan dokumentált, a root-döntés (a terv a kanonikus) hivatkozott ✔

### 3. MSW kontraktus-tükör ✅

- Állapottartó store + `resetCrmDb()`; a seed a meglévő `mocks/worlds.ts` adatokat
  **újrahasznosítja** (nem másolat — a worlds.ts kommentje jelzi a seed-forrás szerepet),
  a feladat-határidők „most"-relatívak → determinisztikus SLA-mix (a smoke-teszt a
  „2 SLA-sértés" KPI-t assertálja) ✔
- Guard → 409 a közös táblákból; discard/lose kötelező indok → 400; convert → új opp
  `nyitott` fázisban `fromLead`+`oppId` kereszt-linkkel; quote-csonk guardok (lezárt →
  409, dupla → 409); win→`wonAt`, lose→`lostAt`; minden átmenet napló-bejegyzést ír ✔
- Stabil `CRM_SEED_IDS`, a tesztek erre hivatkoznak ✔

### 4. Képernyők vs terv ✅ (mind a 6 + az új tasks fül)

- **Áttekintés**: 4 KPI kizárólag a hookokból számítva (pipeline, súlyozott forecast,
  nyitott feladatok + SLA-sértés danger-kiemeléssel dark-párral, konverzió), nyitott
  lehetőségek kivonat + legutóbbi tevékenységek az API-ból ✔
- **Leadek / Lehetőségek**: DataTable kettős render (F1-primitív helyes használata —
  `mobile: title/meta/hidden` szerepek, cím-cella valódi fókuszálható `<button>` →
  SlideOver), szerver-oldali szűrés (státusz-chipek + kereső / open-mind-fázis), súlyozott
  oszlop ✔
- **Feladatok** (ÚJ fül a worlds-configban ✔): határidő-rendezett lista, SZÁMÍTOTT
  SLA-pillek a spec-tónusokkal (ok=success/soon=warn/overdue=danger), prioritás-pill,
  teljesítés-akció, „teljesítettek is" kapcsoló ✔
- **Forecast**: recharts oszlopdiagram a megosztott lazy chunkban, egy adatsor
  jelmagyarázat nélkül, `aria-hidden` + **teljes hozzáférhető táblázat-nézet**
  (caption + th scope) — a dataviz-elvek szerint ✔
- **SlideOver-ek**: FsmStepper fő-lánc + mellékállapot (`sideLabel`), meta-grid,
  elvetés/elvesztés-ok doboz, konvertálás-link (`oppId`) ill. kapcsolt ajánlat
  (`quoteId`) megjelenítés, ActivityLog címkézett űrlappal ✔
- `CrmPage` 38 soros diszpécser, route-tesztekkel ✔

### 5. FSM UI (az S1-en túl) ✅

- Lead-panel: mind az 5 akció MINDIG látható; tiltott → `Button disabledReason`
  (aria-disabled + állandó DOM-tooltip + fókuszban marad — F1-minta); elvetés inline
  űrlap kötelező indokkal, kliens-validáció is disabledReason-ként ✔
- Opp-panel: mind a 6 akció, lose kötelező indokkal, win csak tárgyalásból
  (a guard-üzenet a közös táblából lokalizált) ✔
- Tesztelt: engedélyezett vs. tiltott gomb, lenyelt kattintás, átmenet utáni
  állapotváltás, terminális lead minden gombja tiltott, konvertálás ✔

### 6. Tokenek / dark / a11y ✅

- **Az EHS S1-osztályú hiba nem ismétlődött meg**: a `pages/crm` fa EGYETLEN nyers
  paletta-osztályt használ (`CrmDashboard.tsx:60` KPI-riasztás), és annak van dark-párja
  (`text-rose-600 dark:text-rose-400`) ✔. Minden más felület `surface-*`/`ink`/`line`/
  `world-*` token ✔
- Világ-akcent: worlds-config `accent: "blue"` + a `WorldShell` `data-world` gyökér —
  a chipek/gombok/fókusz-ringek a `world-*` tokenekből oldódnak fel ✔
  (`theme/fsmTones.ts` crmLead/crmOpportunity a spec 1.5 térképével egyezik, tesztelt ✔)
- FAB: a CRM-ben nincs bekötve — a spec 3.2 szerint FAB csak egyértelmű elsődleges
  létrehozó akcióhoz kell; új lead-űrlap nincs scope-ban (task follow-up 5.), így a
  FAB hiánya helyes (az EHS S2-ütközés itt fel sem merülhet) ✔
- Szűrő-chipek `aria-pressed`, kereső `aria-label`, QueryGate skeleton `aria-busy` /
  hiba `role="alert"` + Újra ✔

---

## Kért javítások (nem blokkoló) és megjegyzések

- **M1 — TasksScreen: közös mutation-példány fagyasztja az összes sort**
  (`src/pages/crm/TasksScreen.tsx:14,58-65`): egy `useCompleteTask` példány van a
  listára, így egy teljesítés alatt MINDEN sor gombja „Folyamatban…" lesz. Az EHS
  `PpeScreen` soronkénti mutation-példány mintája (a review kifejezetten dicsérte)
  a követendő. Kérve az S-körrel együtt.
- **M2 — Szűrő-chipek** (`LeadsScreen.tsx:75-90`, `OppsScreen.tsx:74-88`): az aktív
  chip csak színnel jelöl (spec 3.3: nem-szín jelzés is, pl. pipa-ikon), és `h-7`
  (28 px) a touch-küszöb (44 px) alatt van mobilon. Kérve, nem blokkoló.
- **N1 — Forecast dark-mód**: a diagram hardcode light hexekkel fut
  (`ForecastScreen.tsx:13,69-83` — rács `#e7e5e4`, tick `#78716c`, tooltip). A task
  follow-up 4. pontja dokumentálja → **elfogadva tracked backlogként** (a tokenszintű
  dark-epic tételei közé felveendő), a hozzáférhető táblázat-alternatíva miatt nem
  blokkoló. Apró: a `BAR_FILL` blue-**500**, a világ-akcent blue-**600** — a
  tokenesítéskor igazítandó.
- **N2 — Kanbanon nincs „elveszett" oszlop**: az elveszett kártya eltűnik a tábláról
  (a Lehetőségek szűrőben elérhető). Elfogadható terv-értelmezés — a fix-körben nem kell
  hozzányúlni, de a won-oszlop mintájára megfontolható.
- **N3 — Dashboard nyers `<button>`-ok** (`CrmDashboard.tsx:73-78,101-106`): a
  „Pipeline →" / „Feladatok →" linkek nem a Button primitívet használják és nincs
  explicit `type` (formon kívül ártalmatlan) — kozmetikai.
- **N4 — Kanban „Megnyert" egy koppintásra**: a `targyalas` oszlop léptetés-gombja
  megerősítés nélkül zár le terminális állapotba (a lose indok-kötelező, a win nem).
  A tervvel nem ellentétes; UX-megfontolásként rögzítve.
- **N5 — `QueryGate` az EHS-ből importált** (task follow-up 3.) — a `components/ui`-ba
  promótálás külön mini-task, tracked ✔.

---

## Tesztek

CRM-scope-ú futtatás (`npx vitest run src/services/crm src/pages/crm
src/pages/__tests__/CrmPage.test.tsx`): **7 fájl / 60 teszt — mind zöld** (egyezik a
task-jelentéssel). Lefedik: lead-FSM guard-táblák + teljes legális lánc + 409 + 404 +
discard-indok 400 + convert (csonk, kereszt-link, dupla 409); opp-FSM fő lánc + fázis-
ugrás 409 + lose-indok + terminális 409 + quote-csonk guardok + `nextOppAction` +
súlyozott érték; SLA határértékek + nap-vége szabály + determinisztikus seed-mix;
UI: aria-disabled + tooltip + lenyelt kattintás + kanban oszlop-váltás szerver-státusszal
+ smoke mind a 6 képernyőre + CrmPage route-diszpécser.

Megjegyzés: az S1 és S2 fixhez teszt is jár — S1: lezárt oppon a quote-gomb
`aria-disabled`; S2: a meglévő teszt-utils-szal a detail-kulcs 409 utáni
invalidálása asszertálható.

---

## Kért javítások összefoglalva (re-review scope)

| # | Fájl | Mi | Súly |
|---|---|---|---|
| S1 | `src/pages/crm/OppDetailSlideOver.tsx:155-167` | Quote-gomb `disabledReason` lezárt lehetőségen (OPP_OPEN_STAGES guard a UI-ban is) | blokkoló |
| S2 | `src/services/crm/leads.ts:136-142`, `opportunities.ts:137-143` | Detail-prefix (`lead`/`opp`) invalidálás az onSettled-ben (EHS README 6. szabály) | blokkoló |
| S3 | `src/pages/crm/PipelineScreen.tsx:72,76` | Kanban-sáv spec 3.3: edge-fade maszk + snap + fókuszálható region + 280 px oszlop + darabszám az aria-labelben + `touch-pan-x` | blokkoló |
| M1 | `src/pages/crm/TasksScreen.tsx:14,58-65` | Soronkénti complete-mutation (EHS PpeScreen minta) | kérve, nem blokkoló |
| M2 | `LeadsScreen.tsx:75-90`, `OppsScreen.tsx:74-88` | Aktív chip nem-szín jelzés + touch-méret | kérve, nem blokkoló |
| N1–N5 | ld. fent | apróságok / tracked backlog | opcionális |

Az S1–S3 javítás után a CRM-minta a következő modulokra (HR, Maintenance…) **változtatás
nélkül ajánlott sablon** — a `fsmGuards` kiemeléssel a másolás az EHS-nél is olcsóbb.
A re-review az S1–S3 (+M1/M2, ha egy körben készül) célzott ellenőrzésére korlátozódik,
az adatréteg/FSM/teszt mag újranyitása nélkül. A repo-gyökér `CLAUDE.md` CRM sora a régi
prototípus-review APPROVED-ját őrzi — a jelen review a PORTÁL-implementációra vonatkozik,
a CLAUDE.md-t nem módosítottam.

---

_Designer terminál — JoineryTech sziget. Re-review: az S1–S3 fix után jelezz a designer mailboxba._

---

## RE-REVIEW: ✅ APPROVED — 2026-07-14 (F2-CRM-REREVIEW)

Az F2-CRM-FIX kör minden blokkoló (S1–S3) és mindkét kért (M1–M2) findingot
megoldotta — kódolvasással és célzott tesztfuttatással ellenőrizve, szűk scope-ban
(az adatréteg/FSM/teszt-mag nem lett újranyitva; Kontrolling-fájlok nem érintve).

| # | Ellenőrzés eredménye | Verdikt |
|---|---|---|
| S1 | `OppDetailSlideOver.tsx:160-176`: a quote-gomb lezárt lehetőségen `disabledReason`-t kap („Lezárt lehetőséghez nem hozható létre ajánlat.") az új, nevesített `isOppOpen(status)` guarddal (`services/crm/fsm.ts:74-76` — az MSW 409-guard UI-tükre, kommentelve). Teszt: `__tests__/OppDetailSlideOver.test.tsx` — 3 teszt (aria-disabled + tooltip-szöveg aria-describedby-on, elnyelt kattintás a store ellen asszertálva, nyitott oppon végrehajt + „Kapcsolt ajánlat" render). | ✅ |
| S2 | `leads.ts:136-146` / `opportunities.ts:137-147`: mindkét invalidáló a lista-prefix mellett a **singular detail prefixet** (`[...crmKeys.all,'lead']` / `'opp'`) is invalidálja, a README 6. szabályra hivatkozó kommenttel (incidents.ts-minta). Teszt: `__tests__/detailInvalidation.test.tsx` — 4 teszt (opp-átmenet 409, lead-átmenet 409, quote-csonk 409, sikeres átmenetnél lista+detail együtt), `getQueryState().isInvalidated`-en asszertálva. | ✅ |
| S3 | `PipelineScreen.tsx:78-91`: a sáv `role="region"` + `aria-label="Pipeline fázis-oszlopok"` + `tabIndex={0}` + fókusz-ring; edge-fade `mask-image` (Tabs.tsx-recept); `snap-x snap-mandatory` + oszlopokon `snap-start`; `touch-pan-x`; oszlop `w-[280px]` (spec-minimum); oszlop-név darabszámmal („Nyitott, 1 elem"). Teszt: `pipelineStageMove.test.tsx:66-81` mind a hat affordanciát asszertálja, a darabszám-követés a léptetés-teszt részeként is fut. | ✅ |
| M1 | `TasksScreen.tsx:16-48`: soronkénti `useCompleteTask` a kiemelt `TaskRow` komponensben (EHS PpeScreen-minta) — a pending már csak a saját sorát tiltja. | ✅ |
| M2 | `LeadsScreen.tsx:79-95` / `OppsScreen.tsx:79-95`: aktív chip nem-szín jelzése (check-ikon `aria-hidden` + `font-semibold`), a 28 px-es pillen `before:inset-x-0 before:-inset-y-2` pszeudó → 44 px-es függőleges touch-célfelület a vizuális méret változatlanul hagyásával; `aria-pressed` megmaradt. | ✅ |

**Tesztfuttatás:** `npx vitest run src/services/crm src/pages/crm
src/pages/__tests__/CrmPage.test.tsx` — **9 fájl / 68 teszt zöld** (a review-kori
60 + 8 új), egyezik a task-jelentéssel.

**Következmény:** a CRM-minta a bejelentett formában **változtatás nélkül ajánlott
sablon** a következő modulokra (HR, Maintenance…). Az N1–N5 tételek tracked
backlogként élnek tovább, e re-review scope-ján kívül. A repo-gyökér `CLAUDE.md`
CRM sora már ✅ — módosítás nem szükséges.

_Designer terminál — F2-CRM re-review lezárva: ✅ APPROVED._
