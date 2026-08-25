# JoineryTech technikai tudásindex

Ez az index a technikai dokumentáció belépési pontja. A célja navigáció, nem állapotnapló: ami ma fut, az a forráskódból, konfigurációból és friss ellenőrzésből derül ki; ami ma prioritás, az az [`EPICS.yaml`](../../EPICS.yaml)-ban szerepel.

## Források elsőbbsége

| Kérdés | Elsődleges forrás |
|---|---|
| Aktuális program- vagy task-státusz | [`EPICS.yaml`](../../EPICS.yaml) |
| Futásidejű viselkedés és függőségverzió | Az érintett komponens forrása, manifestje és friss tesztje |
| Architekturális döntés | [ADR-index](adr/README.md) |
| Közös vagy külső API-szerződés | [Kontraktus-index](contracts/README.md) |
| Auth, tenant, RLS működése | [Hosting README](../../src/spaceos-modules-hosting/README.md) és ADR-061/062 |
| Futtatási vagy provisioning eljárás | [Üzemeltetési index](deployment/README.md) |

## Kezdd itt

- [Projekt- és repository-térkép](../ARCHITECTURE.md)
- [Fejlesztői útmutató](../DEVELOPMENT.md)
- [Architekturális dokumentumtérkép](architecture/README.md)
- [ADR-index](adr/README.md)
- [Task-protokoll](../tasks/README.md)

## Architektúra és rendszerszintű döntések

| Téma | Kiindulópont |
|---|---|
| Modulok, trust-határok és komponensek | [ECOSYSTEM_MODULE_ARCHITECTURE.md](architecture/ECOSYSTEM_MODULE_ARCHITECTURE.md) |
| Moduláris termék- és instance-architektúra | [SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md](architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md) |
| Auth + tenant-azonosság | [ADR-061](adr/ADR-061-host-auth-es-tenant-identitas.md) |
| Tenant-izoláció és RLS | [ADR-062](adr/ADR-062-rls-tenant-izolacio.md) |
| Aktuális helyi authority/provisioning szerződés | [KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md](architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md) |
| Modul-katalógus és lifecycle | [ADR-067](adr/ADR-067-module-catalog-and-lifecycle.md) |
| Projects és B2B ownership | [ADR-068](adr/ADR-068-project-core-and-b2b-collaboration-ownership.md), [ADR-072](adr/ADR-072-projects-module-ownership.md) |
| Planning/scheduling | [ADR-069](adr/ADR-069-planning-domain-and-product-package.md), [ADR-070](adr/ADR-070-scheduling-core-external-dependencies.md) |

Az `architecture/` mappa további térképe: [architecture/README.md](architecture/README.md).

## Domain

| Modul | Domainmodell |
|---|---|
| CRM | [CRM_DOMAIN_MODEL.md](domain/CRM_DOMAIN_MODEL.md) |
| HR | [HR_DOMAIN_MODEL.md](domain/HR_DOMAIN_MODEL.md) |
| QA | [QA_DOMAIN_MODEL.md](domain/QA_DOMAIN_MODEL.md) |
| Maintenance | [MAINTENANCE_DOMAIN_MODEL.md](domain/MAINTENANCE_DOMAIN_MODEL.md) |
| DMS | [DMS_DOMAIN_MODEL.md](domain/DMS_DOMAIN_MODEL.md) |
| ERP core | [ERP_CORE_DOMAIN_CONTRACT.md](domain/ERP_CORE_DOMAIN_CONTRACT.md) |
| B2B collaboration | [B2B_COLLABORATION_DOMAIN_CONTRACT.md](domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md) |

A `domain/code/` mappa példákat és implementációs segédanyagokat tartalmaz; a futó modellhez mindig az adott modul forrása az elsődleges.

## Minták és fejlesztési szabványok

### Backend és adat

- [DATABASE_PATTERNS.md](patterns/DATABASE_PATTERNS.md)
- [CONTRACT_FIRST_DEVELOPMENT.md](patterns/CONTRACT_FIRST_DEVELOPMENT.md)
- [SECURITY_PATTERNS.md](patterns/SECURITY_PATTERNS.md)
- [TESTING_STRATEGIES.md](patterns/TESTING_STRATEGIES.md)
- [BACKEND_PATTERNS.md](engineering/BACKEND_PATTERNS.md)

### Frontend

- [DESIGN_SYSTEM_SPEC_V1.md](patterns/DESIGN_SYSTEM_SPEC_V1.md)
- [FRONTEND_VERIFICATION_WORKFLOW.md](patterns/FRONTEND_VERIFICATION_WORKFLOW.md)
- [REACT_18_TYPESCRIPT_MODERNIZATION.md](patterns/REACT_18_TYPESCRIPT_MODERNIZATION.md) — történeti minta; az aktuális Portal manifest az irányadó verziókhoz
- [UX_DESIGN_PRINCIPLES.md](patterns/UX_DESIGN_PRINCIPLES.md)

### Mérnöki segédanyag

- [Backend .NET](engineering/backend_dotnet.knowledge.md)
- [Frontend React](engineering/frontend_react.knowledge.md)
- [Backend tesztelés](engineering/testing_backend_dotnet.knowledge.md)
- [Frontend tesztelés](engineering/testing_frontend_react.knowledge.md)
- [Cutting fejlesztési/test runbook](engineering/CUTTING_DEVELOPMENT_TEST_RUNBOOK.md)

## Kontraktusok, deployment és adatvédelem

- [Kontraktus-index](contracts/README.md)
- [Üzemeltetési index](deployment/README.md)
- [Doorstar-lánc integrációs terv](architecture/DOORSTAR_CHAIN_INTEGRATION_PLAN_2026-08-10.md) — dátumozott integrációs terv, nem automatikus aktiválási engedély
- [Doorstar multi-tenant release progress](architecture/DOORSTAR_MULTITENANT_RELEASE_PROGRESS_2026-08-12.md) — dátumozott evidence; a release állapotát mindig a megfelelő ownerrel és az élő tervvel ellenőrizd

## Kontextusok és történeti anyag

A `context/` mappa agent- és domainkontextusok gyűjteménye. Több fájl pillanatfelvétel, ezért a dátumát és hatályát olvasd a tartalom előtt. A termékvízióhoz [VISION.md](context/VISION.md) ad hátteret, de a benne szereplő mérőszámokat és roadmapet ne kezeld élő státuszként.

A `docs/joinerytech/` prototípus- és designkorpuszhoz a [legacy index](../joinerytech/README.md) ad eligazítást.
