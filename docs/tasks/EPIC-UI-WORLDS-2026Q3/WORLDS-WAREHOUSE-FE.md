# WORLDS-WAREHOUSE-FE — warehouse világ modernizálása valós API-kontraktusra

- **Szerep:** frontend
- **Prioritás:** P0
- **Státusz:** pending
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

- [ ] Minden aktív warehouse képernyő szolgáltatásrétegen át olvas.
- [ ] Nincs `/api/v2/*` vagy téves `/api/suppliers` path.
- [ ] PO UI FSM a valós backend kulcsokat tükrözi, magyar csak label.
- [ ] Offcut 409/410 és procurement 400/409 megjelenítés tesztelt.
- [ ] Rule-6 kereszt-invalidáció tesztelt.
- [ ] Lots/zones nem hamis adat, hanem döntésre váró állapot.
- [ ] Érintett lint 0, célzott teszt és build zöld.

## Stop / eszkaláció

Többsoros PO, supplier trend, unit price vagy lots/zones mező nem található ki.
Backend gap esetén disabled/gap UI és új task-jelölt készül.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő: képernyő/data-source mátrix, tesztszám, gapek._

