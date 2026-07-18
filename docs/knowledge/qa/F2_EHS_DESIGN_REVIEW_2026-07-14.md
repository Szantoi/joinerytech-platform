# F2-EHS-REVIEW — EHS modul designer review (Fázis 2, 1. modul)

> **Kiadta:** designer terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-EHS-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (EHS spec + Closed→Reopened ADR), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`
> **Vizsgált kód:** `src/joinerytech-portal` working tree (F2-EHS-FE diff: `src/services/ehs/`, `src/mocks/ehsApi/`, `src/pages/ehs/`, `src/components/ui/FsmStepper.tsx`, EhsPage + wizard-bekötés)
> **Módszer:** teljes EHS-diff átolvasás a spec ellen + tesztfuttatás (EHS-scope-ú vitest: **84/84 zöld**)

---

## Összesített verdikt: ⚠️ CHANGES REQUESTED (szűk körű)

Az F2-EHS munka **kiemelkedő minőségű** — az adatréteg-minta (zod + query-kulcs gyár +
FSM egy-igazságforrás + MSW-tükör) **jóváhagyva a többi 6 modul sablonjának**, az FSM-UI
a plan 3. vezérelvét (tiltott átmenet = látható + aria-disabled + tooltip) hiánytalanul
hozza, az új képernyők spec-hűek. **Két vizuális/UX hiba blokkol**, mindkettő kicsi
(összesen ~10 perc fix): a dashboard kártya-fejlécek dark módban olvashatatlanok (S1),
és a most bekötött FAB mobilon RÁTAKAR a bottom nav-ra (S2). A javítás után az EHS
✅ APPROVED-ra váltható.

| Terület | Verdikt |
|---|---|
| 1. Adatréteg-minta (`services/apiClient.ts` + `services/ehs/`) | ✅ APPROVED — **sablonként ajánlott** (M1 megjegyzéssel) |
| 2. MSW kontraktus-tükör (`mocks/ehsApi/`) | ✅ APPROVED |
| 3. FsmStepper primitív (`components/ui/FsmStepper.tsx`) | ✅ APPROVED |
| 4. Esemény-FSM UI (SlideOver + TransitionPanel) | ✅ APPROVED |
| 5. Új képernyők (SDS / EVE / Bejárások+CAPA) | ✅ APPROVED (megjegyzésekkel) |
| 6. Dashboard KPI-k | ⚠️ **CHANGES REQUESTED** (S1) |
| 7. Wizard-bekötés + FAB mount | ⚠️ **CHANGES REQUESTED** (S2) |
| 8. Nyitott tételek (wizard EN, RisksScreen) | ✅ elfogadva tracked backlogként |

---

## Blokkoló hibák

### S1 — EhsDashboard: nyers stone/rose osztályok dark pár nélkül → olvashatatlan szöveg dark módban

`src/pages/ehs/EhsDashboard.tsx:94-96, 100, 106, 121-123, 127`

A két Card-fejléc (`Legutóbbi események`, `Kockázati mátrix (kivonat)`) és a listasorok
nyers palettát használnak dark variáns nélkül, miközben a `Card` dark módban
`dark:bg-stone-900`-ra vált:

- `text-stone-800` a `stone-900` kártyán: **≈1.2:1 kontraszt — a fejléc-szöveg gyakorlatilag láthatatlan** (94-95. és 121-122. sor);
- az `Összes →` / `Mátrix →` linkek `text-rose-600` (96., 123. sor): ≈3.6:1 a sötét kártyán, 11px szövegen AA-bukás; a `hover:text-rose-800` dark módban még sötétebbre vált;
- `border-stone-100`, `divide-stone-50`, `hover:bg-stone-50/60` (94., 100., 106., 127. sor): világos vonalak/hover a sötét felületen.

Ez ÚJ F2-kód — a spec 0.2 szabálya („a komponensek NEM nyers palettát használnak,
hanem szemantikus utility-ket") és a plan 4. vezérelve (dark mode alapból) vonatkozik rá.
Az EHS világ **alapértelmezett képernyője** — dark módban azonnal szembejön.

**Fix:** `text-stone-800` → `text-ink`, `border-stone-100`/`divide-stone-50` → `border-line`/`divide-line`
(vagy `surface-2`), `hover:bg-stone-50/60` → `hover:bg-surface-2`, a rose-linkekre
`text-rose-600 dark:text-rose-300` pár (vagy `text-world-soft-fg`).

### S2 — IncidentReportFAB: mobilon rátakar a bottom nav-ra, desktopon is megjelenik

`src/components/EHS/IncidentReportFAB.tsx:35` (mount: `src/pages/EhsPage.tsx:42-47`)

A FAB `fixed bottom-6 right-6 z-40` — a `MobileBottomNav` viszont 58 px magas,
`z-30` (`MobileBottomNav.tsx:82`). Mobilon a FAB alsó fele (24–58 px sáv) **a nav
FÖLÉ kerül (z-40 > z-30) és eltakarja a jobb szélső fület** („Több") — pont azt a
gombot, amit az F1-ben a11y-dialógussá tettünk. A spec 3.2 előírása:

- pozíció mobilon: `bottom: calc(58px + env(safe-area-inset-bottom) + 16px)` — a nav FÖLÖTT;
- **desktopon a FAB nem jelenik meg** (ott a lista-fejléc primary buttonja a helye) — most `md:bottom-6 md:right-6`-tal desktopon is renderel;
- szín: `bg-world text-world-fg` a spec szerint — a mostani `bg-rose-600` a **danger** tónus, amit az 1.4 pont kifejezetten azért tett rose-ra, hogy elváljon az EHS világ **red** akcentjétől.

A FAB maga F2-integráció (task 2: world-mount) — az ütközés ezzel a bekötéssel vált élessé.
Megjegyzés: az F1-ben a `ChatBubble` ugyanerre a problémára már kapott nav-offsetet — az a minta másolható.

---

## Jóváhagyott területek (részletek)

### 1. Adatréteg-minta ✅ — sablonként ajánlott a CRM/HR/… számára

- `src/services/apiClient.ts`: generikus, zod-validált fetch; nem-2xx → `ApiError`
  (backend `message` + status), `isConflict()` helper, 204/üres törzs kezelve ✔
- `src/services/ehs/fsm.ts`: **átmenet-táblák egyetlen igazságforrásként** — ugyanazt
  importálja a UI (`transitionBlockReason` magyar indoklással, lokalizáció a hívótól
  jön, a services réteg nyelvfüggetlen — szép megoldás) és az MSW guard (409) ✔
- `keys.ts`: hierarchikus kulcs-gyár, invalidálás mindig prefixszel ✔
- Domain-fájlok: teljes zod-lefedettség (minden válasz `schema`-n megy át), FSM-akció =
  dedikált végpont, mutáció-toast a hookban, optimista frissítés CSAK az incidens-átmeneten
  (determinisztikus célállapot) — rollback + 409-toast + invalidálás ✔
- `validity.ts`: számított mezők tiszta függvényként, MSW + teszt közös használatban ✔
- `README.md`: a 6 szabály világos, másolható — a mintát követő modul nem tud félremenni ✔
- `employees.ts`: ÁTMENETI névtár, jól dokumentált (HR-lookup follow-up rögzítve) ✔

**M1 (nem blokkoló, de a README-be kívánkozik):** a domainek közti invalidálás-keresztkötések
hiányosak az unified-CAPA láncban:
- `capa.ts:73-77` (`useCompleteCapa`): invalidálja a `capas` + `walk` kulcsokat, de az
  **incident kulcsokat nem** — a CapaBoardról teljesített esemény-CAPA után a nyitott
  esemény-SlideOver pipája staled marad;
- `incidents.ts:169-171` (`useIncidentTransition.onSettled`): csak az `incidents` prefixet
  invalidálja — az `addCorrectiveAction` új CAPA-t szül, a `capas` lista nem frissül; és a
  detail kulcs (`incident`, egyes szám) sincs a prefix alatt, így 409 után a rollback-elt
  detail nem szinkronizál újra a szerverrel (siker-ágon az `onSuccess` setQueryData fedi).

Javasolt minta: közös `useInvalidateEhs(domains: ...)` helper a `safetyWalks.ts:137-145`
mintájára, README-szabályként rögzítve („FSM-mutáció minden érintett domain-kulcsot invalidál").

### 2. MSW kontraktus-tükör ✅

- Állapottartó store (`db.ts`) + `resetEhsDb()`; számított mezők a szerializálókban
  (sdsValidity, isExpired, findingCount, incidens-CAPA az egységes táblából) ✔
- `guardTransition` a services-FSM-ből → 409 a backenddel egyező üzenettel ✔
- Bejárás-lezárás üzleti guard (nyitott CAPA → 409, `handlers.walks.ts:127-145`),
  megállapítás-guard (csak InProgress, 74-79. sor), `complete` szerver-döntéses célállapot ✔
- Wizard `POST /events` beírja az incidenst a store-ba → lista-invalidálás után megjelenik ✔
- Apró megjegyzés (N5): a wizard `property` típusa `HazardousCondition`-re képződik
  (`handlers.incidents.ts:27-31`) — szemantikailag „anyagi kár" ≠ „veszélyes állapot";
  a backend enum-bővítése a wizard-lokalizációs mini-taskkal együtt rendezhető.

### 3. FsmStepper ✅

`src/components/ui/FsmStepper.tsx` — rendezett lista (`<ol aria-label>`), aktív lépés
`aria-current="step"` (spec 3.3 FSM-stepper szabálya), teljesített/hátralévő jelzés
**forma + szín** (kitöltött vs. üreges dot, súly), mellékállapot (Elmaradt/Újranyitva)
külön jelvényként a halványított fő-lánc felett, nyíl-konnektorok `aria-hidden` ✔.
Nem interaktív — billentyűzet-követelmény nincs. Aktív pill `bg-world-soft text-world-soft-fg`
tokenből ✔. Mindhárom felhasználás (incidens fő-út + Reopened mellékág; bejárás fő-út +
Cancelled) helyes.

### 4. Esemény-FSM UI ✅

- `IncidentTransitionPanel.tsx:73-90`: mind a 4 akció-gomb MINDIG látható; tiltott →
  `Button disabledReason` (aria-disabled + állandó DOM-tooltip + fókuszálható marad —
  F1-ben jóváhagyott minta), az indoklás a `transitionBlockReason`-ből lokalizált ✔
- Engedélyezett akció → inline mini-űrlap; mezők `useId`+`htmlFor` címkével
  (`formFields.tsx`), kötelező jelölés natív `required` + `aria-hidden` csillag ✔
- Kliens-validáció is disabledReason-ként jelenik meg („Töltsd ki a kötelező mezőket.") —
  konzisztens a mintával, nem rejtett submit ✔
- 409 → hiba-toast a szerver guard-üzenetével + rollback (tesztelt: lenyelt kattintás,
  gomb-állapotváltás átmenet után) ✔
- `IncidentDetailSlideOver.tsx`: StatusPill (`fsm="ehsBaleset"` + Reopened→warn extra),
  stepper, CAPA-lista kész/nyitott forma-jelzéssel (pipa + áthúzás, nem csak szín) ✔

**ADR-megfelelés:** a plan 5. pont ADR-je szerint a UI a backend-kontraktus
`Closed → Reopened` átmenetét követi (`fsm.ts:37`), az `elutasitva` ág nincs — helyes.

### 5. Új képernyők ✅ (megjegyzésekkel)

- **SDS** (`SdsScreen` + `SdsDetailSlideOver`): DataTable tábla↔kártya, cím-oszlop valódi
  `<button>` fókusz-ringgel (az F1 N4 kérdése itt jól zárult), SDS-érvényesség SZÁMÍTOTT
  StatusPill (Valid=success/Expiring=warn/Expired=danger a spec-tónusokkal), GHS-chipek,
  megújítás archivált anyagon disabledReason-nel ✔
- **EVE/PPE** (`PpeScreen`): Tabs (F1-jóváhagyott primitív, helyes `idBase`/`TabPanel`
  használat), dolgozó-szűrő címkézett selecttel, kiadás-FSM gombok soronként saját
  mutation-példánnyal (nem fagyasztja a többi sort), lejárt kiadás danger-pill,
  lejárat-elhagyás → defaultLifetimeMonths ✔
- **Bejárások** (`WalksScreen` + `WalkDetailSlideOver` + `CapaBoard`): ütemezés-űrlap,
  stepper + mellékág, megállapítás-űrlap CSAK InProgress-ben renderelt (szerver-guard
  fedezi a maradékot), CAPA-generálás felelős+határidővel, close-guard 409 → toast,
  egységes CAPA-tábla forrás-pillel + késésben-kiemelés (szöveg is: „(késésben)", nem
  csak szín ✔), legacy `actions` út → CAPA-fül ✔
- `QueryGate`: egységes skeleton (aria-busy) / hiba (role="alert" + Újra gomb) ✔

Megjegyzések (nem blokkoló):
- **N1** — `EhsDashboard.tsx:83`: a „Nyitott CAPA" KPI `onScreen('walks')`-ra visz (Bejárások
  fül); a meglévő `actions` út pont a CAPA-fület nyitja — `onScreen('actions')` pontosabb cél.
- **N2** — `EhsDashboard.tsx:47`: a betöltés-jelző `<span aria-label="betöltés">…</span>` —
  nem-interaktív span `aria-label`-jét a SR-ek nem megbízhatóan olvassák; `<span role="status">`
  vagy sr-only szöveg jobb.
- **N3** — `IncidentsScreen.tsx:32`: `hover:border-rose-200` dark pár nélkül (dekoratív,
  kozmetikai — az S1 fixszel egy körben rendezhető).

### 6. Tokenek ✅

`theme/fsmTones.ts`: a 2 új készlet (`ehsPpeKiadas`, `ehsBejaras`) kanonikus magyar
kulcsokkal + backend enum-aliasok, `Reopened → warn` a `FSM_EXTRA_TONES`-ban dokumentált
indoklással ✔. A tónusválasztások jók (kiadva=warn „átvételre vár", intezkedes=warn
„nyitott CAPA-k"). A danger=rose vs. EHS-akcent=red elválasztás a pill-eken érvényesül.

---

## 8. Nyitott tételek — döntés

| Tétel | Döntés |
|---|---|
| **Wizard EN szövegei** (StepType/StepReview/`StepDetails.tsx:66` „Select location…") | ✅ Elfogadva tracked backlogként (F2-EHS-FE follow-up 2. pont) — NEM blokkoló. A locations-bekötés kész, HU hibaszövegekkel; a maradék lokalizáció mini-task. A vegyes HU/EN option-szövegek az S1/S2 körrel EGYÜTT nem javítandók — külön task. |
| **RisksScreen statikus mock** | ✅ Elfogadva tracked backlogként (follow-up 3. pont) — NEM blokkoló. A képernyő fejlécben jelzi a 3×3 mátrixot, a kód kommentálja a scope-ot. A backend 5×5 migrációs taskba **fel kell venni**: a képernyő nyers palettája (`cellColor` rose/amber/emerald-50, `text-stone-700`) dark-tokenesítést is igényel. |
| `elutasitva` ág (plan-FSM vs. kontraktus) | ✅ Lezárva — a root ADR (plan 5. pont) a `Closed→Reopened`-et tette kanonikussá, a UI ezt követi. |
| Dolgozó-névtár átmeneti | ✅ Elfogadva — HR-lookup bekötésekor kiváltandó (follow-up 4. pont). |

---

## Tesztek

EHS-scope-ú futtatás (services/ehs, pages/ehs, EhsPage, IncidentReportWizard, statusTones):
**8 fájl / 84 teszt — mind zöld.** Lefedik: incidens-FSM legális lánc + 409 + 404 +
unified-CAPA; SDS validitás határértékekkel + renew-flip; EVE-FSM + terminális 409 +
isExpired; bejárás teljes út a close-guard 409-cel; UI: aria-disabled + tooltip + lenyelt
kattintás; smoke mind az 5 képernyőre; legacy `actions` route; wizard-locations.

---

## Kért javítások összefoglalva (re-review scope)

| # | Fájl | Mi | Súly |
|---|---|---|---|
| S1 | `src/pages/ehs/EhsDashboard.tsx:94-96,100,106,121-123,127` | Nyers stone/rose → token-osztályok (`text-ink`, `border-line`, `divide-line`, `hover:bg-surface-2`, rose dark-pár) | blokkoló |
| S2 | `src/components/EHS/IncidentReportFAB.tsx:35` | FAB mobilon a bottom nav fölé: `bottom-[calc(58px+env(safe-area-inset-bottom)+16px)] md:hidden` + `bg-world text-world-fg` (spec 3.2) | blokkoló |
| M1 | `src/services/ehs/capa.ts:73-77`, `incidents.ts:169-171` | Invalidálás-keresztkötések (incident↔capa) + README-szabály | kérve, nem blokkoló |
| N1-N3 | ld. fent | apróságok az S1/S2 körrel | opcionális |

Az S1+S2 javítás után az EHS sor a repo-gyökér CLAUDE.md-ben ✅ APPROVED-ra váltható —
a re-review a két fix vizuális ellenőrzésére korlátozódik (dark mód + mobil nézet),
az adatréteg/FSM/a11y mag újranyitása nélkül. **Az adatréteg-minta már MOST másolható
a CRM-hez** (M1 megfontolásával) — a blokkolók nem érintik a sablont.

---

_Designer terminál — JoineryTech sziget. Re-review: az S1/S2 fix után jelezz a designer mailboxba._

---

## RE-REVIEW: ✅ APPROVED — 2026-07-14

> **Kiadta:** designer terminál (F2-EHS-REREVIEW) · **Scope:** az F2-EHS-FIX
> (`docs/tasks/EPIC-UI-PORTAL-2026Q3/archive/F2-EHS-FIX.md`) blokkolóinak vizuális ellenőrzése
> (dark mód + mobil), az adatréteg/FSM/a11y mag újranyitása nélkül.

**Ellenőrizve:**

- **S1 ✅** — `EhsDashboard.tsx`: a Card-fejlécek és listasorok token-osztályokra váltak
  (`text-ink`, `border-line`, `divide-line`, `hover:bg-surface-2`); az `Összes →` /
  `Mátrix →` linkek dark-párt kaptak (`dark:text-rose-300 dark:hover:text-rose-200`) —
  dark módban a fejlécek olvashatók, a linkek AA fölött. Nem maradt nyers stone/rose
  dark-pár nélkül az F2-szakaszokban.
- **S2 ✅** — `IncidentReportFAB.tsx`: `bottom-[calc(58px+env(safe-area-inset-bottom)+16px)]`
  (a bottom nav FÖLÖTT, „Több" fül nem takarva), `md:hidden` (desktopon nem renderel),
  `bg-world hover:bg-world-hover text-world-fg` (world-akcent, nem danger-rose),
  `aria-label="Baleset bejelentése"` változatlan — spec 3.2 teljesül.
- **M1 ✅** — `capa.ts` `useCompleteCapa.onSettled`: `capas` + `walk` + `incidents` +
  `incident`; `incidents.ts` `useIncidentTransition.onSettled`: `incidents` + `incident`
  (detail külön prefix, 409-rollback után is szinkronizál) + `capas`. README 6. szabály
  („FSM-mutáció minden érintett domain-kulcsot invalidál") rögzítve.
- **N1–N3 ✅** — CAPA-KPI → `onScreen('actions')`; betöltés-jelző `role="status"` +
  sr-only szöveg; `IncidentsScreen` hover-border dark-pár (`dark:hover:border-rose-900`).
- **Regresszió-scan** a többi EHS-képernyőn (Sds/Ppe/Walks/Incidents/CapaBoard/SlideOver):
  tiszta — a maradék nyers paletta kizárólag a `RisksScreen`-ben él, ami a 8. pontban
  már tracked backlog (5×5 migrációval együtt tokenesítendő).
- **Tesztek:** célzott vitest újrafuttatva — services/ehs + pages/ehs + components/EHS
  7 fájl / 53 teszt zöld, `EhsPage.test.tsx` + `statusTones.test.ts` 2 fájl / 37 teszt
  zöld (**összesen 90/90**, egyezik a fix-task állításával).

**Döntés:** mindkét blokkoló (S1, S2) és a kért M1 helyesen javítva — az EHS sor a
repo-gyökér `CLAUDE.md`-ben ✅ APPROVED-ra váltva.

_Designer terminál — re-review lezárva, 2026-07-14._
