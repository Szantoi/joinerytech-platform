# FIX-PREEXISTING-TESTS — A 19 örökölt tesztbukás javítása (első kör teljes lezárása)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-16) · **Fázis:** backlog (F1-örökség)
- **Alap:** portal main@ad50ce9 · **Forrás:** F1-C build-verify (HEAD db57ae3-en is bukott — nem epic-regresszió)
- **Cél:** teljes `npx vitest run` → **0 bukás** (1437/1437 zöld)

## Gyökérok-térkép (fájlonként)

A 19 bukás 8 tesztfájlt érintett, 4 gyökérok-csoportba tartozott (7 + 2 + 5 + 5 = 19).
Elv: teszt-oldali javítás, ha a teszt elvárása elavult; kód-oldali, ha a teszt jogos hibát fogott.

### 1. HU számformátum — 7 teszt, 4 tesztfájl (teszt- ÉS kód-oldali)

**Gyökérok:** a komponensek `toLocaleString()`-et hívtak **locale-argumentum nélkül**
(környezetfüggő kimenet!), a tesztek pedig en-US formátumot (`45,000`) vagy szó közökkel
kevert NBSP-t vártak. hu-HU alatt a kimenet NBSP-csoportosított (`45 000`), és a
Testing Library normalizálója az NBSP-t sima szóközzé lapítja — a vesszős/NBSP-s
regexek sosem találhattak. Ráadás: a CLDR hu `minimumGroupingDigits = 2`, tehát a
4-jegyű számok (8500, 3600) **szeparátor nélkül** jelennek meg.

**Javítás:**
- **Kód-oldali (determinizmus):** explicit `toLocaleString('hu-HU')` a legacy ár-formázásban —
  `src/components/BOMPreviewCard.tsx` (4 hely), `src/pages/WorkOrderSummary.tsx` (5 hely).
  Lokálisan viselkedés-őrző (a gép locale-ja eddig is hu volt), de CI-ben/en-US gépen is
  ugyanazt adja. (A `ProcurementPage.tsx` már eddig is explicit `'hu-HU'`-t használt.)
- **Teszt-oldali (elavult elvárás):**
  - `src/__tests__/BOMPreviewCard.test.tsx` — 2 teszt: `/22,500/ → /22 500/`, `/45,000/ → /45 000/`,
    `/8,500/ → /8500/`, `/10,400/ → /10 400/`, `/3,600/ → /3600/` (4-jegyű: nincs szeparátor)
  - `src/components/__tests__/BOMPreviewCard.test.tsx` — 3 teszt: `huPrice()` helper
    (hu-HU formázás + NBSP/NNBSP → sima szóköz, ahogy a Testing Library normalizál),
    a dinamikus `new RegExp(x.toLocaleString())` és a `'45,000 Ft'` literál helyett
  - `src/__tests__/configurator-integration.test.tsx` — 1 teszt: `/31,500/ /18,000/ /49,500/` → szóközös
  - `src/__tests__/WorkOrderSummary.test.tsx` — 1 teszt: ugyanez a 3 regex

### 2. Zod v4 API-törés a wizard validációban — 2 teszt, 2 tesztfájl (KÓD-OLDALI, valódi bug)

**Gyökérok:** `src/pages/ProductConfiguratorWizard.tsx` a `catch`-ben `error.errors?.forEach`-et
hívott — a zod v4 (`^4.4.3`) **eltávolította** a `.errors` aliast (csak `.issues` van). Az opcionális
láncolás miatt a validációs hibák **némán elnyelődtek**: érvénytelen méretekkel (width=500) is
tovább lehetett lépni, a „Minimum width: 700mm" üzenet sosem jelent meg. Ezt fogta
`src/__tests__/ProductConfiguratorWizard.test.tsx` („validates dimension ranges on step 2") és
`src/pages/__tests__/ProductConfiguratorWizard.test.tsx` („validates dimension inputs").

**Javítás (kód-oldali, minimális):** `error instanceof ZodError` + `error.issues.forEach(...)`.
Bónusz lint-tisztítás az érintett sorokon: a `catch (error: any)` tipizálva, a `mutationFn`
`data: any` → `ConfigStateForm` (a submit-payload pontos típusa).

### 3. catalogFilterStore kettős perzisztencia — 5 teszt, 1 tesztfájl (kód- ÉS teszt-oldali)

**Gyökérok (kód):** `src/stores/catalogFilterStore.ts` a zustand `persist` middleware-t ÉS a
kézi, 300 ms-os debounce-olt mentést **ugyanarra a storage-kulcsra** (`spaceos_catalog_v2`)
használta. A persist minden `set()`-nél azonnal, **más formátumban** (`{state, version}`) írt,
mint amit a `loadFilters` vár (`{filters, viewMode, timestamp, version}`) — ez kinullázta a
debounce-ot (a „még nincs mentve" asszertek buktak), és sérült rehidrálást is okozott.

**Javítás (kód-oldali):** a persist middleware **eltávolítva** — a dokumentált kézi séma
(300 ms debounce + 24h expiry + sessionStorage-fallback + BroadcastChannel) az egyetlen
igazságforrás. A reload-túlélés megmaradt: a kiemelt `readPersistedFilters()` modul-szinten
egyszer lefut, és az áruház kezdőállapotát adja (a `loadFilters` akció ugyanerre delegál).

> **Review-tipp:** a `git diff` itt ~298 sort mutat, de ebből **~40/44 a tényleges változás** —
> a többi a `persist(...)` wrapper megszűnése utáni újraindentálás. **`git diff -w`-vel**
> nézve látszik a valódi diff.

**Javítás (teszt-oldali)** — 3 teszthiba a teszt saját hibája volt:
- *BroadcastChannel*: a store a BC-példányt **import-időben** hozza létre, az ESM import-hoist
  miatt a tesztfájl mock-osztálya sosem érvényesülhetett → spy a valódi (jsdom)
  `BroadcastChannel.prototype.postMessage`-en.
- *sessionStorage-fallback*: a jsdom `localStorage`-a proxy — a `localStorage.setItem = vi.fn(...)`
  értékadás nem metódust ír felül, hanem „setItem" nevű ITEM-et tárol → `vi.spyOn(Storage.prototype,
  'setItem')`, ami csak a localStorage-példányon dob QuotaExceededError-t.
- *debounce („multiple rapid changes only save once")*: minden változás újraindítja a 300 ms-os
  ablakot, a teszt viszont az utolsó változás után csak 100 ms-ot lépett → 300 ms-ra igazítva.
- *viewMode*: `clearFilters` után a storage törlődik, tehát `loadFilters` **null** (nem
  `{viewMode:'grid'}`) — az asszert a store default állapotát ellenőrzi (`viewMode === 'grid'`).

### 4. ProcurementPage Router-hiány — 5 teszt, 1 tesztfájl (teszt-oldali)

**Gyökérok:** a `ProcurementPage` az RFQ-szűrők miatt `useSearchParams`-ot használ
(`useRfqFilters` hook) — Router-kontextus nélkül `useLocation() may be used only in the
context of a <Router>` hibával dobott minden render.

**Javítás (teszt-oldali):** `src/pages/__tests__/ProcurementPage.test.tsx` — közös
`renderPage()` helper `MemoryRouter` wrapperrel; a `\uXXXX` escape-elt magyar
stringek olvasható UTF-8-ra cserélve.

## Törölt teszt

Nincs — mind a 19 teszt megmenthető volt, skip sincs.

## Ráadás: App.test load-flake (NEM a 19-ből)

**Gyökérok:** `src/__tests__/App.test.tsx` „renders warehouse procurement screen" — a képernyők
F1-C óta lazy chunkok, a teszt a `findByText` **default 1 s** timeoutjával várja a
ProcurementPage-chunk (105,97 kB + katalógus-panel) betöltését. A baseline-futásban (131 s)
ez belefért; miközben a párhuzamos backend-agentek dolgoztak (15 node + 6 dotnet processz),
a teljes futás 531 s-ra lassult, és a chunk 1 s alatt nem oldódott fel → a Suspense-fallback
állt még, a lekérdezés bukott (pontosan 1074 ms-nál). **Önmagában futtatva a fájl 8/8 zöld** —
tehát nem termék-hiba és nem az én diffem következménye, hanem terhelés-érzékeny teszt.

**Javítás (teszt-oldali, 1 sor):** `configure({ asyncUtilTimeout: 5000 })` a fájl tetején —
a chunk-import latenciára ad fejteret, a termék-viselkedésre nem hat. Ez a fájl **nem** volt
a 19 dokumentált bukó között; a jegyzőkönyv kedvéért külön jelezve.

## Érintett fájlok (11)

| Fájl | Jelleg |
|------|--------|
| `src/components/BOMPreviewCard.tsx` | kód (hu-HU formázás) |
| `src/pages/WorkOrderSummary.tsx` | kód (hu-HU formázás) |
| `src/pages/ProductConfiguratorWizard.tsx` | **kód (valódi bug: zod v4)** |
| `src/stores/catalogFilterStore.ts` | **kód (kettős perzisztencia)** |
| `src/__tests__/BOMPreviewCard.test.tsx` | teszt |
| `src/components/__tests__/BOMPreviewCard.test.tsx` | teszt |
| `src/__tests__/configurator-integration.test.tsx` | teszt |
| `src/__tests__/WorkOrderSummary.test.tsx` | teszt |
| `src/__tests__/catalogFilterPersistence.test.tsx` | teszt |
| `src/pages/__tests__/ProcurementPage.test.tsx` | teszt |
| `src/__tests__/App.test.tsx` | teszt (load-flake, a 19-en kívül) |

## Ellenőrzés

- **Teljes suite:** `npx vitest run` → **1437 passed / 0 failed** (155 tesztfájl zöld)
- `npx tsc -b` tiszta · `npm run build` zöld (bundle-layout változatlan: ProcurementPage 105,97 kB / gzip 22,05 kB)
- Célzott eslint a 11 érintett fájlra: az általam írt/módosított sorok 0 hibásak.
  A `src/__tests__/WorkOrderSummary.test.tsx` fetch-mock sorain maradt 8 pre-existing
  `no-explicit-any` (HEAD-en is megvolt, scope-on kívüli legacy lint-adósság — nem
  refaktoráltam; a `fireEvent` unused-import viszont javítva, mert az én diffem érintette).
- A 7 modul-világ (`src/modules/`) fájljaihoz nem nyúltam; a Vite dev szerver (5173) végig futott.
- Az egyidejűleg futó backend-agentek változásaihoz (`src/dms`, `src/SpaceOS.Modules.CRM`,
  `src/spaceos-modules-kontrolling`) nem nyúltam.

## Megjegyzés a root-nak

A (2)-es és (3)-as pont **nem csak teszt-kozmetika**: a wizard zod-bugja élesben is némán
átengedte az érvénytelen méreteket (a `min(700)`/`max(1100)` guard hatástalan volt), a
catalogFilterStore kettős írása pedig sérült/formátum-idegen rekordot hagyhatott a
`spaceos_catalog_v2` kulcson. Mindkettő a legacy prototípus-képernyőkön él, de valódi
viselkedés-javulás.

_Frontend terminál — JoineryTech sziget. NEM commitolva: merge/commit root-döntés._
