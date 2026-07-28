# WORLDS-PRODUCTION-FIX — production világ M-findingjainak javítása (review CHANGES REQUESTED)

- **Szerep:** frontend
- **Prioritás:** P1
- **Státusz:** done (2026-07-25, root) — a re-review kör külön task
- **Függőség:** — (a `WORLDS-SHELL-FIX`-szel párhuzamosan futhat, fájl-átfedés nincs)
- **Forrás:** [`WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
- **Mutációs határ:** `src/modules/production/**`, `src/pages/ProductionPage.tsx`
  + tesztjeik; kontraktus-doksi pontosítás (`WORLDS_API_CONTRACTS_2026-07-18.md`
  1.1 sor + joinery createdAt megjegyzés) és a FE-task gap-lista bővítés (G9)
  dokumentációként. Közös shell/kliens fájlokhoz NEM nyúl (az a WORLDS-SHELL-FIX).

## Findingok (a review-riport számozásával — részletek/fájl:sor ott)

| # | Finding | Fix-irány |
|---|---|---|
| M-1 | halott dash-linkek (`plans`/`executions` kulcs) | `cutting`/`machining` + smoke a célképernyő-renderre |
| M-2 | execution FSM-sértés mock 409 vs backend 422 | guardFsm 422 tömb-testtel + teszt/komment/README + doksi 1.1 |
| M-3 | placeholder-HMAC payloadok dokumentálatlan gapje | G9-tétel + api-módban gap-affordanciás disabledReason |
| M-4 | createdAt adathazugság (lista `0001-01-01`/detail UtcNow) | gap-affordancia „—"+tooltip; seed/rendezés őszintesítés |
| M-5 | totalItemCount ≠ szabásjegyzék-sor címke | `items.length` + helyes címke; seed-invariáns |
| M-6 | orders-KPI lap-szűkített számlálás | címke-őszintesítés / pageSize=100 + backend-gap jelölés |
| M-7 | quotes mobil összenyomódás | flex-wrap kártya-sor vagy gombok SlideOverbe sm alatt |
| M-8 | quotes tooltip 98px h-scroll | overflow-x-clip / szél-érzékeny tooltip-pozíció (ha Button-oldali fix kell → átadás a SHELL-FIX-be) |
| M-9 | `m.kind` nyers wire-kulcs | MILESTONE_KIND_LABELS bekötése (egysoros) |
| M-10 | dash-linkek 17px touch-zóna | chip-minta (`before:-inset-y-*`) a linkeken |
| M-11 | detail-SlideOverek hibaág nélkül | QueryGate/isError-ág + Újra mindhárom SlideOverben |
| M-12 | idővonal/mérföldkő pending=error=üres | isPending/isError szétválasztás |

N-follow-upok (nem kötelező ebben a körben, de olcsó ráérés esetén): DH-6
waste-ablak szűrés a mockban, FSM-05/DH-7 nevesített calculate-guard, FSM-06
waste-invalidálás, FSM-07 EXECUTION_ACTION_LABELS bekötés/törlés, FSM-08/STATE-6
quote isPending+currency guard, STATE-4 retry-affordancia, A11Y-4 hint láthatóvá.

## Elfogadási kritérium

- [x] Mind a 12 M javítva VAGY tételes, indokolt root-elfogadott backlog-bejegyzés.
- [x] Minden javításhoz regressziós teszt (különösen: dash-link célképernyő,
      422-tükör, SlideOver error-ág).
- [x] Célzott production-suite + teljes suite + build + lint zöld.
      *(A teljes suite egyetlen kimaradó fájlja a pre-existing OOM — lásd napló.)*
- [x] Fresh adversarial review a diffre (4 lencse, 15 lelet, mind javítva).
- [ ] Re-review kör a review-riport szerint (friss screenshot + probe), riport
      verdikt frissítve. → **külön task: `WORLDS-PRODUCTION-REREVIEW`**

## Végrehajtási napló

**2026-07-25 — root (Claude).**

### Mit javítottunk, hol

| # | Fájl(ok) | Változás |
|---|---|---|
| M-1 | `ProductionDashboard.tsx` | `onScreen('plans')`→`'cutting'`, `onScreen('executions')`→`'machining'` — a `ProductionPage.tsx` diszpécserének VALÓS kulcsai. Két teszt őrzi: az egyik a dashboard által küldött kulcsokat, a másik azt, hogy ezekre a kulcsokra a célképernyő tényleg renderel (mindkét vég). |
| M-2 | `mocks/db.ts`, `mocks/handlers.executions.ts`, `mocks/index.ts`, `productionApi.test.ts`, `productionContract.gate.ts`, `services/README.md`, kontraktus-doksi 1.1 | Az executions-végpontok MINDEN elutasítása **422 + csupasz `[{identifier,errorMessage}]` tömb** (a `guardFsm` 409-ágát 422-re cseréltük, a payload-422-k is tömb-testet adnak). A valós host az Execution szeletben csak `Result.Invalid`-ot ad → `MapResult` 422. A 409 kizárólag a plan-létrehozásnál (duplikált dátum) és az assign-batchnél marad. |
| M-3 | `services/fsm.ts` (új `deviceSignatureBlockReason`), `ExecutionDetailSlideOver.tsx`, `WORLDS-PRODUCTION-FE.md` (**G9** gap-sor) | `api` módban a start/progress/complete letiltott, magyarázó tooltippel — élesben a `complete` ÁTMENT VOLNA, és a konstans `demo-proof-hash` hamis bizonyítékként rögzült volna. Mock módban a demó változatlan. A guard a services rétegben él (a többi block-reason mellett), ezért unit-tesztelhető mindkét ágon. |
| M-4 | `pages/labels.ts` (`DOOR_ORDER_CREATED_AT_HINT`), `OrderDetailSlideOver.tsx`, `DoorOrdersScreen.tsx`, `mocks/seed.ts`, `mocks/handlers.orders.ts`, kontraktus-doksi | A `createdAt` nem perzisztált: a UI „—"-t mutat magyarázattal, a lista nem ír dátumot. A MOCK is őszinte lett: a seed a `0001-01-01` sentinelt tartja (nem hihető álbatot), a detail-route a backend „vándorló UtcNow" viselkedését tükrözi, és a lista-route createdAt-rendezése KIKERÜLT (az éles lekérdezésben nincs OrderBy). |
| M-5 | `services/orders.ts`, `mocks/seed.ts` | A toast mostantól `N szabásjegyzék-sor (M ajtótétel)` — a `totalItemCount` a backendben `order.Items.Count`. A seed-invariáns helyreállt: `totalItemCount` = a rendelés tételszáma (6 ill. 3), nem a szabásjegyzék sorainak száma. |
| M-6 | `services/config.ts` (`DASH_ORDERS_SCAN_PAGE_SIZE=100`), `ProductionDashboard.tsx` | A KPI a kontraktus-maximumig vizsgál, és ha a `totalCount` ennél is nagyobb, az alcím **bevallja**: „N vizsgált rendelésből (M összesen)" + tooltip a count-végpont hiányáról. Nincs néma alulszámolás teljességet sugalló felirat mellett. |
| M-7 | `QuotesScreen.tsx` | A sor `flex-wrap`-el törik: mobilon az ügyfél/meta oszlop a teljes sort kapja (mért: **294px**, volt ~40px), a pill+gombok a második sorba kerülnek; `sm`-től a korábbi, APPROVED egysoros elrendezés változatlan. |
| M-8 | `components/ui/Button.tsx` (új `tooltipAlign`), `QuotesScreen.tsx` | A `disabledReason`-tooltip a sor végi gomboknál a gomb JOBB széléhez igazodik. Az alapértelmezés (`center`) osztálysora bitre a régi → a másik 6 világ érintetlen. Mért eredmény: quotes h-scroll **98px → 0px** (1440 és 360 px-en is). |
| M-9 | `ExecutionDetailSlideOver.tsx` | `MILESTONE_KIND_LABELS[m.kind]` — a holt címke-térkép bekötve. |
| M-10 | `ProductionDashboard.tsx` | A négy szekció-link a modulban már használt chip-mintát kapta (`before:-inset-y-3.5`) → 17px szövegdoboz körül 44px effektív érintési zóna, változatlan elrendezéssel. |
| M-11 | új `pages/DetailState.tsx`, mindhárom detail-SlideOver, `PlanDetailSlideOver.tsx` profil-blokk | A detail-fetch hibája már NEM örök „Betöltés…": `role="alert"` + Újra. A profil-lekérés hibája sem marad néma üres select — kimondja, hogy emiatt blokkolt a publikálás. |
| M-12 | `ExecutionDetailSlideOver.tsx` | Az idővonal és a mérföldkő-lista szétválasztja a betöltés / hiba / üres állapotot (eddig mindhárom „Nincs rögzített esemény." volt). |

### Bizonyítás

- **17 új jsdom-regressziós teszt** (`productionFindings.regression.test.tsx`) — findingonként legalább egy, a riport számozásával (M-11-re mindhárom SlideOver, M-12-re idővonal ÉS mérföldkövek, M-3-ra mindkét adat-mód); plusz 3 API-szintű teszt (M-4 wire-viselkedés, M-5 seed- ÉS generátor-invariáns) és 2 guard-unitteszt.
- **Böngésző-szintű mérés** a `keyboard-smoke.mjs`-ben (M-7/M-8/M-10): ezek jsdom-ban elvileg sem foghatók, mert nincs layout-motor. A `document.elementFromPoint` a dash-link kiterjesztett zónáját is valósan ellenőrzi.

### Friss adversarial review (4 lencse, 19 agent) — és amit KIFOGOTT

A diffre 4 független lencse futott (lefedettség / regresszió-sugár / teszt-mutáció
/ kontraktus-doksi igazság), minden S+M lelet külön verify-agenttel:
**15 megerősített lelet, 0 megcáfolt.** A leletek a MÁSODIK körben javítva:

| Lelet | Mi volt a baj | Javítás |
|---|---|---|
| **M-5 fele hiányzott** | A mock `buildCuttingList` generátora 1 ajtótétel = 1 szabásjegyzék-sor arányt adott, és a seedeletlen rendelésekre EZ fut. Egy elérhető úton (ordSubmitted kalkulálása) az új, „őszinte" toast így pont azt sugallta volna, hogy a két szám ugyanaz — az invariáns-teszt viszont csak a seedelt esetet nézte, tehát zöld maradt. | Ajtótételenként 3 alkatrész-sor (lap/keretléc/tok), `totalItemCount` marad `order.itemCount`; új teszt a GENERÁLT útra. |
| **Az M-8 fix új, néma hibát hozott** | A jobbra igazított `whitespace-nowrap` tooltip keskeny kijelzőn BALRA lóg ki; balra nincs görgetés, tehát a magyarázat csendben levágódik — és a smoke-check ezt konstrukcióból nem látta. | Az `end` változat tördel + `max-w-[min(20rem,calc(100vw-2rem))]`; új smoke-mérés: MINDEN tooltip-doboz a viewporton belül (6/6 @1440 és @360). |
| **Önellentmondás az M-10 körül** | Ugyanaz a diff, ami 44px-es érintési zónát kényszerít ki, egy ~16px-es csupasz szöveg-gombot vezetett be (a profil-hiba „Újra"-ja). | A közös `Button` primitívre cserélve (`variant="secondary" size="sm"`). |
| **M-3-nak nem volt teszt-őre** | A riport legsúlyosabb adat-őszinteségi findingjének BEKÖTÉSÉT (a komponensben) semmi nem védte, csak a mögötte lévő tiszta guard-függvényt. | A mód injektálható propként (`apiMode`, default = build-idejű kapcsoló); 2 komponens-teszt (api = tiltott, mock = engedélyezett). |
| **M-11 őre 3-ból 1 SlideOvert fedett; M-12-é a mérföldköveket nem** | A többi hibaág teszt nélkül maradt. | +4 teszt: rendelés- és végrehajtás-részlet 500, mérföldkő-lekérés 500, prioritás-profil 500. |
| **4 komment még 409-et tanított** (köztük a `db.ts` önmagának mondott ellent 93 sorral odébb) | A kód és a doksi javítva volt, a kommentek nem — az API-GATE írója ott olvasná a hibaszemantikát. | `db.ts`, `executions.ts` (×2), `fsm.ts` javítva. |
| **HAMIS állítást írtam a joinery hibatestről** | A doksi és a mock `[{identifier,errorMessage}]`-t állított a DoorOrder 400-akra. A forrás (`DoorOrderEndpoints.cs`) `Results.BadRequest(result.Errors)`-t ad → **csupasz `string[]`**; a 404 `Results.NotFound()` → **üres törzs**. (A `[{identifier,errorMessage}]` alak a products- és gyartasilap-csoporté — `ProductEndpoints.cs:41,80`.) | Mock + README + kontraktus-doksi javítva; a 404 üres törzsű lett. |
| **A 409-jegyzet túl széles volt** | „409 KIZÁRÓLAG assign-batch + plan-létrehozás" — ugyanaz a doksi további cutting-409-eket sorol (analytics/rebuild, adapter-config). | A jegyzet a tényleges hatókörre szűkítve. |
| **M-11 nem volt teljes** | A prioritás-profil select BETÖLTŐ és ÜRES állapota továbbra is néma volt (a publish magyarázat nélkül blokkolt). | Mindhárom állapot kimondva (betöltés / hiba+Újra / „nincs profil ehhez a bérlőhöz — G7"). |
| **README elavult** | Hiányzott a G9-guard, a `api`-módú tiltás és az új gapek. | Kiegészítve (G9, createdAt, count-végpont, mock-fidelitás maradvány). |

### Kapuk (a végleges, javított fán)

| Kapu | Eredmény |
|---|---|
| Production modul vitest | **5 fájl / 85 teszt zöld** |
| Teljes portál-suite | **170/171 fájl · 1594 teszt · 0 bukás** (három darabban futtatva — a háttérfutásokat a környezet ismételten leállította; a darabolás lefedi a teljes `src`-t) |
| `npm run build` | **PASS** (0 hiba) |
| `eslint` (modul + Button + smoke-script) | **0 hiba** |
| `npm run test:smoke:keyboard` (élő Chrome) | **16/16 PASS** — quotes h-scroll 0px (1440 és 360), 6/6 tooltip a viewporton belül, mobil ügyfél-oszlop 294px, dash-link 44px-es zóna |

⚠ A suite EGYETLEN nem futó fájlja továbbra is a
`src/pages/__tests__/ProcurementPage.test.tsx` (5 teszt): **pre-existing heap-OOM**,
bizonyítottan független ettől a körtől — külön task: `STAB-FE-PROCUREMENT-OOM`.

Egy lelet **scope-jelzés** volt, nem hiba: a review közben a
`productionContract.gate.ts`-t is módosítottam (a 409-es blokk szövegét a 422-re
igazítottam), így a lencsék által látott diffnél eggyel több fájl van a körben —
ez a fenti táblázat M-2 sorába tartozik, kód-hatása nincs (komment + describe-név).
