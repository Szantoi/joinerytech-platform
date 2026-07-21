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

- 2026-07-21, architect (agent, PROJECT-CORE-ADR): elolvasta a
  `PROJECT-BOUNDARY-AUDIT.md` task-fájlt és teljes kimenetét
  (`PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`), a kötelező célforrást
  (`SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md`), ADR-065, ADR-066,
  ADR-067 teljes szövegét, és az `EPIC-B2B-COLLABORATION-2026Q3` README +
  mind a kilenc `B2B-01..09` task-fájlt.
- Ellenőrizte az ADR-számozást (`docs/knowledge/adr/*.md` listázva):
  ADR-059..067 foglalt, **ADR-068 szabad** — ez lett a kimeneti fájl száma.
- Forrásból megerősítette az audit fő állításait: `FlowEpic.cs`,
  `AppDbContext.cs:145-181`, `init-query-rls.sql`,
  `FlowManagement/Domain/{FlowProject,FlowTask}.cs`, `B2BHandshake.cs` (VO),
  `DelegateFlowEpicCommandHandler.cs`, portál `ProjectsPage.tsx`.
- Célzott kiegészítő kódvizsgálatot végzett három, a bemenetekben nem elég
  mélyen feltárt területen (a task „Stop / eszkaláció" szabálya szerint):
  1. `SpaceOS.Modules.Abstractions/Handshake/*.cs` — nulla fogyasztó,
     iparág-terhelt `HandshakeType` enum (DesignToManufacturer stb.) feltárva.
  2. `TenantHandshakeAllowlist`/`B2BHandshakeVerifier`/
     `GetTenantActorQueryHandler` (ADR-039) — egy **második, élő, migrált, de
     más célú** allowlist-mechanizmus feltárva, amit a `DelegateFlowEpic
     CommandHandler` sosem hív, és ami maga is iparág-specifikus
     (`"door"/"cabinet"/"window"`) zárt szótárat tartalmaz a Kernel Domain
     rétegben — egy korábban nem nevesített, ADR-065-höz hasonló
     domain-mentesség sérülés.
  3. Procurement `SubcontractOrder.cs`/`Supplier.cs`/
     `AcceptSubcontractOrderCommandHandler.cs` — feltárva, hogy a `Supplier`
     tenant-belső törzsadat, nincs mögötte valódi cross-tenant identitás, tehát
     a `SubcontractOrder` ma strukturálisan nem versenyez a leendő
     `DelegatedWorkPackage`-dzsel.
- Meghozta mind a 11 kötelező döntési pontot az ADR kötelező szerkezete szerint
  (legalább 3 opció az ownership-kérdésre, döntési erők/nem-célok, domain/port/
  event ownership táblák, threat model, API/persistence terv, migráció/
  rollback, tesztstratégia, következmények/elvetett alternatívák).
- Két ponton pontosította a meglévő `B2B-01..09` task-határokat
  (`B2B-01-DOMAIN-CONTRACT.md`: a két különböző Kernel-handshake-fogalom
  explicit szétválasztása; `B2B-06-MODULE-ADAPTERS.md`: a Procurement-adapter
  opcionális/jövőbeli jellege, mert a `Supplier` ma tenant-belső törzsadat) —
  a többi hét task-fájl változtatás nélkül helytállónak bizonyult.
- Nyolc, architektúrán túlmutató (üzleti/jogi/ütemezési) nyitott kérdést
  különített el Gábornak, és nem fogadta el önmagát az ADR-t — Státusz
  **PROPOSED**, a projekt ADR-elfogadási konvenciója szerint (Gábor dönt).
- Alkalmazáskód, migráció, endpoint és `EPICS.yaml` nem módosult.

## Átadási bizonyíték

- **ADR:** `docs/knowledge/adr/ADR-068-project-core-and-b2b-collaboration-ownership.md`,
  **Státusz: PROPOSED** — Gábor jóváhagyására vár, 8 explicit nyitott kérdéssel
  (ADR 15. fejezet).
- **Verdict:** minden architektúra-jellegű (a 11 kötelező döntési pont)
  meghozva; egyik pont sem maradt `decision_required` architektúra-szinten —
  a nyitva hagyott pontok kizárólag üzleti/jogi/ütemezési jellegűek.
- **Elutasított opciók:** Kernel FlowManagement/FlowEpic közvetlen
  kiterjesztése (O1), JoineryTech-tulajdonú adapter/read context mint egyedüli
  válasz (O2), a kézfogás Procurement/CRM alá rejtése (O4) — mindhárom
  indoklással elutasítva az ADR 4. fejezetében.
- **Választott irány:** új, önálló, iparágsemleges SpaceOS Collaboration
  bounded context (O3), Kernel-lel és a 7 ERP-modullal egyenrangú, a Kernel
  core-t egyáltalán nem módosítva.
- **Létrehozott/módosított taskok:** nincs új párhuzamos tasklánc nyitva (a
  task saját tiltása szerint); a meglévő `B2B-01` és `B2B-06` task-fájl
  célzottan pontosítva (lásd fent és az ADR 14. fejezete).
- **Mutáció:** ez a task-fájl, az ADR-068 fájl, és a `B2B-01`/`B2B-06`
  task-fájl célzott szerkesztése. `EPICS.yaml`, alkalmazáskód, migráció,
  endpoint nem módosult — a root terminál frissíti az EPICS-státuszt a
  felülvizsgálat után.
