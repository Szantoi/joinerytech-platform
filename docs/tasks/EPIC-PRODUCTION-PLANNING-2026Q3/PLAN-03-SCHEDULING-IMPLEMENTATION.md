# PLAN-03 — `spaceos.scheduling` modul implementáció (M1-M5)

- **Szerep:** backend (backend terminál sávja)
- **Prioritás:** P0 (a Doorstar a kontraktus-publikációra vár)
- **Státusz:** pending
- **Függőség:** `PLAN-02 = done` (ADR-069 ACCEPTED — minden döntés ott)
- **Kimenet:** futó `spaceos.scheduling` modul-host, publikált OpenAPI 3.1,
  RLS-proof gate-artefakt, sandbox-kiajánlás

## Normatív alapok (kötelező olvasmány, EBBEN A SORRENDBEN)

1. `docs/knowledge/adr/ADR-069-planning-domain-and-product-package.md` — MINDEN
   architektúra-döntés itt van (aggregátumok, FSM, API, biztonság, nevek).
2. `docs/knowledge/architecture/PLANNING_CAPABILITY_AUDIT_2026-07-27.md` —
   fájl:sor bizonyítékok + a követendő minták (hosting §5.1, RlsFixtures §5.2).
3. `docs/knowledge/patterns/DATABASE_PATTERNS.md` + ADR_CATALOGUE.md + Nexus RAG.
4. Doorstar input-pack v1 (13 vektor) — a kompatibilitási CI-kapu fixture-e.

## Kemény szabályok

- ModuleId: `spaceos.scheduling`; repo: **`Szantoi/spaceos-modules-scheduling`
  (LÉTREHOZVA 2026-07-28, public, üres)** — ide dolgozol; a platform-repo fájába
  NEM kerül a modul-kód (nem source-submodule, ADR-067/ERPSEP-04 minta); séma:
  `scheduling`; API-bázis: `/api/scheduling/v1`.
- A magban EGYETLEN faipari szó sem lehet (ADR-067 regex-őr) — a faipari
  taxonómia a `joinerytech.scheduling-standards` rétegé (KÉSŐBBI task).
- Kernel-kapcsolat KIZÁRÓLAG `ProjectRef` opak referencián át; Kernel-kód tilos.
- Hosting-minta kötelező (AddSpaceOsModuleAuth/Tenancy + GUC-interceptor +
  RlsMigrationSql FORCE RLS + EF query filter); Maintenance-host a másolandó váz.
- Worker: NOBYPASSRLS; keresztbérlős részművelet csak szűk SECURITY DEFINER-ben.
- Éles/VPS művelet és sandbox-kiajánlás: Gábor-kapu.

## Mérföldkövek (ADR-069 §11) — mindegyik végén review_requested

- **M1 — kalkulációs mag + kompatibilitási kapu:** elapsed/labour/days képletek
  + FS/SS/FF/SF+lag+partial-release+fixed-override bound-feloldás (precedencia
  az ADR §4 szerint); a 13 Doorstar-vektor hash-pinnelt C# CI-teszt zölden.
  TIPP: tiszta, IO-mentes számítási könyvtárként kezdd (Domain + unit-tesztek),
  host nélkül — ez gyorsan bizonyítható.
- **M2 — domain + perzisztencia + RLS-proof:** aggregátumok (ScheduleRun/
  ScheduleRevision, OperationPlan, DependencyEdge, Resource/ResourceCalendar/
  CalendarException, CapacityReservation, OperationStandard/StandardRevision,
  SchedulingAuditLog + outbox), migrációk, NonSuperuserRlsFixture proof-suite
  (4 fact minden táblára), host-váz + /health.
- **M3 — read-only OpenAPI + generált-kliens kapu:** ADR §6 read-endpointok,
  OpenAPI 3.1 spec-generálás, CI-ben TS-kliens generálás (generálási hiba =
  build-bukás), ProblemDetails + correlationId. Sandbox-kiajánlás terve
  (scheduling-sandbox.joinerytech.hu — élesítés Gábor-kapu).
  **Ez a Doorstar-kapu: itt nyílik a fogyasztás.**
- **M4 — naptár-tudatos scheduler + overload:** finite-capacity allokáció,
  slot-generálás, shadow-számítás + diff read-model, overload-endpoint.
- **M5 — 2. fázis írási irány:** standard-import (idempotency-key +
  karantén-workflow), naptár-revízió + jóváhagyás FSM, CapacityReservation
  írás, publish külső jóváhagyással.

## Done-kritérium (taskonként a review dönt)

M1-M3 után: publikálható kontraktus-csomag (OpenAPI + manifest-vázlat +
RLS-proof kimenet + verzió/hash) — a Doorstar-átadás root-review után indul.
M4-M5 külön review-körök. A teljes task done-ját root-review mondja ki.
