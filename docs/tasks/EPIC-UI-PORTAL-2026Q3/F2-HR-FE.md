# F2-HR-FE — HR modul-képernyők + adatréteg (Fázis 2, 4. modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-15) · **Fázis:** F2
- **Előfeltétel:** F2-EHS-FE (adatréteg-minta), F2-CRM-FE (FSM-SlideOver + `services/fsmGuards`), F2-KONTROLLING-FE (calc-tükör minta, S1/S2 review-leckék), F1 primitívek
- **Akcent:** amber (worlds-config `hr` + `[data-world]` tokenek)

## Feladat

A HR modul portál-oldali kiépítése a bevált adatréteg-mintára:
1. **Adatréteg** (`src/services/hr/`): zod + TanStack Query + a távollét szigorú FSM-je a közös `services/fsmGuards`-szal; kapacitás-számítás calc-tükörrel.
2. **Képernyők:** HR-áttekintés, Dolgozók, Kapacitás-rács, Távollét (FSM-akciókkal), Készség-mátrix, Munkaidő-napló.
3. **Tesztek** + teljes suite + build + lint.

### ⚠️ Backend-gap (follow-up a backend terminálnak)

- **Nincs HR API-réteg/host (audit G4.1):** a `src/hr` backend domainje KÉSZ és terv-konform (Absence aggregátum + `AbsenceStatusTransitions` FSM + guardok), de nincs endpoint-rétege — a kontraktus ezért **MSW-FIRST** tükör (`src/mocks/hrApi/`), a backend domain-elnevezéseit követve (approve/reject/start/complete/reopen; Pending/Approved/InProgress/Completed/Rejected ↔ kert/jovahagyva/folyamatban/lezarva/elutasitva).
- **Kapacitás-endpoint előkép:** `GET /api/hr/capacity?week=` — szerver-számított heti rács (a backend `CapacityCalculationService` szemantikája: napi kapacitás = heti óraszám/5, blokkoló távollét → 0); a kliens SOSEM számol saját rácsot.
- **`hr.manage` jogosultság UI-STUB** (`permissions.ts`): auth-bekötéskor csak a `useHrPermissions` belseje cserélendő; a tiltott döntés-gomb már most `disabledReason`-nel magyarázott.
- **Munkaidő → Kontrolling átadás STUB** (`timeLogs.ts` + `/timelogs/push`): most csak `pushedAt`-jelölés + toast; éles integrációkor a mutációnak a `controllingKeys.all`-t IS invalidálnia kell (munka-kategória tényköltség), és a backend-oldali költség-feladás tisztázandó.

## Kivitelezés

### 1. Adatréteg (`src/services/hr/` — ld. `services/hr/README.md`)
- `fsm.ts`: **ABSENCE_FSM** — az EGYETLEN átmenet-forrás UI és MSW alá (közös `services/fsmGuards` helperekkel); `ABSENCE_BLOCKING_STATUSES` + `isAbsenceBlocking` nevesített guard (kapacitás-számítás közös feltétele), `isAbsenceRequested` KPI-guard.
- `calc.ts`: a Kontrolling `calc.ts` megfelelője — dátum-helperek (hétfő/munkanap/kapacitás-hét), napi/heti terhelés-számítás (kapacitás, lekötés, túlterhelés-epsilon, blokkoló távollét → 0), `loadBand` küszöbök a configból. **Ugyanezt futtatja a UI és az MSW.**
- `employees.ts` / `assignments.ts` / `capacity.ts` / `absences.ts` / `timeLogs.ts`: zod-sémák + fetcherek + hookok; a távollét-átmenet **optimista** (detail-cache azonnal, 409-nél rollback + hiba-toast).
- **Rule-6 invalidálás** (`absences.ts useInvalidateAbsences`): `absences` lista-prefix + `absence` **szinguláris detail-prefix** (külön él!) + `capacity` (a blokkoló státuszba lépő távollét a rácsot is érinti) — a CRM S2-lecke szerkezeti alkalmazása.
- `keys.ts`: hierarchikus kulcs-gyár (`hrKeys.all` alatt), a detail-kulcs csapda dokumentálva.
- `permissions.ts` + `config.ts` (API base, munkanap/hét, túlterhelés-epsilon, warn-küszöb — QUALITY.md 3.).

### 2. MSW kontraktus-tükör (`src/mocks/hrApi/`)
- Állapottartó store (`db.ts`, `resetHrDb()`), közös `guardTransition` → tiltott FSM-átmenet **409** a szabálysértő üzenettel; reject indok nélkül **400**; ismeretlen id **404**; üres push **409** (üzleti guard).
- `seed.ts`: dolgozó-törzs a meglévő `mocks/hr.ts`-ből újrahasznosítva; a dátumos adatok (5 távollét — státuszonként egy; 7 beosztás; 6 munkaóra-tétel) a „mához" képest **relatív munkanap-eltolással** generáltak → a rács és a KPI-k hétvége-biztosan determinisztikusak; stabil `HR_SEED_IDS` (túlterhelt/távollevő/kérelmező/részmunkaidős dolgozó).
- `/capacity` a `services/hr/calc.ts`-szel számol (egy igazságforrás); week-validáció (nem hétfő → 400).

### 3. Képernyők (`src/pages/hr/`; `HrPage.tsx` 533 soros statikus oldal → ~38 soros diszpécser; worlds-config: +**timelogs** fül)
- **Áttekintés** (`HrDashboard`): 4 KPI (mai jelenlét, kapacitás-kihasználtság, túlterheltek, nyitott kérelmek) + túlterhelt-lista + nyitott kérelmek + heti terhelés-sávok — minden érték a hookokból.
- **Dolgozók** (`PeopleScreen`): DataTable kettős render, SZERVER-oldali részleg-szűrő chipek (Kontrolling S2-minta: pipa + font-semibold + 44 px touch-cél) + kereső (q), heti terhelés-oszlop a `/capacity`-ből `loadBand` pillel; sor → profil-SlideOver (`EmployeeDetailSlideOver`: készség-pillek szint-számmal, beosztások, munkaóra-napló push-akcióval, távollétek).
- **Kapacitás-rács** (`CapacityScreen`): heti H–P rács hét-léptetéssel, cellák terhelés-sávval (szín+szöveg), távollét/hétvége cellák, heti összesítő sáv-címkével; a rács **saját görgethető régió** (`role="region"` + `aria-label` + `tabIndex` — Kontrolling S1-lecke), jelmagyarázat.
- **Távollét** (`AbsencesScreen` + `AbsenceDetailSlideOver`): kérelmek DataTable státusz-szűrő chipekkel; detail: **FsmStepper** (kert → jóváhagyva → folyamatban → lezárva, elutasítva mellékállapotként), átmenet-gombsor — a tiltott akció `disabledReason`-nel (aria-disabled + tooltip, SOSEM rejtett), indok-lánc: folyamatban → `hr.manage` (approve/reject) → FSM-guard; elutasítás kötelező indokkal (CRM discard-minta), napló.
- **Készség-mátrix** (`SkillsScreen`): dolgozó × készség rács szintezett pillekkel (szám+címke, nem csak szín), SZERVER-oldali készség-szűrő, lefedettség-összesítő (fő + mester), saját görgethető régió.
- **Munkaidő-napló** (`TimeLogsScreen`): tételek DataTable-ben átadási státusszal, „Átadás a Kontrollingnak (n)" gomb — nincs átadható tétel / nincs jog → magyarázott tiltás (a 409 üzleti guard UI-tükre).

## Eredmény

- A HR a **negyedik modul** a típusos adatréteg-mintán — itt a minta mindkét korábbi ágát kombinálja: szigorú FSM (EHS/CRM-út, közös `fsmGuards`) + számítás-tükör calc-modul (Kontrolling-út).
- Gap-analízis HR-hiányai lezárva: adatréteg ✅ (statikus import → MSW+Query), távollét-akciók ✅ (a `kert→jovahagyva` már kattintható, guardolt), készség-mátrix képernyő ✅, + munkaidő-napló a Kontrolling-integráció előképével.
- Build zöld; a HR lazy chunk 43,32 kB raw / 10,22 kB gzip.

## Fájlok

**ÚJ** — képernyők: `src/pages/hr/{PeopleScreen,CapacityScreen,AbsencesScreen,AbsenceDetailSlideOver,SkillsScreen,TimeLogsScreen}.tsx`
**MEGLÉVŐ (előző munkamenetből, committolva):** `src/services/hr/*` (11 fájl + README), `src/mocks/hrApi/*` (7 fájl, handlers.ts-be bekötve), `src/pages/hr/{EmployeeAvatar,EmployeeDetailSlideOver,HrDashboard,labels}.tsx`
**MÓDOSÍTVA:** `src/pages/HrPage.tsx` (533→38 sor diszpécser), `src/mocks/worlds.ts` (hr képernyők: +timelogs fül)
**TESZT:** ÚJ `src/services/hr/__tests__/{absenceFsm,calc,hrApi}.test.ts`, `src/pages/hr/__tests__/{hrTestUtils.tsx,hrScreens.smoke.test.tsx,absenceFlow.test.tsx}`; ÚJRAÍRVA `src/pages/__tests__/HrPage.test.tsx` (statikus-mock helyett MSW + route-diszpécser)
**VÁLTOZATLAN:** `src/mocks/hr.ts` (törzs-seed forrás) · CRM/EHS/Kontrolling fájlok (zároltak — csak import irányban használva)

## Tesztek

- **HR-scope: 57/57 zöld** (6 fájl):
  - `absenceFsm.test.ts` (7): fő út + mellékág + terminális lezarva + tiltott átmenetek + blockReason-szöveg + blokkoló/nyitott guardok.
  - `calc.test.ts` (16): dátum-helperek (hétfő, hétvége, kapacitás-hét, hónap-határ), napi kapacitás (8 / 6,4), átfedő beosztások, blokkoló vs. kert távollét, túlterhelés-epsilon, heti összkép + 0-kapacitás él, loadBand-küszöbök.
  - `hrApi.test.ts` (13, msw/node + `resetHrDb`): dolgozó-szűrők (dept/q/skill) + 404; távollét-lánc (approve→start→complete), 409 guard (újra-approve, terminális), 400 (indok nélküli reject), reopen indok-törléssel; kapacitás week-validáció + túlterhelt/távolléti cella + **rule-6 a kontraktusban** (approve után a rács 0 kapacitást ad); timelog push (szűkített + teljes + üres → 409).
  - UI: smoke mind a 6 képernyőre (KPI-k, szerver-szűrők, S1-régiók, S2-chipek, mátrix-lefedettség, push-gomb); **FSM-folyam** (tiltott gomb aria-disabled + tooltip + elnyelt kattintás; approve → gombok átbillennek + store + lista-pill frissül; reject indok-kényszerrel; `hr.manage` letiltva → jogosultsági indok); HrPage route-teszt (7 eset, SlideOver-nyitással).
- **Teljes suite:** `npx vitest run` → **1272 passed / 20 failed (1292)** — a 20 bukás a dokumentált, HR-től független pre-existing készlet (BOMPreviewCard, configurator/wizard, catalogFilterPersistence, ProcurementPage + App-procurement, WorkOrderSummary — azonos az F2-KONTROLLING-FIX utáni futással); HR-fájl nincs köztük.
- **Build:** `npm run build` ✅ · **tsc -b** tiszta · **ESLint** az érintett fájlokra tiszta.

## Nyitott kérdések / follow-up

1. **Backend HR host + OpenAPI (G4.1):** a `mocks/hrApi` route-készlet + `services/hr` zod-sémák a rögzítendő kontraktus-előkép; a kapacitás-endpoint (szerver-számított rács) backend-oldali megvalósítása a `CapacityCalculationService`-re épülhet.
2. **Munkaidő → Kontrolling integráció:** a push-stub éles bekötése (Labor tényköltség-feladás + `controllingKeys.all` kereszt-invalidálás) — közös backend/frontend mini-task.
3. **`hr.manage` claim-forrás:** auth-bekötés a Keycloak-profilból (`useHrPermissions` belseje).
4. **Training/Certification (platform HR-scope):** továbbra sincs képzés/tanúsítvány entitás a portálban (gap-analízis L-tétel) — külön task, backend-kontraktussal együtt.
5. **`QueryGate` promótálás** `components/ui`-ba — immár 4 modul importálja az EHS-ből (a CRM/Kontrolling follow-uppal közös).
