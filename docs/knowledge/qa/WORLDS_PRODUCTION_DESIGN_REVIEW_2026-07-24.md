# WORLDS-PRODUCTION-REVIEW — production világ designer + adatőszinteségi review

> **Kiadta:** root terminál (designer szerep) — 2026-07-24
> **Epic:** `EPIC-UI-WORLDS-2026Q3` / W1-production
> **Kontraktus:** [`WORLDS_API_CONTRACTS_2026-07-18.md`](../architecture/WORLDS_API_CONTRACTS_2026-07-18.md)
> (cutting 1.x + joinery 2.x szakaszok), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`,
> task-szerződések: [`WORLDS-PRODUCTION-FE`](../../tasks/EPIC-UI-WORLDS-2026Q3/archive/WORLDS-PRODUCTION-FE.md)
> + [`WORLDS-PRODUCTION-API-GATE`](../../tasks/EPIC-UI-WORLDS-2026Q3/archive/WORLDS-PRODUCTION-API-GATE.md)
> **Vizsgált kód:** `joinerytech-portal main@1f3ca31` (`src/modules/production/**`,
> `src/pages/ProductionPage.tsx` + közös shell: `src/components/layout/WorldShell.tsx`,
> `src/components/ui/**`, `src/services/apiClient.ts`); backend-igazságforrás a
> submodule-forrásból (`spaceos-modules-cutting`, `spaceos-modules-joinery`)
> **Módszer:** (1) 36 screenshot headless Chrome-mal (dev + MSW mock, 6 route ×
> light/dark × 1440/768/360), konzol-, overflow-, tab-walk- és élő fókuszcsapda-/
> toast-probe-ok; (2) 5 párhuzamos review-lencse (design system, a11y/billentyűzet,
> adatőszinteség, FSM-átmenetek, state-lefedettség) többagentes workflow-ban;
> (3) MINDEN S/M finding független adversarial verify-menetet kapott (17/17
> CONFIRMED, több esetben mechanika-korrekcióval); (4) root kód-szintű
> szúrópróbák a kulcs-findingokra. Portal-fájl nem módosult (read-only review).
> **Tesztbizonyíték:** production-scope vitest **80/80 zöld** (6 fájl: modul +
> ProductionPage + dataMode-kapu); konzol-hiba a 36 probe-futásban: **0**.
> **Screenshot-asszetek:** [`assets/worlds-production-review-2026-07-24/`](assets/worlds-production-review-2026-07-24/)
> (16 kép: 6 route light+dark desktop, quotes mobil pár, tablet-túlcsordulás bizonyíték).

---

## Összesített verdikt: ❌ CHANGES REQUESTED

**1 db S-szintű** (billentyűzet-holtpont a közös SlideOver fókuszcsapdában — minden
production FSM-akció billentyűzetről használhatatlan desktopon) és **15 db verifikált
M-szintű** finding. A modul ERŐS alapokon áll — a lencsék PASS-területei (lent)
hosszabbak, mint a hibalista, és a hibák többsége célzott, kis javítás. De a
task elfogadási kritériuma („nincs S; M javítva vagy elfogadott backlog") nem
teljesül, ezért a stop-klauzula szerint külön fix-taskok készülnek:

- [`WORLDS-PRODUCTION-FIX`](../../tasks/EPIC-UI-WORLDS-2026Q3/WORLDS-PRODUCTION-FIX.md) — a 12 production-modul M
- [`WORLDS-SHELL-FIX`](../../tasks/EPIC-UI-WORLDS-2026Q3/WORLDS-SHELL-FIX.md) — az S + 3 közös-shell M (mind a 7 APPROVED modul-világot érinti!)

**Re-review feltétel:** mindkét fix-task kapuja zöld (célzott + teljes suite,
Playwright-billentyűzet-smoke az S-regresszió ellen), utána friss screenshot-kör +
fókusz-probe újrafuttatás. A riport N-listája follow-up backlog, nem re-review-blokkoló.

| Mátrix-pont | Verdikt |
|---|---|
| 1. Képernyők (dash/cutting/machining/orders/quotes/analytics) | ✅ mind renderel, seed-koherens |
| 2. Light/dark × 360/768/desktop | ⚠️ dark PASS mindenhol; 768px shell-túlcsordulás (M), quotes 360px összenyomódás (M) |
| 3. Loading/empty/error/4xx | ⚠️ lista-képernyők QueryGate-tel PASS; detail-SlideOverek hibaág nélkül (M) |
| 4. Billentyűzet-út | ❌ S: SlideOver fókuszcsapda-holtpont desktopon (közös shell) |
| 5. FSM-gombok | ⚠️ egy átmenet-forrás PASS; halott dash-linkek + 409/422 tükör-drift + placeholder-HMAC (M) |
| 6. Adatőszinteség | ⚠️ sémák kontraktus-hűek, analytics őszinte gap-kártyás; 4 célzott adat-hazugság (M) |
| 7. API/mock paritás | ⚠️ dataMode-kapu PASS; hibatest-ÜZENET paritás sérül (M, közös apiClient) |
| 8. Akcent/kontraszt/scroll-region | ⚠️ token-fegyelem PASS; quotes tooltip-h-scroll (M) |

---

## S-szintű findingok (1)

### S-1 (A11Y-1) — Desktop billentyűzet-holtpont: a SlideOver fókuszcsapda a `display:none` mobil „Vissza" gombot célozza
**Fájl:** `src/components/ui/hooks/useFocusTrap.ts:37` + `src/components/ui/SlideOver.tsx:74` · **Scope: KÖZÖS SHELL (pre-existing, mind a 7 APPROVED világ érintett)**

1440px-en bármely production SlideOver megnyitása után (egérrel VAGY Enterrel) a
fókusz a `body`-n ragad: a `getFocusable()[0]` a `md:hidden` mobil „Vissza" gomb,
amin a `.focus()` no-op; ezután minden Tab a „fókusz kiszökött" ágba fut
(`preventDefault` + ugyanarra a rejtett gombra fókusz) — **örök no-op**. A dialógus
EGYETLEN vezérlője sem érhető el Tab-bal (Publikálás/Fagyasztás/Panel-foglalás,
execution-akciók, quote ár/indok mezők, Bezárás), csak az Escape működik. Élő
probe-bizonyíték: `probe3-a11y.json` (focusAfterOpen=body 10 Tab után is;
mobil 360 kontroll hibátlan ciklussal — az ok izoláltan a rejtett első elem).
WCAG 2.1.1 (A) sérülés a fő folyamon. A mobil „Vissza" gomb maga egy korábbi
audit-javítás volt — az javította a mobilt és REGRESSZÁLTA a desktopot; jsdom-ban
(nincs layout) ez teszttel elvileg sem fogható meg → Playwright-smoke kötelező.

**Fix-irány:** `getFocusable()` szűrjön renderelt elemekre
(`el.checkVisibility?.() ?? el.offsetParent !== null`), fallback fókusz a
konténerre (`tabIndex=-1`); browser-szintű billentyűzet-smoke a regresszió ellen.

---

## M-szintű findingok — közös shell / kliens (3)

### M-S1 (WPR-DS-01) — Tablet 768px: a WorldShell fejléc ~165px oldal-túlcsordulást okoz MINDEN route-on
`WorldShell.tsx:219` · pre-existing, mind a 7 világ érintett. A `md:` breakpoint
pont 768-nál kapcsolja a desktop sidebart (w-56) ÉS a topbart; a jobb klaszter
(kereső 224px + bell + témaváltó + user-chip ≈ 466px) nem fér az 544px-es sávba,
semmi nem zsugorodik. Bizonyíték: mind a 12 tablet-screenshot 928-948px széles
canvas (768 helyett), a user-chip a viewporton kívül (`dash-dark-tablet.jpg`).
**Fix-irány:** zsugorítható jobb klaszter (kereső `max-w`+`min-w-0` / ikonná
csukás lg alatt) vagy a desktop-topbar md→lg emelése.

### M-S2 (A11Y-2) — Nyitott SlideOver mellett a toast live-regionok inertek
`useInertBackground.ts:24` + `Toast.tsx:53` · pre-existing, minden világ. A hook
a dialóguson kívül MINDENT inertté tesz — a ToastContainer a fa testvére, így a
SlideOverből indított MINDEN mutáció-visszajelzés (plan transition, execution
akciók, quote döntés…) felolvasónak néma (WCAG 4.1.3), az error-toast a dialógus
zárásáig nem is zárható. Élő probe: `statusRegionInert=true` a „9 panel
lefoglalva" toastnál. **Fix-irány:** dedikált toast-root az inert-walk
skip-listáján, vagy portál egy megkímélt body-szintű node-ba.

### M-S3 (FSM-02 ≡ STATE-1) — Az apiClient nem érti a `ValidationErrors`-tömb hibatestet: a guard-üzenetek sosem érnek el a felhasználóhoz
`apiClient.ts:58-65` · közös kliens; a trigger production/joinery-specifikus.
`parseErrorMessage` csak `{message|error}` objektumot olvas — a valós backend
planning 400-a és executions 422-je (Ardalis `ValidationErrors` tömb,
`BadRequest(result.ValidationErrors)`) és a joinery-mock 400-tömbje is
`[{identifier,errorMessage}]` alakú → a gondosan tükrözött magyar guard-üzenet
„Bad Request"-té (élő HTTP/2-n akár ÜRES toasttá — a `??` nem fogja az üres
`statusText`-et) degradálódik. Mock módban MA reprodukálható: Draft rendelés
(itemCount:0) → „Kalkuláció indítása" → generikus toast a beszédes üzenet
helyett. **Fix-irány:** tömb-ág (errorMessage-join) + `{errors: string[]}` /
`{validationErrors}` alakok + `statusText || 'HTTP ' + status` fallback a
sikeres-parse ágban is; kontraktus-teszt a hibatest-alakokra.

---

## M-szintű findingok — production modul (12)

### M-1 (FSM-04) — A dashboard „Vágástervezés →" és „Végrehajtás →" linkje halott képernyő-kulcsra navigál
`ProductionDashboard.tsx:100,174` — `onScreen('plans')` ill. `onScreen('executions')`,
de a diszpécser csak `cutting`/`machining` kulcsot ismer → a link visszatölti a
dashboardot, csak az URL változik (nem létező képernyőre), a nav aktív eleme
eltűnik. Root által kódban megerősítve. **Fix:** kulcs-csere + smoke-teszt arra,
hogy a dash-linkek célképernyője tényleg renderel.

### M-2 (FSM-01) — Execution FSM-sértésre a mock 409-et ad, a valós backend 422-t
`handlers.executions.ts:79,99,129,149` (guardFsm(...,409)) vs backend `MapResult`:
`Result.Invalid → 422 UnprocessableEntity(ValidationErrors)`; a teljes Execution
Application+Domain szeletben **0 db** `Result.Conflict` producer (root által
grep-pel megerősítve) — a kontraktus-doksi 1.1 sora (409) a belső ellentmondás
rossz ága, az 1.5 („Invalid → 422") a helyes. A `productionApi.test.ts` a 409-et
rögzíti elvárásként → az API-GATE élő mutációs fázisában garantáltan pirosra
váltana. **Fix:** mock 422-re tömb-testtel + teszt/komment/README/task-tábla +
kontraktus-doksi 1.1 javítás.

### M-3 (DH-2 ≡ FSM-03) — Start/progress/complete placeholder-payloaddal megy (`WORKER-DEMO`, `demo-hmac`, `demo-proof-hash`) — dokumentálatlan maradvány
`ExecutionDetailSlideOver.tsx:79,92,117`. A mock csak mező-meglétet néz → zölden
hazudik. Élőben (verify-korrigált mechanika): Indítás → **400** már a
model-bindingnél (`workerId` Guid-typed); Panel kész → **422** (a `demo-hmac`
nem valid Base64); a **Lezárás viszont ÁTMENNE** — a Null proof-policy
elfogadná, és a konstans `demo-proof-hash` **hamis bizonyítékként rögzülne**
(az adat-őszinteségi rész rosszabbik fele). A maradvány a G1-G8 gap-listában
NINCS (csak kód-kommentben) — a task saját 8. elve sérül. **Fix:** G9-tétel +
api-módban gap-affordanciás letiltás (disabledReason: eszköz-integráció
hiányzik); a backend Null-policy stubjai külön backend follow-up.

### M-4 (DH-1) — DoorOrder `createdAt`: a lista-route élesben `0001-01-01`-et, a detail minden lekérésnél `UtcNow`-t adna — a mock valósághű dátumai ezt elfedik
`DoorOrdersScreen.tsx:47` + `OrderDetailSlideOver.tsx:75` + seed/rendezés.
Backend-bizonyíték: `DoorOrderRepository.cs:65` (`default` a CreatedAt
pozícióban — a kontraktus-doksi ezt NEM rögzíti, UtcNow-állítása a lista-route-ra
téves) + `GetDoorOrderQueryHandler.cs:32`. A mock ráadásul createdAt szerint
rendez, amit a valós API nem tud reprodukálni (nincs OrderBy). **Fix:**
gap-affordancia („—" + tooltip) amíg a joinery nem perzisztál CreatedAt-ot;
seed ne töltsön hihető dátumot nem-létező adatba; kontraktus-doksi pontosítás;
backend-fix külön joinery task.

### M-5 (DH-3) — A kalkuláció-toast a `totalItemCount`-ot „szabásjegyzék-tétel"-ként címkézi, pedig az az AJTÓTÉTEL-szám
`services/orders.ts:193`. Backend: `totalItemCount = order.Items.Count` ≠ a
szabásjegyzék-sorok száma. Mock módban MA látható: ordDraft (3 tétel) kalkulálva
„1 szabásjegyzék-tétel" toast 3 látható tétel mellett; a seed a backend-invariánst
is sérti (itemCount:6 vs totalItemCount:4). **Fix:** `items.length` + helyes
címke; seed-invariáns helyreállítás.

### M-6 (DH-4) — A dashboard „Rendelés kalkulációban" KPI csak az első lapról (pageSize=20) számol, az alcím viszont a teljes totalCount-ot mutatja
`ProductionDashboard.tsx:32,52-54`. 20+ rendelésnél a KPI némán alulszámol,
miközben a „N összesen" alcím teljességet sugall; a másik 3 KPI teljes listából
számol — csak itt hamis. A kontraktusban nincs count/filter végpont (backend-gap,
jelölendő). **Fix:** címke-őszintesítés / pageSize=100; hosszú táv: backend
count-végpont follow-up.

### M-7 (WPR-DS-02) — Quotes mobil 360px: az ügyfél/meta oszlop ~40px-re préselődik — azonosító, dátum, összeg olvashatatlan
`QuotesScreen.tsx:87` — nem-törő flex-sor fix StatusPill + 2 akciógombbal;
`quotes-{light,dark}-mobile.jpg`: „Nagy Múzeum Kft." három sorba, meta „Q-2…"-re
csonkul, az 1 240 000 HUF nem látszik. Független a tooltip-túllógástól (az
absolute, nem foglal helyet). **Fix:** mobilon két soros kártya (flex-wrap,
gombok külön sor) vagy gombok SlideOverbe sm alatt.

### M-8 (WPR-DS-05, root-probe) — Quotes: 98px oldal-szintű h-scroll MINDEN szélességen a disabled-gomb tooltipek túllógása miatt
probe2.json: a jobb szélső Jóváhagyás/Elutasítás gombok `absolute whitespace-nowrap`
tooltip-spanjei (közös `Button.tsx` tooltip) 1450-1538px-ig nyúlnak 1440-es
viewportnál → vízszintes görgősáv üres térrel (spec 8. pont: a page-body nem
görgethet vízszintesen). **Fix:** `overflow-x-clip` a lista-konténeren VAGY a
tooltip szél-érzékeny pozicionálása (jobbra igazítás a jobb szélső oszlopban).

### M-9 (WPR-DS-03) — Mérföldkő-lista: nyers angol wire-kulcs a magyar UI-ban (`m.kind`)
`ExecutionDetailSlideOver.tsx:169` — `PanelCompletion`/`TimeWindow`/`QualityCheck`/
`WorkerConsent` jelenik meg; a `MILESTONE_KIND_LABELS` térkép létezik a
labels.ts-ben, de sehol nincs használva (dead code) — root által megerősítve.
Egysoros fix + import.

### M-10 (A11Y-3) — Dashboard szekció-linkek 17px magas találati zónával (house-spec: 44px touch)
`ProductionDashboard.tsx:99-104,134-139,173-178,204-209` — csupasz text-buttonok;
ugyanebben a modulban a szűrő-chipek a HELYES mintát használják
(`before:-inset-y-2` → 44px effektív zóna, `CuttingExecutionScreen.tsx:53`) —
belső inkonzisztencia, olcsó fix.

### M-11 (STATE-2) — Mindhárom detail-SlideOver hibaág nélküli: 404/500 a detail-fetch-en örök „Betöltés…"
`PlanDetailSlideOver.tsx:39` + Order/Execution párjai — `!data ? 'Betöltés…'`,
isError-ág, role=alert, Újra, aria-busy nincs; a lista-képernyők QueryGate-je és
MÁS modulok detail-SlideOverjei (maintenance/kontrolling) a helyes mintát
használják. A profiles-query hibája némán üres selectet ad (publish blokkolódik
magyarázat nélkül). **Fix:** QueryGate vagy isPending/isError elágazás + Újra.

### M-12 (STATE-3) — Execution idővonal/mérföldkövek: pending ÉS error állapot is „Nincs rögzített esemény."
`ExecutionDetailSlideOver.tsx:146,163` — üres ≠ hiba ≠ betöltés nem
megkülönböztethető egy OPERATÍV képernyőn (tranziens hiba után a gépkezelő azt
hiheti, nincs panel-esemény). Ugyanebben a modulban az OrderDetailSlideOver
szabásjegyzék-blokkja HELYESEN csinálja — belső inkonzisztencia. **Fix:**
isPending → „Betöltés…", isError → hiba + Újra.

---

## N-szintű follow-upok (17)

Production modul: **DH-5** seed wire-formátum drift (nem-GUID idk — tudatos
döntés, az API-GATE schema-fázis fedi majd) · **DH-6** waste-mock nem szűr a
from/to ablakra · **DH-7 ≡ FSM-05** calculate-gomb inline guardja háromfelé
ellentmond (halmaz ≠ tooltip ≠ MSW; nevesített guard kell az fsm.ts-be) ·
**FSM-06** waste-cache nem invalidálódik execution-mutáció után · **FSM-07**
`EXECUTION_ACTION_LABELS` definiált de használatlan (drift-forrás) · **FSM-08 ≡
STATE-6** quote-gombok isPending-védelem + currency-guard nélkül · **STATE-4**
másodlagos blokkok (waste-csempe, cuttingList) hibaága retry nélkül · **A11Y-4**
gap-jelvény hint csak title-attribútumban · **WPR-DS-04** production FSM-tónusok
lokálisan a labels.ts-ben (spec 1.5 bővítés — designer follow-up, dokumentált).

Közös shell/platform: **A11Y-5** QueryGate loading role="status" nélkül ·
**A11Y-6** nav aktív elem aria-current nélkül · **A11Y-7** nyers inputok
fókuszgyűrű-inkonzisztenciája + natív disabled lapozó · **A11Y-8** Playwright
billentyűzet-smoke hiánya (az S-osztály jsdom-ban nem fogható) · **STATE-5**
React Query retry:1 a 4xx-ekre is · **STATE-7** 401/403 megkülönböztetett UI-ág
(elfogadott maradvány, auth-bekötés utáni follow-up) · `jt-temp` document.title.

---

## PASS-területek (tételes, bizonyítékkal)

- **Dark mode:** teljes átváltás mind a 6 route-on, „világos sziget" nélkül (18
  dark screenshot); nyers palettaosztály csak 8 helyen, MIND dark-párral;
  hardcoded hex/rgb: 0.
- **Token-fegyelem:** surface/ink/line/world-* következetes; StatusPill a spec
  1.4 STATUS_TONES AA-párjait használja; brand-teal fallback-akcent dokumentált
  döntés, dark receptje működik.
- **Adatőszinteség-mag:** mind az 5 zod-séma mező/típus/enum-szinten egyezik a
  kontraktussal — kitalált séma-mező NINCS; a 4 KPI + hulladék-kártya valós
  mezőkből, a képeken az értékek a seedből levezethetően pontosak (3/4, 3/6,
  3/7, 2; 1181 cm²); analytics ŐSZINTE amber gap-kártyával grafikon-hazugság
  helyett; DoorOrder InProduction/Completed gap-affordancia a helyén.
- **FSM egy igazságforrás:** services/production/fsm.ts az egyetlen tábla — UI
  `transitionBlockReason` ÉS mind a 4 MSW-handler ugyanazt fogyasztja; a
  FE-táblák tételesen egyeznek a kontraktus 1.5/2.5-tel; elérhetetlen
  státuszokra nincs akció-gomb; obsolete UpdateStatus FSM-bypass nincs.
- **Billentyűzet (a holtponton kívül):** mobil SlideOver-ciklus hibátlan (élő
  probe); disabled gombok aria-disabled + aria-describedby tooltippel
  fókuszban maradnak (helyes minta); chipek aria-pressed + 44px effektív zóna;
  státusz sosem csak szín.
- **State-mag:** mind a 6 képernyő QueryGate (aria-busy skeleton, role=alert +
  Újra); szűrt-üres külön szöveggel; dataMode-kapu api-módban MSW-t sosem indít
  (dataMode.test.ts); React Query refetchOnWindowFocus:false, nincs végtelen retry.
- **Rule-6 invalidálás:** plans/executions/orders lista+detail külön prefix,
  freeze→executions kereszt-invalidálás — rendben (egy rés: waste, FSM-06 nit).

## Billentyűzet-jegyzőkönyv (probes.json tabWalk, desktop/light)

dash: 13 shell-stop után értelmes sorrend (szekció-link → terv-sorok →
rendelés-sorok → FAB), minden stopon látható fókusz · cutting: date-input natív
szegmensek (nem hiba), letiltott „Terv létrehozása" fókuszálható indoklással ·
machining: 8 chip aria-pressed-del · orders: 7 sor-gomb tiszta sorrendben ·
quotes: chipek + soronkénti döntés-gombok, tiltottak indokkal · analytics:
nincs interaktív elem a tartalomban (helyes). **SlideOver megnyitása után
desktopon: S-1 holtpont.**

## Re-review feltétel (összefoglalva)

1. `WORLDS-SHELL-FIX`: S-1 + M-S1..S3 javítva, Playwright billentyűzet-smoke
   bekötve, teljes portál-suite zöld (shell-változás = mind a 7 világ regresszió-kör).
2. `WORLDS-PRODUCTION-FIX`: M-1..M-12 javítva vagy root által elfogadott
   backlog-tétellel dokumentálva; célzott production-suite + build + lint zöld.
3. Friss screenshot-kör (light/dark × 3 szélesség) + fókusz/overflow-probe
   újrafuttatás; a riport verdikt-szakasza frissítve.
