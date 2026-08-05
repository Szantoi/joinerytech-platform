# FRONTEND Terminal State

> **Frissítve:** 2026-07-31 este, Europe/Budapest
> **Operatív lista:** [`TODO.md`](TODO.md) · **Munkarend:** [`CLAUDE.md`](CLAUDE.md)
> **Állapot-forrás:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`
> Done/APPROVED-ot **kizárólag a root-review** állít; én `review_requested`-et
> jelentek mért bizonyítékkal (teszt-számok, file:line, futtatott kapuk).

---

## Jelenlegi állapot (2026-08-05)

- **Portál:** `main@76bc647` (Tranche B törlés, **root-APPROVED**), platform pin
  bumpolva (`581322a`). A 07-30 óta piros `npm ci` **feloldva** — root negatív
  kontrollal igazolta (`f8829aa` ERESOLVE → `76bc647` exit 0).
- **2026-08-05, `review_requested`** (`outbox/2026-08-05_001`): a
  **suite-recept rése**. A `test:nightly` 166/179-et futtatott; három fájlt
  **egyetlen nevesített kapu sem** ért el — köztük `src/auth/RequireAuth` és
  `src/config/worldAccess`. Javítás: `--dir` alapú kétdarabos felosztás
  (`test:src` 91/834 + `test:packages` 88/817 = **179/1651 zöld**).
  → [[portal-teljes-suite-futtatas]]
- **Root verdikt-tanulság (08-04):** a felterjesztett 498/66 és 106 a **munkafán**
  igaz, a repóból **178/1641** és **102** jön ki. Ok: a vitest pozicionális
  argumentuma **részlánc-szűrő** → a parkolt, követetlen csomag bekerült a
  mérésembe. A gondosságom az **írásra** irányult, a mérés **hatókörére** nem.

### Korábbi állapot (2026-08-03)

- **Portál:** `main@f5f44b7` (a PORTAL-DEADTREE-A törlés), platform pin `a26a06a`.
- **A sávom: KIOSZTVA és leszállítva** (inbox `2026-08-03_001` → outbox
  `2026-08-03_001`, `review_requested`). A kiadott 3 follow-upból **kettő már
  07-28 óta kész volt** (`50753ba`); a valóban nyitott munka a P2 volt, az kész.
- **Boundary-őr szerkezeti teszt: APPROVED** (portál `ee2cf04`, 139 sor, egyetlen
  fájl). Saját ellenőrzés a közös fán: a fájl **követett**, a teszt **6/6 zöld**.
  A 3 napos állás oka root-mulasztás volt (a review-sora a csatornát + a saját
  listáját nézte, a **terminál-outboxokat nem**) — a jelzés volt a helyes eljárás.
- **2026-08-03: a rootnak jelentve a csatornán** (append-only igazolva: az első
  513 663 bájt sha1-je változatlan, 513 663 → 515 460 B) → **4 percen belül verdikt**.
- **Mailbox-őrség ÉL** (persistent Monitor `bkp0bp8xv`): `frontend/inbox` új fájl +
  `AGENT-CHANNEL.md` növekmény `@frontend`/`@all` szűréssel. **Öntesztelve** 2
  pozitív + 2 zaj-kontrollal és a zsugorodás-ággal; az élesítő esemény a valódi
  célpontokat mérte (`inbox=0`, `csatorna=515460B`). Session-váltáskor ÚJRA kell.
- **A terminál 2026-07-28 óta él.** Az eddigi szeletek MIND root-APPROVED-ok,
  egy kivétellel (a fenti).

---

## 2026-08-03 — a nap: egy holtpont feloldva, egy szelet, két lelet

| # | Tétel | Állapot |
|---|---|---|
| 1 | A 3 napja álló 009-es felterjesztés megsürgetve a csatornán | **4 percen belül verdikt** → APPROVED, portál `ee2cf04` |
| 2 | A kiadott 3 follow-up mérése | **kettő már 07-28 óta kész** (`50753ba`) — a #3 blokkolt, el sem indult |
| 3 | P2: `PUBLIC_SUBPATHS` → `package.json` `exports` | **APPROVED**, portál `f8829aa` |
| 4 | Gábor döntése a Codex-munkatestről továbbítva | érvénybe léptetve, gazda: **backend** |
| + | Mailbox-őrség élesítve, majd zaj-hangolva | `bu1jfz2vd` |

### A nap két módszertani hozadéka

1. **A részben helyesbített lista.** A root reggel a négy follow-upból **egyet**
   helyesbített — pont azt, amit én véletlenül megmértem a 009 közben —, a maradék
   hármat nem mérte újra. Így egy **már javított** lista adott ki két elvégzett
   munkát. *A javítás ténye megnöveli a maradék tekintélyét, holott semmi nem
   igazolta őket.* → [[reszben-helyesbitett-lista]]
2. **A „már kész" veszélyes félkész alakja.** A #1-nél nem elég azt mérni, hogy a
   kód a helyén van-e: ha a **mozgatás** megvolt, de a **regisztráció** elmaradt, a
   végpont némán halott. Ezért a teljes láncot mértem
   (`handlers.wizardPhotos.ts` → `mocks/index.ts` → `handlers.ts` → worker).

### A P2 bizonyítás-sora (a zöld önmagában semmit nem ért volna)

teszt **8/8** · a fő „0 sértés" állítás a szigorítás után is átmegy (**0 hamis
pozitív**) · **mutáció valódi fájllal** a bejáró útjában (sha1 `d6beb2e7`) → bukik ·
**negatív kontroll: a HEAD-en lévő RÉGI őr ugyanazon a szondás fán 6/6 zölden
átengedi** → a rés valódi volt. Kapuk: lint `exit 0` · `tsc` `exit 0` ·
`src/components src/__tests__` **498/498** (baseline 496 + a 2 új teszt).

⚠ **A root mérési anomáliája, amit ő maga mondott ki:** a darab első futása 4
bukást adott, de akkor én ugyanazon a fán dolgoztam — **egyidejű futás = érvénytelen
mérés** —, és a kimenetet nem mentette el, így a hipotézis nem igazolható.
Megállapodás: közös fán jelezzük egymásnak a futás kezdetét.

---

## 2026-07-31 — a nap: 9 szelet, 8 APPROVED

| # | Szelet | Állapot | A lényeg egy sorban |
|---|---|---|---|
| 1 | Gép-státusz a kiosztás-megerősítőben | APPROVED `1ee7510` | a csend kivétele, nem tiltás; közös `machineStatus.ts` a zónával egy forrásból |
| 2 | `PieceInputRow` DOM-id | APPROVED `746a85e` | duplikált/instabil id a PUBLIKUS űrlapon → `useId`; a címke az ELSŐ sor mezőjét nyitotta |
| 3 | 10 gyanús lint-lelet route-triázsa | elfogadva | 6 gatelt → legacy-scope, 1 a PIN-döntéssel mozog, 2 léphető |
| 4 | 3 designer-review verifikáció | mindhárom task `done` | **kettőt a saját doksija már 07-14-én lezárt** — a task-státusz volt elavult |
| 5 | `WorkflowPage` csak-olvasható (b) | APPROVED `13a57ed` | a néma NO-OP drag-elnyelés megszűnt |
| 6 | `lang="hu"` + ThemeToggle radiogroup | APPROVED `eede328` | őr-teszt a fájlra; roving tabindex + 4 nyíl |
| 7 | axe-kör (shell + 7 világ) | elfogadva | 0 critical / 8 serious / 3 moderate; **5 világ tiszta** |
| 8 | A 3 axe-javítás | APPROVED `1ef0798` | **újramérés 0/0/0/0** ugyanazzal a műszerrel |
| 9 | **PORTAL-DEADTREE-A** | APPROVED `f5f44b7` | **59 fájl / 8 001 sor**; lint **172 → 125**, pontosan az ELŐRE számolt értékkel |
| + | Boundary-őr két vak pontja | `review_requested` | az őr létezett, de 12-ből 10-et fogott — a 2 rés szerkezeti teszttel fedve |

### A nap mérés-módszertani hozadéka (mind memóriában)

1. **A kapu léte ≠ a hatása.** A boundary-őr megvolt és a CLAUDE.md hivatkozott
   rá — öntesztre mégis **átengedte a dinamikus `import()`-ot** (amivel a portál
   route-jai töltődnek) és a **3 szintű `../` visszanyúlást** (a konfig fixen
   4-5 szintet nevez meg). A fán ma 0 sértés csúszik át → **lappangó** vakság.
   A javítás nem tágabb regex (zajos kaput egy héten belül kikapcsolnak), hanem
   **feloldás-alapú szerkezeti teszt** az eslint-szabály mellé.
2. **Töröléskor az árva-importot a MEGMARADÓ fáról mérd.** A szemre teljes
   58-as klaszter-listám kihagyott egy teszt-fájlt; a megmaradó fa import-
   feloldása megfogta. Nélküle a suite azonnal tört volna → 59 fájl.
3. **A lint-számot ELŐRE számold ki.** 125-öt jósoltam, 125 lett — ez azt is
   bizonyítja, amit egy utólagos szám nem tud: a törlés **máshol nem hozott
   létre új leletet**. (És a becslésem helyesbítése: a „~57" a Tranche B-t is
   tartalmazta, Tranche A-ra a valós szám 47.)
4. **A bundle-méret változatlansága a VÁRT eredmény** — a halott kód eleve nem
   került bele. Aki ilyenkor „optimalizálást" ír, félrevezet.
5. **Bukó közös kapu → négylépcsős bizonyítás.** (egyedül zöld · újrafuttatva
   zöld · a diff gépileg 0 `packages/` fájlt érint · a szomszéd darab
   változatlan). Nem „ismerős minta" alapján zártam le.
6. **A detektor is tévedhet — oklch-korban különösen.** A kontraszt-mérőm első
   futása **7 hamis FAIL**-t adott, mert a Chrome a computed színt a FORRÁS
   színterében (`oklch(...)`) adja vissza, a parserem meg rgb-ként olvasta.
   Javítás: canvas-visszaolvasás + a mérőfüggvény **öntesztje** a valódi mérés
   ELŐTT.
7. **A root mérési fogása:** `sed -i` a mutáció-visszaállításnál Windows-fán
   CRLF→LF-et fordít → a sha1-bizonyítás sorvég-hamis pozitívot ad. **Mentett
   bájt-másolatból** állíts vissza.

### Számok, amiket a nap végén mértem

`tsc`/build PASS · **packages 817/817** · `src/components src/__tests__`
**496/496** · `src/pages src/mocks src/lib src/hooks` **693/693** · browser-smoke
zöld · **lint 125** (117 error + 8 warning, 50 fájlban) · **axe 0/0/0/0**.

---

## Korábbi napok — sűrítve

### 2026-07-30 — „a lint valódi hibákat takart, negyedszer"

Hat szelet. A nap gerince: **180 lint-lelet élő/halott térképe** (11 ügynökös
workflow) — 31 halott fájl / 57 lelet (**0/31 cáfolva** adverszáriálisan),
32 teszt-lelet, 91 élő (13 gyanús). A 3 legsúlyosabb gyanús **élő, PUBLIKUS**
route-on volt:

1. **Hamis „elküldve"** (`PublicQuoteRequestPage`, `/quote-request`) — javítva.
   ⭐ **A hibát egy TESZT védte:** a `'shows mock success when API fails'` a
   hibát *elvárt viselkedésként* rögzítette; aki javítja a `catch`-et, piros
   tesztet kap és visszacsinálja. → [[teszt-ami-kikoti-a-hibat]]
2. **rules-of-hooks crash** (`SupplierPortalPage`) — javítva; a mutáció csak
   `node_modules/.vite` törléssel volt érvényes (a build-cache a root mérését
   is érvénytelenítette).
3. **PIN-backdoor** (`OperatorLoginScreen`, `/shopfloor`) — nem nyúltam hozzá,
   a route sorsa Gábor-kérdés.

További: `CatalogPanel` lint-szelet (**három** valódi defekt egy figyelmeztetés
mögött, kettőt a harmadik takart), szivárgás-kapu zaj-hangolása (72 → 51,
−21/+0) és vak pontjai (30 → 33, +3/−0; a naiv alak 84-et adna).

### 2026-07-29 — a11y- és design-system-kör

`aria-current`/smoke (**a kapu egyszerre volt hamisan piros és hamisan zöld**;
24 valódi route + 17 gatelt, drift-őrrel) · `WorkflowPage` dark mode (24
route-ból egy tört; 7 → 1, és az 1 a detektorom téves riasztása volt) ·
`sr-only` táblázat-csapda (`width:1px` táblázaton nem fog, **két** modul) ·
`TOUCH-44` (`pointer: coarse` — nem kellett választani a11y és terv között) ·
`PORTALUI-PUBLISH` (a `publishConfig`-út `npm pack`-kel kimérve KIESETT).

**Három lelet, amit a beroutolás tett láthatóvá:** halott operátor-lista (a
lint végig jelezte) · szerep-szótár ütközés (zöld teszt fedte el, nem létező
szerepet mockolt) · UTC-s terv-dátum.

### 2026-07-28 — PLAN-05, mind a négy szelet APPROVED

F1 `GanttChart`+`DependencyGraph` (`0b0dbce`) · F2 `CapacityHeatmap` (`794b2c4`)
· F3 `ConfirmDialog`/`usePrintScope`/`useTimeCursor` (`ed0a786`) · F3+
`ConfirmProvider` (`b6f81e4`, `83b6f4b`).

---

## Referencia — amit a PLAN-05-ben a portal-ui kapott (közös felület)

| Primitív / hook | Fájl | Lényeg |
|---|---|---|
| `GanttChart` | `components/ui/GanttChart.tsx` | **az EGYETLEN idősáv-implementáció** (a `TimelineRow`/`ExecutionTimeline` beolvasztva és törölve); lanes/items, `domain`, `ticks` (szám VAGY explicit lista, üres felirat = csak rácsvonal), reszponzív viewBox |
| `DependencyGraph` | `components/ui/DependencyGraph.tsx` | FS/SS/FF/SF-képes háló; hiányzó végpontra NINCS kitalált él |
| `CapacityHeatmap` | `components/ui/CapacityHeatmap.tsx` (+ `.types.ts`) | valódi táblázat-szemantika (`th scope`), küszöb→tónus, hiányzó cella üresen marad |
| `ConfirmDialog` + `useConfirm` | `components/ui/ConfirmDialog.tsx` + `confirmContext.ts` | promise-alapú `ask()`; a fókusz a **Mégsén** landol |
| `usePrintScope` | `components/ui/hooks/usePrintScope.ts` | ref-fel kijelölt nyomtatási régió + `src/index.css` `@media print` blokk |
| `useTimeCursor` + `dates.ts` | `components/ui/hooks/` + `src/dates.ts` | csúszó idő-ablak; **naptári** (DST-biztos) léptetés, Intl nap-nevek |
| `SVG_TONES` / `SVG_AXIS` | `theme/svgTones.ts` | a STATUS_TONES SVG-párja — a `bg-*`/`text-*` utility SVG-alakzatra NEM hat |

App-oldali rétegek: `src/lib/scheduling/{planningVisualizationModel,capacityLoadModel}.ts`
(nézet-modellek, magyar szöveg formatter-propban), `src/components/scheduling/
{ExecutionGantt,CapacityConflictPanel}.tsx` (kompozíciók).

## Referencia — a portál mérőeszközei

| Eszköz | Mit fog meg |
|---|---|
| `npm run test:smoke:keyboard` | layout-függő a11y (jsdom-ban elvileg sem fogható): fókuszcsapda, 44px érintés, SHELL-H1 route-onként, F4 dialógus |
| `src/__tests__/workspaceBoundary.test.ts` | csomag-határok **feloldott úton** (az eslint-őr két vak pontja: dinamikus import, `../`-lánc mélysége) |
| `src/__tests__/indexHtml.test.ts` | a dokumentum nyelve (`lang="hu"`) — jsdom nem tölti be az index.html-t, ezért a FÁJLT olvassa |
| eldobható playwright-harness | axe-kör, kontraszt-mérés (⚠ oklch → canvas-feloldás + önteszt kell) |

---

## Ismert leletek — NEM az én sávom

- **`/w/trade` (gatelt):** a `usePricingRules:67` sikertelen PUT után lokálisan
  átírja az árat és `return true`-t ad → a hívó sikerként zárja. A hamis
  „elküldve" családja; ha a trade-világ élesedik, ez az ELSŐ tétel.
- **`LeadDetailSlideOver`** terhelés-flake (root P2-listáján).
- **`packages/module-collaboration/`** — B2B-08, `changes_requested`, más sáv.
