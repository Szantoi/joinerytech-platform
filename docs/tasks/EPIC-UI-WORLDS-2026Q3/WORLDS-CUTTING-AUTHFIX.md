# WORLDS-CUTTING-AUTHFIX — analytics tenant és pricing policy javítása

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** pending
- **Függőség:** `WORLDS-API-AUDIT = done`; ADR-061/062 minták olvasása
- **Mutációs határ:** `src/spaceos-modules-cutting/` és ez a task-fájl
- **Tiltott scope:** analytics DTO redesign, production portal, deploy

## Cél

A cutting portál-végpontokon a tenant kizárólag hitelesített claimből származzon,
és a pricing-rules endpointok ne hivatkozzanak nem regisztrált policyra.

## Ismert gap

- `/analytics/oee` kötelező `tenantId` query-paramot vár; a portál nem küldi,
  idegen tenant pedig elvileg megadható.
- `PricingRuleEndpoints` policy-kontraktusa nincs teljesen bekötve.
- A modul saját auth/tenant mintát használ; a hosting-csomag átvétele csak akkor
  megengedett, ha a submodule függőségi iránya tiszta.

## Megvalósítás

1. Készíts endpoint tesztet: token tenant A + query tenant B nem adhat B-adatot.
2. A portál analytics queryk tenantját a request-scoped, hitelesített tenant
   accessor adja. Publikus query tenant-param szűnjön meg vagy legyen explicit
   kompatibilitási input, amely nem írhatja felül a claimet.
3. A MediatR query továbbra is explicit tenant ID-t kapjon az application
   boundaryn; ne olvasson HTTP contextet a handler.
4. Regisztráld és teszteld a pricing policy/role mappinget. Token nélkül 401,
   jogosultság nélkül 403, megfelelő role-lal 200.
5. Ne logolj JWT-t vagy tenantlistát; csak correlation ID és eredménykód.
6. Dokumentáld a wire-breaking vagy kompatibilitási döntést.

## Érintett források

- `src/SpaceOS.Modules.Cutting.Api/Endpoints/AnalyticsEndpoints.cs`
- `src/SpaceOS.Modules.Cutting.Api/Endpoints/PricingRuleEndpoints.cs`
- auth/tenant DI és endpoint test host
- `src/SpaceOS.Modules.Cutting.Analytics.Application/Queries/GetMachineOEEQuery.cs`

## Tesztterv

```powershell
dotnet test src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj --filter "FullyQualifiedName~Analytics|FullyQualifiedName~Pricing|FullyQualifiedName~Auth"
dotnet test src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj
dotnet build src/spaceos-modules-cutting/SpaceOS.Modules.Cutting.sln
```

## Elfogadási kritériumok

- [ ] Analytics tenant hitelesített claimből származik.
- [ ] Idegen query/header tenant nem írja felül a claimet.
- [ ] 401/403/200 pricing policy mátrix tesztelt.
- [ ] Handler HTTP-független marad.
- [ ] Teljes cutting suite és build zöld.

## Stop / eszkaláció

Ha a modul hosting-csomag függősége submodule-ciklust hozna létre, ne másold be a
kódot. Készíts dependency-javaslatot és használd a meglévő accessor legkisebb
biztonságos javítását.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

