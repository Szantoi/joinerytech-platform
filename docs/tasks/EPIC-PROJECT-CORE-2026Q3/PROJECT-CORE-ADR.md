# PROJECT-CORE-ADR — projekt-orchestration és B2B MVP döntése

- **Szerep:** architect/root
- **Prioritás:** P0
- **Státusz:** pending, kiadható (`PROJECT-BOUNDARY-AUDIT = done`)
- **Függőség:** `PROJECT-BOUNDARY-AUDIT = done`
- **Mutációs határ:** `docs/knowledge/adr/`, ADR index, task/EPICS státusz
- **Tiltott scope:** implementáció, adatbázis-migráció, API vagy frontend kód

## Cél

Elfogadott ADR-ben dönteni arról, hogyan áll össze a JoineryTech Projects
élmény a meglévő Kernel FlowManagement, FlowEpic és StageChain képességeiből,
valamint hol él az iparágsemleges SpaceOS Collaboration bounded context. A
kézfogást nem egyszerű delegálási mezőként, hanem két vállalat közötti digitális
megállapodásként és állapotkezelt munkamegosztásként kell elhelyezni.

Kötelező célforrás:
[`SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md`](../../knowledge/architecture/SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md).

## Kötelező döntési pontok

1. **Ownership:** Kernel/FlowManagement kiterjesztés, JoineryTech adapter/read
   context vagy új bounded context. A duplikált Project aggregate tiltott.
2. **Hierarchy:** Program/Project/Milestone/FlowEpic/Task ID-k és lifecycle
   tulajdonosa, referenciális szabályok.
3. **B2B ownership:** a jelenlegi FlowEpic-owned value object, a nem használt
   Handshake absztrakciók és a Procurement `SubcontractOrder` kapcsolatából
   pontosan egy agreement és egy delegated-work source of truth kijelölése.
4. **Két lifecycle:** a verziózott együttműködési megállapodás és a delegált
   munkacsomag állapotgépe külön; minden tranzícióhoz actor, guard és event.
5. **Digitális megállapodás:** immutable terms revision, deterministic hash,
   accept/reject/amend/revoke, acceptance evidence és jogi/compliance határ.
6. **Tenant boundary:** host/guest adatszelet, partner-allowlist kontra participant
   grant, actor-szűrt read model és fail-closed RLS/JWT policy.
7. **Információcsere:** schema/version envelope, DMS/proof reference,
   outbox/inbox, sequence, idempotencia, replay és reconciliation.
8. **StageChain:** template ownership, tenant-config, versioning, futó FlowEpic
   migrációja template-váltáskor.
9. **Modulkapcsolat:** CRM, Procurement, Kontrolling, Production, Warehouse, QA
   és DMS csak semleges ID/port/event referencián; üzleti adat nem duplikálható.
10. **Read model:** actor-szűrt ugyanazon URL-es nézet, projekció rebuild és
   eventual consistency viselkedés.
11. **MVP stop condition:** mi fér az első cross-company vertical slice-ba, mi
    explicit későbbi; Doorstar pilothoz szükséges platformartifactok.

## ADR kötelező szerkezete

- context és bizonyíték;
- döntési erők és nem-célok;
- legalább három opció;
- döntés és miért;
- domain/port/event ownership táblák;
- security/threat model;
- API és persistence magas szintű terv;
- migráció/kompatibilitás/rollback;
- tesztstratégia;
- következmények és elvetett alternatívák;
- implementációs task-bontás fájlhatárokkal.

## Elvárt implementációs task-kimenet

Az implementációs bontás már létrejött a
[`EPIC-B2B-COLLABORATION-2026Q3`](../EPIC-B2B-COLLABORATION-2026Q3/README.md)
alatt. Az ADR elfogadásakor ellenőrizni és szükség esetén pontosítani kell a
`B2B-01..09` package-, fájl- és ownership-határait; új párhuzamos tasklánc nem
nyitható.

## Elfogadási kritériumok

- [ ] Az ADR nem hoz létre duplikált Project/FlowEpic truth source-ot.
- [ ] Az agreement és delegated work source of truth, valamint a
      `SubcontractOrder` adapter/retire döntése egyértelmű.
- [ ] B2B minden állapotához actor, guard és audit követelmény tartozik.
- [ ] Host és guest tenant láthatóság explicit, fail-closed.
- [ ] Participant grant és allowlist felelőssége szétválasztott.
- [ ] Immutable terms revision, hash, acceptance evidence és amendment szabály
      szerepel.
- [ ] Az adatcsere verziózás, idempotencia és replay viselkedése rögzített.
- [ ] Moduladat ownership és port/event kapcsolat egyértelmű.
- [ ] MVP és non-goals mérhető.
- [ ] A `B2B-01..09` taskhatárok az ADR-döntéshez igazítva, önállóan kiadhatók.

## Stop / eszkaláció

Ha az audit egy konkrét ownership-kérdést nem bizonyít, azt célzott kiegészítő
audittal kell zárni, nem feltételezéssel. A globális tenant-filter fellazítása,
guest-host megszemélyesítés, implicit cross-tenant read vagy a kézfogás
Procurement/CRM alá rejtése nem elfogadható opció.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő: ADR link, verdict, elutasított opciók, létrehozott taskok._
