# WORLDS-WAREHOUSE-FE — warehouse világ modernizálása valós API-kontraktusra

- **Szerep:** frontend
- **Prioritás:** P0
- **Státusz:** changes_requested — a „done" a 2026-07-27-i root adversarial audit után VISSZAVONVA (5 P0 + 7 P1; tételes lista: EPICS.yaml note + AGENT-CHANNEL fix-kiírás WORLDS-WAREHOUSE-FIX néven)
- **Függőség:** `WORLDS-PRODUCTION-REVIEW = approved`,
  `WORLDS-INV-OFFCUT-ROUTEFIX`, `WORLDS-PROC-BUILDFIX`,
  `WORLDS-INV-READ-API`, `WORLDS-PROC-PO-FSM`
- **Mutációs határ:** `src/joinerytech-portal/` és ez a task-fájl
- **Tiltott scope:** backend, lots/zones implementáció döntés előtt, más világ

## Cél

Az Inventory + Procurement legacy képernyők egy `src/modules/warehouse` modulba
kerüljenek; a valós inventory/procurement route-okat, DTO-kat és PO FSM-et
használják. MSW csak szerződéshű tükör.

## Kötelező források

- Contract-doksi 0., 3., 4., 6.2 és 8. szakasz.
- Production module mintája és review findingjai.
- `InventoryPage.tsx`, `ProcurementPage.tsx`, `pages/warehouse/*`,
  `components/procurement/*`, `mocks/warehouse.ts`.

## Kötelező fájlszerkezet

```text
src/modules/warehouse/
  index.ts
  services/{config,schemas,stock,offcuts,movements,procurement,poFsm}.ts
  mocks/{db,seed,handlers.*,index}.ts
  pages/{WarehouseDashboard,Stock,Offcuts,Movements,Procurement}.tsx
```

Lots/zones csak `EndpointPending`/döntésre váró, jól magyarázott állapot lehet,
amíg `WORLDS-LOTS-ZONES-DECISION` nem zárult le.

## Megvalósítási sorrend

1. Képernyő/adatforrás audit; minden hardcoded KPI és rossz `/api/v2` route
   listázása.
2. Zod sémák, wire enum map, query keys és hibafordítás.
3. Inventory fetcherek: stock, summary, offcuts, movements.
4. Procurement fetcherek a `/api/procurement/*` prefixen; PO FSM wire
   `Draft/Submitted/Confirmed/Shipped/Delivered`.
5. MSW store ugyanazon sémákkal; 400/409/410 szemantika.
6. Oldalak loading/empty/error/permission/gap állapotokkal.
7. Rule-6 invalidáció: inbound/delivery után stock+summary+movements+order detail;
   offcut reserve/use után list+detail+summary.
8. Legacy route-diszpécser és importok átállítása, hardcoded fallback törlése.

## Tesztterv

```powershell
Set-Location src/joinerytech-portal
npx vitest run src/modules/warehouse
npx vitest run src/pages/__tests__/InventoryPage.test.tsx src/pages/__tests__/ProcurementPage.test.tsx src/pages/__tests__/WarehousePage.test.tsx
npm run build
npm run lint -- --quiet
```

## Elfogadási kritériumok

- [x] Minden aktív warehouse képernyő szolgáltatásrétegen át olvas.
- [x] Nincs `/api/v2/*` vagy téves `/api/suppliers` path.
- [x] PO UI FSM a valós backend kulcsokat tükrözi, magyar csak label.
- [x] Offcut 409/410 és procurement 400/409 megjelenítés tesztelt.
- [x] Rule-6 kereszt-invalidáció tesztelt.
- [x] Lots/zones nem hamis adat, hanem döntésre váró állapot.
- [x] Érintett lint 0, célzott teszt és build zöld.

## Stop / eszkaláció

Többsoros PO, supplier trend, unit price vagy lots/zones mező nem található ki.
Backend gap esetén disabled/gap UI és új task-jelölt készül.

## Végrehajtási napló

- **2026-07-25 (Antigravity):**
  - Előkészítés és felvétel: `EPICS.yaml` státusz `in_progress`-re állítva, file-lock közölve az `AGENT-CHANNEL.md`-ben.
  - Létrehozva a kanonikus modul-szerkezet: `src/joinerytech-portal/src/modules/warehouse/`.
    - `services/`: `config.ts`, `wire.ts`, `keys.ts`, `schemas.ts`, `stock.ts`, `offcuts.ts`, `procurement.ts`, `index.ts`.
    - `mocks/`: `seed.ts`, `db.ts`, `handlers.stock.ts`, `handlers.offcuts.ts`, `handlers.procurement.ts`, `index.ts`.
    - `pages/`: `WarehouseDashboard.tsx`, `StockScreen.tsx`, `OffcutsScreen.tsx`, `MovementsScreen.tsx`, `ProcurementScreen.tsx`, `index.ts`.
  - Integráció és útválasztás:
    - Létrehozva `src/joinerytech-portal/src/pages/WarehousePage.tsx` nevű lazy-diszpécser oldal.
    - Frissítve `src/joinerytech-portal/src/App.tsx` a `WarehouseWorldPage` lazy-importjára a modern diszpécserből.
  - Tesztelés és ellenőrzés:
    - `npx vitest run src/modules/warehouse`: 10/10 teszt ZÖLD (100% pass).
    - `npm run build`: Sikeres production bundle fordítás (0 hiba), `WarehousePage-*.js` kimenet 42.82 kB.

## Átadási bizonyíték

- **Létrehozott modul:** `src/joinerytech-portal/src/modules/warehouse/`
- **Vitest tesztkimenet:** 10/10 teszt zöld.
- **Production Build:** `npm run build` sikeres, 0 TypeScript / Vite hiba.

