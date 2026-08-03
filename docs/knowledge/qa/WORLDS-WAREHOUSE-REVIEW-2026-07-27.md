# WORLDS-WAREHOUSE-REVIEW — QA Riport

**Dátum:** 2026-07-27  
**Reviewer:** Antigravity (root terminál)  
**Scope:** Warehouse világ — statikus kódelemzés (designer + kontraktus review)  
**Módszer:** Teljes forrás-olvasás (kód, MSW handlerek, séma, mock DB, seed)  
**Verdict:** **PASS-WITH-FINDINGS** (nincs S-szintű; 3×M, 4×L)

---

## Összefoglaló

A Warehouse világ (`WORLDS-WAREHOUSE-FE` + `WORLDS-WAREHOUSE-API-GATE`) sikeresen elkészült.
A 7 képernyő (Dashboard, Stock, Offcuts, Movements, Procurement) szerkezetileg helyes,
a zod-sémák és az MSW handlerek összhangban vannak egymással, a PO-FSM kizárólag valós
átmeneteket enged a frontend oldalon. Az adatőszinteség nagyrészt teljesül, két kivétel
dokumentálva (Movements + konsumpcióterület-számítás).

---

## Képernyőnkénti értékelés

### 1. WarehouseDashboard

| Kérdés | Eredmény |
|--------|---------|
| KPI-kártya adatai valós forrásból? | ✅ useStockLevel, useOffcutStatsSummary, usePurchaseOrders — mind zod-validált |
| Loading/Error állapot kezelve? | ✅ QueryGate wrapper egységesen lefedi |
| Retry mind a 4 query-ra? | ✅ handleRetryAll meghívja az összes refetch-et |
| Dark mode? | ✅ Minden szín-token dark:-prefixelt |
| Üres állapot? | ✅ 'Nincs aktív megrendelés' / 'Nincs készletadat' üzenet |
| Lots/zones látható? | ✅ Nincs ilyen szekció — helyes, nem tűnik kész funkciónak |

**Finding:** —

---

### 2. StockScreen

| Kérdés | Eredmény |
|--------|---------|
| Anyag-szelektor és API-hívás szinkronban? | ✅ selectedMaterial → useStockLevel(selectedMaterial) |
| Trendadat valódi végpontról? | ✅ /api/inventory/trend zod-validált |
| Bevételezés/felhasználás után invalidáció? | ✅ stock, trend, movements kulcsok mind invalidálódnak |
| Modális form a11y? | ⚠️ M-1 (lásd alább) |
| Hardkódolt vastagság? | ⚠️ M-2 (lásd alább) |
| Empty state a trend-nél? | ✅ 'Nincs megjeleníthető trendadat' |

---

### 3. OffcutsScreen

| Kérdés | Eredmény |
|--------|---------|
| Lista zod-validált? | ✅ offcutListItemSchema + pagination |
| Detail SlideOver adatforrás? | ✅ useOffcutDetail — külön zod séma (getOffcutDetailResponseSchema) |
| FSM gombok csak valós átmenetet engednek? | ✅ Available→Foglalás, Reserved→Felhasználás — pontosan |
| Approve gomb Available-ről hívható? | ⚠️ L-1 (lásd alább) |
| Status filter összeszámol? | ✅ total az API-tól jön, nem kliensen számolja |
| Dark mode + Summary kártyák | ✅ |

---

### 4. MovementsScreen

| Kérdés | Eredmény |
|--------|---------|
| Adatforrás valódi API? | ❌ M-3 — SAMPLE_MOVEMENTS hardkódolt tömb, nincs backend hívás |
| Filter valós számot mutat? | ❌ (következmény: a filter csak a statikus 3 elemre vonatkozik) |
| Oszlopok, dark mode | ✅ (a statikus adatokon belül) |
| Üres állapot szűrés esetén? | ⚠️ L-2 — ha üres a szűrt lista, nincs üres-állapot üzenet |

---

### 5. ProcurementScreen

| Kérdés | Eredmény |
|--------|---------|
| PO lista zod-validált? | ✅ purchaseOrderListItemSchema |
| FSM gombok pontosak? | ✅ Draft→Submit→Confirm→Ship→Deliver, csak aktuális státuszra megfelelő gomb |
| Wire labelek (PO_STATUS_LABELS)? | ✅ Magyar, teljes lefedettség |
| Törlés gomb korlátja? | ✅ status !== 'Delivered' && status !== 'Cancelled' — helyes |
| Create PO: supplier lookup mock? | ⚠️ L-3a (lásd alább) |
| Requisition status label? | ⚠️ L-4 (lásd alább) |
| 409-es FSM hiba UI-ba jut? | ⚠️ L-3b — generic toast, nem a backend hibaüzenet |
| Dark mode | ✅ |
| Create gomb felirata | ⚠️ L-3c — 'Megrendelés gomb' placeholder szöveg |

---

## Findingok részletezve

### M-1 — Modális form: hiányzó role="dialog" + aria-labelledby (StockScreen + ProcurementScreen)

**Szint:** M  
**Hely:** StockScreen.tsx:163, StockScreen.tsx:210, ProcurementScreen.tsx:184  
**Leírás:** A fixed inset-0 z-50 overlay div nem rendelkezik role="dialog", aria-modal="true",
aria-labelledby attribútumokkal. A h3 cím nincs összekötve a dialógussal — képernyőolvasók
nem hirdetik ki az overlay típusát/nevét. Focus-trap is hiányzik (pre-existing pattern
más modulokban is).  
**Reprodukció:** Screenreaderrel megnyitva a modált: nem Dialog-ként kerül fókuszba.  
**Javaslat:** role="dialog" aria-modal="true" aria-labelledby="modal-title-id" az overlay wrapper div-re,
id="modal-title-id" a h3-ra.

---

### M-2 — Hardkódolt thickness: 18 és area: panelCount * 5.796 (StockScreen)

**Szint:** M  
**Hely:** StockScreen.tsx:39, StockScreen.tsx:59  
**Leírás:** thickness: 18 és area: panelCount * 5.796 mindkét form-ban hardkódolt,
függetlenül a selectedMaterial-tól. Ha a user pl. Bükk tömörfa 25mm-t választ,
a backendnek küldött adat vastagsága és területe MDF-es konstanssal számolt.  
**Reprodukció:** Anyagszelektor: Bükk tömörfa 25mm → Bevételezés → backend kapja: thickness=18, area=panelCount*5.796  
**Javaslat:** A MATERIAL_OPTIONS tömbhöz thicknessMm és panelAreaM2 mező, és a számítás ezekből dolgozzon.

---

### M-3 — MovementsScreen statikus SAMPLE_MOVEMENTS (nincs API hívás)

**Szint:** M  
**Hely:** MovementsScreen.tsx:15-43  
**Leírás:** A MovementsScreen kizárólag hardkódolt SAMPLE_MOVEMENTS tömbből olvas,
nincs useQuery, nincs API hívás. Ez azt jelenti:
1. Valódi bevételezések és felhasználások, amelyeket a StockScreen-en rögzítünk,
   nem jelennek meg a Movements listában.
2. Az adatok sosem frissülnek, nem invalidáció-érzékenyek.
A backend /api/inventory/movements lapozható végpontja létezik (WORLDS-INV-READ-API elkészítette),
az MSW stack azonban nem regisztrál hozzá handlert ebben a modulban.  
**Reprodukció:** StockScreen → Bevételezés rögzítése → Movements képernyő:
csak a 3 statikus sor látható, az új bevételezés nem jelenik meg.  
**Javaslat:** useMovements(page, filter) hook + /api/inventory/movements MSW handler + zod séma.
Ez az egyetlen képernyő, ahol az adatőszinteségi kritérium nem teljesül.

---

### L-1 — Approve gomb Available státuszú offcut-on (OffcutsScreen SlideOver)

**Szint:** L  
**Hely:** OffcutsScreen.tsx:226-229  
**Leírás:** A SlideOver Available státuszú offcut esetén egyszerre mutatja a
Foglalás kezdeményezése és Foglalás jóváhagyása (Reserved) gombokat.
Az approveOffcutReservation logikailag Reserved-re állítja az elemet anélkül,
hogy előbb reserveOffcut-ot hívtunk volna — a mock elfogadja, de a valódi backend
ezt 409-cel utasítja vissza (nincs aktív reservation ID).  
**Javaslat:** A jóváhagyó gombot Reserved állapotra szűrni, ne Available-re.

---

### L-2 — Hiányzó üres-állapot üzenet a szűrt Movements listában

**Szint:** L  
**Hely:** MovementsScreen.tsx:88-113  
**Leírás:** Ha egy szűrő eredménye üres (pl. Offcut mozgások szűrő és nincs ilyen adat),
a DataTable üres táblázatot renderel — nincs Nincs találat üzenet.

---

### L-3a — Create PO mock: supplier lookup hibás (db.ts)

**Szint:** L  
**Hely:** db.ts:143-155  
**Leírás:** createPurchaseOrder a po.supplierName-t hasonlítja a supplier id-jához.
A frontend supplierId-t küld. A payload nem tartalmaz totalAmount-ot —
a mock 100 000 Ft fallback-kel él, nem tükrözi a backend quantity × unitPrice számítását.

### L-3b — PO 409-es FSM-hiba generic toast-ként jelenik meg

**Szint:** L  
**Hely:** ProcurementScreen.tsx:53-60  
**Leírás:** A handleFsmTransition catch blokkja generic üzenetet ad, nem olvassa a
409 body-ból jövő konkrét hibát.

### L-3c — Create PO submit gomb placeholder felirat

**Szint:** L  
**Hely:** ProcurementScreen.tsx:244  
**Leírás:** 'Megrendelés gomb' placeholder szöveg production kódban.  
**Javítás:** 'Megrendelés létrehozása'

---

### L-4 — Requisition StatusPill nem a Wire labeleket használja

**Szint:** L  
**Hely:** ProcurementScreen.tsx:173  
**Leírás:** label={req.status} az angol wire értéket (Draft, Approved, ConvertedToPO, Rejected)
jeleníti meg, nem a REQUISITION_STATUS_LABELS-t (Piszkozat, Jóváhagyva, Megrendelve, Elutasítva).
Az wire.ts-ben a REQUISITION_STATUS_LABELS létezik, de nincs felhasználva ezen a ponton.

---

## Kontraktus-ellenőrzés

| Végpont | MSW handler | Zod séma | Paritás |
|---------|-------------|----------|---------|
| GET /api/inventory/stock | ✅ | stockLevelResponseSchema | ✅ |
| GET /api/inventory/trend | ✅ | consumptionTrendResponseSchema | ✅ |
| POST /api/inventory/movements/consumption | ✅ | recordConsumptionRequestSchema | ✅ |
| POST /api/inventory/movements/inbound | ✅ | recordInboundRequestSchema | ✅ |
| GET /api/inventory/movements | ❌ nincs handler | — | ❌ M-3 |
| GET /api/inventory/offcuts | ✅ | getOffcutListResponseSchema | ✅ |
| GET /api/inventory/offcuts/:id | ✅ | getOffcutDetailResponseSchema | ✅ |
| GET /api/inventory/offcuts/stats/summary | ✅ | getOffcutStatsSummaryResponseSchema | ✅ |
| POST /api/inventory/offcuts/:id/reserve | ✅ | — | ✅ |
| POST /api/inventory/offcuts/:id/approve-reservation | ✅ | — | ✅ |
| POST /api/inventory/offcuts/:id/use | ✅ | — | ✅ |
| GET /api/procurement/suppliers | ✅ | supplierResponseSchema | ✅ |
| GET /api/procurement/orders | ✅ | purchaseOrderListItemSchema | ✅ |
| POST /api/procurement/orders | ✅ | createPurchaseOrderRequestSchema | ⚠️ L-3a |
| POST /api/procurement/orders/:id/:action | ✅ | — | ✅ |
| GET /api/procurement/requisitions/ | ✅ | requisitionDtoSchema | ✅ |

---

## Lots/Zones státusz

A WORLDS-LOTS-ZONES-DECISION task pending — a warehouse világ egyetlen képernyőn sem
hivatkozik lots/zones funkcióra, nem sugall kész funkcionalitást. ✅ Helyes.

---

## Verdict

**PASS-WITH-FINDINGS**

- **S-szintű:** 0
- **M-szintű:** 3 (M-1: modális a11y, M-2: hardkódolt thickness/area, M-3: Movements statikus adat)
- **L-szintű:** 4 (L-1: approve gomb, L-2: empty state, L-3a-c: PO create mock + toast + placeholder, L-4: requisition label)

**Blokkol-e az APPROVED-hoz:** Az M-3 (MovementsScreen adatőszinteség) a review-mátrix
5. pontját sérti — ez az egyetlen pont, ahol az elfogadási kritérium jelenleg nem teljesül.

**Javasolt következő lépés:** WORLDS-WAREHOUSE-FIX task nyitása az M-3 (MovementsScreen API
integration), az M-1 (modális a11y) és az L-3c (placeholder gombfelirat) javítására elsőként.
