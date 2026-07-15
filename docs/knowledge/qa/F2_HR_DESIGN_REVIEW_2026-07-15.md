# F2-HR-REVIEW — HR modul designer review (Fázis 2, 4. modul)

> **Kiadta:** designer terminál — 2026-07-15
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-HR-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (HR: accent amber — 17. sor; kapacitás-rács + távollét-FSM + készség-mátrix — 40. sor; FSM: `kert → jovahagyva → folyamatban → lezarva` +`elutasitva` — 65. sor), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`, precedensek: EHS/CRM/Kontrolling review-k (`docs/knowledge/qa/`)
> **Vizsgált kód:** `src/joinerytech-portal` main@`8831603` (F2-HR-FE: `src/services/hr/`, `src/mocks/hrApi/`, `src/pages/hr/`, `src/pages/HrPage.tsx` + tesztek)
> **Módszer:** teljes HR-diff átolvasás a spec + a három korábbi modul-review érett szempontrendszere ellen, tesztfuttatás (HR-scope-ú vitest: **6 fájl / 57 teszt — mind zöld**, bontás lent). A Maintenance-fájlokat (párhuzamos frontend-munka) NEM érintettem, portal-fájl nem módosult.

---

## Összesített verdikt: ✅ APPROVED

Az F2-HR munka a sablon **negyedik, legtisztább iterációja**: a három korábbi
review MINDEN dokumentált leckéje beépült — a széles rácsok saját
`role="region"` scroll-konténerben görögnek (Kontrolling S1-minta, kommentben
hivatkozva), a szűrő-chipek pipa+félkövér+44 px-es célfelülettel készültek
(Kontrolling S2-minta), a detail-kulcs KÜLÖN invalidálódik (CRM S2-lecke), és
a kapacitás-rács jelmagyarázata szín+szöveg páros. A `fsm.ts` a közös
`services/fsmGuards`-ra épül (elsőként — az EHS saját példánya follow-up), a
`calc.ts` kapacitás-tükröt a UI és az MSW közösen futtatja, a rule-6
kereszt-invalidálás (absences + absence + capacity) hiánytalan és a
kontraktus-teszt is fedi. **Blokkoló hiba nincs**; egy fontos (M1: egy
hardcode-olt küszöb-literál a dashboardon) és négy apró tétel follow-upként
kérve/rögzítve.

| Terület | Verdikt |
|---|---|
| 1. FSM egy igazságforrás (`fsm.ts` + közös `fsmGuards`; UI ÉS MSW) | ✅ APPROVED |
| 2. Adatréteg (`services/hr/`): zod, kulcs-gyár, hookok, optimista átmenet | ✅ APPROVED |
| 3. `calc.ts` kapacitás-tükör (backend CapacityCalculationService; UI+MSW közös) | ✅ APPROVED |
| 4. Rule-6 invalidálás: `absences` + `absence` (detail!) + `capacity` kereszt | ✅ APPROVED |
| 5. MSW kontraktus-tükör (`mocks/hrApi/`): 409 FSM-guard, 400, 404, üzleti guard | ✅ APPROVED |
| 6. Képernyők vs terv (6 képernyő, amber akcent) | ✅ APPROVED |
| 7. S1-osztály: görgethető rácsok saját régióban (kapacitás, készség-mátrix) | ✅ APPROVED |
| 8. S2-osztály: chip-affordanciák (pipa + 44 px touch-cél, 3 képernyőn) | ✅ APPROVED |
| 9. Kapacitás-rács jelmagyarázat: szín + szöveg (nem csak szín) | ✅ APPROVED |
| 10. Tokenek / amber / dark / nyerspaletta-fegyelem | ✅ APPROVED |
| 11. Config-vezérelt küszöbök | ⚠ M1 — egy literál (kérve, nem blokkoló) |
| 12. Loading/empty/error + magyar címkék (labels.ts) | ✅ APPROVED |
| 13. Tesztek | ✅ 57/57 zöld (6 fájl) |

---

## Blokkoló hibák

**Nincs.** (Először a Fázis 2-ben.)

---

## Jóváhagyott területek (részletek)

### 1. FSM-integritás ✅ — az EGYETLEN átmenet-forrás igazoltan közös

`src/services/hr/fsm.ts` — a backend `AbsenceStatusTransitions` 1:1 tükre
(`kert → jovahagyva → folyamatban → lezarva`, +`elutasitva` a kertből,
`reopen`-nel vissza — a terv 65. sora betűre), és ELSŐKÉNT a közös
`services/fsmGuards.ts`-re épül (az EHS saját helper-példányának kiváltása
tracked follow-up, `fsmGuards.ts:9-11`):

- **UI:** `AbsenceDetailSlideOver.tsx:37-40` — indok-lánc: pending →
  `hr.manage` jogosultság (approve/reject) → `transitionBlockReason` az
  FSM-táblából; a tiltott gomb `disabledReason`-t kap (aria-disabled +
  tooltip, a Button primitívvel), SOSEM rejtett. Mind az 5 akció-gomb mindig
  látszik.
- **MSW:** `mocks/hrApi/handlers.absences.ts:28` + `db.ts:57-68` — ugyanaz a
  `canTransition` dönt, tiltott átmenet → 409 a szabálysértést leíró üzenettel.
- **Bónusz nevesített guardok** (isOppOpen-minta): `isAbsenceBlocking`
  (kapacitást blokkoló státuszok — a calc ÉS a dashboard közös feltétele,
  `fsm.ts:45-51`), `isAbsenceRequested` (`fsm.ts:54-56`),
  `isTimeLogPushable` (`timeLogs.ts:33-35` — a push-gomb és az MSW 409 közös
  üzleti guardja).
- A reject KÖTELEZŐ indoka kliens- és szerver-oldalon is érvényesül
  (`AbsenceDetailSlideOver.tsx:92` disabledReason ↔
  `handlers.absences.ts:70-72` → 400); a reopen az indokot törli
  (`handlers.absences.ts:87-89`) ✔. FsmStepper a fő úton, az `elutasitva`
  mellékág `sideLabel`-lel ✔.

### 2. Adatréteg-minta konformancia ✅

- Zod-lefedettség teljes; kulcs-gyár hierarchikus, a detail-kulcsok
  (`employee`, `absence`) NEM a lista-prefix alatt — a fájl-fejkomment
  explicit figyelmeztet a CRM S2-leckére (`keys.ts:6-8`) ✔
- **Optimista átmenet helyesen:** onMutate a detail cache-t a célállapotra
  billenti, 409-nél rollback + a szerver guard-üzenete toastban, onSettled
  mindig invalidál (a szerver az igazságforrás) — `absences.ts:140-162` ✔
- FSM-akció = dedikált végpont (nincs generikus PATCH), EHS README 2. szabály
  (`absences.ts:75-85`) ✔
- `hr.manage` jogosultság UI-STUB dokumentált bekötési ponttal
  (`permissions.ts` — auth-bekötéskor csak a hook belseje cserélendő);
  a jogosultság-hiány is disabledReason, nem rejtett gomb — és TESZTELT
  (absenceFlow 4. teszt) ✔
- Timelog→Kontrolling push STUB: a jövőbeli `controllingKeys.all`
  kereszt-invalidálás TODO-ként dokumentálva (`timeLogs.ts:82-84`) ✔
- README rögzíti a modul-sajátosságokat (5 pont: FSM-tükör, calc, rule-6,
  hr.manage stub, push-stub) ✔

### 3. `calc.ts` kapacitás-tükör ✅ — a Kontrolling-minta jól ült át

- Napi kapacitás = heti óraszám / `WORKDAYS_PER_WEEK`, túlterhelés
  `OVERLOAD_EPSILON` tűréssel, sáv-küszöb `UTILIZATION_WARN_THRESHOLD` —
  MIND configból (`config.ts:14-20`) ✔
- Blokkoló távollét → 0 kapacitású nap; a blokkoló-halmaz a NEVESÍTETT
  `isAbsenceBlocking` guard (a fsm.ts-ből — a számítás és az FSM egy fájlban
  nem keveredik, de egy igazságforrásból dolgozik) ✔
- **A kliens sosem számol saját rácsot:** a `/capacity` szerver-számított
  (MSW: `handlers.capacity.ts:25-29` ugyanazt a `calcWeekCapacity`-t
  futtatja); a hétfő-validáció 400-at ad (`handlers.capacity.ts:17-22`) ✔
- Élhelyzetek tesztelve: 0 kapacitás → 0 kihasználtság (nincs 0-osztás),
  pontosan kapacitáson lévő lekötés nem túlterhelés (epsilon), hétvége-ág,
  hónap-határ ✔
- A seed dátumai a „mához" képest relatív MUNKANAP-eltolással generáltak
  (hétvége-biztos determinisztikus szerkezet, `seed.ts:16-36`) + stabil
  seed-ID-k a tesztekhez — gondos, újrafuttatható mock-terv ✔

### 4. Rule-6 kereszt-invalidálás ✅ — a review-kérdés magja rendben

`absences.ts:110-117`: a távollét-mutáció a `absences` lista-prefixet, a
`absence` DETAIL-prefixet (külön él!) ÉS a `capacity` prefixet (minden
betöltött hét) invalidálja — a blokkoló státuszba lépő távollét kiveszi a
napokat a rácsból, így a számított erőforrás is frissül. A keresztkötés a
KONTRAKTUS-tesztben is fedett („RULE-6 keresztkötés: az approve után a
kapacitás-rács változik" — hrApi.test.ts), és a UI-folyam teszt a
lista-frissülést is asszertálja ✔.

### 5. MSW kontraktus-tükör ✅

- Állapottartó store + `resetHrDb()` (`db.ts`), a dolgozó-törzs a meglévő
  statikus mockból újrahasznosítva (CRM seed-minta) ✔
- Backend-invariánsok: tiltott FSM-átmenet → **409** (közös guard), reject
  indok nélkül → **400**, ismeretlen id → **404**, üres push → **409**
  üzleti guard (`handlers.timelogs.ts:33-36` — a UI gombja ugyanezt tükrözi
  disabledReason-nel) ✔
- Szerver-oldali szűrők: dept/q/skill (dolgozók), status/empId (távollét),
  empId (beosztás, timelog); rendezettség dokumentált kommentekkel ✔

### 6. Képernyők vs terv ✅ (mind a 6)

- **Worlds-config:** dash / people / capacity / absences / skills / timelogs
  (`mocks/worlds.ts:287-300`), `accent: 'amber'` — a terv 17. sora szerint;
  a `HrPage` 37 soros vékony diszpécser route-tesztekkel ✔. A világ-kártya
  badge („1 kérelem") a seeddel EGYEZIK (1 db `kert` kérelem) — a Kontrolling
  N2 hiba nem ismétlődött ✔
- **Áttekintés:** 4 KPI kizárólag hookokból (mai jelenlét hétvége-ággal,
  kihasználtság, túlterheltek, nyitott kérelmek), túlterhelt-lista
  ikon+szöveges pill párossal (nem csak szín, `HrDashboard.tsx:127-131`),
  nyitott kérelmek képernyő-linkekkel ✔
- **Dolgozók:** DataTable kettős render, SZERVER-oldali részleg-szűrő +
  kereső (sr-only label a mezőn), heti terhelés-oszlop a /capacity-ból
  szöveg + sávcímkés pill párossal ✔
- **Kapacitás-rács:** ld. 7. és 9. pont; hét-léptetés gombsor `role="group"`
  + aria-label, hétvégén automatikusan a következő tervezhető hét
  (`capacityWeekOf`) ✔
- **Távollét:** DataTable + státusz-szűrő chipek (szerver-oldali), sor-cím
  → detail SlideOver FsmStepperrel + akció-panellel + naplóval ✔
- **Készség-mátrix:** szintezett cellák — a szint SZÁMKÉNT is a pillben
  („2 · Rutin", nem csak szín), lefedettség-összesítő lábléc,
  készség-szűrő ✔
- **Munkaidő-napló:** átadási státusz pillekkel, push-gomb hármas
  disabledReason-lánccal (jog → pending → nincs tétel) ✔

### 7–8. A korábbi review-k hibaosztályai — mind megelőzve ✅

- **S1-osztály (görgethető rács):** a kapacitás-rács
  (`CapacityScreen.tsx:76-81`) és a készség-mátrix (`SkillsScreen.tsx:78-83`)
  SAJÁT `overflow-x-auto` + `role="region"` + `aria-label` + `tabIndex={0}` +
  fókusz-ring konténerben él (spec 2.4; a Kontrolling S1-fix receptje,
  kommentben hivatkozva); sr-only `<caption>` + `th[scope]` mindkét kézi
  táblán; a többi lista a DataTable primitívet használja. TESZTELT (smoke +
  HrPage: „saját görgethető régió") ✔
- **S2-osztály (chipek):** mindhárom chip-soron (Távollét státusz,
  Dolgozók részleg, Készség-szűrő) az aktív chip pipa-ikon (`aria-hidden`) +
  `font-semibold` nem-szín jelzést kap, a 28 px-es pill körül
  `before:-inset-y-2` pszeudó adja a 44 px-es touch-célt, `aria-pressed` +
  `role="group"` ✔ — a Kontrolling S2-fix mintája, kommentben hivatkozva.
  TESZTELT (smoke: „részleg-szűrő chipek (S2-minta)") ✔

### 9. Kapacitás-rács: nem csak szín hordozza az információt ✅

- Minden munkanap-cellában a lekötés/kapacitás SZÁMKÉNT áll
  (`8/8` tabular-nums), túlterhelt cellán sr-only „— túlterhelt" kiegészítés
  (`CapacityScreen.tsx:135-139`); távollét-cella a típus RÖVID SZÖVEGÉVEL
  (nem üres színfolt); hétvége „—" aria-label-lel ✔
- Jelmagyarázat szín + SZÖVEG párokkal (`CapacityScreen.tsx:159-176`, a
  minták `aria-hidden` dekorációk, a címke a configból származó
  `LOAD_BAND_META` szövege); a túlterhelt sáv a színen túl RING-gel is
  elválik (forma-jelzés) ✔; heti összesítő oszlopban óraszám + sáv-címke
  szövegként ✔

### 10. Tokenek / amber / dark / a11y ✅

- **Amber akcent tokenből:** `[data-world="hr"]` light+dark változó-készlet
  az `index.css:118-129`-ben (a `--world-fg` dark módban amber-950 — a
  chip-kontraszt rendben); a képernyők KIZÁRÓLAG `world-*` tokent használnak
  (bg-world, world-ring, world-soft-fg) — nyers amber-osztály akcent-célra
  sehol ✔
- **Nyerspaletta-fegyelem:** a `pages/hr` fa minden nyers paletta-osztálya
  szemantikus jelzőszín (rose/amber/emerald a terhelés-sávokhoz) és MIND
  dark-páros (9 előfordulás ellenőrizve — az EHS S1 hibaosztály nem
  ismétlődött) ✔
- SlideOver (F1 primitív) helyes használat mindkét helyen; loading skeleton
  `aria-busy`, hiba `role="alert"`, QueryGate minden képernyőn Újra-gombbal;
  üres állapotok magyar szöveggel ✔
- Magyar címkék központi `labels.ts`-ben (státusz/akció/típus/részleg/
  bérsáv/készség + formázók), a tónusok a spec 1.5 `hrTavollet` térképével
  betűre egyezők (`theme/fsmTones.ts:24-28`) ✔
- EmployeeAvatar dekoratív (`aria-hidden`), a nevet mindig látható szöveg
  hordozza ✔

---

## Kért javítások (nem blokkoló) és megjegyzések

- **M1 — HrDashboard: hardcode-olt küszöb-literál a terhelés-sávon**
  (`src/pages/hr/HrDashboard.tsx:212`): a heti terhelés-sáv tónusa
  `pct > 85` literállal dönt, miközben a küszöb config-vezérelt
  (`config.ts:20`, `UTILIZATION_WARN_THRESHOLD = 0.85`) és a modul minden
  más pontja a configból dolgozó `loadBand`-et használja. Küszöb-módosításnál
  a dashboard-sáv elszakadna a Dolgozók képernyő „Magas terhelés" pilljétől —
  a Kontrolling M2 leckéjének visszatérése egy (dekoratív, desktop-only)
  ponton. Mivel a modul a küszöb-rendszert egyébként teljesen internalizálta
  (a számok szövegként helyesek, csak a sáv színe érintett), NEM emelem
  blokkolóvá. **Fix (1 sor):** `loadBand(r.assigned, r.capacity)` tónus-térképpel,
  vagy `UTILIZATION_WARN_THRESHOLD` import. Kérve a következő HR-t érintő
  fix-körrel; a soron következő modul-review-ban ellenőrzöm.
- **N1 — `QueryGate` továbbra is az EHS-ből importált** — immár a 4. modul
  importálja (`pages/ehs/QueryGate`); a `components/ui`-ba promótálás a CRM
  N5 / Kontrolling N6 közös mini-taskja, tracked backlog.
- **N2 — Reject-űrlap kézi input** (`AbsenceDetailSlideOver.tsx:83-88`):
  címkézett, fókusz-ringes, működő — de nem az EHS `formFields` primitívjeit
  használja (a Kontrolling AdjustmentForm igen). Konzisztencia-nit.
- **N3 — Dashboard terhelés-sáv mobilon teljesen rejtett**
  (`HrDashboard.tsx:203`, `hidden md:block`): mobil-nézetben a
  kihasználtság-blokk (óraszámokkal együtt) eltűnik, csak a Túlterhelt pill
  marad. Az adat a Kapacitás fülön elérhető, ezért nit; megfontolható a
  számpár (`32/40 ó`) mobilon is.
- **N4 — EmployeeAvatar fehér monogram törzsadat-színen**
  (`EmployeeAvatar.tsx:17-19`): a kontraszt a seed-színektől függ; mivel a
  korong `aria-hidden` dekoráció és a név mindig szövegként áll mellette,
  nem a11y-hiba — megjegyzés a leendő valós törzsadat-színekhez (világos
  szín esetén sötét monogram-szín számítása).

---

## Tesztek

HR-scope-ú futtatás (`npx vitest run src/pages/hr src/services/hr
src/pages/__tests__/HrPage.test.tsx`): **6 fájl / 57 teszt — mind zöld**
(egyezik az F2-HR-FE task-jelentés 57/57-ével). Bontás:

| Fájl | Teszt | Fókusz |
|---|---|---|
| `services/hr/__tests__/calc.test.ts` | 17 | dátum-helperek, napi kapacitás, túlterhelés-epsilon, blokkoló távollét, 0-osztás-ág, config-küszöbök |
| `services/hr/__tests__/hrApi.test.ts` | 16 | MSW-kontraktus: szűrők, FSM 409/400/404, teljes lánc, RULE-6 keresztkötés, push üzleti guard |
| `services/hr/__tests__/absenceFsm.test.ts` | 7 | átmenet-tábla, terminális állapot, blockReason, blokkoló/nyitott guardok |
| `pages/hr/__tests__/hrScreens.smoke.test.tsx` | 6 | mind az 5 képernyő + S1 régió- és S2 chip-asszertek |
| `pages/hr/__tests__/absenceFlow.test.tsx` | 4 | tiltott gombok aria-disabled+tooltip, approve-folyam listafrissüléssel, reject-folyam, hr.manage-tiltás |
| `pages/__tests__/HrPage.test.tsx` | 7 | route-diszpécser mind a 6 képernyőre + SlideOver-nyitás |

A lefedés a precedens-szerinti (calc tiszta függvények + MSW-kontraktus +
UI-folyamok), és — először a sorozatban — a **jogosultsági tiltott ág** is
UI-tesztelt.

---

## Findings összefoglalva

| # | Fájl | Mi | Súly |
|---|---|---|---|
| M1 | `src/pages/hr/HrDashboard.tsx:212` | Sáv-tónus küszöb configból (`UTILIZATION_WARN_THRESHOLD` / `loadBand`), nem `85` literál | kérve, nem blokkoló |
| N1 | `pages/ehs/QueryGate` importok | QueryGate promótálás `components/ui`-ba (CRM N5 / Kontrolling N6 közös tétel) | tracked backlog |
| N2 | `AbsenceDetailSlideOver.tsx:83-88` | Reject-input a közös formFields primitívekkel | opcionális |
| N3 | `HrDashboard.tsx:203` | Terhelés-számpár mobilon is | opcionális |
| N4 | `EmployeeAvatar.tsx:17-19` | Monogram-kontraszt adatfüggő — valós törzsadatnál számított szövegszín | megjegyzés |

**Döntés: ✅ APPROVED.** Blokkoló hiba nincs — a HR az első modul a Fázis
2-ben, amely fix-kör nélkül megy át: a három korábbi review dokumentált
leckéi bizonyítottan beépültek a sablonba. Az M1 egy-soros fix a következő
HR-t érintő körrel; N1–N4 tracked backlog. A `hr` felkerül a `modules_done`
listára; a következő modul (Maintenance) review-jában az M1-et és a közös
QueryGate-promótálást is ellenőrzöm.

---

_Designer terminál — JoineryTech sziget. F2-HR review lezárva: ✅ APPROVED._
