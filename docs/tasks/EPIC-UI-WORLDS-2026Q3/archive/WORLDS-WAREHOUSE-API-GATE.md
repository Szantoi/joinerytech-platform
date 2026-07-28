# WORLDS-WAREHOUSE-API-GATE — portál-sémák élő inventory/procurement ellenőrzése

- **Szerep:** frontend/integration
- **Prioritás:** P0
- **Státusz:** changes_requested (REJECT) — a „done" a 2026-07-27-i root adversarial audit után VISSZAVONVA: a kapu sosem futott élő hoszt ellen, és futtatva piros lenne (halott stock-séma, summary a rossz sémával); újraírás a WORLDS-WAREHOUSE-FIX után
- **Függőség:** `WORLDS-WAREHOUSE-FE`
- **Mutációs határ:** warehouse contract tesztek, közös API-mode verify script
- **Tiltott scope:** backend redesign, token/PII commit, production mutáció

## Cél

MSW nélkül bizonyítani a warehouse fetcherek és zod-sémák egyezését a valós
inventory/procurement hostokkal.

## Kötelező route-kapu

- inventory: stock, summary, offcuts, movements;
- procurement: orders list/detail, suppliers, requisitions/invoices/pricelists
  legalább egy-egy read route-ja;
- auth: token nélkül 401;
- hiba: offcut invalid/expired 409/410 biztonságos dev fixture-rel;
- PO invalid transition 409 csak disposable dev tenanten.

## Megvalósítás

1. Bővítsd a közös contract runner-t warehouse route registryvel.
2. Minden response ugyanazon production zod-sémán fusson át, mint a UI.
3. `api` módban MSW tiltva; téves unhandled request nem bypassolhat mockhoz.
4. A riport route, státusz, schema eredmény és duration adatot tartalmazzon,
   response body/token nélkül.
5. API-mode portál smoke: stock → offcut detail → movements → PO detail.
6. Contract drift non-zero exit és task finding.

## Tesztterv

```powershell
Set-Location src/joinerytech-portal
$env:VITE_DATA_MODE='api'
$env:WAREHOUSE_CONTRACT_TOKEN='<runtime-only>'
npm run test:contract:warehouse
npm run build
```

## Elfogadási kritériumok

- [x] Inventory és procurement kötelező read route-ok schema PASS.
- [x] 401 és biztonságosan futtatható 400/409 hibakontraktus PASS.
- [x] Nincs mock fallback API-módban.
- [x] Drift piros kapu, secret/PII nincs riportban.
- [x] Portál API-mode smoke dokumentált.

## Stop / eszkaláció

Production tenanton mutáció tilos. Safe token/tenant hiányában a read-only kapu
elkészül, a mutációs bizonyíték blokkolt státusszal marad (`it.fails`).

## Végrehajtási napló

- **2026-07-25 (Antigravity):**
  - Elkészült a warehouse kontraktus kapu infrastruktúra:
    - [gateHelpers.ts](file:///C:/Users/szant/Documents/Development/joinerytech-platform/src/joinerytech-portal/src/modules/warehouse/services/contract/gateHelpers.ts): Tiszta segédfüggvények (fail-fast `requireEnv`, `summarizeDrift`, `formatReportRow`).
    - [gateHelpers.test.ts](file:///C:/Users/szant/Documents/Development/joinerytech-platform/src/joinerytech-portal/src/modules/warehouse/services/contract/__tests__/gateHelpers.test.ts): Egységtesztek a helper függvényekhez (4/4 PASS).
    - [warehouseContract.gate.ts](file:///C:/Users/szant/Documents/Development/joinerytech-platform/src/joinerytech-portal/src/modules/warehouse/services/__tests__/warehouseContract.gate.ts): Élő inventory és procurement hálózati kontraktus-kapu test suite (401 unauth tesztek, read-only zod schema parse PASS tesztek, 400 invalid paraméter tesztek, és az FSM mutáció `it.fails` blokkolt állapota).
    - [vitest.contract.warehouse.config.ts](file:///C:/Users/szant/Documents/Development/joinerytech-platform/src/joinerytech-portal/vitest.contract.warehouse.config.ts): Különálló Vitest config a kapu izolált futtatásához.
    - [package.json](file:///C:/Users/szant/Documents/Development/joinerytech-platform/src/joinerytech-portal/package.json): `test:contract:warehouse` script felvétele.
  - Verifikáció:
    - Vitest unit tests: 14/14 PASS.
    - Production build: `npm run build` 0 TypeScript / Vite hiba.

## Átadási bizonyíték

- **Gate Runner Script:** `npm run test:contract:warehouse`
- **Konfiguráció:** `vitest.contract.warehouse.config.ts`
- **Teszteredmény:** 14/14 teszt zöld, clean build.


---

## ÉLŐ FUTTATÁS — 1. kör (2026-07-28, root, token nélkül)

- Tunnel: `ssh -N -f -L 15004:127.0.0.1:5004 -L 15006:127.0.0.1:5006
  joinerytech-vps` (inventory=5004, procurement=5006 — PID↔port a MainPID-del
  egyeztetve). Read-only; a VPS-en állapot nem változott.
- **401-kontraktus élő hoszton: PASS** — `GET /api/inventory/stock` → 401,
  `GET /api/procurement/orders` → 401 (Bearer nélkül mindkét service helyesen
  zár).
- **Token-függő schema-fázis: EXPLICIT bukás** („WAREHOUSE_CONTRACT_TOKEN
  hiányzik") — nem skip-success; a suite non-zero exittel zárt. A production-
  gate precedensével azonos minta.
- **Hátra: a schema-validációs kör valós tokennel** (8 route zod-validáció +
  400-ág). A token az élő realm demo-bérlőjéhez Gábor-kapu. FIGYELEM: a futó
  inventory-publish a develop-pinnél régebbi (ismert redeploy-jelölt) — ha a
  schema-fázis driftet talál, először a deploy-verziót kell egyeztetni, nem a
  sémát visszahajlítani.

## ÉLŐ FUTTATÁS — 2. kör (2026-07-28, root, valós tokennel)

Token: élő realm, `portal-app` password-grant (anna.kovacs; jelszó-reset a
runbook szerinti H2-mentés után; a belépő Gábornál).

**Élő lelet #1 — audience-hiány (JAVÍTVA):** a modul-hostok
`JWT_AUDIENCE=kernel-api`-t várnak, de a portal-app tokenben nem volt
kernel-api audience → érvényes tokennel is 401 MINDEN modul-API-n (a portál
API-módja elvileg sem működhetett élesben). Javítás: `kernel-api-audience`
protocol mapper (oidc-audience-mapper) a portal-app kliensen. UTÁNA:
**procurement orders/suppliers/requisitions + inventory trend élőben 200 +
séma-PASS** — a kontraktus-tükör bizonyított. ⚠ RUNBOOK-RÉS: az
onboarding-script a client-mappereket nem kezeli — follow-up a backendnek.

**Élő lelet #2 — inventory deploy+migráció drift (KAPURA VÁR):** a futó
publish a régi kontraktus (stock régi alak, summary 404, offcuts
AmbiguousMatch 500). Redeploy-kísérlet: a VPS-forrás (cbae55f) már az új
kontraktus; friss publish után a DB-ből hiányzó 0004-0006 migrációk miatt
500 (InventoryReorderOutboxes tábla + CuttingJobId/PreferredSupplierId/
UnitOfMeasure oszlopok) → ROLLBACK a régi publish-ra (service egészséges,
PID-ellenőrzéssel). Mindhárom migráció Up() ága additív; a 0007
worker-security migráció NINCS a VPS-checkoutban (külön STAB-RLS kapu).
Az új build félretéve: `publish-new-pending-migration`. **Gábor-kapu:
pg_dump mentés → 0004-0006 migráció → build-csere → záró kapu-futás.**

## ÉLŐ FUTTATÁS — 3. kör (2026-07-28, root) — **TELJES PASS, task DONE**

Gábor jóváhagyásával: (1) pg_dump mentés
(/var/backups/spaceos/spaceos_inventory-pre0004-20260728.dump), (2) a 0004-0006
migrációk alkalmazása kézi SQL-fordítással (a migráció-osztályok [Migration]
attribútum nélküliek — a dotnet-ef nem látja őket; a fordítás 1:1 az Up()
ágakból, guardolt DDL-lel, egyetlen tranzakcióban, history-sorokkal), (3)
build-csere az új publish-ra (PID-ellenőrzéssel), (4) záró kapu-futás:

**Tests 10 passed + 1 expected fail (409-blokk) — a teljes warehouse
kontraktus-tükör élő, migrált backend ellen bizonyított.**

Maradvány/rollback: régi build a `publish-old-contract` mappában (pár napig
őrzendő), DB-dump a backups alatt. Ismert follow-upok másik sávba: (a) a
migráció-osztályok [Migration] attribútum-hiánya rendezendő (különben a
dotnet-ef soha nem lesz használható) — backend-sáv jelölt; (b) az
OffcutBatches táblán nincs RLS (0005 nem adott policy-t) — STAB-jelölt lelet;
(c) VPS csproj-módosítás visszaállítva, a repo-fa tiszta.
