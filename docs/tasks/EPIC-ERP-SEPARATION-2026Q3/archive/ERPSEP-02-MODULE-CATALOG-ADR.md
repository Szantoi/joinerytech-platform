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

- `docs/knowledge/adr/ADR-067-module-catalog-and-lifecycle.md` (ADR-065 és ADR-066
  már foglalt: ADR-065 a Kernel FlowEpicScope-absztrakció, ADR-066 az ERPSEP-03
  cross-module contract ADR-ja)
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

**Végrehajtva:** 2026-07-21, agent (root terminál megbízásából).

**Számozás-korrekció:** a task eredeti kimenete `ADR-065` lett volna, de az már foglalt
(Kernel FlowEpicScope-absztrakció). `docs/knowledge/adr/` tényleges tartalmát a munka
megkezdése előtt kilistáztam (`ADR-059`…`ADR-065` foglalt, `ADR-066` az ERPSEP-03
testvér-taskhoz van fenntartva, párhuzamosan fut egy másik agenten) — a kimenet ezért
`ADR-067-module-catalog-and-lifecycle.md` lett, a briefingben kapott instrukció szerint.

**Elolvasott kötelező források (mind a task, mind a célarchitektúra szerint):**
- ERPSEP-01 kimenete (`ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`, teljes, különösen
  3., 6., 7., 10. pont)
- `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md` 5–7. és 11. fejezete
- `ECOSYSTEM_MODULE_ARCHITECTURE.md` (aktor-taxonómia, ADR-018/019 kontextus)
- Kernel forrás: `ModuleRegistryService.cs`, `IModuleRegistryService.cs`, `ModuleType.cs`,
  `Tenant.cs` (`EnabledModules`, `UpdateEnabledModules`, `SetEnabledModules`),
  `Migration_0025_TenantEnabledModules.cs`, `Migration_0029_EcosystemActorTypes.cs`
  (a `validate_enabled_modules_for_type()` DB-trigger teljes SQL-je, SEC-02)
- Portál: `AuthContext.tsx` (JWT-claim parse + a 86. soros hardcode-olt mock-lista),
  `RequireAuth.tsx` (megerősítve: kizárólag `isAuthenticated`-et ellenőriz, semmilyen
  modul-gate nincs), `mocks/worlds.ts` (mind a 27 világ-kulcs, `WORLD_ORDER`), `App.tsx`
  (route-regisztráció — megerősítve: minden világ route feltétel nélkül regisztrált)
- ERPSEP-05, MODULE-PACKAGES task-fájlok (kontextushoz, nem mutálva)

**Kulcs-megállapítások, amik a döntéseket alátámasztották (kódból, nem dokumentumból):**
- A Kernel `ModuleRegistryService` és a DB-trigger ma **ökoszisztéma-aktor-szintű**
  listát véd (door/cabinet/window/cutting/spatial/trading/delivery/installation/orders),
  a portál `enabled_modules` pedig **ERP-szintű** listát (crm/kontrolling/hr/…) — a két
  világ kódszinten tényleg diszjunkt, ahogy az ERPSEP-01 állította.
- A portál `RequireAuth.tsx` **nem** implementál semmilyen modul-alapú route-gate-et —
  az 5-állapotú modell (`known→installed→entitled→enabled→usable`) ma ténylegesen egy
  állapotra (route létezik-e a fájlrendszerben) zsugorodik a UI-oldalon.
- Nincs a repóban semmilyen aláírás-infrastruktúra (cosign/sigstore/SBOM-eszköz) és
  nincs privát package registry — ez zöldmezős döntés, nem meglévő minta módosítása,
  ami megerősítette, hogy a trust root / registry kérdés valóban `decision_required`.
- A `Tenants.EnabledModules` egyetlen tömb ma összemossa az `entitled` és `enabled`
  állapotot — nincs "licencelt, de kikapcsolt" köztes állapot a DB-sémában.

## Átadási bizonyíték

- **ADR:** [`docs/knowledge/adr/ADR-067-module-catalog-and-lifecycle.md`](../../knowledge/adr/ADR-067-module-catalog-and-lifecycle.md)
  — **Státusz: JAVASOLT (Proposed)**, nem elfogadva. A Stop-klauzula szerint marad
  Proposed, mert három kérdés nyitott: trust root modell (egykulcsos vs TUF-szerű
  root+intermediate), package/bundle registry választása, és a licenc/entitlement
  hosszú távú tulajdonosa (kereskedelmi rendszer vs Kernel-only mező). Mind a három
  Gábor üzleti/biztonsági döntése, nem architektúra-kérdés — az ADR „Nyitott kérdések
  Gábornak" szakasza tételesen felsorolja őket.
- **Schema draft:** [`docs/knowledge/contracts/spaceos-module-v1.schema.json`](../../knowledge/contracts/spaceos-module-v1.schema.json)
  (JSON Schema, draft 2020-12). **Validálva:**
  `python3 -c "import json; json.load(open('docs/knowledge/contracts/spaceos-module-v1.schema.json'))"`
  → érvényes JSON; `jsonschema.Draft202012Validator.check_schema(...)` → érvényes
  séma; egy mintaminta manifest (`spaceos.maintenance@1.0.0`, a célarchitektúra §7.2
  példájának megfelelő tartalommal, kiegészítve a `signature` blokkal) sikeresen
  validált a séma ellen (`Draft202012Validator(schema).validate(sample)` → nem dobott
  kivételt).
- **Legacy ID → kanonikus ID migrációs tábla:** az ADR „Legacy ID → kanonikus ID
  migrációs tábla" szakaszában, teljes lefedéssel mindkét mai világra (Kernel
  ökoszisztéma-allowlist 9 tagja + portál 7 ERP-kulcsa) plusz a `joinery`/`inventory`/
  `procurement`/`production` backend-könyvtárakra, az explicit „world ≠ module"
  szétválasztásra (production/warehouse portál-világ = több ModuleId kompozíciója),
  a 16 backend nélküli legacy portál-világra (nem kapnak ModuleId-t) és a 4 orphan
  modul-duplikátumra (nem kapnak ModuleId-t, retire-jelöltek maradnak).
- **Threat model:** az ADR „Threat model" szakaszában táblázatos formában — supply
  chain, downgrade, tamper, unknown module, stale entitlement — mindegyikhez konkrét
  mitigáció ezen ADR döntéseiből és tételesen megnevezett maradék kockázat.
- **Security reviewer verdikt:** **nincs még** — ez az agent-futás nem tartalmazott
  külön security reviewer kört (a task nem kérte a végrehajtás részeként, csak az
  Elfogadási kritériumok között szerepel „Security reviewer elfogadta vagy tételes
  blokkolólistát adott" — ez a Proposed→Accepted átmenet előfeltétele, amit Gábornak
  vagy egy általa megbízott reviewernek kell elvégeznie a nyitott kérdések eldöntése
  után).
- **Mutációs határ betartva:** kizárólag ez a task-fájl, az új ADR és az új schema-fájl
  változott/jött létre. Nem történt Kernel/DB/portál-implementáció, nem történt
  registry-publikálás, `.codex/`, `AGENTS.md` és `EPICS.yaml` érintetlen maradt, az
  ERPSEP-03 task-fájl és `ADR-066` nem lett módosítva.

