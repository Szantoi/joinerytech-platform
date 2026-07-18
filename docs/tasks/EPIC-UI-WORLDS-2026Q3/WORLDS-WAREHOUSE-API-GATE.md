# WORLDS-WAREHOUSE-API-GATE — portál-sémák élő inventory/procurement ellenőrzése

- **Szerep:** frontend/integration
- **Prioritás:** P0
- **Státusz:** pending
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

- [ ] Inventory és procurement kötelező read route-ok schema PASS.
- [ ] 401 és biztonságosan futtatható 409/410 kontraktus PASS.
- [ ] Nincs mock fallback API-módban.
- [ ] Drift piros kapu, secret/PII nincs riportban.
- [ ] Portál API-mode smoke dokumentált.

## Stop / eszkaláció

Production tenanton mutáció tilos. Safe token/tenant hiányában a read-only kapu
elkészül, a mutációs bizonyíték blokkolt státusszal marad.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

