# WORLDS-PRODUCTION-API-GATE — portál-sémák ellenőrzése élő cutting/joinery API-n

- **Szerep:** frontend/integration
- **Prioritás:** P0
- **Státusz:** pending
- **Függőség:** `WORLDS-PRODUCTION-FE`, `WORLDS-CUTTING-AUTHFIX`
- **Mutációs határ:** production module contract tesztjei, portál API-mode config,
  safe verify script, task-doksi
- **Tiltott scope:** képernyő-redesign, backend üzleti bővítés, token commit,
  automatikus VPS deploy

## Cél

Bizonyítani, hogy MSW nélkül a production module zod-sémái és hibakezelése a
valódi cutting/joinery host válaszait fogadja, és contract drift esetén a kapu
piros.

## Megvalósítás

1. Készíts explicit `api` data mode-ot; az MSW indulását automatikus teszt tiltsa.
2. Hozz létre `test:contract:production` scriptet. A base URL és bearer token
   csak env-ből jöhet; hiány esetén a script fail-fast, nem skip-success.
3. Read-only végpontokon kérj valós választ és parse-old a production zod
   sémákkal. Legalább: plans, analytics egy elérhető route-ja, door orders.
4. Hibakontraktus: token nélkül 401; hibás filter/payload 400 vagy 422 a
   dokumentált végpont szerint; tiltott transition kontrollált 409.
5. Mutációs smoke csak külön disposable dev tenant/seed mellett futtatható; cleanup
   kötelező. Production tenanton tilos.
6. A riport route-onként tartalmazza: HTTP kód, schema PASS/FAIL, response field
   drift, duration. Bodyt/PII-t/tokeneket ne naplózz.
7. API-módban indított portálon manuális vagy automatizált route-smoke:
   dashboard → lista → detail/error state. Képernyőkép a QA jelentéshez.

## Tesztterv

```powershell
Set-Location src/joinerytech-portal
$env:VITE_DATA_MODE='api'
$env:PRODUCTION_CONTRACT_TOKEN='<runtime-only>'
npm run test:contract:production
npm run build
```

## Elfogadási kritériumok

- [ ] `api` módban az MSW nem indul.
- [ ] Legalább három valós read route response-a ugyanazon zod-sémán PASS.
- [ ] 401 és legalább egy 400/422/409 hibakontraktus bizonyított.
- [ ] Contract drift nem warning, hanem non-zero exit.
- [ ] Token/body/PII nincs logban vagy repóban.
- [ ] API-mode route-smoke dokumentált.

## Stop / eszkaláció

Élő VPS-en mutációt vagy seedet csak külön root jóváhagyással. Ha nincs safe dev
tenant/token, a read-only és auth kapu elkészülhet, a mutációs rész blokkolt marad.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

