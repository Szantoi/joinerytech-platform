# Architekturális dokumentumtérkép

Az `architecture/` mappa döntési háttéranyagot, rendszerterveket és dátumozott assessmenteket tartalmaz. A fájlnévben szereplő dátum hatályt jelöl: egy audit vagy checkpoint akkor igaz, amikor készült, és nem helyettesíti az [`EPICS.yaml`](../../../EPICS.yaml) élő státuszát.

## Stabil szerkezeti kiindulópontok

- [ECOSYSTEM_MODULE_ARCHITECTURE.md](ECOSYSTEM_MODULE_ARCHITECTURE.md) — a platform modul- és aktorhatárai.
- [SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md](SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md) — termékcsalád, bundle és instance irány.
- [MODULAR_EXTERNAL_INTEGRATION_AND_AI_KNOWLEDGE_DIRECTION_2026-08-21.md](MODULAR_EXTERNAL_INTEGRATION_AND_AI_KNOWLEDGE_DIRECTION_2026-08-21.md) — ügyfelenkénti modulkompozíció, külső konektorok, MCP, RAG és GraphRAG tervezési iránya.
- [ARCHITECTURAL_PATTERNS_CATALOGUE.md](ARCHITECTURAL_PATTERNS_CATALOGUE.md) — minták összefoglalója.
- [ADR_CATALOGUE.md](ADR_CATALOGUE.md) — ADR-001–058 történeti katalógusa; az újabb döntésekhez a [külön ADR-index](../adr/README.md) a kanonikus belépés.

## Auth, tenant és biztonság

- [KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md](KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md) — lokális, fail-closed authority/provisioning szerződés; nem aktiválási bizonyíték.
- [LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md](LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md) — dátumozott audit; a jelenlegi kód és a hosting szerződés mellett olvasd.
- [CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md](CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md) — Cutting-specifikus trust-határ.
- [CUTTING_SECURITY_AUDIT_2026-07-21.md](CUTTING_SECURITY_AUDIT_2026-07-21.md) — dátumozott security evidence.
- [MULTI_TENANT_RLS_ARCHITECTURE_2026.md](MULTI_TENANT_RLS_ARCHITECTURE_2026.md) — történeti minta; RLS-implementáció előtt egyeztesd ADR-062-vel és a közös hosting kóddal.

## Modulok, termékcsomagok és integráció

- [MODULE_PACKAGES_PLAN_2026-07-27.md](MODULE_PACKAGES_PLAN_2026-07-27.md) — modulcsomagolási terv.
- [ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md](ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md) — horizontális és termékspecifikus képességhatár.
- [PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md](PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md) — projekt- és collaboration-határ elemzése.
- [SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md](SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md) — B2B életciklus és résztvevői RLS.
- [DOORSTAR_CHAIN_INTEGRATION_PLAN_2026-08-10.md](DOORSTAR_CHAIN_INTEGRATION_PLAN_2026-08-10.md) — Doorstar-lánc integrációs terv.
- [DOORSTAR_MULTITENANT_STAGING_AUDIT_2026-08-12.md](DOORSTAR_MULTITENANT_STAGING_AUDIT_2026-08-12.md) — staging-audit, nem production go/no-go.

## Portál és worldök

- [PORTAL_WORLDS_INVENTORY_2026-07-16.md](PORTAL_WORLDS_INVENTORY_2026-07-16.md) — dátumozott world-leltár.
- [WORLDS_API_CONTRACTS_2026-07-18.md](WORLDS_API_CONTRACTS_2026-07-18.md) — API-first world-kontraktus audit.
- [UI_IMPLEMENTATION_PLAN_2026-07-14.md](UI_IMPLEMENTATION_PLAN_2026-07-14.md) — eredeti implementációs terv; azóta készült végrehajtási evidence-eket a task-archívum és az `EPICS.yaml` egészíti ki.
- [BUNDLE_REPORT_F1.md](BUNDLE_REPORT_F1.md) — mért bundle-report egy adott változathoz.

## Dátumozott állapotfelmérések

- [PROJECT_STATE_ASSESSMENT_2026-07-18.md](PROJECT_STATE_ASSESSMENT_2026-07-18.md)
- [PROJECT_STATE_CHECKPOINT_2026-07-23.md](PROJECT_STATE_CHECKPOINT_2026-07-23.md)
- [VPS_SERVICE_STATE_2026-07-16.md](VPS_SERVICE_STATE_2026-07-16.md)

Ezek történeti, ellenőrizhető állapotfelvételek. Új munka indításakor előbb az `EPICS.yaml`, majd az érintett komponens munkafája és a legfrissebb taskdokumentáció a helyes sorrend.

## Kapcsolódó indexek

- [Technikai tudásindex](../INDEX.md)
- [ADR-index](../adr/README.md)
- [Kontraktus-index](../contracts/README.md)
- [Fejlesztői útmutató](../../DEVELOPMENT.md)
