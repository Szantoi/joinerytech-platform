# STAB-FE-PROCUREMENT-OOM — végtelen render-hurok a SmartFilteren (teszt-OOM + élő CPU-pörgés)

- **Szerep:** frontend
- **Prioritás:** P1
- **Státusz:** done (2026-07-25, root) — portal@13bf494
- **Felfedezve:** 2026-07-25 (root, a `WORLDS-SHELL-FIX` teljes-suite kapujában)
- **Mutációs határ:** `src/components/shared/SmartFilter.tsx`,
  `src/hooks/useFilterState.ts`, `src/pages/ProcurementPage.tsx`
- **Tiltott scope:** a reprodukáló teszt
  (`src/pages/__tests__/ProcurementPage.test.tsx`) törlése/skipelése — az a
  bizonyíték, és a fix után zöldnek kell lennie.

## Tünet

- `npx vitest run src/pages/__tests__/ProcurementPage.test.tsx` → a vitest
  worker **V8 heap-OOM-mal hal** (~4 GB, ~220 s után), 5 teszt sosem fut le.
- Ezért a **teljes portál-suite `EXIT=1`** annak ellenére, hogy **0 teszt bukik**
  (169/170 fájl, 1573/1578 teszt zöld) — és a `test:nightly` kapu
  (`vitest run src/pages …`) is piros.
- A vitest összegzőben `tests 0ms` → a crash az **első `render()`-en belül**
  történik, nem a teszttestben.

## Miért nem tűnt fel eddig

A `STAB-FE-TEST-GATE` naplója (2026-07-21) már rögzítette, hogy „1 hibás fájl
pre-existing" — de nem nevesítette és nem szervezte taskba. Most nevesítve van.

## Bizonyíték, hogy pre-existing (nem a WORLDS-SHELL-FIX okozta)

1. Izoláltan, egyetlen workerrel is elszáll (nem aggregált memória/worker-szám).
2. A `WORLDS-SHELL-FIX` 5 módosított forrásfájlját HEAD-re visszaállítva
   **azonosan elszáll** (237 s), majd sha1-ellenőrzött visszaállítás a
   fix-állapotra.

## Gyökérok (bizonyítva: A/B/C bisect + forráskód-ellenőrzés)

Végtelen passzív-effekt hurok, amit három hely együtt hoz létre:

| Hely | Szerep a hurokban |
|---|---|
| `src/pages/ProcurementPage.tsx:235` | `data={apiOrders \|\| []}` — `apiOrders` a tesztben `null` (nincs token, a `useApi` sosem fetchel), így **minden renderben új tömb-literál** keletkezik. |
| `src/hooks/useFilterState.ts:273-312` | `filteredData = useMemo(…, [data, activeFilters])`; szűrő nélkül **magát a `data`-t adja vissza** → új identitás minden renderben. |
| `src/components/shared/SmartFilter.tsx:64-66` | `useEffect(() => onFilter(filteredData), [filteredData, onFilter])` → minden commit után `setFilteredOrders(újTömb)`; új referencia ⇒ React sosem bail-outol ⇒ újabb render ⇒ vissza az 1. pontra. |

**Miért OOM és nem „Maximum update depth exceeded":** a hurkot passzív-effekt
flush hajtja, amire a React 19 csak `console.error`-t ad (a dobó ág a sync-lane
`nestedUpdateCount`), és mindez az RTL `act()`-jén belül fut: a `flushActQueue`
`for (; i < queue.length; i++)` ciklusa közben minden iteráció újabb closure-t
tol ugyanabba az `actQueue`-ba, a `queue.length = 0` truncálás pedig csak a
ciklus után jönne. A tömb tehát render-sebességgel, korlátlanul nő, és minden
elem élő gyökérből elérhető → nincs mit felszabadítani.

**Bisect-bizonyíték** (ideiglenes próbafájlok, azóta törölve):

- **A** — teljes ProcurementPage, de a `components/shared` (SmartFilter) mockolva
  `() => null`-ra: **zöld**, 206 ms → minden más gyerek (KPIDashboard,
  RfqFilterBar, a 3 SlideOver/Drawer, `useApi`, `useRfqFilters`) ártatlan.
- **B** — csak SmartFilter, `data={apiOrders || []}` + `onFilter={setState}`
  mintával: **beragad** (90 s-nál kilőve; a `--testTimeout` nem üt, mert a hurok
  szinkron `act()`-flush, sosem ad vissza a timernek).
- **C** — ugyanaz, de `data={EMPTY}` modul-szintű konstanssal: **zöld**, 29 ms.

## ÉLŐ hatás (nem csak teszt!)

A SmartFilter-blokk a `<details>` „Advanced Filters (SmartFilter Demo)" alatt
**mindig renderelődik** (a `details` gyerekei a DOM-ban vannak zárt állapotban
is). Ha az API nem ad adatot (nincs token / hibás válasz → `apiOrders === null`),
a böngészőben ugyanez a hurok indul el: nem OOM-ol (a scheduler enged a
böngészőnek), de **folyamatosan pörgeti a CPU-t** a Procurement oldalon.
A `SmartFilter`-nek ma **egyetlen hívási helye van** (ProcurementPage), tehát a
robbanási sugár egy oldal — plusz a látens csapda minden jövőbeli fogyasztónak.

## Javítási vázlat

1. **Hívási hely stabilizálása** — `ProcurementPage.tsx`: `apiOrders || []`
   helyett stabil identitás (modul-szintű `EMPTY` konstans vagy `useMemo`).
   Megfontolandó a `filteredOrders` tükör-state teljes megszüntetése is: a
   `SmartFilter` eredményét ma semmi sem használja (a lista a `rfqFilter`-ből
   jön), tehát az egész `onFilter`-lánc no-op is lehet.
2. **SmartFilter keményítése** — az `onFilter`-t `useRef`-be tükrözve
   (`useLayoutEffect` frissítéssel), az effekt csak `[filteredData]`-tól függjön;
   így az inline-arrow `onFilter` hívási minta sem tudja újra felhúzni a csapdát.
3. **Látens testvér-veszély** — `useFilterState.ts:98-131`: az URL→state effekt
   feltétel nélkül `setActiveFilters(újTömb)`-öt hív, és a deps-ben szerepel a
   `config.fields`; bármely fogyasztó, aki inline `config={{…}}` literált ad át,
   ugyanezt a végtelen hurkot kapja. Guard: azonosság-összehasonlítás a
   `setActiveFilters`-ben és/vagy `searchParams.toString()` a deps-ben.
4. **Kósza `import React from 'react'`** a `SmartFilter.tsx:192`-ben — felvinni a
   fájl elejére, ha már úgyis nyúlunk hozzá.

## Elfogadási kritérium

- [x] `npx vitest run src/pages/__tests__/ProcurementPage.test.tsx` zöld
      (5/5, **5,7 s** — korábban 220 s után heap-halál), a teszt változatlan.
- [x] Teljes portál-suite kizárás nélkül: **172/172 fájl, 1602 teszt, 0 bukás**.
- [x] Regressziós tesztek a hurok mechanizmusára (nem „beragadás"-alapúak,
      hanem hívás-számot pinnelnek — így valódi bukást adnak).
- [x] `build` + `lint` zöld (lint 21 → 20 probléma, új hiba nincs),
      fresh adversarial review a diffre.
- [ ] `npm run test:nightly` külön futtatása (a teljes suite lefedi, de a
      script maga még nem futott ebben a körben).
- [ ] Böngésző-szúrópróba render-számlálóval a Procurement oldalon.

## Végrehajtási napló

**2026-07-25 — root (Claude), portal@13bf494.**

A hurok **négy** ponton szakad meg — és ebből **kettőt csak a fresh review
talált meg**, az első javítás után:

1. `ProcurementPage`: `data={apiOrders || []}` → `useMemo`.
2. `SmartFilter`: az `onFilter` kikerült a hatás deps-éből (ref-tükör), és a
   hatás **érték-alapú kapuval** csak valódi eredmény-változásra emittál.
3. **`FilterRow` (review-lelet, S):** ugyanez a minta egy szinttel lejjebb — az
   `onChange` a deps-ben, a `SmartFilter` inline arrow-ként adta át. Az első
   javítás után a hurok **bármely szűrőértékkel vagy bármely bookmarkolt
   szűrő-URL-lel visszajött volna.** A verifier mérése: 410 → 11 render.
4. **`useFilterState.updateFilter` (review-lelet):** a `.map()` mindig új
   tömb-identitást adott, és a feltétel nélküli setState + `setSearchParams`
   akkor is futott, ha semmi nem változott (böngészőben `history.replaceState`-spam).

**Őszinte korlát, ami a kódban is ki van mondva:** a SmartFilter érték-kapuja
**elem-identitás** alapú. Ha egy hívó minden renderben új elem-objektumokat
gyárt (`data={rows.map(r => ({...r}))}`), a kapu nem fog. A szerződés
(„a `data` elemei referenciálisan stabilak") most a komponens dokumentációjában
szerepel — korábban a komment tévesen azt állította, hogy bármelyik hívási
helyen biztonságos.

Új őrök: `SmartFilter.loop.test.tsx` (4) + `useFilterState.loop.test.tsx` (3).
Mindkét kritikus guard **mutációs próbával igazolva: KILLED** (a teszt bukik,
nem fagy — ez szándékos, mert egy valódi hurok time-out nélkül ragadna be).
