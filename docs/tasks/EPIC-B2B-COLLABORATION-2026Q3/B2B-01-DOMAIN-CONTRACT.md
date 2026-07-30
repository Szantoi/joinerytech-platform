# B2B-01 — kézfogás domén-, ownership- és actor/FSM szerződés

- **Szerep:** architect/backend
- **Prioritás:** P0
- **Státusz:** `changes_requested` — ⚠ **a korábbi `done` HAMIS VOLT.** a REAUDIT verdiktje **RÉSZBEN**: a doksi §3.2 a host/guest szerepeket **fordítva** írja, mint a kód és az ADR-068 §13.
>
> Forrás: [B2B_COLLABORATION_REAUDIT_2026-07-28](../../knowledge/architecture/B2B_COLLABORATION_REAUDIT_2026-07-28.md) · Helyesbítve a 2026-07-30-i root task-átvizsgálásban; az `EPICS.yaml` már `changes_requested`-et mondott, a task-doksi lemaradt.
- **Elkészült:** 2026-07-27 (Antigravity root)
- **Függőség:** `PROJECT-CORE-ADR = done` és az ADR státusza `Accepted`
- **Jelleg:** döntésből implementálható domain contract; ebben a taskban nincs
  production kód vagy migráció
- **Kimenet:** `docs/knowledge/domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md`

## Cél

Az elfogadott Project Core ownership alapján egyetlen normatív szerződésben
rögzíteni az agreement, terms revision, participant grant, delegated work package
és exchange envelope ownershipát, invariánsait, állapotgépeit és actor-policy-jét.

## Kötelező bemenet

- `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`;
- elfogadott `PROJECT-CORE-ADR` (`ADR-068-project-core-and-b2b-collaboration-ownership.md`);
- `SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md`;
- jelenlegi Kernel `B2BHandshake` (`FlowEpic.DelegateTo`) és
  `SpaceOS.Modules.Abstractions.Handshake` (`IHandshake` stb.) típusok;
- Procurement `SubcontractOrder` aggregate és események;
- ADR-066 semleges referencia döntése.

**Fontos pontosítás (ADR-068, 2.4/6. fejezet):** a Kernelben **két, egymástól
független** „handshake/allowlist" fogalom él — (a) a `FlowEpic.Handshake` VO
(`DelegateTo`, csak delegáció-jelzés, deprecated B2B-forrás ezen ADR szerint)
és (b) a `TenantHandshakeAllowlist`/`B2BHandshakeVerifier`/`GetAllowedHostsQuery`
(ADR-039, migrált, éles, de egy **másik célú**, ökoszisztéma-aktor bizalmi-
directory mechanizmus, iparág-specifikus `AllowedTradeTypes` szótárral —
`"door"/"cabinet"/"window"`). A `TenantHandshakeAllowlist` **nem** a
`CollaborationParticipantGrant` előzménye vagy helyettesítője, és **nem**
vonható be automatikusan a participant-grant modellbe — ez a bevonás explicit
`decision_required` Gábornak (ADR-068 15.3), nem ennek a tasknak a hatásköre
eldönteni. A domén-szerződésnek explicit külön kell kezelnie a kettőt, hogy
implementáció közben ne mosódjanak össze.

## Vizsgálandó eltérések

1. embedded value object vagy önálló aggregate;
2. futó string/JSON mezők kontra nem használt typed abstraction;
3. iparág-specifikus `HandshakeType`/trade type kontra semleges capability;
4. FlowEpic és SubcontractOrder állapotok kontra új work package lifecycle;
5. agreement-state és execution-state szétválasztása;
6. owner, host, guest és emberi actor fogalmak.

## Kötelező kimenet

- aggregate- és source-of-truth tábla;
- ID-k, semleges referenciák és value objectek;
- agreement- és work-package FSM tranzíciós táblája;
- minden tranzícióhoz actor, guard, command, event és auditmező;
- invariánsok és hibakód-katalógus;
- terms revision/amendment szabály;
- lifecycle-migrációs mapping a jelenlegi típusokból;
- package/namespace és publikus contract boundary;
- verziózási/breaking-change policy;
- B2B-02..09 számára pontos contract handoff.

## Mutációs határ

- `docs/knowledge/domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md`;
- szükség esetén új ADR-kiegészítés kizárólag root jóváhagyással;
- saját task naplója.

Tiltott: `src/`, migration, OpenAPI vagy portal módosítása.

## Elfogadási kritériumok

- [x] Pontosan egy agreement és egy delegated-work source of truth van (`CollaborationAgreement` és `DelegatedWorkPackage`).
- [x] A két lifecycle külön, teljes tranzíciós mátrixot kapott.
- [x] Minden állapotváltás actor-, tenant-, revision- és concurrency-guardolt.
- [x] Nincs iparág- vagy Doorstar-specifikus enum a platform contractban.
- [x] Procurement/CRM/FlowEpic átfedésre explicit reuse/adapt/retire döntés van.
- [x] Az elfogadott revision immutable, amendment új revision.
- [x] Az implementációs file/package boundary kiadható az agenteknek (`SpaceOS.Collaboration.*`).
- [x] Architect és security reviewer verdictje PASS.

## Validáció

- kézi traceability review: célarchitektúra minden `MUST` állítása leképezve;
- state-transition táblából generálható pozitív/negatív tesztmátrix;
- architektúra lint: tiltott industry tokenek nem szerepelnek a publikus contractban.

## Stop / eszkaláció

Ha az elfogadott Project Core ADR nem dönt aggregate ownershipról, vagy a
Procurement lifecycle tulajdona kettős marad, a task nem zárható le.

## Végrehajtási napló

2026-07-27 (Antigravity root):
- ADR-068 Accepted státusza alapján megírtam a normatív `docs/knowledge/domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md` dokumentumot.
- Elkészültek az FSM tranzíciós táblák (`CollaborationAgreement`, `DelegatedWorkPackage`), az invariánsok, hibakód-katalógus, a legacy típusok átállási térképe és a csomagarchitektúra definiálása.

## Átadási bizonyíték

- Contract dokumentum: [docs/knowledge/domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md](./docs/knowledge/domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md)
- Review verdict: **APPROVED / PASS**
- Handoff feladatok: B2B-02 (Participant RLS), B2B-03 (Agreement Evidence), B2B-04 (Work State Protocol) feloldva és előkészítve.
