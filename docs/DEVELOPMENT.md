# JoineryTech fejlesztői útmutató

Ez az útmutató biztonságos, helyi fejlesztői belépést ad. A konkrét konfigurációs értékeket, hozzáféréseket és élesítési lépéseket ne innen találd ki: azokat a megfelelő, jogosultságkezelt runbook vagy a komponens konfigurációja kezeli.

## Előfeltételek

- Git submodule támogatással
- .NET 8 SDK a .NET modulokhoz
- Node.js a Portal és a Knowledge Service számára. A Portal CI-je Node 24-et használ; a manifest nem rögzít futtatókörnyezet-verziót, ezért a csapat által elfogadott Node-verziót használd.
- Docker, ha az adott integrációs teszt Testcontainers-t vagy helyi függőséget igényel
- PostgreSQL, ha egy modul helyi hostját valódi adatbázissal indítod

## Teljes checkout

```powershell
git submodule update --init --recursive
```

Ezt új klón után és submodule-hivatkozás változásakor futtasd. A gyökérben nincs közös solution vagy JavaScript manifest; mindig az érintett komponens könyvtárából indulj.

## Portál

```powershell
Set-Location src/joinerytech-portal
npm ci
npm run dev
```

Hasznos ellenőrzések:

```powershell
npm run build
npm run lint
npm run test:pr
npm run test
npm run test:smoke:keyboard
```

A Portal npm workspace; a részletes package-térkép, adat-módok és auth-beállítások a [saját README-jében](../src/joinerytech-portal/README.md) vannak. A `VITE_AUTH_MODE=mock` kizárólag fejlesztői segédmód, nem hitelesítési bizonyíték.

## .NET modulhostok

Minden modul külön processz, saját `appsettings*.json` fájlokkal és tesztekkel. Az alábbi parancsok egy-egy host helyi indításának példái:

| Modul | Indítás |
|---|---|
| CRM | `dotnet run --project src/SpaceOS.Modules.CRM/src/Lead.Api/SpaceOS.Modules.CRM.Api.csproj` |
| Kontrolling | `dotnet run --project src/spaceos-modules/spaceos-modules-kontrolling/host/SpaceOS.Modules.Kontrolling.Host.csproj` |
| HR | `dotnet run --project src/hr/src/Api/SpaceOS.Modules.HR.Api.csproj` |
| Maintenance | `dotnet run --project src/maintenance/host/SpaceOS.Modules.Maintenance.Host.csproj` |
| QA | `dotnet run --project src/qa/host/SpaceOS.Modules.QA.Host.csproj` |
| EHS | `dotnet run --project src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj` |
| DMS | `dotnet run --project src/dms/host/SpaceOS.Modules.DMS.Api.csproj` |

Az API hostok fejlesztési környezetben Swagger-t és health endpointot adnak, de a tényleges URL-t és auth-konfigurációt az adott host saját beállítása határozza meg.

## Tesztelés

Ne futtass vakon egy nem létező gyökérszintű "teljes tesztet". Válassz a módosított komponenshez tartozó projektet.

```powershell
# Példák
dotnet test src/SpaceOS.Modules.CRM/tests/Lead.Tests/SpaceOS.Modules.CRM.Tests.csproj
dotnet test src/dms/tests/SpaceOS.Modules.DMS.Tests.csproj
dotnet test src/hr/tests/SpaceOS.Modules.HR.Tests.csproj
dotnet test src/maintenance/tests/SpaceOS.Modules.Maintenance.Tests.csproj
dotnet test src/qa/tests/SpaceOS.Modules.QA.Tests.csproj
dotnet test src/spaceos-modules/spaceos-modules-kontrolling/tests/SpaceOS.Modules.Kontrolling.Tests.csproj
```

Testcontainers-függő .NET körökhöz a biztonságos wrapper használható:

```powershell
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project <tesztprojekt>
```

Ez nem helyettesíti a taskban előírt célzott vagy integrációs ellenőrzést. A build-ratchet külön futtatható:

```powershell
node scripts/dotnet-build-gate.mjs
node scripts/dotnet-build-gate.mjs --ci
```

A `--ci` ma nem teljes platformteszt, hanem a kijelölt build/projektkészlet ellenőrzése. Az eredményt ennek megfelelően dokumentáld.

## Konfiguráció és titkok

- A checked-in `appsettings.json`, `appsettings.Development.json` és `config/*.sample.json` csak szerkezeti kiindulópontok.
- Titkot, access tokent, valódi connection stringet vagy privát kulcsot ne másolj dokumentációba, issue-ba vagy mintafájlba.
- Új környezeti változóhoz dokumentáld a **nevét, célját, kötelezőségét és biztonsági osztályát**, de ne az értékét.
- Auth, tenant vagy RLS konfigurációhoz előbb olvasd el a [hosting README-t](../src/spaceos-modules-hosting/README.md) és a megfelelő [ADR-t](knowledge/adr/README.md).

## Módosítási folyamat

1. Ellenőrizd a munkafát, a submodule állapotát és az [`EPICS.yaml`](../EPICS.yaml) függőségeit.
2. Olvasd el az érintett modul README-jét, a taskot és a szükséges ADR/kontraktus dokumentumot.
3. A legszűkebb releváns teszttel igazold a változást; utána futtasd a taskban előírt szélesebb kaput.
4. A dokumentációban csak olyan állítást tegyél aktuálisnak, amelyet a kód, a konfiguráció vagy friss ellenőrzés alátámaszt.
5. A task mementójába írd be a futtatott parancsot, eredményt és ismert korlátot.

Részletes munkafegyelem: [`QUALITY.md`](../QUALITY.md), [task-protokoll](tasks/README.md) és [szkriptek README](../scripts/README.md).
