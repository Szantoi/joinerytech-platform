# STAB-HTTP-ERROR-REDACTION — Belső hibaüzenetek kiszűrése HTTP-válaszokból

- **Epic:** `EPIC-PLATFORM-STABILITY-2026Q3`
- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** `review`
- **Függőség:** nincs
- **Mutációs határ:** CRM, HR, QA, Kontrolling és EHS API endpoint-hibaleképezők, célzott endpoint-tesztek
- **Tiltott scope:** domain validációs szabályok, tenant/RLS, jogosultsági modell, portal-kontraktusok átnevezése

## Cél és üzleti eredmény

Váratlan provider-, adatbázis- vagy konfigurációs hiba HTTP-válasza nem árul el
belső részleteket, miközben a dokumentált validációs (400), hiányzó (404) és
üzleti konfliktus (409) státuszok megmaradnak.

## Preflight

Az auditban a CRM, HR, QA és Kontrolling közös `Result → HTTP` mapperének
fallbackje, illetve EHS 20 generic és 24 `InvalidOperationException` catch-ága
nyers `ex.Message` értéket küldött a kliensnek.

## Megvalósítási lépések

1. CRM, HR, QA és Kontrolling váratlan `Ardalis.Result` státuszai egységes,
   generikus `500 InternalServerError` válaszra térnek át.
2. EHS-ben az `EhsEndpointResults` centralizálja a biztonságos 400, 409 és 500
   választ; az összes érintett legacy endpoint ezt használja.
3. A FluentValidation-hiba megőrzi a 400-as user-input viselkedést, míg más
   kivételek nem írhatják felül belső szöveggel a 409/500 választ.
4. Endpoint-regressziós tesztek szándékos `connection string=secret` értékkel
   igazolják, hogy az nem jelenik meg válaszban.

## Elfogadási kritériumok

- [x] Váratlan `Result.Error` CRM/HR/QA/Kontrolling esetben generikus 500.
- [x] EHS API endpointokban nincs `ex.Message` HTTP-válaszban.
- [x] EHS FluentValidation megőrzi a 400-as állapotot.
- [x] EHS konfliktusok 409-esek maradnak, belső részlet nélkül.
- [x] Célzott HTTP regressziós tesztek zöldek.

## Stop / eszkaláció

Az eredeti kivétel strukturált, korreláció-azonosítós szerveroldali naplózása
külön observability-feladat: a jelenlegi `Ardalis.Result.Error` sok helyen már
csak szöveget hordoz. A redakció ezt nem blokkolja, de a diagnosztika javítása
külön tervezést igényel.

## Végrehajtási napló

2026-07-29 — A közös mapperek hálózati fallbackje 400-ról biztonságos 500-ra
változott. EHS legacy endpointokban a 20 generic catch és a 24 nyers konfliktus
válasz közös, redaktált eredményre lett átvezetve.

## Átadási bizonyíték

```text
dotnet test src/SpaceOS.Modules.CRM/tests/Lead.Tests/SpaceOS.Modules.CRM.Tests.csproj --no-restore --nologo
Passed: 121, Failed: 0

dotnet test src/hr/tests/SpaceOS.Modules.HR.Tests.csproj --no-restore --nologo
Passed: 211, Failed: 0

dotnet test src/qa/tests/SpaceOS.Modules.QA.Tests.csproj --no-restore --nologo
Passed: 242, Failed: 0

dotnet test src/spaceos-modules/spaceos-modules-kontrolling/tests/SpaceOS.Modules.Kontrolling.Tests.csproj --no-restore --nologo
Passed: 190, Failed: 0

dotnet test src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj --no-restore --nologo --filter FullyQualifiedName~Api
Passed: 42, Failed: 0
```

Összes célzott teszt: **806 zöld**. EHS build-warningok pre-existing:
AutoMapper 13.0.2 helyett 14.0.0 feloldás (`NU1603`) és az ehhez tartozó
`NU1903` magas súlyosságú advisory.
