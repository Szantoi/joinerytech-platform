# FRONTEND Terminal State

> **Frissítve:** 2026-07-29 délután, Europe/Budapest

## Nap vége (2026-07-29 este) — a második kör

A hat reggeli szelet után továbbiak, mind `review_requested` vagy APPROVED:

| Szelet | Állapot | Lényeg |
|---|---|---|
| aria-current / smoke | APPROVED, commitolva | a kapu **egyszerre volt hamisan piros és hamisan zöld**; 24 valódi route + 17 gatelt, drift-őrrel |
| `WorkflowPage` dark mode | APPROVED, commitolva | mért audit: a 24 route-ból **egy** tört; 7 → 1, és az 1 a detektorom téves riasztása (kontraszt 17.49/13.89 — AA) |
| `sr-only` táblázat-csapda | APPROVED | a `width:1px` táblázaton nem fog; **két** modul, a második olyan képernyőn, amit a sweep be sem járt |
| `TOUCH-44` | APPROVED | `pointer: coarse` — nem kellett választani a11y és terv között; smoke-kapuval, mutációval |
| `PORTALUI-PUBLISH` | APPROVED, **publish Gábor-kapun** | a `publishConfig`-út `npm pack`-kel kimérve KIESETT; fogyasztói próba 7/7 + típus-mutáció |
| Szivárgás-kapu | APPROVED + 3 utókövetés kész | a publikált **ref**-et méri; mind a 6 fájlt fogja; submodule-lefedettség gépileg kimondva |

**A nap visszatérő tanulsága, négyszer:** az **ellenőrző eszköz** volt a hibás,
nem a mért kód — a chip-kontraszt téves riasztása, a `process.env` negatív
kontroll (ami a legveszélyesebb alakot nyomta el), a képzelt alakra mintázott
pozitív korpusz, és a `rev-parse --git-dir`, ami a szülő-repót találta meg.
→ [[kapu-epites-precedencia]], [[a-detektor-is-tevedhet]]

**Nyitva, NEM az én sávom:** a token-rotáció (R1), a LICENSE-ek, és hat meg nem
mért submodule. A biztonsági kört a doccapture/backend/root viszi.

## A délelőtt mérlege — hat APPROVED szelet, mind COMMITOLVA

Root-review APPROVED: **M3-bekötés · route-bekötés · magyarítás+tokenek ·
PLAN-05 F4 · F5 · F6 + F6/2**. A root a jelzésemre lezárta a gating-review-t
(hogy a három közös fájl tisztán kezelhető legyen), majd commitolt:
**portál `83b6f4b` → `ad8fd1b`, öt commit**, az általam javasolt fájl-diszjunkt
csoportosítás szerint. Platform-oldal: `53efe8d` (submodule-pin, F5/F6 kiírások,
és a `tenant-onboarding.sample.json`, ami addig untracked volt).

Saját ellenőrzés a commit UTÁN: minden fájlom tracked, a törölt
`AssignmentConfirmModal.tsx` tényleg eltűnt, `tsc` PASS, **729/729** a
scheduling+auth+portal-ui halmazon. A `packages/module-collaboration/`
szándékosan kimaradt (B2B-08, `changes_requested`) — széles `add`-del be ne
kerüljön.

**A nap három legfontosabb lelete** (mind a beroutolás tette láthatóvá):
1. **Halott operátor-lista** — `useEffect` importálva, sosem használva; a
   `useApi` lusta, tehát a lista sosem töltődött be → köteget SENKI nem tudott
   kiosztani. **A lint ezt végig jelezte**, én reggel „legacy adósságnak"
   könyveltem. → [[lint-figyelmeztetes-mint-hibajelentes]]
2. **Szerep-szótár ütközés** — a `useSchedulePermissions` olyan szerepekre volt
   írva, amiket a `parseUserClaims` kiszűrt → a képernyő mindenkinek
   csak-olvasható. Egy zöld teszt fedte el (nem létező szerepet mockolt).
3. **UTC-s terv-dátum** (root lelete) — éjszakai műszakban a tegnapi tervet
   mutatta volna mainak.
> **Állapotforrás:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`
> **Munkarend:** [`CLAUDE.md`](CLAUDE.md) — done-t KIZÁRÓLAG a root-review állít

## Jelenlegi állapot

- **Terminál megnyitva 2026-07-28-án**, első nap: a PLAN-05 mind a négy szelete
  leszállítva és root-review APPROVED.
- **Portal:** `main@83b6f4b`. Az én szeleteim (alulról felfelé):
  `0b0dbce` F1 → `794b2c4` F2 → `ed0a786` F3 → `b6f81e4` + `83b6f4b` F3+.
  A commitokat a root készíti — én `review_requested`-et jelentek bizonyítékokkal.
- **A portál working tree nem tiszta, de nem tőlem:** `packages/portal-core/
  src/auth/AuthContext.tsx`, `src/auth/**`, `src/components/layout/HomeScreen*`
  a Codex világ-gating sávja (ERPSEP-FE-WORLD-GATING), commitolatlan.
- **PLAN-05 (Doorstar-vizualizációk általánosítása): DONE** — F1+F2+F3+F3+.
  Az `EditableDataTable` a task-doksi szerint az M4 revízió-szerkesztés
  döntéséig várakozik (nem az én nyitott tételem).

## Amit a PLAN-05-ben a portal-ui kapott (közös felület, mindenkinek)

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

## 2026-07-29 délelőtt — M3 pending/error bekötés — **ROOT-REVIEW: APPROVED**

Root-mérés: 3 fájl / 26 teszt PASS, a kulcsdöntés kódban is ellenőrizve
(`useApi.ts:92`). Utókövetést nem kért. **A commit még nem futott le** — a
pathspec a csatornán megvan a rootnak (a `useApi.test.ts` untracked, `add` kell
neki; az `OperatorAutocomplete.test.tsx` a hook-commitba tartozik, mert a
típus-bővítés nélküle nem fordul).

**Nyitva maradt, Gábor asztalán:** kap-e route-ot a `SchedulingPage`.

### A szelet tartalma

Nyitott kiosztás nem volt (inbox üres), ezért a TODO egyetlen **kimondott
átvételi feltétellel** bíró tételét vittem végig. Jelentés:
`outbox/2026-07-29_002_m3-bekotes-pending-error-review-requested.md`.

- **`src/hooks/useApi.ts` — additív `isPending`.** A hook lusta (a fetch csak a
  fogyasztó `useEffect`-jéből indul), ezért az első festéskor az `isLoading`
  még `false` — aki arra gate-el, üres nézetet villant. Az implementáció a
  `resolvedUrl`-t követi, nem egy `hasResolved` jelzőt: így az **url-váltás** is
  „még nincs válasz", és egy **szabályos `null` törzs** sem ragad betöltésbe.
  Az `isLoading` érintetlen → a 40 fogyasztóból egy sem törik.
- **`src/pages/SchedulingPage.tsx` — lekérésenként külön `QueryGate`** (köteg /
  gép / idősáv). Az idősáv közös kaput kap, mert két lekérésből áll össze: ha az
  egyik hiányzik, a rács nem részleges, hanem hamis. A darabszám sem ír „(0)"-t,
  amíg nincs válasz.
- ÚJ: `src/hooks/__tests__/useApi.test.ts` (6 eset — a hooknak eddig nem volt
  tesztje) + 5 új eset a `SchedulingPage.test.tsx`-ben.
- Kapuk: célzott **26/26** · pages+hooks+lib+mocks **727/727** ·
  components+`__tests__` **544/544** · `tsc` PASS · `build` PASS ·
  lint az érintett fájlokon **baseline 7 → 6**.

**Lelet: a `SchedulingPage` sehonnan nincs beroutolva** — nulla hivatkozás rá a
portálon a saját fájlján és tesztjén kívül. Az `ExecutionGantt` egyetlen
fogyasztója tehát ma elérhetetlen a futó appból. Root-döntést kértem róla.
(Munka közben vettem észre, nem előtte — a fogyasztó elérhetőségét első
lépésben kell ellenőrizni.)

## 2026-07-29 délután — SchedulingPage route-bekötés (review_requested)

Gábor döntése: kapjon route-ot. `/w/production/scheduling` = **„Ütemezés"**, a
production világ alatt, a `machining` után. Jelentés:
`outbox/2026-07-29_003_scheduling-route-bekotes-review-requested.md`.

- **A csomagon kívül maradt**, a `WorkflowPage` precedense szerint (a
  `ProductionPage` fejléc-kommentje eddig is kimondta ezt a kivételt).
- **A saját `h1`-je kiesett:** a `WorldShell` az egyetlen dokumentum-főcím
  (`WorldShell.tsx:247`) — nélküle a „route-onként pontosan egy h1" kapu bukott
  volna. Új jsdom-teszt őrzi, hogy ne kerüljön vissza.
- **A smoke `ROUTES` listája kézzel felsorolt** (`keyboard-smoke.mjs:232`) — a
  regiszter bővítése önmagában NEM ad lefedettséget új route-nak.
- **A szelet nőtt:** a lap önálló, teljes képernyős lapnak épült, végig
  `stone-*` színekkel és angol szöveggel → 7 komponens magyarítása + tokenek.
- Kapuk: 112/112 célzott · 727/727 + 546/546 chunk · tsc/build PASS ·
  lint baseline **9 → 7** · SHELL-H1 **39/39 route** · dark/light **8/8**.

## World-gating P1 — átvettem, majd visszaadtam (2026-07-29, versenyhelyzet)

Gábor a gazdátlan gating-P1-et rám osztotta; deklaráltam a sávot és nekiálltam a
felmérésnek. **A fájlok a kezem alatt változtak meg** (`HomeScreen.tsx` +
`AuthContext.tsx` 07:57:57, `worldAccess.ts` 07:58:10) — egy új Codex-session
percekkel korábban felvette a root csatorna-jelzéséből. **Egy sort sem
módosítottam**, jeleztem a csatornán, visszaléptem.

**Root sáv-döntése:** a bent lévő író fejezze be (egy félig megírt fájlkészletet
átvenni rosszabb, mint befejezni). A Codex azóta `review_requested`-et jelentett
(5 fájl / 26 teszt PASS). **A sáv nem az enyém.**

**Amit a felmérés hozott — bekerült a review-ba:** a `Joiner` a metszet alatt
üres rácsot kapott volna (`ROLE_WORLDS.Joiner = ['shopfloor']`, a `shopfloor`
viszont `HIDDEN_LEGACY_WORLDS`-tag → a metszet üres; a `settings` sem menti,
mert az `isWorldEnabled` settings-kivétele csak az entitlement-tengelyen él).
**Gábor döntése: `Joiner` → `production` + `settings`.** A root szerint enélkül
„ez a hiba zöld teszttel ment volna át".

**Tanulság a következő session-nek:** a sáv-deklaráció a csatornán **nem
elég** ütközés ellen, ha a másik fél nem jelent be. Közös fájlhoz nyúlás előtt
érdemes az időbélyeget is megnézni, nem csak a `git status`-t.

## Ismert leletek (NEM az én sávom, bizonyítottan előzetesek)

1. ~~`/w/production/cutting` smoke-bukás~~ — **FELOLDVA** a Codex 2026-07-29
   09:20-as gating-javításával; saját méréssel igazolva (38 route SHELL-H1
   PASS). A `dev-harness/` kerülőútra nincs többé szükség.
2. **`npm run test:smoke:keyboard` továbbra is piros, de MÁS okból:**
   `aria-current` hiányzik 15 legacy világ-route nav-elemén (`/w/sales`,
   `/w/design`, `/w/finance`, `/w/masterdata`, `/w/interior`, `/w/service`,
   `/w/tasks`, `/w/attendance`, `/w/ai`, `/w/execbi`, `/w/logistics`,
   `/w/mfgprep`, `/w/projects`, `/w/supervisor`, `/w/shop`). Stash-elt
   baseline-nal igazolva, hogy a diffem nélkül ugyanez. A „~16 legacy világ"
   adósság accessibility-lába.
3. **Legacy lint-adósság az érintett fájlokban, amihez nem nyúltam:**
   `CatalogPanel.tsx` (`handleDuplicate` deklaráció előtt használva: 1 error +
   1 warning — root külön szeletet ígért rá), `SchedulingPage.tsx` (3),
   `MachineDropZone.tsx` (2), `OperatorAutocomplete.tsx` (1).

## Kapu-számok — 2026-07-28 nap vége (PLAN-05 zárás)

- `vitest run packages`: **810/810 PASS** (87 fájl)
- `packages/portal-ui` + `src/lib/scheduling` + `src/components/scheduling`: **237/237**
- lint: 0 az általam írt/módosított fájlokon · `npm run build`: PASS
- böngésző-mérés (eldobható harness): F1 39/39, F2 21/21, F3 22/22
