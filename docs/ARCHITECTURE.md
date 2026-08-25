# JoineryTech architektúra – áttekintés

Ez a dokumentum a rendszer stabil szerkezeti képét adja. Nem release-jelentés: az aktuális állapotot az [`EPICS.yaml`](../EPICS.yaml), a tényleges viselkedést pedig a forráskód és a friss ellenőrzések adják.

## Rendszerhatár

JoineryTech a SpaceOS ökoszisztéma platformrétege: általánosítható faipari SaaS-képességeket ad. Az ügyfélspecifikus megvalósítások, például Doorstar, külön instance- vagy integrációs határt képviselnek.

```text
Nexus / megosztott infrastruktúra
              │
              ▼
JoineryTech platform
  ├─ közös kernel, hosting és kontraktusok
  ├─ horizontális üzleti modulok
  ├─ iparági/termék modulok
  └─ Portal
              │
              ▼
Ügyfél-instance és B2B integrációk
```

## Fő építőelemek

| Elem | Felelősség | Hely |
|---|---|---|
| Portal | Böngészős felület, route-ok, UI-állapot, API- és mock-adat mód | [`src/joinerytech-portal/`](../src/joinerytech-portal/) |
| Platformmodulok | CRM, Kontrolling, HR, Maintenance, QA, EHS és DMS doménlogika | `src/` alatti modulgyökerek |
| Hosting | OIDC auth, tenant-feloldás, entitlement és RLS-integráció közös mintája | [`src/spaceos-modules-hosting/`](../src/spaceos-modules-hosting/) |
| Kernel | Keresztdomén absztrakciók és infrastruktúra referencia | [`src/spaceos-kernel/`](../src/spaceos-kernel/) |
| Contracts | Semleges, megosztott modul-szerződések | [`src/spaceos-modules-contracts/`](../src/spaceos-modules-contracts/) |
| Kijelölt képességmodulok | Cutting, inventory, procurement, scheduling, joinery és kapcsolódó képességek | `src/spaceos-modules-{cutting,inventory,procurement,scheduling,joinery}/` |
| Knowledge Service | Tudáskeresés és koordinációs szolgáltatás | [`src/joinerytech-nexus/knowledge-service/`](../src/joinerytech-nexus/knowledge-service/) |

## Modulok és termékhatárok

A platform horizontális moduljai üzleti funkciót adnak több faipari szereplőnek. Az iparági modulok ezzel szemben termék- vagy képességspecifikusak. A kernel nem vehet át ilyen domainismeretet csak azért, mert egy modulnak kényelmes lenne.

| Horizontális modul | Fő domain |
|---|---|
| CRM | Értékesítési pipeline és ajánlat/rendelés előkészítés |
| Kontrolling | Költség-, forecast- és eltéréselemzés |
| HR | Munkatárs, képzés, kompetencia és tanúsítvány |
| Maintenance | Eszközök és karbantartási munkák |
| QA | Vizsgálat, hiba, javítás és visszaellenőrzés |
| EHS | Kockázat, incidens és munkavédelmi nyilvántartás |
| DMS | Dokumentumtárolás, verzió és életciklus |

A részletes ownership-, package- és lifecycle-döntésekhez az [ADR-065–072](knowledge/adr/README.md#modularitás-termékcsomagok-és-tulajdonjog) és a [moduláris termékarchitektúra](knowledge/architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md) a kiindulópont.

## Bizalmi határok: auth, tenant, RLS

```text
Portal / API-kliens
       │  OIDC access token
       ▼
Modulhost
  ├─ token validáció
  ├─ tenant feloldása hitelesített claimből
  ├─ modul-entitlement ellenőrzése
  └─ alkalmazásréteg
       │
       ▼
PostgreSQL
  ├─ alkalmazásbeli szűrés
  └─ Row-Level Security mint végső adatbázis-határ
```

Fontos elvek:

- A tenantnak nem lehet pusztán kliens által küldött header az egyetlen forrása.
- A tenant- és jogosultsági ellenőrzés a modulhost belépési határán történik.
- Az alkalmazásrétegbeli szűrés nem helyettesíti az adatbázis RLS-védelmét.
- A hitelesítési vagy provisioning dokumentum nem jelent automatikus élesítési engedélyt.

Részletek: [hosting README](../src/spaceos-modules-hosting/README.md), [ADR-061](knowledge/adr/ADR-061-host-auth-es-tenant-identitas.md), [ADR-062](knowledge/adr/ADR-062-rls-tenant-izolacio.md), valamint a [2026-08-20-i authority-projection szerződés](knowledge/architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md).

## Integrációs felületek

| Felület | Szabály |
|---|---|
| HTTP/OpenAPI | A wire-szerződés explicit; a portál ne kitalált DTO-kra épüljön. |
| Megosztott .NET kontraktus | Csak semleges, tudatosan verziózott típus kerülhet ide. |
| Modul-katalógus | A modulazonosító és lifecycle az ADR-ben rögzített szerződés része. |
| Verziózott release-artefaktum | Immutábilis; checksum vagy release-pin átírása külön release-feladat. |
| B2B/instance kapcsolat | Külön trust- és ownership-határ, nem közvetlen cross-tenant olvasás. |

A pontos fájlokhoz lásd a [kontraktus-indexet](knowledge/contracts/README.md).

## Repository-topológia

A gyökér repository több, önálló életciklusú komponenst fog össze. A `.gitmodules` szerinti submodule-okat a munka megkezdése előtt inicializálni kell; egyik komponens gyökérből futó buildje vagy tesztje sem jelenti automatikusan a teljes platform ellenőrzését.

```text
joinerytech-platform/
├─ src/
│  ├─ joinerytech-portal/          # submodule, React workspace
│  ├─ spaceos-kernel/              # submodule, .NET kernel
│  ├─ spaceos-modules-contracts/   # submodule, shared contracts
│  ├─ spaceos-modules-hosting/     # common hosting package
│  ├─ SpaceOS.Modules.CRM/          # direct platform module
│  ├─ hr/, qa/, ehs/, dms/, maintenance/
│  └─ spaceos-modules-*/           # capability modulok és közös csomagok
├─ docs/                           # documentation and evidence
├─ scripts/                        # safe, documented automation
└─ EPICS.yaml                      # live programme state
```

## További olvasnivaló

- [Architekturális dokumentumtérkép](knowledge/architecture/README.md)
- [Technikai tudásindex](knowledge/INDEX.md)
- [Döntési rekordok](knowledge/adr/README.md)
- [Fejlesztői útmutató](DEVELOPMENT.md)
