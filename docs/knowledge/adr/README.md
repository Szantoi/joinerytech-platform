# JoineryTech ADR-index

Az Architecture Decision Record (ADR) a döntés indokát, hatályát és következményét őrzi. Ez az index az ADR-059-től induló döntések kanonikus navigációja; az ADR-001–058 történeti katalógusa az [`architecture/ADR_CATALOGUE.md`](../architecture/ADR_CATALOGUE.md).

Az aktuális megvalósítási sorrend vagy epic-státusz **nem** ebből az indexből olvasandó. Azt az [`EPICS.yaml`](../../../EPICS.yaml) és az érintett taskok tartalmazzák.

## Platform-, tenant- és wire-határok

| ADR | Tárgy |
|---|---|
| [059](ADR-059-wire-nyelv.md) | Wire-nyelv és kanonikus enum-szókincs |
| [060](ADR-060-hr-enum-taxonomia.md) | HR enum-taxonómia |
| [061](ADR-061-host-auth-es-tenant-identitas.md) | Modulhost auth és tenant-identitás |
| [062](ADR-062-rls-tenant-izolacio.md) | Tenant-izoláció és RLS minta |
| [063](ADR-063-qa-rework-conditional.md) | QA rework / Conditional ág |
| [064](ADR-064-kontraktus-reszletek.md) | Keresztmodul kontraktusrészletek |

## Modularitás, termékcsomagok és tulajdonjog

| ADR | Tárgy |
|---|---|
| [065](ADR-065-kernel-scope-absztrakcio.md) | Kernel core-elemek domain-mentessége |
| [066](ADR-066-erp-module-contract-boundaries.md) | ERP-modulok közti kontraktus- és referenciahatárok |
| [067](ADR-067-module-catalog-and-lifecycle.md) | Kanonikus ModuleId, modul-katalógus és lifecycle |
| [068](ADR-068-project-core-and-b2b-collaboration-ownership.md) | Projekt-orchestration és B2B kézfogás ownership |
| [069](ADR-069-planning-domain-and-product-package.md) | Planning domain és termékcsomag |
| [070](ADR-070-scheduling-core-external-dependencies.md) | Scheduling külső függőségei |
| [071](ADR-071-model-reading-versus-deterministic-decision.md) | Modellolvasás és determinisztikus döntés határa |
| [072](ADR-072-projects-module-ownership.md) | Önálló `spaceos.projects` modul tulajdonjoga |

## Hogyan használd az ADR-t?

1. Keresd meg a témához tartozó rekordot és olvasd el teljesen.
2. Ellenőrizd a döntés mezőjét, a kapcsolódó rekordokat és a fájlban jelölt hatályt.
3. Keresd meg az implementációs epicet az `EPICS.yaml`-ban.
4. Ha a kód vagy egy szerződés eltérést mutat, ne írd át önkényesen: rögzítsd a kompatibilitási vagy migrációs döntést.

Az ADR rögzíti a **miértet** és a tartós határt; a task a **mit és mikor** kérdést, a teszt pedig a ténylegesen teljesült viselkedést bizonyítja.
