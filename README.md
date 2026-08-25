# JoineryTech Platform

JoineryTech a faipari vállalkozásokhoz készült, több-bérlős SaaS platform. A cél nem egyetlen ügyfél egyedi rendszere, hanem újrahasználható üzleti modulok, közös platformszolgáltatások és iparági termékcsomagok biztosítása.

Ez a repository egy **összeállító workspace**, nem egyetlen futtatható alkalmazás: közvetlenül karbantartott modulokat és külön Git-submodule-okban lévő komponenseket fog össze. Emiatt mindig azt a komponenst indítsd, teszteld és módosítsd, amelyen dolgozol.

## Merre induljak?

- Első olvasásként: [dokumentációs térkép](docs/README.md).
- Lokális fejlesztéshez: [fejlesztői útmutató](docs/DEVELOPMENT.md).
- A rendszer felépítéséhez: [architektúra áttekintés](docs/ARCHITECTURE.md).
- Az élő program- és epic-státuszhoz: [EPICS.yaml](EPICS.yaml).
- Architekturális döntéshez: [ADR-index](docs/knowledge/adr/README.md).
- Operatív taskhoz: [task-protokoll](docs/tasks/README.md).

## Mit tartalmaz a workspace?

| Terület | Hely | Szerep |
|---|---|---|
| Webes portál | [`src/joinerytech-portal/`](src/joinerytech-portal/) | React-alapú felület; külön submodule és npm workspace |
| Platformmodulok | `src/SpaceOS.Modules.CRM/`, `src/hr/`, `src/qa/`, `src/ehs/`, `src/dms/`, `src/maintenance/`, `src/spaceos-modules/spaceos-modules-kontrolling/` | A hét horizontális üzleti modul .NET 8 hostokkal |
| Közös hosting | [`src/spaceos-modules-hosting/`](src/spaceos-modules-hosting/) | Auth, tenant-feloldás, entitlement és RLS-alapminták |
| Kernel és közös kontraktusok | [`src/spaceos-kernel/`](src/spaceos-kernel/), [`src/spaceos-modules-contracts/`](src/spaceos-modules-contracts/) | Keresztdomén absztrakciók és megosztott szerződések |
| Kijelölt képességmodulok | `src/spaceos-modules-{cutting,inventory,procurement,scheduling,joinery}/` és `src/spaceos-nesting-algorithms/` | Például cutting, inventory, procurement, scheduling és joinery |
| Tudás- és koordinációs szolgáltatás | [`src/joinerytech-nexus/knowledge-service/`](src/joinerytech-nexus/knowledge-service/) | Node.js alapú Knowledge Service |
| Automatizálás és mintakonfiguráció | [`scripts/`](scripts/), [`config/`](config/), [`tools/`](tools/) | Biztonságos segédprogramok, minták és integrációs eszközök |

## A hét platformmodul

| Modul | Felelősség |
|---|---|
| CRM | Lead → opportunity → ajánlat → rendelés folyamat |
| Kontrolling | Költségkövetés, EAC és eltéréselemzés |
| HR | Képzés, kompetencia és tanúsítványok |
| Maintenance | Eszköznyilvántartás és munkautasítások |
| QA | Ellenőrzések, hibák és javító intézkedések |
| EHS | Incidensek, kockázatok és munkavédelem |
| DMS | Dokumentumok és verziókezelés |

## Architektúra röviden

```text
Felhasználó
    │
    ▼
JoineryTech Portal (React)
    │  OIDC access token + moduljogosultságok
    ▼
Modul-hostok (.NET 8)
    │  közös hosting: hitelesítés, tenant, entitlement
    ▼
Domain / application / infrastructure rétegek
    │
    ▼
PostgreSQL + Row-Level Security
```

A tenantot hitelesített OIDC-claimből kell feloldani; a kliens által küldött tenant-azonosító önmagában nem bizalmi forrás. A közös hosting-csomag és az adatbázis RLS-védelme ezért a modulhatár része. A részletes modell a [hosting README-ben](src/spaceos-modules-hosting/README.md) és az [architektúra dokumentációban](docs/ARCHITECTURE.md) található.

## Gyors indulás

### 1. Teljes checkout

```powershell
git submodule update --init --recursive
```

Új klónnál a `--recurse-submodules` kapcsoló használata ajánlott. Több `src/` alatti könyvtár önálló Git-repository; a gyökérben nincs közös `.sln` vagy `package.json`.

### 2. Válassz fejlesztési sávot

Az alábbi példák külön terminálban, a repository gyökeréből indulnak. Ne másold őket egyetlen egymás utáni PowerShell-sorozatként, mert a könyvtárváltás szándékosan az adott komponensben hagyja a terminált.

#### Portál

```powershell
Set-Location src/joinerytech-portal
npm ci
npm run dev
```

#### CRM modulhost

```powershell
dotnet run --project src/SpaceOS.Modules.CRM/src/Lead.Api/SpaceOS.Modules.CRM.Api.csproj
```

#### Knowledge Service

```powershell
Set-Location src/joinerytech-nexus/knowledge-service
npm ci
npm run dev
```

A teljes, biztonságos parancslista és a tesztelési útvonalak a [fejlesztői útmutatóban](docs/DEVELOPMENT.md) vannak.

## Források elsőbbsége

| Kérdés | Elsődleges forrás |
|---|---|
| Mi az aktuális feladat- és epic-státusz? | [`EPICS.yaml`](EPICS.yaml) |
| Mit csinál ma a rendszer? | Forráskód, manifestek, konfiguráció és friss tesztfuttatás |
| Miért ilyen az architektúra? | [ADR-index](docs/knowledge/adr/README.md) |
| Milyen külső szerződés kötelező? | [Kontraktus-index](docs/knowledge/contracts/README.md) |
| Hogyan futtassam vagy ellenőrizzem biztonságosan? | [Fejlesztési](docs/DEVELOPMENT.md) és [üzemeltetési](docs/knowledge/deployment/README.md) dokumentáció |

A dátumozott auditok, review-k és `archive/` alatti taskok fontos bizonyítékok, de **nem** automatikusan az aktuális rendszerállapot leírásai. Ezeket mindig az `EPICS.yaml`-lal és a kóddal együtt értelmezd.

## Hozzájárulási alapelvek

- A módosítás előtt olvasd el az [`AGENTS.md`](AGENTS.md) és a [`QUALITY.md`](QUALITY.md) szabályait.
- Ne formázd vagy rendezd át mások meglévő, nem kapcsolódó diffjeit.
- Egy komponens dokumentációját a saját README-je mellett tartsd karban.
- Titkot, tokent és éles környezeti értéket ne írj dokumentációba vagy mintakonfigurációba.
- A release- vagy deploy-döntéshez külön bizonyíték és jogosult jóváhagyás kell; a dokumentáció önmagában nem engedély.
