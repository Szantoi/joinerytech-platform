# WORLDS-WAREHOUSE-FIX — review-finding javítások

- **Szerep:** frontend
- **Prioritás:** P0
- **Státusz:** review_requested
- **Függőség:** `WORLDS-WAREHOUSE-REVIEW`
- **Forrás:** `docs/knowledge/qa/WORLDS-WAREHOUSE-REVIEW-2026-07-27.md`

## Cél

A Warehouse review M-1, M-2 és M-3 findingjainak lezárása szerződéshű mockkal,
valamint a velük közvetlenül összefüggő L-1, L-2, L-3a/c és L-4 javítása.

## Megvalósítás

- M-3: a `MovementsScreen` a `GET /api/inventory/movements` lapozott, zod-validált
  DTO-ját használja; nincs statikus adat. Az MSW DB/handler azonos `items/total/page/pageSize`
  válaszformát ad, és inbound/consumption rögzítés után a query invalidáció frissíti a listát.
- M-2: a kiválasztható alapanyagok vastagsága és panelterülete egyetlen
  `WAREHOUSE_CONFIG.MATERIALS` konfigurációból jön a két inventory-mutation payloadhoz.
- M-1: a három modal névvel ellátott, `aria-modal` dialógus; a közös inert-background és
  focus-trap hook kezeli a fókuszt, Escape bezárja.
- L-1: az offcut approve csak `Reserved` állapotban jelenik meg; az MSW matching reservationt
  is megkövetel, így nem zöldülhet mockban tiltott átmenet.
- L-2: üres filtereredménynek saját, kimondott állapota van.
- L-3a/c és L-4: a PO mock `supplierId`-ból old fel beszállítót, mennyiség × egységár összeget
  számol, a submit gomb végleges magyar feliratot kapott, a requisition pill magyar wire-labelt használ.
- Integrációs lelet: a `warehouseHandlers` bekerült a globális MSW worker-regiszterbe;
  enélkül a böngészős portál API-hibával állt meg a modul saját handlerjei ellenére.

## Bizonyíték

- `npm exec -- vitest run src/modules/warehouse src/mocks/__tests__/dataMode.test.ts`: **24/24 zöld**.
- Érintett ESLint: **0 hiba**; `git diff --check`: tiszta.
- `npm run build`: TypeScript és Vite build zöld.
- Böngészős smoke (mock mode): movement lista 3 találattal, Offcut szűrő 1 találattal,
  konzolhiba nélkül; a consumption modal egyedi nevű `role=dialog`, `aria-modal=true`,
  Escape-re bezár.

## Stop / következő kapu

Kódot ezen a körön túl nem bővítünk. Független adversarial review után a
`WORLDS-WAREHOUSE-REVIEW` re-review-ja dönt az APPROVED verdict-ről.

---

## ROOT ÁTVÉTEL (2026-07-27 éjjel) — Antigravity leállt (kvóta), a root fejezi be

A fenti kör RÉSZLEGES volt (M-1/M-2/M-3 + L-tételek a saját önreview-ból).
A done feltétele a ROOT-AUDIT teljes listája. Kötelező tételek:

### P0 (mind blokkoló)

1. **Stock-kontraktus:** a `schemas.ts` stock-sémája a backend által EXPLICIT
   kivezetett régi alakot tükrözi. Cél-alak a backend forrásból:
   `GetStockListQuery.cs` → `StockListResponse{items[],total,page,pageSize}`,
   item: `materialCatalogId, materialType?, unitOfMeasure, fullPanelQuantity,
   offcutQuantity, totalQuantity, unitPrice, reorderMin` (ellenőrizd a pontos
   mezőket a forrásban: src/spaceos-modules-inventory/.../GetStockListQuery.cs
   és InventoryEndpoints.cs). A hardcoded `MATERIALS` lista (config.ts) mint
   kliens-oldali ár/min-forrás MEGSZŰNIK — unitPrice/reorderMin az API-ból.
   MSW/db.ts/seed ugyanezt az alakot tükrözi. StockScreen + Dashboard átáll.
2. **Summary-fetcher:** `GET /api/inventory/summary` fetcher + zod-séma a
   `GetInventorySummaryQuery.cs` valós alakjából; a Dashboard KPI-k ebből
   (nem egy default-anyag számából).
3. **Offcut-mutációk:** a demo-stubok (`jobId:'job-demo-001'`,
   `reservationId:'res-demo-001'`) MEGSZŰNNEK — a reserve válaszából kapott
   valódi reservationId átfűzve az approve-ig (state/cache), a jobId valódi
   bemenetből (ha nincs job-forrás, kimondott UI-affordancia + validált input).
4. **PO deliver-body:** a backend `DeliverPurchaseOrderRequest`-je kötelező
   mezőt vár (ReceivedQuantity — pontos alak a ProcurementEndpoints.cs-ből);
   a `procurement.ts` deliver ezt küldi, UI-input van rá, az MSW hiányzó
   body-ra 400-at tükröz (nem 200-at).
5. **poFsm.ts egy-igazságforrás:** PO-átmenet-tábla külön fájlban (production
   fsm.ts minta), a UI ebből dönt gomb-láthatóságot/disabledReason-t, az MSW
   db.ts átmenet-guardja UGYANEBBŐL a táblából ad 409-et tiltott átmenetre
   (a backend Result.Conflict→409 tükre, ResultToHttp.cs). Dedikált FSM-tesztek.

### P1 (mind kötelező)

6. App.tsx: a 6 unused lazy-import eltávolítása; a legacy ProcurementPage
   (/api/v2 hívásokkal, 106 kB chunk) ne kerüljön a buildbe, ha már nem
   route-olt — a warehouse-diszpécser vs. legacy oldalak viszonya tisztázva
   (lots/zones/movementlog: a régi stone-* oldalak HELYETT vagy kimondott
   legacy-fallback state, de dupla-h1 és „endpoint nem elérhető" hazugság
   nélkül — ld. H1-review P2-2).
7. worlds.ts warehouse-blokk: `offcuts` tab felvétele (a fő deliverable most
   navigációból elérhetetlen!).
8. Rule-6: deliver után movements+trend+order-detail invalidáció is; teszttel.
9. 400/409/410 megjelenítés: az ApiError.status/isConflict helperek használata
   a képernyő-hibaágakban; 410 kezelése ahol releváns; service-tesztek
   státuszkód-assertekkel (ne csak rejects.toThrow).
10. pending≠error≠üres: SlideOver detail hibaág; requisitions a QueryGate-be.
11. Halott dashboard-gombok: onOpenConsumptionModal/onOpenInboundModal
    propok bekötése vagy a gombok elhagyása (hazug affordancia tilos).
12. **Mocks-izoláció:** a modul gyökér-barreljéből az `export * from './mocks'`
    TÖRLENDŐ (MSW-szivárgás a lazy chunkokba) — a mocks KÜLÖN belépési pont.

### P2 (ha olcsó, most)

13. Duplikált movements-handler törlése; Math.random() a mockból ki
    (determinisztikus trend); ismeretlen anyag → 404 (nem kitalált készlet);
    DEFAULT_MATERIAL_TYPE literál-duplikációk.

### Kapuk a done-hoz

Warehouse-tesztek production-szintre (FSM + státuszkód + képernyő-tesztek),
boundary-őr, eslint 0 az érintett fájlokon (App.tsx-szel!), tsc+build,
teljes suite (3 darabban), browser-smoke (a 38 route-os H1-őrrel), fresh
adversarial review, majd root-commit a H1-szelettel koordinálva.

---

## ROOT-REVIEW ZÁRÁS (2026-07-28) — VERDIKT: APPROVED, task DONE

A befejezett fát (Antigravity 07:16-os `review_requested` felterjesztése)
független adversarial review bírálta el, majd a root egy javító kört futtatott.

### Adversarial review eredmény

- **Mind az 5 P0 + 7 P1 + P2-13 tétel TELJESÜL** (tételes bizonyíték a review-
  jelentésben: séma↔backend mezőegyezés a GetStockListQuery/GetInventorySummary/
  DeliverPurchaseOrderRequest forrásokból, poFsm↔PurchaseOrder.cs átmenet-
  egyezés, reservationId-átfűzés, dist-chunk mock-izoláció grep-pel).
- **1 új P1 (kötelező): `stock` alias-kulcs** — a diszpécser worlds.ts-ben nem
  létező kulcsot szolgált ki, a Dashboard gyors-műveletei erre navigáltak →
  a `/w/warehouse/stock` route-on a WorldShell h1 „Áttekintés"-t hazudott,
  aktív nav-elem nélkül (a smoke ROUTES-listáján kívüli fejléc-hazugság).
- 4 új P2: backend enum-drift (OffcutStatus.Waste / MovementType.Scrap a zod-
  whitelistből kizárva → egyetlen legacy sor listaszintű parse-hibát okozna);
  MSW-fabrikált expectedDelivery dátum; pagináció-literál duplikáció a
  movements/offcuts handlerben; hiányzó diszpécser-kulcs őr-teszt.

### Root javító kör (mind javítva)

1. `stock` alias megszüntetve — Dashboard → `inventory`; a diszpécser képernyő-
   térképe külön fájlba (`src/pages/warehouseScreenMap.ts`) emelve, exportált
   kulcskészlettel.
2. **Két-irányú kulcs-őr teszt** (`src/pages/__tests__/WarehousePage.test.tsx`,
   a legacy LotsPage-teszteket váltja): worlds.ts ↔ diszpécser kulcs-halmaz
   egyezés + minden kulcson h1-cím assert + fallback-ág.
3. Enum-drift zárva: `Waste`/`Scrap` felvéve a whitelistekbe + wire-címkék.
4. Mock-hűség: expectedDelivery hiánynál `null` (nem fabrikált dátum), ÉS —
   **review-n túli root-lelet** — a backend create-handlere auto-submitál
   (`Create→Submit()→mentés`), így create után `Submitted` a hű állapot, nem
   `Draft`; Draft PO kizárólag rekvizíció-konverzióból létezik → mock+seed+
   teszt-lánc ehhez igazítva (seedben Draft PO a submit-akció fedésére).
5. Pagináció-korlátok a `WAREHOUSE_CONFIG`-ból mindhárom handlerben.

### Kapuk (javító kör után újrafuttatva)

- Warehouse+dataMode+őr: **89/89 zöld**; teljes suite 3 darabban:
  **759 + 480 + 439 zöld, 0 bukás** — a ProcurementPage.test.tsx **kizárás
  nélkül** (a heap-OOM a STAB-FE-PROCUREMENT-OOM fixszel igazoltan megszűnt).
- ESLint érintett fájlokon + mind a 7 modul-világon: 0 hiba; `tsc`+`vite build`
  zöld; a legacy ProcurementPage 106 kB chunkja nincs a distben.
- Browser-smoke: minden zöld, SHELL-H1 38 route-os őrrel.

### Backend follow-up jegyzet (nem e task scope-ja)

A `RecordDeliveryValidator` nincs bekötve MediatR-pipeline-ba a procurement
modulban (nincs `AddValidatorsFromAssembly`/validation behavior) — a nem-pozitív
`receivedQuantity` élesben nem a validátor 422-jével bukik. A Codex procurement-
sávjának (STAB-RLS / ERPSEP-05 környezet) jelezve az AGENT-CHANNEL-en.
