# ERPSEP-02 — kanonikus ModuleId és aláírt modul-katalógus ADR

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** architect/security
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** ERPSEP-01
- **Mutációs határ:** új ADR, manifest/schema prototípus és ez a task
- **Tiltott scope:** Kernel/DB/portal implementáció, registry-publikálás

## Cél és üzleti eredmény

Egyetlen kanonikus modulazonosító-, verzió- és állapotmodell készül, amely
megszünteti a Kernel, portal és instance kézi modul-listáinak eltérését anélkül,
hogy gyengítené a defense-in-depth védelmet.

## Kötelező döntések

1. ModuleId namespace: `spaceos.*`, `joinerytech.*`, `<instance>.*`.
2. Legacy alias és migrációs szabály.
3. `known → installed → entitled → enabled → usable` állapotok tulajdonosa.
4. Manifest schema, dependency constraint és platform compatibility.
5. Katalógus- és bundle-aláírás, trust root, visszavonás.
6. Kernel allowlist és PostgreSQL trigger generálása ugyanabból a forrásból.
7. Ismeretlen, inkompatibilis vagy sérült modul fail-closed viselkedése.

## Kötelező források

- ERPSEP-01 kimenete
- `src/spaceos-kernel/SpaceOS.Kernel.Domain/Services/ModuleRegistryService.cs`
- enabled-module migrációk/triggerek és `Tenant.EnabledModules`
- portal `mocks/worlds.ts`, `AuthContext.tsx`, route-regisztráció
- célarchitektúra 6–7. fejezete

## Kötelező kimenet

- `docs/knowledge/adr/ADR-065-module-catalog-and-lifecycle.md`
- `docs/knowledge/contracts/spaceos-module-v1.schema.json` tervezet
- legacy ID → kanonikus ID migrációs tábla
- threat model: supply chain, downgrade, tamper, unknown module, stale entitlement

## Elfogadási kritériumok

- [ ] Egy ID ugyanazt jelenti DB-ben, JWT/contextben, API-ban és frontendben.
- [ ] A katalógus nem korlátlan, DB-ből felvett pluginlista.
- [ ] A jelenlegi Kernel + DB defense-in-depth szándéka megmarad.
- [ ] A manifest géppel validálható és verziózott.
- [ ] Rollback/downgrade és signing-key rotation viselkedése eldöntött.
- [ ] Security reviewer elfogadta vagy tételes blokkolólistát adott.

## Stop / eszkaláció

Trust root, licence/entitlement tulajdonos vagy package registry döntés hiányában
az ADR marad `Proposed`; implementáció nem indulhat.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_ADR-verzió, schema validation és reviewer verdict._

